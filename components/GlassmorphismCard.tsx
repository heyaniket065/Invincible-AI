
import React from 'react';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassmorphismCard;
