'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { signInAnonymously } from 'firebase/auth';
import { useAuth } from '@/firebase';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    if (auth && !user && !isUserLoading) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
      });
    }
  }, [auth, user, isUserLoading]);

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 p-8">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
