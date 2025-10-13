import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center py-2 px-4 h-24',
        className
      )}
    >
      <div className="flex flex-col items-center">
        <span className="font-bold text-lg tracking-tight">Viña Negra</span>
        <span className="text-xs text-muted-foreground">Manager</span>
      </div>
    </div>
  );
}
