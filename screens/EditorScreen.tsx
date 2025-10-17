import React, { useState, useEffect } from 'react';
import type { UploadedImage } from '../types';
import GlassmorphismCard from '../components/GlassmorphismCard';
import { generateImageFromPrompt } from '../services/geminiService';
// FIX: Import CheckIcon from the new Icons.tsx file.
import { CheckIcon } from '../components/icons/Icons';

interface EditorScreenProps {
  initialImages: UploadedImage[];
}

const EditorScreen: React.FC<EditorScreenProps> = ({ initialImages }) => {
  const [images] = useState<UploadedImage[]>(initialImages);
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);
  const [editedImageUrls, setEditedImageUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [progress, setProgress] = useState({ generated: 0, total: 0 });
  const [timingData, setTimingData] = useState({ startTime: 0, avgTimePerImage: 0 });

  // When component loads or initial images change, select the first one by default.
  useEffect(() => {
    if (initialImages.length > 0 && selectedImages.length === 0) {
      setSelectedImages([initialImages[0]]);
    }
  }, [initialImages, selectedImages.length]);

  const handleImageSelect = (imageToToggle: UploadedImage) => {
    setSelectedImages(prevSelected => {
      const isAlreadySelected = prevSelected.some(img => img.file.name === imageToToggle.file.name);

      if (isAlreadySelected) {
        // If it's the last selected image, do not allow deselection.
        if (prevSelected.length === 1) {
          return prevSelected;
        }
        // Otherwise, remove it from the selection.
        return prevSelected.filter(img => img.file.name !== imageToToggle.file.name);
      } else {
        // Add the new image to the selection.
        return [...prevSelected, imageToToggle];
      }
    });
  };
  
  const processImages = async (promptGenerator: (image: UploadedImage) => string, filesProvider: (image: UploadedImage) => File[]) => {
      if (selectedImages.length === 0) return;
      setIsLoading(true);
      setError(null);
      setEditedImageUrls(new Map());
      setProgress({ generated: 0, total: selectedImages.length });
      setTimingData({ startTime: Date.now(), avgTimePerImage: 0 });

      try {
        const generationPromises = selectedImages.map(image =>
          generateImageFromPrompt(promptGenerator(image), filesProvider(image)).then(url => {
            setEditedImageUrls(prevMap => new Map(prevMap).set(image.file.name, url));
            
            setProgress(prev => {
                const newGenerated = prev.generated + 1;
                const elapsed = Date.now() - timingData.startTime;
                const newAvg = elapsed / newGenerated;
                setTimingData(td => ({ ...td, avgTimePerImage: newAvg }));
                return { ...prev, generated: newGenerated };
            });
          })
        );

        await Promise.all(generationPromises);
      } catch (err) {
        setError('Failed to generate image(s). Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
  };


  const handleSuggestionClick = async (suggestionPrompt: string) => {
    const fullPrompt = `${suggestionPrompt}. Ensure the output is a high resolution photorealistic image that does not look AI-generated. Preserve the main subject's identity, face, and clothing from the original image if possible.`;
    await processImages(() => fullPrompt, (image) => [image.file]);
  };

  const handleMergeClick = async () => {
    if (selectedImages.length !== 2) {
      setError("Please select exactly two images to merge.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImageUrls(new Map()); // Clear previous edits
    setProgress({ generated: 0, total: 1 });
    setTimingData({ startTime: Date.now(), avgTimePerImage: 0 });


    try {
      const mergePrompt = "Merge these two photos into one natural couple portrait. Preserve faces and clothes exactly from the original images. The background should be a soft blurred forest with warm evening light. Output a high resolution photorealistic image that does not look AI-generated.";
      const filesToMerge = selectedImages.map(img => img.file);
      
      const mergedUrl = await generateImageFromPrompt(mergePrompt, filesToMerge);
      
      // Use the first selected image's name as the key for the result map
      setEditedImageUrls(new Map().set(selectedImages[0].file.name, mergedUrl));
      setProgress({ generated: 1, total: 1 });
      setTimingData(td => ({...td, avgTimePerImage: Date.now() - td.startTime}))

    } catch (err) {
      setError('Failed to merge images. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await handleSuggestionClick(prompt);
  };


  const suggestions = [
    { name: 'Cinematic', prompt: 'Make this photo cinematic with a warm tone, soft bokeh background, and dramatic lighting.' },
    { name: 'Romantic', prompt: 'Give this photo a romantic feel with soft, dreamy lighting, a gentle pink or golden hue, and a slightly blurred background.' },
    { name: 'Natural', prompt: 'Enhance this photo with natural lighting and vibrant colors, keeping it realistic and crisp.' },
    { name: 'Studio', prompt: 'Give this photo a professional studio look with clean, high-key lighting and a simple, unobtrusive background.' },
    { name: 'Vintage', prompt: 'Apply a vintage film look to this photo, with faded colors, subtle grain, and a slightly sepia or desaturated tone.' },
    { name: 'Anime-soft', prompt: 'Transform this photo with a soft, ethereal anime-inspired aesthetic. Use pastel colors, glowing highlights, and a smooth, gentle focus.' },
  ];

  const backgroundOperations = [
    { name: 'Blur', prompt: 'Apply a soft, natural blur to the background of this image. Keep the foreground subject perfectly in focus and preserved.' },
    { name: 'Replace', prompt: 'Replace the background of this image with a soft blurred forest with warm evening light. Match the lighting on the subject. The subject must be perfectly preserved.' },
    { name: 'Bokeh', prompt: 'Create a beautiful DSLR-like bokeh effect in the background of this image. The foreground subject must remain sharp and clear, with identity perfectly preserved.' },
  ];
  
  const advancedEdits = [
    { name: 'Pose Correction', prompt: "Analyze the subject in this photo and subtly adjust their pose to be more relaxed and natural. Reduce shoulder/neck tension. It is critical to preserve the person's face, identity, clothing, and realistic body proportions. Do not change the background. Output a high-resolution photorealistic image." },
    { name: 'Auto Enhance', prompt: "Enhance this photo's quality, increase its resolution, and sharpen the details to make it look like it was taken with a professional camera. Preserve all original content and identity." },
    // FIX: Added a missing colon after 'name' which was causing a major syntax error.
    { name: 'Magic Remove', prompt: "Identify and seamlessly remove the most prominent or distracting object from this photo using generative fill. The result should be realistic and natural." }
  ];

  const manualAdjustments = [
    { name: 'Exposure +', prompt: 'Slightly increase the exposure of this photo to make it brighter, while preserving highlights and shadows.' },
    { name: 'Contrast +', prompt: 'Slightly increase the contrast of this photo to make the colors pop, without losing detail.' },
    { name: 'Clarity +', prompt: 'Slightly increase the clarity and texture of this photo to make it sharper and more defined.' },
    { name: 'Saturation +', prompt: 'Slightly increase the color saturation of this photo to make the colors more vibrant and rich.' },
  ];


  const primaryImage = selectedImages[0];
  const editedPrimaryImageUrl = primaryImage ? editedImageUrls.get(primaryImage.file.name) : null;
  const percentageComplete = progress.total > 0 ? Math.round((progress.generated / progress.total) * 100) : 0;
  const remainingImages = progress.total - progress.generated;
  const estimatedSecondsRemaining = remainingImages > 0 && timingData.avgTimePerImage > 0 ? Math.round((remainingImages * timingData.avgTimePerImage) / 1000) : 0;


  return (
    <div className="p-4 pt-8 pb-28">
      <h1 className="text-3xl font-bold text-center mb-6">Photo Editor</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassmorphismCard>
          <h2 className="text-xl font-semibold mb-3">Before</h2>
          <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center">
            {primaryImage ? (
              <img src={primaryImage.previewUrl} alt="Original" className="max-h-full max-w-full object-contain rounded-lg" />
            ) : (
                <p className="text-gray-400">No image selected</p>
            )}
          </div>
        </GlassmorphismCard>
        
        <GlassmorphismCard>
          <h2 className="text-xl font-semibold mb-3">After</h2>
           <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center text-center p-4">
                <svg className="animate-spin h-8 w-8 text-[#1E90FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                 <p className="mt-4 text-lg font-semibold text-gray-200">Generating... {percentageComplete}%</p>
                 <p className="text-sm text-gray-400">({progress.generated}/{progress.total} images complete)</p>
                 {estimatedSecondsRemaining > 0 && <p className="text-xs text-gray-500 mt-1">~{estimatedSecondsRemaining} seconds remaining</p>}
              </div>
            ) : error ? (
              <p className="text-red-400 text-center p-4">{error}</p>
            ) : editedPrimaryImageUrl ? (
              <img src={editedPrimaryImageUrl} alt="Edited" className="max-h-full max-w-full object-contain rounded-lg" />
            ) : (
                <p className="text-gray-400">AI result will appear here</p>
            )}
          </div>
        </GlassmorphismCard>
      </div>

      {images.length > 0 && (
        <div className="my-6">
          <h3 className="text-lg font-semibold mb-2">Your Uploads ({selectedImages.length} selected)</h3>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {images.map((img, index) => {
              const isSelected = selectedImages.some(i => i.file.name === img.file.name);
              return (
                <div 
                  key={index}
                  onClick={() => handleImageSelect(img)}
                  className="relative flex-shrink-0 cursor-pointer"
                >
                  <img
                    src={img.previewUrl}
                    alt={`upload-${index}`}
                    className={`w-20 h-20 object-cover rounded-lg border-4 transition-all duration-200 ${isSelected ? 'border-[#1E90FF] scale-105 shadow-md shadow-[#1E90FF]/40' : 'border-transparent'}`}
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-[#1E90FF] rounded-full p-0.5 pointer-events-none shadow-lg">
                      {/* FIX: Added className and strokeWidth to style the CheckIcon correctly. */}
                      <CheckIcon className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <GlassmorphismCard className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Composition Edits</h3>
        <button 
          onClick={handleMergeClick} 
          disabled={isLoading || selectedImages.length !== 2} 
          className="w-full bg-white/10 hover:bg-white/20 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          Merge (select 2 images)
        </button>
      </GlassmorphismCard>

      <GlassmorphismCard className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Background Operations</h3>
        <div className="grid grid-cols-3 gap-3">
          {backgroundOperations.map((op) => (
            <button key={op.name} onClick={() => handleSuggestionClick(op.prompt)} disabled={isLoading || selectedImages.length === 0} className="bg-white/10 hover:bg-white/20 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
              {op.name}
            </button>
          ))}
        </div>
      </GlassmorphismCard>
      
      <GlassmorphismCard className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Manual Adjustments</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {manualAdjustments.map((adj) => (
            <button key={adj.name} onClick={() => handleSuggestionClick(adj.prompt)} disabled={isLoading || selectedImages.length === 0} className="bg-white/10 hover:bg-white/20 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
              {adj.name}
            </button>
          ))}
        </div>
      </GlassmorphismCard>

      <GlassmorphismCard className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Advanced Edits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {advancedEdits.map((edit) => (
            <button key={edit.name} onClick={() => handleSuggestionClick(edit.prompt)} disabled={isLoading || selectedImages.length === 0} className="bg-white/10 hover:bg-white/20 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
              {edit.name}
            </button>
          ))}
        </div>
      </GlassmorphismCard>
      
      <GlassmorphismCard className="mt-6">
        <h3 className="text-lg font-semibold mb-3">AI Style Suggestions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {suggestions.map((s) => (
            <button key={s.name} onClick={() => handleSuggestionClick(s.prompt)} disabled={isLoading || selectedImages.length === 0} className="bg-[#1E90FF]/80 hover:bg-[#1E90FF] disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
              {s.name}
            </button>
          ))}
        </div>
        <form onSubmit={handleCustomPromptSubmit} className="mt-4 flex gap-2">
            <input 
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Or type your own prompt..."
                className="flex-grow bg-white/10 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                disabled={isLoading || selectedImages.length === 0}
            />
            <button type="submit" disabled={isLoading || selectedImages.length === 0} className="bg-[#1E90FF] hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                Go
            </button>
        </form>
      </GlassmorphismCard>
    </div>
  );
};

export default EditorScreen;