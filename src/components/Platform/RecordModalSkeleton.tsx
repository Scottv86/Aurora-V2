import { Skeleton } from '../UI/Skeleton';

export const RecordModalSkeleton = () => {
  return (
    <div className="w-full space-y-12">

      <div className="grid grid-cols-12 gap-x-4 gap-y-6 w-full">
        {/* Mocking fields for modal */}
        <div className="col-span-6 space-y-2">
          <Skeleton variant="text" className="w-20 h-3" />
          <Skeleton variant="rounded" className="w-full h-11" />
        </div>
        <div className="col-span-6 space-y-2">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="rounded" className="w-full h-11" />
        </div>
        <div className="col-span-12 space-y-2">
          <Skeleton variant="text" className="w-28 h-3" />
          <Skeleton variant="rounded" className="w-full h-11" />
        </div>
        <div className="col-span-12 space-y-2">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="rounded" className="w-full h-24" />
        </div>
        <div className="col-span-6 space-y-2">
          <Skeleton variant="text" className="w-20 h-3" />
          <Skeleton variant="rounded" className="w-full h-11" />
        </div>
        <div className="col-span-6 space-y-2">
          <Skeleton variant="text" className="w-16 h-3" />
          <Skeleton variant="rounded" className="w-full h-11" />
        </div>
      </div>
    </div>
  );
};
