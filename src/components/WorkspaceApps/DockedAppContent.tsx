import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import {
  CompactNotesView,
  CompactRemindersView,
  CompactInboxView,
  CompactCalendarView,
  CompactCalculatorView,
} from './CompactDockedViews';
import { CompactAIAssistantView } from './CompactAIAssistantView';
import { CompactDirectoryRolodexView } from './CompactDirectoryRolodexView';

const FeedApp = lazy(() => import('../../pages/Apps/FeedApp').then((m) => ({ default: m.FeedApp })));
const DocsApp = lazy(() => import('../../pages/Apps/DocsApp').then((m) => ({ default: m.DocsApp })));
const DriveApp = lazy(() => import('../../pages/Apps/DriveApp').then((m) => ({ default: m.DriveApp })));
const PointOfSalePage = lazy(() =>
  import('../../pages/Platform/PointOfSalePage').then((m) => ({ default: m.PointOfSalePage }))
);
const TriageInboxPage = lazy(() =>
  import('../../pages/Triage/TriageInboxPage').then((m) => ({ default: m.TriageInboxPage }))
);
const PeopleOrgDirectory = lazy(() =>
  import('../../pages/Platform/PeopleOrgDirectory').then((m) => ({ default: m.PeopleOrgDirectory }))
);
const QueryExplorer = lazy(() =>
  import('../../pages/Settings/QueryExplorer').then((m) => ({ default: m.QueryExplorer }))
);
const ApprovalsHubPage = lazy(() => import('../../pages/Approvals/ApprovalsHubPage'));
const SearchesDirectoryPage = lazy(() =>
  import('../../pages/Search/SearchesDirectoryPage').then((m) => ({ default: m.SearchesDirectoryPage }))
);

const DockedFallback = () => (
  <div className="h-full flex items-center justify-center text-zinc-400 p-6">
    <Loader2 className="w-5 h-5 animate-spin" />
  </div>
);

interface DockedAppContentProps {
  appId: string;
  compactLevel: 'side' | 'bottom';
}

export const DockedAppContent: React.FC<DockedAppContentProps> = ({ appId, compactLevel }) => {
  switch (appId) {
    case 'notes':
      return <CompactNotesView compactLevel={compactLevel} />;
    case 'reminders':
      return <CompactRemindersView compactLevel={compactLevel} />;
    case 'inbox':
      return <CompactInboxView compactLevel={compactLevel} />;
    case 'calendar':
      return <CompactCalendarView compactLevel={compactLevel} />;
    case 'calculator':
      return <CompactCalculatorView compactLevel={compactLevel} />;
    case 'ai-assistant':
      return <CompactAIAssistantView compactLevel={compactLevel} />;
    case 'directory':
      return <CompactDirectoryRolodexView compactLevel={compactLevel} />;
    default:
      break;
  }

  return (
    <div className="aurora-docked-surface h-full w-full overflow-auto bg-white dark:bg-zinc-950">
      <Suspense fallback={<DockedFallback />}>
        {appId === 'feed' && <FeedApp />}
        {appId === 'docs' && <DocsApp />}
        {appId === 'drive' && <DriveApp />}
        {appId === 'pos' && <PointOfSalePage />}
        {appId === 'triage' && <TriageInboxPage />}
        {appId === 'directory' && <PeopleOrgDirectory />}
        {appId === 'query' && <QueryExplorer embedded />}
        {appId === 'approvals' && <ApprovalsHubPage />}
        {appId === 'searches' && <SearchesDirectoryPage />}
      </Suspense>
    </div>
  );
};
