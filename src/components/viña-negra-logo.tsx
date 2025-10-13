import { cn } from '@/lib/utils';

export function ViñaNegraLogo({ className, agrocomercialColor = "text-green-600", avnColor = "text-foreground", vianaColor = "text-foreground" }: { className?: string, agrocomercialColor?: string, avnColor?: string, vianaColor?: string }) {
    return (
        <div className={cn("flex flex-col items-center justify-center", className)}>
            <div className="flex items-center">
                <svg width="100%" height="100%" viewBox="0 0 150 50" className="w-full h-auto">
                    <text x="50%" y="35" dominantBaseline="middle" textAnchor="middle" className={cn("text-5xl font-bold tracking-tight", avnColor)}>
                        AVN
                    </text>
                </svg>
            </div>
            <div className={cn("text-xs font-medium tracking-wider -mt-2", agrocomercialColor)}>
                AGROCOMERCIAL
            </div>
            <div className={cn("text-sm font-bold tracking-tight", vianaColor)}>
                VIÑA NEGRA
            </div>
        </div>
    );
}
