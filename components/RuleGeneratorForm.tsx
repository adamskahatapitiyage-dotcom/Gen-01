import React, { useState, useEffect, useRef } from 'react';
import type { RuleInputs, GenerationPayload, RefineRuleInputs, CategoryInputs } from '../types';

interface RuleGeneratorFormProps {
  onGenerate: (payload: GenerationPayload) => void;
  isLoading: boolean;
  activeInputs?: RuleInputs;
  onClearForm: () => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; required?: boolean }> = ({ htmlFor, children, required }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-300 mb-2">
        {children}
        {required && <span className="text-cyan-400 ml-1">*</span>}
    </label>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input
        ref={ref}
        {...props}
        className="block w-full bg-slate-800 border border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50 transition-all"
    />
));

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
    <textarea
        ref={ref}
        {...props}
        className="block w-full bg-slate-800 border border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50 transition-all"
    />
));

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }> = ({ children, ...props }) => (
    <button
        {...props}
        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-gradient-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
        {children}
    </button>
);

const UploadIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const XCircleIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

// Constants for image size limits
const MAX_SINGLE_IMAGE_SIZE_MB = 10;
const MAX_TOTAL_IMAGES_SIZE_MB = 30; // Reasonable limit for multiple images combined
const MAX_SINGLE_IMAGE_SIZE_BYTES = MAX_SINGLE_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_IMAGES_SIZE_BYTES = MAX_TOTAL_IMAGES_SIZE_MB * 1024 * 1024;


