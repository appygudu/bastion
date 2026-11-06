export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skel rounded-sm ${className}`} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-28" />)}
      </div>
      <SkeletonBlock className="h-48" />
    </div>
  );
}
