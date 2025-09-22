import { cn } from '@/lib/utils';

export function ViñaNegraLogo({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            className={cn(className)}
            aria-label="Agrocomercial Viña Negra Logo"
        >
            <defs>
                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#B38B59', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#F0E6D2', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#B38B59', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="grape-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#4A4A4A', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#1E1E1E', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            <style>
                {`
                    .avn-text { font-family: "Times New Roman", Times, serif; font-weight: bold; fill: #002117; }
                    .agro-text { font-family: "Trajan Pro", serif; fill: #B38B59; font-size: 14px; letter-spacing: 1px; }
                    .vina-text { font-family: "Times New Roman", Times, serif; font-weight: bold; fill: #000000; font-size: 18px; letter-spacing: 0.5px; }
                `}
            </style>
            
            {/* Main AVN Letters */}
            <text x="35" y="100" fontSize="80" className="avn-text">A</text>
            <text x="125" y="100" fontSize="80" className="avn-text">N</text>

            {/* Field/Swirl */}
            <path
                d="M 20,105 Q 100,125 180,105 C 170,115 100,130 30,115 C 40,110 90,120 170,110"
                fill="url(#gold-gradient)"
                stroke="#A77E4D"
                strokeWidth="0.5"
            />
             <path
                d="M 25,110 Q 100,130 175,110 C 165,120 100,135 35,120 C 45,115 95,125 165,115"
                fill="url(#gold-gradient)"
                stroke="#A77E4D"
                strokeWidth="0.5"
                opacity="0.7"
            />
            
            {/* V shape with fill */}
            <path d="M 80 40 L 100 100 L 120 40 Z" fill="#002117" />
            
            {/* Grapes */}
            <g transform="translate(100, 65) scale(0.7)">
                {/* top row */}
                <circle cx="0" cy="-10" r="4" fill="url(#grape-gradient)" />
                {/* middle row */}
                <circle cx="-5" cy="-2" r="4.5" fill="url(#grape-gradient)" />
                <circle cx="5" cy="-2" r="4.5" fill="url(#grape-gradient)" />
                {/* third row */}
                <circle cx="-10" cy="6" r="4.5" fill="url(#grape-gradient)" />
                <circle cx="0" cy="6" r="5" fill="url(#grape-gradient)" />
                <circle cx="10" cy="6" r="4.5" fill="url(#grape-gradient)" />
                {/* bottom row */}
                <circle cx="-5" cy="14" r="4.5" fill="url(#grape-gradient)" />
                <circle cx="5" cy="14" r="4.5" fill="url(#grape-gradient)" />
                 {/* Vine leaf */}
                <path d="M 5 -18 C 15 -25, 20 -15, 10 -10 C 15 -12, 12 -18, 5 -18 Z" fill="#3D3D3D" />
                <path d="M 5 -18 C 0 -22, 5 -25, 8 -20" stroke="#3D3D3D" fill="none" strokeWidth="0.8"/>
            </g>

            {/* Text below */}
            <text x="100" y="140" textAnchor="middle" className="agro-text">AGROCOMERCIAL</text>
            <text x="100" y="165" textAnchor="middle" className="vina-text">VIÑA NEGRA</text>
        </svg>
    );
}
