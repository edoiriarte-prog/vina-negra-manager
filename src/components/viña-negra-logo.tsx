
import { cn } from '@/lib/utils';

// You can replace this with your own logo
export function ViñaNegraLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <span className="font-bold text-xl tracking-tight">Viña Negra</span>
      <span className="text-sm text-muted-foreground">Manager</span>
    </div>
  );
}
