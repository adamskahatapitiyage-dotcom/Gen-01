import { GoogleGenAI, Chat, GenerateContentResponse, Type } from '@google/genai';
import { PROMPT_TEMPLATE, REFINE_PROMPT_TEMPLATE, CATEGORY_PROMPT_TEMPLATE } from '../constants';
import type { RuleInputs, TestResult, RefineRuleInputs, ChatMessage, CategoryInputs } from '../types';

// This application primarily uses 'gemini-2.5-flash', which is generally available
// within the free tier of Google Cloud AI, enabling deployment without a paid Google Cloud account
// provided usage remains within free tier limits.
let ai: GoogleGenAI;

try {
  // Ensure API_KEY is available, otherwise this will throw.
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
  console.error("Failed to initialize GoogleGenAI. Make sure the API_KEY environment variable is set.", error);
  // We re-throw this so the UI can catch it and display a proper message.
  throw new Error("Failed to initialize GoogleGenAI. Make sure the API_KEY environment variable is set.");
}

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const base64EncodedData = await base64EncodedDataPromise;
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const createPrompt = (inputs: RuleInputs, existingInstructions: string = 'N/A', userNotes: string = 'N/A') => {
  // Ensure values are formatted as a bulleted list for the prompt
  const valueListFormatted = inputs.values.split(',').map(v => v.trim()).filter(v => v).map(v => `- ${v}`).join('\n');

  return PROMPT_TEMPLATE
    .replace(/{internalCategory}/g, inputs.category)
    .replace(/{attr}/g, inputs.attributeName)
    .replace('{valueList}', valueListFormatted) // Use the formatted list
    .replace('{existingInstructions}', existingInstructions)
    .replace('{userNotes}', userNotes);
};

const processStreamMarkdown = async (
    stream: AsyncIterable<GenerateContentResponse>,
    onChunk: (chunk: string) => void
): Promise<string> => {
    let text = '';
    for await (const chunk of stream) {
        const chunkText = chunk.text;
        if(chunkText){
            text += chunkText;
            onChunk(chunkText);
        }
    }
    return text.replace(/```markdown/g, '').replace(/```/g, '').trim();
}

const withRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
    let lastError: unknown = new Error("API call failed after multiple retries.");
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            lastError = error;
            const errorString = (error instanceof Error ? error.message : String(error)).toLowerCase();

            // Only retry for transient, capacity-related errors
            if (errorString.includes("overloaded") || errorString.includes("503") || errorString.includes("unavailable")) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
                console.log(`The AI is currently juggling flaming torches... gracefully handling your request. Retrying in ${Math.round(delay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Not a retryable error, re-throw immediately
                throw error;
            }
        }
    }
    // If all retries fail, throw the last captured error
    throw lastError;
};


const handleError = (error: unknown): Error => {
    console.error("Gemini API call failed:", error);

    const errorString = (error instanceof Error ? error.message : JSON.stringify(error)).toLowerCase();
    
    if (errorString.includes("overloaded") || errorString.includes("503") || errorString.includes("unavailable")) {
        return new Error("Whoa, the AI is popular right now! It seems to be at full capacity. Please give it a moment to catch its breath and try again in a few minutes.");
    }
    if (errorString.includes("api key not valid")) {
        return new Error("The API key is not valid. Please ensure it is configured correctly.");
    }
    if (errorString.includes("400")) {
         return new Error("The request was malformed. This can happen if the input text is too long, images are too large, or if it contains other unsupported content. Please check your inputs and try again.");
    }
    
    // A more robust fallback to prevent leaking raw error details like in the screenshot.
    console.error("Full API Error details:", error);
    return new Error("An unexpected error occurred with the AI service. This might be a temporary service issue or an internal model problem. Please wait a moment and try again. If the issue persists, please check the developer console for more details.");
};


export const generateAttributeRuleStreamed = async (
    inputs: RuleInputs,
    onChunk: (chunk: string) => void
): Promise<{ rule: string; chat: Chat }> => {
  const { category, attributeName, values } = inputs;

  if (!category || !attributeName || !values) {
    throw new Error("Category, Attribute Name, and Values are required.");
  }
  
  const userPrompt = createPrompt(inputs);

  try {
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-flash',
    });
    
    // FIX: Explicitly type `stream` to avoid type inference issues with the `withRetry` helper.
    const stream: AsyncIterable<GenerateContentResponse> = await withRetry(() => chat.sendMessageStream({ 
      message: userPrompt,
      config: {
        maxOutputTokens: 3000,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }));
    const rule = await processStreamMarkdown(stream, onChunk);

    if (!rule) {
      throw new Error("The AI returned an empty response. Please try again.");
    }

    return { rule, chat };

  } catch (error) {
    throw handleError(error);
  }
};

export const generateRefinedRule = async (
    inputs: RefineRuleInputs,
): Promise<{ rule: string; inputs: RuleInputs; chat: Chat }> => {
  const { existingRule, feedback } = inputs;

  if (!existingRule || !feedback) {
    throw new Error("Existing Rule and Feedback are both required.");
  }

  const prompt = REFINE_PROMPT_TEMPLATE
    .replace('{existingRule}', existingRule)
    .replace('{feedback}', feedback);
  
  try {
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            attributeName: { type: Type.STRING },
            values: { type: Type.STRING },
            rule: { type: Type.STRING }
          },
          required: ['category', 'attributeName', 'values', 'rule']
        },
        maxOutputTokens: 3000, // Generous for JSON output of a rule
        thinkingConfig: { thinkingBudget: 1024 },
      }
    }));
    
    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("The AI returned an empty response. Please try again.");
    }

    const parsedResult = JSON.parse(jsonText);
    if (!parsedResult.rule || !parsedResult.category || !parsedResult.attributeName || !parsedResult.values) {
      throw new Error("The AI response was missing required fields (rule, category, attributeName, values).");
    }
    
    const newInputs: RuleInputs = {
      category: parsedResult.category,
      attributeName: parsedResult.attributeName,
      values: parsedResult.values,
    };

    // Create a new chat session primed with this interaction for future refinements
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: jsonText }] }
      ]
    });

    return { rule: parsedResult.rule, inputs: newInputs, chat };

  } catch (error) {
    if (error instanceof SyntaxError) {
        console.error("Failed to parse AI response as JSON:", error);
        throw new Error("The AI returned an invalid JSON format. Please try again.");
    }
    throw handleError(error);
  }
};

export const refineRuleStreamed = async (
    chat: Chat, 
    inputs: RuleInputs, 
    refinementPrompt: string, 
    existingRule: string,
    onChunk: (chunk: string) => void
): Promise<string> => {
    if (!chat) {
        throw new Error("No active chat session found for refinement. Please start a new generation.");
    }
    if (!refinementPrompt.trim()) {
        throw new Error("Refinement prompt cannot be empty.");
    }

    const userPrompt = createPrompt(inputs, existingRule, refinementPrompt);

    try {
        // FIX: Explicitly type `stream` to avoid type inference issues with the `withRetry` helper.
        // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
        const stream: AsyncIterable<GenerateContentResponse> = await withRetry(() => chat.sendMessageStream({ 
          message: userPrompt,
          config: {
            maxOutputTokens: 3000,
            thinkingConfig: { thinkingBudget: 1024 },
          },
        }));
        const refinedRule = await processStreamMarkdown(stream, onChunk);
        
        if (!refinedRule) {
          throw new Error("The AI returned an empty response during refinement. Please try again.");
        }

        return refinedRule;

    } catch (error) {
        throw handleError(error);
    }
};

export const generateRuleFromImagesStreamed = async (
    images: File[],
    onChunk: (chunk: string) => void
): Promise<string> => {
  if (!images || images.length === 0) {
    throw new Error("At least one image is required for OCR-based generation.");
  }

  const imageParts = await Promise.all(images.map(fileToGenerativePart));

  // Updated OCR prompt to be more concise and focused on the task
  const ocrPrompt = `Analyze the provided images using OCR. These images contain information about product attributes.
From the extracted text, identify the **Product Category**, **Attribute Name**, and **Attribute Values**.
Then, generate a comprehensive set of structured tagging instructions in Markdown format for an AI model or human tagger, explaining how to accurately assign these attribute values based on product data. The rules should be clear, detailed, and cover definitions and edge cases.`;

  try {
    // FIX: Explicitly type `response` to avoid type inference issues with the `withRetry` helper.
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const response: AsyncIterable<GenerateContentResponse> = await withRetry(() => ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: ocrPrompt }, ...imageParts] }],
      config: {
        maxOutputTokens: 3000,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }));
    return await processStreamMarkdown(response, onChunk);
  } catch (error) {
    throw handleError(error);
  }
};


export const generateRuleFromTextAndImagesStreamed = async (
    inputs: RuleInputs, 
    images: File[],
    onChunk: (chunk: string) => void
): Promise<string> => {
  const { category, attributeName, values } = inputs;

  if (!category || !attributeName || !values) {
    throw new Error("Category, Attribute Name, and Values are required.");
  }
  if (!images || images.length === 0) {
    throw new Error("At least one image is required for Text & Image generation.");
  }

  const imageParts = await Promise.all(images.map(fileToGenerativePart));

  const prompt = createPrompt(inputs) + `
---
You must also analyze the following images. They are visual examples related to the attribute values.
Use the visual information from the images to enrich the definitions and rules you generate. For example, if a value is "Striped," use the provided images of striped products to describe the visual characteristics of stripes that a tagger should look for. Ensure your final instructions are practical and informed by both the text inputs and these visual examples.
`;
  
  try {
    // FIX: Explicitly type `response` to avoid type inference issues with the `withRetry` helper.
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const response: AsyncIterable<GenerateContentResponse> = await withRetry(() => ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }, ...imageParts] }],
      config: {
        maxOutputTokens: 3000,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }));
    return await processStreamMarkdown(response, onChunk);
  } catch (error) {
    throw handleError(error);
  }
};

export const generateCompactRule = async (markdownRule: string): Promise<string> => {
  if (!markdownRule) {
    throw new Error("Cannot summarize an empty rule.");
  }

  const prompt = `You are a text summarization expert. Your task is to create a concise, "compact" summary of the provided set of tagging instructions.
  The summary should be easy to read and capture the absolute most important aspects of the rule.

  **Guidelines for the summary:**
  - Start with a one-sentence overview of the attribute's purpose.
  - Use a bulleted list to highlight 2-4 key "Tag when" conditions.
  - Use another bulleted list for 1-2 critical "Do not tag when" conditions.
  - Keep the language simple and direct.
  - The entire summary should not exceed 5-6 lines.
  - Output as plain text or simple markdown.

  Here is the full rule to summarize:
  ---
  ${markdownRule}
  ---
  `;

  try {
    // FIX: Explicitly type `response` to avoid type inference issues with the `withRetry` helper.
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 200, // Small max output tokens for a summary
        thinkingConfig: { thinkingBudget: 50 },
      },
    }));

    const summary = response.text;
    if (!summary) {
      throw new Error("The AI returned an empty summary.");
    }
    return summary.trim();

  } catch (error) {
    throw handleError(error);
  }
};

// FIX: Added 'export' to make this function available for import in other modules.
export const exportRuleAsJson = async (markdownRule: string): Promise<string> => {
  if (!markdownRule) {
    throw new Error("Cannot export an empty rule.");
  }

  const prompt = `Convert the following rule, which is in Markdown format, into a structured JSON object.

  Analyze the structure of the markdown. Identify the main sections (like "Attribute Definition", "Value Definition", etc.) and the nested content within each. The JSON output should reflect this hierarchy. For the "Value Definition" section, create an an array of objects, where each object represents a value and contains its definition, "Tag when" criteria, and "Do not tag when" criteria.
  The top-level keys should be camelCase (e.g., "attributeDefinition").

  Here is the Markdown rule to convert:
  ---
  ${markdownRule}
  ---
  `;

  try {
    // FIX: Explicitly type `response` to avoid type inference issues with the `withRetry` helper.
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 4000, // Generous for JSON conversion
        thinkingConfig: { thinkingBudget: 1024 },
      }
    }));

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("The AI returned an empty JSON response.");
    }
    // Attempt to parse to ensure it's valid JSON before returning
    JSON.parse(jsonText); 
    return jsonText;

  } catch (error) {
    if (error instanceof SyntaxError) {
        console.error("Failed to parse AI response as JSON:", error);
        throw new Error("The AI returned an invalid JSON format. Please try exporting again.");
    }
    throw handleError(error);
  }
};

// FIX: Added 'export' to make this function available for import in other modules.
export const verifyRuleWithSamples = async (markdownRule: string, samples: string): Promise<TestResult[]> => {
  if (!markdownRule) {
    throw new Error("Cannot test an empty rule.");
  }
  if (!samples.trim()) {
    throw new Error("Sample data cannot be empty.");
  }

  const prompt = `You are a rule verification engine. You will be given a set of tagging rules in Markdown format and a list of sample inputs (one per line).
  Your task is to evaluate each sample input against the provided rules.
  For each sample, determine if it should be tagged according to the rules ('pass') or not ('fail').
  Provide a brief, one-sentence reason for your decision for each sample.
  Return your analysis as a JSON array of objects.

  RULES:
  ---
  ${markdownRule}
  ---

  SAMPLES:
  ---
  ${samples}
  ---
  `;

  try {
    // FIX: Explicitly type `response` to avoid type inference issues with the `withRetry` helper.
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sample: { type: Type.STRING },
              result: { type: Type.STRING, enum: ['pass', 'fail'] },
              reason: { type: Type.STRING }
            },
            required: ['sample', 'result', 'reason']
          }
        },
        maxOutputTokens: 2000, // Sufficient for a list of test results
        thinkingConfig: { thinkingBudget: 512 },
      }
    }));
    
    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("The AI returned an empty JSON response for the test.");
    }

    const parsedResult = JSON.parse(jsonText);
    return parsedResult as TestResult[];

  } catch (error) {
     if (error instanceof SyntaxError) {
        console.error("Failed to parse AI test response as JSON:", error);
        throw new Error("The AI returned an invalid JSON format for the test results. Please try again.");
    }
    throw handleError(error);
  }
};


export const sendMessageToChatbot = async (
  history: ChatMessage[],
  newMessage: string,
  onChunk: (chunk: string) => void,
): Promise<{ fullResponse: string }> => {
  if (!newMessage.trim()) {
    throw new Error("Chat message cannot be empty.");
  }

  try {
    // Initialize chat with existing history
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(part => ({ text: part.text }))
      })),
      config: {
        systemInstruction: "You are a helpful AI assistant. Answer questions concisely and informatively. If you don't know something, say so.",
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
      }
    });

    // FIX: Explicitly type `stream` to resolve type inference issues with the `withRetry` helper.
    const stream: AsyncIterable<GenerateContentResponse> = await withRetry(() => chat.sendMessageStream({
      message: newMessage,
      config: {
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingBudget: 256 },
      },
    }));

    let fullResponse = '';
    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullResponse += chunkText;
        onChunk(chunkText);
      }
    }

    if (!fullResponse) {
      throw new Error("The AI returned an empty response.");
    }

    return { fullResponse };

  } catch (error) {
    throw handleError(error);
  }
};

export const generateCategoryRuleStreamed = async (
    categoryInputs: CategoryInputs,
    onChunk: (chunk: string) => void
): Promise<{ rule: string; chat: Chat }> => {
  const { categoryName, categoryDescription } = categoryInputs;

  if (!categoryName || !categoryDescription) {
    throw new Error("Category Name and Description are required for category rule generation.");
  }

  const userPrompt = CATEGORY_PROMPT_TEMPLATE
    .replace(/{categoryName}/g, categoryName)
    .replace(/{categoryDescription}/g, categoryDescription);

  try {
    // Using 'gemini-2.5-flash' model for cost-effective and free-tier compatible operations.
    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-flash',
    });
    
    const stream: AsyncIterable<GenerateContentResponse> = await withRetry(() => chat.sendMessageStream({ 
      message: userPrompt,
      config: {
        maxOutputTokens: 500, // Reduced tokens for concise category rules
        thinkingConfig: { thinkingBudget: 128 }, // Reduced thinking budget
      },
    }));
    const rule = await processStreamMarkdown(stream, onChunk);

    if (!rule) {
      throw new Error("The AI returned an empty response for category rule generation. Please try again.");
    }

    return { rule, chat };

  } catch (error) {
    throw handleError(error);
  }
};