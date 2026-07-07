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
    const finalWidth = size || width;
    const finalHeight = size || height;

    return (
        <svg 
            {...(finalWidth !== undefined ? { width: finalWidth } : {})}
            {...(finalHeight !== undefined ? { height: finalHeight } : {})}
            viewBox="0 0 100 100" 
            className={`select-none shrink-0 ${className} hover:scale-105 active:scale-95 transition-all duration-300 !opacity-100 !block`} 
            style={{ display: 'block', opacity: 1 }}
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* 딥 네이비 단색 박스 배경 */}
            <rect 
                x="4" 
                y="4" 
                width="92" 
                height="92" 
                rx="24" 
                ry="24" 
                fill="#0B2545" 
            />

            {/* 굴뚝 달린 웅장한 흰색 집 모양 아이콘 */}
            <g transform="translate(0, 3) scale(1.05) translate(-2.5, -5)">
                {/* 굴뚝 */}
                <rect x="63" y="27" width="8" height="15" fill="#ffffff" rx="1.5" />
                
                {/* 지붕 및 몸체 */}
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

                {/* 360 텍스트 */}
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
                    style={{ letterSpacing: '-0.02em' }}
                >
                    360
                </text>
            </g>
        </svg>
    );
};

export default Naver360Icon;
