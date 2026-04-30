import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, size = 20, className }) => {
  // @ts-ignore
  const Icon = LucideIcons[name] || LucideIcons.Puzzle;
  return <Icon size={size} className={className} />;
};
