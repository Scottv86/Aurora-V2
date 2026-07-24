import { AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { AIAssistant } from '../AI/AIAssistant';
import { ChatDrawer } from '../AI/ChatDrawer';
import { AppLauncher } from './AppLauncher';
import { NotificationsDrawer } from './NotificationsDrawer';
import { RecyclingBinDrawer } from './RecyclingBinDrawer';

export const GlobalDrawers = () => {
  const { 
    isAIAssistantOpen, 
    isChatOpen, 
    isAppLauncherOpen, 
    isNotificationsOpen,
    isRecyclingBinOpen
  } = usePlatform();

  return (
    <AnimatePresence mode="wait">
      {isAIAssistantOpen && <AIAssistant key="ai-assistant" />}
      {isChatOpen && <ChatDrawer key="chat-drawer" />}
      {isAppLauncherOpen && <AppLauncher key="app-launcher" />}
      {isNotificationsOpen && <NotificationsDrawer key="notifications-drawer" />}
      {isRecyclingBinOpen && <RecyclingBinDrawer key="recycling-bin-drawer" />}
    </AnimatePresence>
  );
};