const FileUploader: React.FC<{
    fileInputRef: React.RefObject<HTMLInputElement>;
    onImageChange: (files: FileList | null) => void;
    imagePreviews: string[];
    onRemoveImage: (index: number) => void;
}> = ({ fileInputRef, onImageChange, imagePreviews, onRemoveImage }) => (
    <div>
        <div 
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); onImageChange(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-md cursor-pointer hover:border-cyan-500 transition-colors bg-slate-800/50 hover:bg-slate-800"
        >
            <div className="space-y-1 text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-slate-500"/>
                <p className="text-sm text-slate-400">
                    <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">PNG, JPG, GIF up to {MAX_SINGLE_IMAGE_SIZE_MB}MB per image, {MAX_TOTAL_IMAGES_SIZE_MB}MB total.</p>
            </div>
        </div>
        <input ref={fileInputRef} id="image-upload" name="image-upload" type="file" className="sr-only" multiple accept="image/*" onChange={(e) => onImageChange(e.target.files)} />
        {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                        <img src={preview} alt={`Preview ${index}`} className="h-24 w-full object-cover rounded-md" />
                        <button type="button" onClick={() => onRemoveImage(index)} className="absolute -top-2 -right-2 bg-slate-900 rounded-full text-slate-400 hover:text-white transition-transform transform group-hover:scale-110" aria-label="Remove image">
                            <XCircleIcon className="w-6 h-6"/>
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
);


const RuleGeneratorForm: React.FC<RuleGeneratorFormProps> = ({ onGenerate, isLoading, activeInputs, onClearForm }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'text-and-image' | 'image' | 'refine' | 'category'>('text');
  const [inputs, setInputs] = useState<RuleInputs>({ category: '', attributeName: '', values: '' });
  const [refineInputs, setRefineInputs] = useState<RefineRuleInputs>({
    existingRule: '',
    feedback: ''
  });
  const [categoryInputs, setCategoryInputs] = useState<CategoryInputs>({ categoryName: '', categoryDescription: '' }); // New state for category inputs
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup preview URLs
    return () => {
      imagePreviews.forEach(URL.revokeObjectURL);
    };
  }, [imagePreviews]);

  useEffect(() => {
    if (activeInputs) {
      setInputs(activeInputs);
    } else {
      setInputs({ category: '', attributeName: '', values: '' });
    }
    setRefineInputs({ existingRule: '', feedback: '' });
    setCategoryInputs({ categoryName: '', categoryDescription: '' }); // Reset category inputs
    setImages([]);
    setImagePreviews([]);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }, [activeInputs]);
  
  // Reset images when switching tabs
  useEffect(() => {
    setImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Also clear the native file input value
    }
  }, [activeTab]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleRefineChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRefineInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // New change handler for category
    const { name, value } = e.target;
    setCategoryInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newFilesArray = Array.from(fileList);
    const validNewFiles: File[] = [];
    const newPreviews: string[] = [];
    let currentTotalSize = images.reduce((sum, file) => sum + file.size, 0);

    for (const file of newFilesArray) {
      if (file.size > MAX_SINGLE_IMAGE_SIZE_BYTES) {
        alert(`Image '${file.name}' is too large. Max size is ${MAX_SINGLE_IMAGE_SIZE_MB}MB.`);
        continue; // Skip this file
      }

      // Check cumulative size before adding
      if (currentTotalSize + file.size > MAX_TOTAL_IMAGES_SIZE_BYTES) {
        alert(`Adding image '${file.name}' would exceed the total image limit of ${MAX_TOTAL_IMAGES_SIZE_MB}MB. Please remove some images or upload fewer.`);
        break; // Stop processing further files
      }

      validNewFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
      currentTotalSize += file.size;
    }

    if (validNewFiles.length > 0) {
      setImages(prev => [...prev, ...validNewFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
    // Clear the file input value to allow re-uploading the same file if needed,
    // useful if a file was rejected and user wants to try again with a different one
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => {
        const newPreviews = [...prev];
        URL.revokeObjectURL(newPreviews[indexToRemove]);
        newPreviews.splice(indexToRemove, 1);
        return newPreviews;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const processValues = (values: string) => values
      .replace(/\n/g, ',') // Treat newlines as commas
      .split(',') // Split by commas
      .map(v => v.trim()) // Trim whitespace from each value
      .filter(v => v) // Remove any empty values that result from extra commas/newlines
      .join(','); // Join back into a clean, comma-separated string (no space after comma for consistency)

    if (activeTab === 'refine') {
        onGenerate({ type: 'refine', inputs: refineInputs });
    } else if (activeTab === 'text') {
        const processedInputs = { ...inputs, values: processValues(inputs.values) };
        onGenerate({ type: 'text', inputs: processedInputs });
    } else if (activeTab === 'text-and-image') {
        const processedInputs = { ...inputs, values: processValues(inputs.values) };
        onGenerate({ type: 'text-and-image', inputs: processedInputs, images });
    } else if (activeTab === 'image') {
        onGenerate({ type: 'image', images });
    } else if (activeTab === 'category') { // New category tab submission
        onGenerate({ type: 'category', categoryInputs });
    }
  };
  
  const localClearForm = () => {
    setInputs({ category: '', attributeName: '', values: '' });
    setRefineInputs({ existingRule: '', feedback: '' });
    setCategoryInputs({ categoryName: '', categoryDescription: '' }); // Clear category inputs
    setImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    onClearForm();
  };

  const isTextDataPristine = !inputs.category && !inputs.attributeName && !inputs.values;
  const isRefineDataPristine = !refineInputs.existingRule && !refineInputs.feedback;
  const isImageDataPristine = images.length === 0;
  const isCategoryDataPristine = !categoryInputs.categoryName && !categoryInputs.categoryDescription; // New pristine check
  const isPristine = isTextDataPristine && isRefineDataPristine && isImageDataPristine && isCategoryDataPristine; // Update isPristine


  let isSubmitDisabled = isLoading;
  if (activeTab === 'text') {
    isSubmitDisabled = isLoading || !inputs.category || !inputs.attributeName || !inputs.values;
  } else if (activeTab === 'text-and-image') {
    isSubmitDisabled = isLoading || !inputs.category || !inputs.attributeName || !inputs.values || images.length === 0;
  } else if (activeTab === 'image') {
    isSubmitDisabled = isLoading || images.length === 0;
  } else if (activeTab === 'refine') {
    isSubmitDisabled = isLoading || !refineInputs.existingRule || !refineInputs.feedback;
  } else if (activeTab === 'category') { // New category tab submission check
    isSubmitDisabled = isLoading || !categoryInputs.categoryName || !categoryInputs.categoryDescription;
  }


  return (
    <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 sticky top-24 xl:top-28 shadow-2xl shadow-slate-950/50">
        <div className="bg-slate-800 p-1 rounded-lg grid grid-cols-5 gap-1 mb-6"> {/* Updated grid-cols to 5 */}
            <button onClick={() => setActiveTab('text')} role="tab" aria-selected={activeTab === 'text'} className={`w-full px-2 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${activeTab === 'text' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
                Text
            </button>
            <button onClick={() => setActiveTab('text-and-image')} role="tab" aria-selected={activeTab === 'text-and-image'} className={`w-full px-2 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${activeTab === 'text-and-image' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
                Text & Image
            </button>
            <button onClick={() => setActiveTab('image')} role="tab" aria-selected={activeTab === 'image'} className={`w-full px-2 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${activeTab === 'image' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
                Image (OCR)
            </button>
            <button onClick={() => setActiveTab('refine')} role="tab" aria-selected={activeTab === 'refine'} className={`w-full px-2 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${activeTab === 'refine' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
                Refine Rule
            </button>
            <button onClick={() => setActiveTab('category')} role="tab" aria-selected={activeTab === 'category'} className={`w-full px-2 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${activeTab === 'category' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
                Category Rules
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {(activeTab === 'text' || activeTab === 'text-and-image') && (
                <div className="space-y-6">
                    <div>
                        <Label htmlFor="category" required>Product Category</Label>
                        <Input id="category" name="category" type="text" value={inputs.category} onChange={handleChange} placeholder="e.g., Footwear" required disabled={isLoading} />
                    </div>
                    <div>
                        <Label htmlFor="attributeName" required>Attribute Name</Label>
                        <Input id="attributeName" name="attributeName" type="text" value={inputs.attributeName} onChange={handleChange} placeholder="e.g., Style" required disabled={isLoading} />
                    </div>
                    <div>
                        <Label htmlFor="values" required>Attribute Values</Label>
                        <Textarea id="values" name="values" value={inputs.values} onChange={handleChange} rows={4} placeholder={"e.g.,\nSneaker\nBoot\nSandal\nLoafer"} required disabled={isLoading} />
                         <p className="mt-2 text-xs text-slate-500">Enter each value on a new line or separate with commas.</p>
                    </div>
                </div>
            )}
            
            {(activeTab === 'text-and-image' || activeTab === 'image') && (
              <div>
                <Label htmlFor="image-upload">
                    {activeTab === 'text-and-image' ? 'Visual Examples' : 'Upload Documents/Screenshots for OCR'}
                </Label>
                <FileUploader 
                    fileInputRef={fileInputRef}
                    onImageChange={handleImageChange}
                    imagePreviews={imagePreviews}
                    onRemoveImage={removeImage}
                />
              </div>
            )}

            {activeTab === 'refine' && (
                <div className="space-y-6">
                     <div>
                        <Label htmlFor="existingRule" required>Existing Rule</Label>
                        <Textarea id="existingRule" name="existingRule" value={refineInputs.existingRule} onChange={handleRefineChange} rows={8} placeholder="Paste the full existing rule here..." required disabled={isLoading} />
                    </div>
                    <div>
                        <Label htmlFor="feedback" required>Refinement Feedback</Label>
                        <Textarea id="feedback" name="feedback" value={refineInputs.feedback} onChange={handleRefineChange} rows={4} placeholder="e.g., Make the definition for 'Sneaker' stricter, add 'Clogs' as a value..." required disabled={isLoading} />
                    </div>
                </div>
            )}

            {activeTab === 'category' && ( // New category input section
                <div className="space-y-6">
                    <div>
                        <Label htmlFor="categoryName" required>Category Name</Label>
                        <Input id="categoryName" name="categoryName" type="text" value={categoryInputs.categoryName} onChange={handleCategoryChange} placeholder="e.g., Footwear, Books" required disabled={isLoading} />
                    </div>
                    <div>
                        <Label htmlFor="categoryDescription" required>Category Description/Purpose</Label>
                        <Textarea id="categoryDescription" name="categoryDescription" value={categoryInputs.categoryDescription} onChange={handleCategoryChange} rows={4} placeholder="e.g., Products worn on the feet, items containing printed or written pages..." required disabled={isLoading} />
                         <p className="mt-2 text-xs text-slate-500">Provide a clear description or purpose of this category.</p>
                    </div>
                </div>
            )}
            
            <div className="mt-6 grid grid-cols-2 gap-4">
                <Button type="submit" disabled={isSubmitDisabled}>
                    {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                    ) : 'Generate Rule'}
                </Button>
                 <button
                    type="button"
                    onClick={localClearForm}
                    disabled={isLoading || isPristine}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-slate-700 text-sm font-semibold rounded-md shadow-sm text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Clear all form inputs"
                >
                    Clear Form
                </button>
            </div>
        </form>
    </div>
  );
};

export default RuleGeneratorForm;