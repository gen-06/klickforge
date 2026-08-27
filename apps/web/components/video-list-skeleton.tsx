export function VideoListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />

      {[1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex gap-2">
                <div className="h-4 w-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
            <div className="h-7 w-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <div className="space-y-1.5 border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-8 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-7 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="aspect-[9/16] animate-pulse bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex items-center justify-between border-t border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="h-4 w-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex gap-1">
                      <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                      <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
