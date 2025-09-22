import { cn } from '@/lib/utils';
import { ViñaNegraLogo } from '@/components/viña-negra-logo';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center py-2 px-4',
        className
      )}
    >
      <ViñaNegraLogo className="w-auto h-24" />
    </div>
  );
}
