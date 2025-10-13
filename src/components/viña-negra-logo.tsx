import { cn } from '@/lib/utils';

export function ViñaNegraLogo({ className }: { className?: string }) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-4", className)}>
            <span className="text-sm font-medium text-green-600 tracking-wider">AGROCOMERCIAL</span>
            <span className="text-2xl font-bold tracking-tight">VIÑA NEGRA</span>
        </div>
    );
}
