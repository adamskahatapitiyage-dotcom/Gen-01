export const REFINE_PROMPT_TEMPLATE = `## 🧾 SYSTEM PROMPT — Attribute Tagging Instruction Refinement Request

You are an expert system that refines product attribute tagging instructions. Your task is to analyze an existing rule, incorporate user feedback, and generate a complete, updated rule as a structured JSON object.

### Instructions:
1.  **Analyze the \`existingRule\`**: Identify the product category, attribute name, and the list of attribute values.
2.  **Incorporate \`userFeedback\`**: Apply the user's requested changes to the rule. You must only change the parts mentioned in the feedback. All other sections must be preserved exactly as they are.
3.  **Format Output as JSON**: Return a single JSON object with the following structure:
    - \`category\`: (string) The inferred product category.
    - \`attributeName\`: (string) The inferred attribute name.
    - \`values\`: (string) A comma-separated string of all attribute values.
    - \`rule\`: (string) The complete, updated rule in Markdown format.

### Input Parameters:
- **Existing Rule**:
\`\`\`markdown
{existingRule}
\`\`\`

- **User Feedback**:
\`\`\`
{feedback}
\`\`\`
`;

export const PROMPT_TEMPLATE = `## 🧾 SYSTEM PROMPT — Attribute Tagging Instruction Request

You are an expert system designed to generate precise, machine-readable tagging instructions for a specific product attribute.

Your task is to create a structured, markdown-formatted instruction set that an AI model can use to **accurately and consistently tag** the attribute {attr} for products in the {internalCategory} category, using e-commerce data such as product titles, descriptions, specifications, and images.

---

### 🔧 Input Parameters

- **Product Category**: {internalCategory}
- **Attribute Name**: {attr}
- **Attribute Value List**:
{valueList}
- **Existing Instructions** *(optional)*:
  - If provided, treat these as the **source of truth** for all sections unless the **userNotes** request changes.
  - When **userNotes** are present, apply changes **only** to the specific sections or values mentioned in \`userNotes\`.
  - Do **not modify or reword any other parts** of \`existingInstructions\`. Copy them exactly as-is into your output.
\`\`\`
{existingInstructions}
\`\`\`
- **User Guidelines or Constraints** *(optional)*:
  - These may include:
  - **Refinement Requests**
    - e.g., “Make the definition for Sneaker stricter”, or “Add Clogs to the value list and define disambiguation for it.”
    - Apply only the specific changes requested. **Preserve all unrelated rules.**
\`\`\`
{userNotes}
\`\`\`

---

### 🧠 What Your Output Must Contain

Your output must be a full tagging instruction set composed of the following sections, formatted as a single Markdown document:

#### 1. 🧠 **Attribute Definition**
- Define what the attribute {attr} represents in the context of {internalCategory}.
- If \`existingInstructions\` are provided and \`userNotes\` do not request a change, copy this section as-is from \`existingInstructions\`.

#### 2. 🔍 **Evidence-Based Detection**
- Describe how to detect values using product images and text separately.
- Clarify source precedence when in conflict.
- State that values must match the provided {valueList}.
- If not mentioned in \`userNotes\`, preserve this section exactly as-is from \`existingInstructions\`.

#### 3. 🔖 **Value Definition**
- For **each and every value** in {valueList}, define:
  - **Definition**: Describe what this value looks like or represents, ausing both visual (image) and textual signals.
  - ✅ **Tag when**: Describe when this value should be applied — based on **visual cues** (e.g., pattern in the image) and/or **text matches**.
  - ❌ **Do not tag when**: List scenarios or signals where the value is incorrect.
  - 🆚 **Confusable with** (optional): List common confusions and how to differentiate.
- If a value is not mentioned in \`userNotes\`, reuse its entire definition block verbatim from \`existingInstructions\`.
- If a value **is** mentioned in \`userNotes\`, only then regenerate or update that block.

#### 4. 🧩 **Clarified Rules for Complex or Confusing Values**
- For values that:
  - Involve multi-word expressions
  - Require agreement across sources
  - Are commonly mis-tagged or confused
  Define special logic here:
    - Co-occurrence rules
    - Visual or textual disambiguation
    - Detection conditions and boundaries

#### 5. 🔢 **Special Instructions for Numeric & Dimension Attributes**
- If the attribute **{attr}** is a numeric or dimension-based attribute (e.g., "Height", "Width", "Weight", "Size"), you **MUST** include the following rules under a relevant "Do not tag when" or "Clarified Rules" section:
  - ❌ Select and enter only the exact dimensions provided in the product data. Use the correct fields for Height (H), Width (W), Depth (D), or Diameter (DIA) as applicable.
  - ❌ Do not round off or estimate any dimension values.
  - ❌ Do not assume or calculate missing measurements.
  - ❌ If any dimension value is not explicitly mentioned, leave it as NULL.
  - ❌ Strictly prohibited: Tagging approximate or rounded-off dimension values.

#### 6. ⚠️ **Handling Edge Cases**
- Rules for when:
  - No relevant info is available
  - Image and text conflict
  - Value appears ambiguous
- Always favor **explicit signals** over assumption.

#### 7. 📌 **Tagging Limits & Priority**
- State the **maximum number of values** that can be tagged for this attribute.
- Provide a **clear priority rule** when multiple values could apply:
  - Example: “Prioritize front-facing pockets, then side, then interior”
- Use numbered or ranked bullets to express hierarchy.
- Copy from \`existingInstructions\` unless \`userNotes\` include refinements.

---

### 🚫 What to Avoid

Your instructions must NOT:

- Use subjective language (e.g., “if it looks elegant”)
- Include opinions or product knowledge not present in the data
- Make assumptions beyond the provided inputs
- Reword, reformat, or alter sections that were not mentioned in \`userNotes\`
- Refer to attributes other than {attr} unless explicitly instructed via {userNotes}

---

### ✅ Output Format

Your final output must be a single, well-structured **Markdown document**. Follow these formatting rules precisely:

- The entire response should be a single block of Markdown text.
- **Do not wrap your entire output in \`\`\`markdown ... \`\`\` code fences.**
- Use \`###\` for all section headings (e.g., \`### 🧠 Attribute Definition\`).
- Use standard Markdown for lists (\`-\` or \`*\`), nested lists, and bold text (\`**...\**\`).
- Use the emoji indicators (\`🧠\`, \`✅\`, \`❌\`, \`🆚\`, etc.) as specified in the sections above to add visual cues.
`;

