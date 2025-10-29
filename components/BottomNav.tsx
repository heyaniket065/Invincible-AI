import React from 'react';
import type { Screen } from '../types';
// FIX: Import icon components from the new Icons.tsx file.
import { HomeIcon, ChatBubbleOvalLeftEllipsisIcon, ShieldCheckIcon, UserIcon } from './icons/Icons';

interface BottomNavProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
  screen: Screen;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ screen, label, icon, isActive, onClick }) => {
  const activeClasses = 'text-[#1E90FF]';
  const inactiveClasses = 'text-gray-400';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen }) => {
  // FIX: Added className to each icon for consistent styling and layout.
  const navItems = [
    { screen: 'home' as Screen, label: 'Home', icon: <HomeIcon className="w-6 h-6 mb-1" /> },
    { screen: 'chat' as Screen, label: 'Chat', icon: <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6 mb-1" /> },
    { screen: 'coach' as Screen, label: 'Coach', icon: <ShieldCheckIcon className="w-6 h-6 mb-1" /> },
    { screen: 'profile' as Screen, label: 'Profile', icon: <UserIcon className="w-6 h-6 mb-1" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-black/30 backdrop-blur-lg border-t border-white/20 z-50">
      <div className="flex justify-around h-full max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.screen}
            screen={item.screen}
            label={item.label}
            icon={item.icon}
            isActive={activeScreen === item.screen}
            onClick={() => setActiveScreen(item.screen)}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;