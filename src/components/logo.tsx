import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center py-2',
        className
      )}
    >
      <Image 
        src="/logo.png" 
        alt="Agrocomercial Viña Negra" 
        width={160} 
        height={100}
        priority
      />
    </div>
  );
}
