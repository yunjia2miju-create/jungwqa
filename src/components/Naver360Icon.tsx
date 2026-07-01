import React from 'react';

interface Naver360IconProps {
    className?: string;
    size?: number;
    width?: number;
    height?: number;
}

export const Naver360Icon: React.FC<Naver360IconProps> = ({ 
    className = "", 
    size,
    width,
    height 
}) => {
    // Proportional scaling for the luxury 360-engraved house shape (perfect square aspect ratio 1:1)
    const baseSize = size || height || width || 64;

    return (
        <svg 
            width={baseSize} 
            height={baseSize} 
            viewBox="0 0 100 100" 
            className={`select-none shrink-0 ${className} hover:scale-105 active:scale-95 transition-all duration-300`} 
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Defs containing rich gradients and smooth shadow filters */}
            <defs>
                {/* Under Director's request: Deep Kings Navy solid color */}
                <linearGradient id="luxury-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0B2545" />
                    <stop offset="100%" stopColor="#0B2545" />
                </linearGradient>
                <filter id="premium-house-shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.28" />
                </filter>
            </defs>

            {/* Base Squircle: Exactly rounded corner square background reflecting '화면 캡처 2026-06-20 204035.jpg' */}
            <rect 
                x="4" 
                y="4" 
                width="92" 
                height="92" 
                rx="24" 
                ry="24" 
                fill="url(#luxury-emerald-grad)" 
                filter="url(#premium-house-shadow)" 
            />

            {/* House Shape Group: Cute, adorable house symbol with a neat chimney on the right sloped roof */}
            <g>
                {/* Chimney placed on the right side of the roof intersecting perfectly */}
                <rect x="63" y="27" width="8" height="15" fill="#ffffff" rx="1.5" />
                
                {/* Unified path for roof overhang and main house body */}
                <path 
                    d="M 50,18 
                       L 16,46 
                       L 22,46 
                       L 22,78 
                       A 3 3 0 0 0 25,81 
                       L 75,81 
                       A 3 3 0 0 0 78,78 
                       L 78,46 
                       L 84,46 
                       Z" 
                    fill="#ffffff"
                />
            </g>

            {/* Highly legible and crispy white "360" text engraved right in the core center of the house */}
            <text 
                x="50" 
                y="63" 
                fill="#0B2545" 
                fontSize="18.5" 
                fontWeight="900" 
                fontFamily="'Inter', 'Space Grotesk', 'JetBrains Mono', 'Noto Sans KR', -apple-system, sans-serif" 
                textAnchor="middle" 
                dominantBaseline="middle"
                className="select-none font-black"
                style={{ letterSpacing: '-0.02em', filter: 'drop-shadow(0px 2px 2.5px rgba(0, 0, 0, 0.45))' }}
            >
                360
            </text>
        </svg>
    );
};

export default Naver360Icon;
