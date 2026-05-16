import { Skeleton } from '../UI/Skeleton';
import { cn } from '../../lib/utils';

export const RecordDetailSkeleton = () => {
  return (
    <div className="flex flex-col w-full px-6 lg:px-12 pt-6 pb-20 space-y-8">

      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" className="w-10 h-10" />
          <Skeleton variant="rounded" className="w-12 h-12" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-48 h-8" />
            <Skeleton variant="text" className="w-32 h-4" />
          </div>
        </div>
        <Skeleton variant="rounded" className="w-32 h-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden">
            {/* Tabs Skeleton */}
            <div className="flex gap-1.5 px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <Skeleton variant="rounded" className="w-16 h-7" />
              <Skeleton variant="rounded" className="w-20 h-7" />
              <Skeleton variant="rounded" className="w-24 h-7" />
            </div>

            <div className="p-8">
              <div className="grid grid-cols-12 gap-6">
                {/* Mocking some fields */}
                <div className="col-span-6 space-y-2">
                  <Skeleton variant="text" className="w-20 h-3" />
                  <Skeleton variant="rounded" className="w-full h-12" />
                </div>
                <div className="col-span-6 space-y-2">
                  <Skeleton variant="text" className="w-24 h-3" />
                  <Skeleton variant="rounded" className="w-full h-12" />
                </div>
                <div className="col-span-12 space-y-2">
                  <Skeleton variant="text" className="w-28 h-3" />
                  <Skeleton variant="rounded" className="w-full h-32" />
                </div>
                <div className="col-span-4 space-y-2">
                  <Skeleton variant="text" className="w-16 h-3" />
                  <Skeleton variant="rounded" className="w-full h-12" />
                </div>
                <div className="col-span-4 space-y-2">
                  <Skeleton variant="text" className="w-20 h-3" />
                  <Skeleton variant="rounded" className="w-full h-12" />
                </div>
                <div className="col-span-4 space-y-2">
                  <Skeleton variant="text" className="w-16 h-3" />
                  <Skeleton variant="rounded" className="w-full h-12" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 space-y-8 shadow-sm">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="w-24 h-3" />
                <Skeleton variant="rounded" className="w-24 h-8" />
              </div>
              <Skeleton variant="rounded" className="w-full h-24" />
              
              <div className="space-y-3">
                <Skeleton variant="text" className="w-32 h-3" />
                <div className="space-y-2">
                  <Skeleton variant="rounded" className="w-full h-14" />
                  <Skeleton variant="rounded" className="w-full h-14" />
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Skeleton variant="text" className="w-20 h-3" />
                <div className="space-y-6 pl-10 relative">
                  <div className="absolute left-1 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
                  <div className="space-y-2">
                    <Skeleton variant="text" className="w-32 h-4" />
                    <Skeleton variant="text" className="w-24 h-3" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton variant="text" className="w-32 h-4" />
                    <Skeleton variant="text" className="w-24 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
