import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, size = 20, className }) => {
  if (name === 'GoogleMaps') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
        <path d="M12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#FFFFFF" />
        <path d="M12 2c-3.87 0-7 3.13-7 7 0 .52.07 1.03.18 1.52L12 2z" fill="#4285F4" fillOpacity="0.2" />
      </svg>
    );
  }
  
  // @ts-ignore
  const Icon = LucideIcons[name] || LucideIcons.Puzzle;
  return <Icon size={size} className={className} />;
};
