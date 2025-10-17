
import React, { useState } from 'react';
import type { Screen, UploadedImage } from './types';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import EditorScreen from './screens/EditorScreen';
import ChatScreen from './screens/ChatScreen';
import CoachScreen from './screens/CoachScreen';
import ProfileScreen from './screens/ProfileScreen';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [imagesToEdit, setImagesToEdit] = useState<UploadedImage[]>([]);

  const handleNavigateToEditor = (images: UploadedImage[]) => {
    setImagesToEdit(images);
    setActiveScreen('editor');
  };
  
  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen onUpload={handleNavigateToEditor} />;
      case 'editor':
        return <EditorScreen initialImages={imagesToEdit} />;
      case 'chat':
        return <ChatScreen />;
      case 'coach':
        return <CoachScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onUpload={handleNavigateToEditor} />;
    }
  };

  return (
    <div className="bg-black min-h-screen text-white flex flex-col font-['Inter']">
      <main className="flex-grow pb-24">
        {renderScreen()}
      </main>
      <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
    </div>
  );
};

export default App;
