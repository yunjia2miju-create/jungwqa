import React from 'react';

interface NaverVrBadgeProps {
  className?: string;
}

export const NaverVrBadge: React.FC<NaverVrBadgeProps> = ({ className = "" }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* 네이버 부동산 스타일 360 VR 오버레이 아이콘 */}
      <div className="relative w-16 h-12 sm:w-20 sm:h-14 flex items-center justify-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
        <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* 360도 회전 타원 궤도 선 */}
          <ellipse cx="50" cy="38" rx="42" ry="18" stroke="white" strokeWidth="6" strokeDasharray="60 20" opacity="0.95" />
          
          {/* 좌우 회전 화살표 머리 */}
          <path d="M 12 30 L 6 38 L 18 39 Z" fill="white" />
          <path d="M 88 46 L 94 38 L 82 37 Z" fill="white" />
          
          {/* 중앙 VR Bold 텍스트 */}
          <text 
            x="50" 
            y="42" 
            fill="white" 
            fontSize="28" 
            fontWeight="900" 
            fontFamily="'Inter', 'Noto Sans KR', sans-serif" 
            textAnchor="middle" 
            dominantBaseline="middle"
            style={{ letterSpacing: '0.05em' }}
          >
            VR
          </text>
        </svg>
      </div>
    </div>
  );
};

export default NaverVrBadge;
