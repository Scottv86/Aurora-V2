import { useContext } from 'react';
import { PlatformContext } from '../context/PlatformContext';

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) throw new Error('usePlatform must be used within PlatformProvider');
  return context;
};