// New constant for Category Rule generation
export const CATEGORY_PROMPT_TEMPLATE = `## 📄 SYSTEM PROMPT — Concise Category Rule Generation

You are an expert AI designed to create extremely clear, concise, and unambiguous rules for product category assignment. Your goal is to provide simple, actionable instructions that prevent confusion and ensure consistent tagging.

---

### 🔧 Input Parameters

- **Category Name**: {categoryName}
- **Category Description/Purpose**: {categoryDescription}

---

### 🧠 What Your Output Must Contain

Your output must be a concise set of rules in Markdown format, specifically designed for a human or AI tagger to understand and apply easily.

#### 1. 🎯 **Category Definition**
- A one-sentence, clear definition of what **{categoryName}** refers to.

#### 2. ✅ **Tagging Criteria**
- A short, bulleted list (max 3-5 points) of the **absolute core criteria** for tagging a product as **{categoryName}**. Focus on the most distinctive and essential characteristics.

#### 3. ❌ **Exclusion Criteria**
- A short, bulleted list (max 2-3 points) of **key scenarios or characteristics where a product should NOT be tagged** as **{categoryName}**. This should address common misclassifications.

---

### 🚫 What to Avoid

Your instructions must NOT:

-   Use jargon or overly technical language.
-   Include subjective interpretations.
-   Make assumptions beyond the provided description.
-   Be lengthy or contain verbose explanations.
-   Include attribute-level details (e.g., specific colors, materials, sizes) unless crucial for the category itself.

---

### ✅ Output Format

Your final output must be a single, well-structured **Markdown document**. Follow these formatting rules precisely:

-   The entire response should be a single block of Markdown text.
-   **Do not wrap your entire output in \`\`\`markdown ... \`\`\` code fences.**
-   Use \`###\` for all section headings (e.g., \`### 🎯 Category Definition\`).
-   Use standard Markdown for bulleted lists (\`-\` or \`*\`).
`;