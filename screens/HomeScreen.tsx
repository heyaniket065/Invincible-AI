import React, { useRef } from 'react';
import type { UploadedImage } from '../types';
import GlassmorphismCard from '../components/GlassmorphismCard';

interface HomeScreenProps {
  onUpload: (images: UploadedImage[]) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      // Fix: Explicitly type `file` as `File` to resolve an issue where it was being inferred as 'unknown'.
      const uploadedImages = files.slice(0, 10).map((file: File) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      onUpload(uploadedImages);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 pt-16 h-full flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">noxz_.editz.7</h1>
        <p className="text-lg text-gray-300 mt-2">AI Photo Editor & Life Assistant</p>
      </div>

      <GlassmorphismCard className="w-full max-w-md text-center cursor-pointer" onClick={handleUploadClick}>
        <div className="p-8 border-2 border-dashed border-white/20 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-4 text-lg font-semibold">Upload up to 10 photos</p>
          <p className="text-sm text-gray-400">Tap here to start editing</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
          />
        </div>
      </GlassmorphismCard>
      
      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
            <GlassmorphismCard className="text-center">
                <h3 className="font-semibold">Auto Enhance</h3>
                <p className="text-xs text-gray-400">One-tap magic</p>
            </GlassmorphismCard>
            <GlassmorphismCard className="text-center">
                <h3 className="font-semibold">Merge Photos</h3>
                <p className="text-xs text-gray-400">Combine images</p>
            </GlassmorphismCard>
             <GlassmorphismCard className="text-center">
                <h3 className="font-semibold">Pose Correction</h3>
                <p className="text-xs text-gray-400">AI-powered fix</p>
            </GlassmorphismCard>
             <GlassmorphismCard className="text-center">
                <h3 className="font-semibold">Create Collage</h3>
                <p className="text-xs text-gray-400">Tell a story</p>
            </GlassmorphismCard>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
