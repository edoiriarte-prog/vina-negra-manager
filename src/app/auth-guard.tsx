'use client';

import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { signInAnonymously } from 'firebase/auth';
import { useAuth } from '@/firebase';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    // Only attempt to sign in if the auth service is ready and there's no user.
    if (auth && !user && !isUserLoading) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
      });
    }
  }, [auth, user, isUserLoading]);

  // CRITICAL FIX: Also check if the 'auth' instance is ready.
  // If 'auth' is null, it means Firebase is not yet initialized. We must wait.
  if (isUserLoading || !user || !auth) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="space-y-4 p-8 w-full max-w-md">
            <Skeleton className="h-12 w-3/4 bg-slate-800" />
            <Skeleton className="h-8 w-full bg-slate-800" />
            <Skeleton className="h-8 w-full bg-slate-800" />
            <Skeleton className="h-8 w-5/6 bg-slate-800" />
        </div>
      </div>
    );
  }

  // Only render children when we are sure there is an authenticated user.
  return <>{children}</>;
}
