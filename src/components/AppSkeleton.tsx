import { Loader2 } from 'lucide-react';

/**
 * Skeleton shell that mimics the app layout while auth initializes.
 * Shows immediately — no blank screen, no "Cargando..." text.
 */
export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </div>
        <nav className="flex-1 p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-full bg-muted rounded animate-pulse" />
          ))}
        </nav>
      </aside>

      {/* Mobile header skeleton */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center px-4">
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
      </div>

      {/* Main content skeleton */}
      <main className="flex-1 p-6 md:p-8 mt-14 md:mt-0">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      </main>
    </div>
  );
}
