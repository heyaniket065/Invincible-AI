import React from 'react';
import type { Screen } from '../types';
import GlassmorphismCard from '../components/GlassmorphismCard';

interface HomeScreenProps {
  editedImages: string[];
  setActiveScreen: (screen: Screen) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ editedImages, setActiveScreen }) => {
  return (
    <div className="p-4 pt-16 h-full flex flex-col">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">noxz_.editz.7</h1>
        <p className="text-lg text-gray-300 mt-2">Your Edited Creations</p>
      </div>

      {editedImages.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
            <GlassmorphismCard className="w-full max-w-md p-8">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="mt-4 text-2xl font-semibold">Your Gallery is Empty</h2>
                <p className="text-gray-400 mt-2 mb-6">Start editing your photos using AI, and your creations will appear here.</p>
                <button 
                    onClick={() => setActiveScreen('chat')}
                    className="bg-[#1E90FF] hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg shadow-blue-500/30"
                >
                    Create Your First Edit
                </button>
            </GlassmorphismCard>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4">
            {editedImages.map((imageUrl, index) => (
                <GlassmorphismCard key={index} className="p-2 aspect-square">
                    <div className="w-full h-full bg-black/30 rounded-lg flex items-center justify-center">
                        <img 
                            src={imageUrl} 
                            alt={`Edited creation ${index + 1}`} 
                            className="max-w-full max-h-full object-contain rounded-md"
                        />
                    </div>
                </GlassmorphismCard>
            ))}
        </div>
      )}
    </div>
  );
};

export default HomeScreen;