import { cn } from '@/lib/utils';

export function ViñaNegraLogo({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 150"
            className={cn(className)}
            aria-label="Agrocomercial Viña Negra Logo"
        >
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@500&display=swap');
                    .avn-letter { font-family: 'Cinzel', serif; font-weight: 700; fill: #2D3748; }
                    .agro-text { font-family: 'Montserrat', sans-serif; font-weight: 500; fill: #4CAF50; }
                    .vina-text { font-family: 'Cinzel', serif; font-weight: 700; fill: #1A202C; }
                `}
            </style>
            
            <g transform="translate(0, -10)">
                {/* A and N letters */}
                <text x="25" y="60" fontSize="50" className="avn-letter" textAnchor="middle">A</text>
                <text x="175" y="60" fontSize="50" className="avn-letter" textAnchor="middle">N</text>

                {/* Leaf for V */}
                <g transform="translate(100, 35) scale(1.2)">
                    <path d="M 0 -15 C -20 10, 0 15, 0 15 C 0 15, 20 10, 0 -15 Z" fill="#66BB6A"/>
                    <path d="M 0 -15 C -10 0, -5 5, 0 15" stroke="#4CAF50" fill="none" strokeWidth="1.5" strokeLinecap="round"/>
                </g>

                {/* Field */}
                <g transform="translate(100, 65)">
                    <path d="M -70 0 C -40 10, 40 10, 70 0 C 60 5, -60 5, -70 0 Z" fill="#66BB6A" />
                    <path d="M -65 2 C -40 12, 40 12, 65 2" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.7" />
                    <path d="M -60 4 C -40 14, 40 14, 60 4" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.6" />
                    <path d="M -55 6 C -40 16, 40 16, 55 6" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.5" />
                </g>

                {/* Text below */}
                <text x="100" y="100" fontSize="14" className="agro-text" textAnchor="middle" letterSpacing="1">AGROCOMERCIAL</text>
                <text x="100" y="125" fontSize="22" className="vina-text" textAnchor="middle">VIÑA NEGRA</text>
            </g>
        </svg>
    );
}
