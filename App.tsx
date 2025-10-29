
import React, { useState, useRef, useEffect } from 'react';
import type { Screen } from './types';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import CoachScreen from './screens/CoachScreen';
import ProfileScreen from './screens/ProfileScreen';
import LiveCoachScreen from './screens/LiveCoachScreen';

const EDITED_IMAGES_KEY = 'noxz_edited_images';

const App: React.FC = () => {
  const [activeScreen, _setActiveScreen] = useState<Screen>('home');
  const [editedImages, setEditedImages] = useState<string[]>([]);
  const previousScreenRef = useRef<Screen>('home');

  useEffect(() => {
    const savedImages = localStorage.getItem(EDITED_IMAGES_KEY);
    if (savedImages) {
      try {
        setEditedImages(JSON.parse(savedImages));
      } catch (e) {
        console.error("Failed to parse edited images from localStorage", e);
        localStorage.removeItem(EDITED_IMAGES_KEY);
      }
    }
  }, []);

  const addEditedImage = (imageUrl: string) => {
    setEditedImages(prevImages => {
      const newImages = [imageUrl, ...prevImages];
      try {
        localStorage.setItem(EDITED_IMAGES_KEY, JSON.stringify(newImages));
      } catch (e) {
        console.error("Failed to save edited images to localStorage", e);
        // Optionally, inform the user that storage is full
      }
      return newImages;
    });
  };

  const setActiveScreen = (screen: Screen) => {
    if (screen !== activeScreen) {
        previousScreenRef.current = activeScreen;
    }
    _setActiveScreen(screen);
  };
  
  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen editedImages={editedImages} setActiveScreen={setActiveScreen} />;
      case 'chat':
        return <ChatScreen setActiveScreen={setActiveScreen} addEditedImage={addEditedImage} />;
      case 'coach':
        return <CoachScreen setActiveScreen={setActiveScreen} />;
      case 'profile':
        return <ProfileScreen />;
      case 'liveCoach':
        const fromScreen = previousScreenRef.current === 'liveCoach' ? 'coach' : previousScreenRef.current;
        return <LiveCoachScreen setActiveScreen={setActiveScreen} fromScreen={fromScreen} />;
      default:
        return <HomeScreen editedImages={editedImages} setActiveScreen={setActiveScreen} />;
    }
  };

  return (
    <div className="bg-black min-h-screen text-white flex flex-col font-['Inter']">
      <main className="flex-grow pb-24">
        {renderScreen()}
      </main>
      {activeScreen !== 'liveCoach' && <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />}
    </div>
  );
};

export default App;