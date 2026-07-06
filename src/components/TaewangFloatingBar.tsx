import React, { useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * [태왕공인중개사 플랫폼 최종 준공: 우측 퀵 카테고리 내비게이션 & 실시간 소통 채널 융합 모듈]
 * * 디자인 시스템 절대 규칙:
 * 1) 명품 '딥 킹스 네이비(Deep Kings Navy, #0B2545)' 및 '민트 아쿠아(#64dfdf)' 액센트를 활용합니다.
 * 2) 본문 전체에 이모지 및 채팅 은어를 배제하고, 신뢰감을 극대화하는 비즈니스 국문 서체를 유지합니다.
 * 3) 반응형 레이아웃을 정밀 설계하여 모바일 하단바 및 메인 콘텐츠와 충돌이 없도록 방어합니다.
 */

interface FloatingBarProps {
  // 확장 전산 선로
}

const TaewangFloatingBar: React.FC<FloatingBarProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 모바일 환경인 경우, 클릭 후 쾌적한 시야를 위해 자동으로 아코디언을 닫습니다.
      if (window.innerWidth <= 1024) {
        setIsOpen(false);
      }
    }
  };

  const navItems = [
    { id: 'vr-showcase-section', label: '360° VR사진', icon: 'fa-rotate' },
    { id: 'oneroom-section', label: '원룸 추천', icon: 'fa-house-user' },
    { id: 'mitu-section', label: '미투 추천', icon: 'fa-door-open' },
    { id: 'tworoom-section', label: '투룸/쓰리룸', icon: 'fa-house-chimney-window' },
    { id: 'officetel-section', label: '오피스텔', icon: 'fa-building' },
    { id: 'apartment-section', label: '아파트 특선', icon: 'fa-city' },
    { id: 'villa-section', label: '빌라', icon: 'fa-home' },
    { id: 'commercial-section', label: '상가/사무실', icon: 'fa-store' },
    { id: 'oneroom-sale-section', label: '원룸매매', icon: 'fa-building-circle-check' },
    { id: 'youtube-section', label: '유튜브', icon: 'fa-youtube' },
    { id: 'navertv-section', label: '네이버TV', icon: 'fa-tv' },
  ];

  return ReactDOM.createPortal(
    <div className="taewang-floating-viewport-root select-none">
      
      {/* 1. 빠른 이동 카테고리 패널 */}
      <div className={`taewang-quick-nav-panel ${isOpen ? 'mobile-visible' : ''}`}>
        <div className="taewang-quick-header">
          <i className="fa-solid fa-compass taewang-compass-spin"></i>
          <span>빠른 카테고리</span>
        </div>
        
        <div className="taewang-quick-body">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleScrollTo(item.id)}
              className="taewang-quick-item"
              title={`${item.label} 바로가기`}
            >
              <span className="taewang-quick-item-icon">
                <i className={`fa-solid ${item.icon}`}></i>
              </span>
              <span className="taewang-quick-item-text">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. 모바일/태블릿용 빠른이동 토글 버튼 (데스크톱에서는 숨김) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`taewang-mobile-toggle-btn ${isOpen ? 'active' : ''}`}
        title="카테고리 이동 메뉴"
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark text-sm' : 'fa-compass text-base'}`}></i>
        <span className="taewang-toggle-label">{isOpen ? '닫기' : '이동'}</span>
      </button>

      {/* 3. 태왕공인중개사 1:1 카카오톡 직통 상담선 */}
      <a
        className="taewang-floating-btn-kakao"
        href="https://open.kakao.com/o/s9o8MkCi"
        target="_blank"
        rel="noopener noreferrer"
        title="카카오톡 실시간 상담"
      >
        <i className="fa-comment fa-solid" style={{ color: '#3A1D1D' }}></i>
      </a>

      {/* 4. 태왕공인중개사 대표번호 직통 전화선 */}
      <a
        className="taewang-floating-btn-phone"
        href="tel:010-7590-0111"
        title="소장님 전화 연결"
      >
        <i className="fa-phone fa-solid taewang-icon-ring" style={{ color: '#ffffff' }}></i>
      </a>

      {/* 글로벌 스타일 전산 배선 */}
      <style>{`
        /* 공통 애니메이션 선언선 */
        @keyframes taewangFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes taewangRingShake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
          20%, 40%, 60%, 80% { transform: rotate(10deg); }
        }
        @keyframes taewangSpinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes taewangFadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes taewangFadeInRight {
          from { opacity: 0; transform: translateX(15px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* 공통 클래스 설정 */
        .taewang-compass-spin {
          animation: taewangSpinSlow 12s linear infinite;
        }

        /* ---------------------------------------------------- */
        /* [1. 데스크톱 환경 (1025px 이상)] */
        /* ---------------------------------------------------- */
        @media (min-width: 1025px) {
          .taewang-floating-viewport-root {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            right: 24px;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            gap: 14px;
            align-items: flex-end;
          }

          /* 빠른 이동 패널 본체 */
          .taewang-quick-nav-panel {
            background: rgba(11, 37, 69, 0.94);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 24px;
            padding: 18px 14px;
            width: 168px;
            box-shadow: 0 24px 64px rgba(11, 37, 69, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            gap: 14px;
            animation: taewangFadeInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .taewang-quick-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #64dfdf;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            padding-bottom: 10px;
            border-b: 1px solid rgba(255, 255, 255, 0.1);
          }

          .taewang-quick-body {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .taewang-quick-item {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 12px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.9);
            font-size: 11px;
            font-weight: 800;
            text-align: left;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .taewang-quick-item-icon {
            color: #64dfdf;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
          }

          .taewang-quick-item:hover {
            background: #64dfdf;
            color: #0B2545;
            border-color: #64dfdf;
            transform: translateX(-4px);
            box-shadow: 0 4px 12px rgba(100, 223, 223, 0.25);
          }

          .taewang-quick-item:hover .taewang-quick-item-icon {
            color: #0B2545;
          }

          /* 모바일 토글 버튼 비활성화 */
          .taewang-mobile-toggle-btn {
            display: none !important;
          }

          /* 원형 링커 소통 버튼 */
          .taewang-floating-btn-kakao,
          .taewang-floating-btn-phone {
            width: 55px;
            height: 55px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
          }

          .taewang-floating-btn-kakao {
            background-color: #FEE500;
            animation: taewangFloat 4s ease-in-out infinite;
          }

          .taewang-floating-btn-phone {
            background-color: #0B2545;
            border: 2px solid #ffffff;
            animation: taewangFloat 4s ease-in-out infinite 0.5s;
          }

          .taewang-floating-btn-kakao i { font-size: 26px; }
          .taewang-floating-btn-phone i { font-size: 22px; }

          .taewang-floating-btn-kakao:hover,
          .taewang-floating-btn-phone:hover {
            animation-play-state: paused;
            transform: scale(1.1) !important;
            box-shadow: 0 12px 32px rgba(11, 37, 69, 0.35);
          }

          .taewang-floating-btn-phone:hover .taewang-icon-ring {
            animation: taewangRingShake 1s ease-in-out infinite;
          }
        }

        /* ---------------------------------------------------- */
        /* [2. 태블릿 및 모바일 환경 (1024px 이하)] */
        /* ---------------------------------------------------- */
        @media (max-width: 1024px) {
          .taewang-floating-viewport-root {
            position: fixed;
            bottom: 95px; /* 모바일 하단바 및 기타 버튼 간섭 절대 방지 완벽 이격 */
            right: 18px;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-end;
          }

          /* 모바일용 카테고리 패널: 아코디언 슬라이드 */
          .taewang-quick-nav-panel {
            display: none;
            background: rgba(11, 37, 69, 0.98);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 14px 12px;
            width: 148px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
            flex-direction: column;
            gap: 10px;
          }

          .taewang-quick-nav-panel.mobile-visible {
            display: flex;
            animation: taewangFadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .taewang-quick-header {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #64dfdf;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.1em;
            padding-bottom: 8px;
            border-b: 1px solid rgba(255, 255, 255, 0.10);
          }

          .taewang-quick-body {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .taewang-quick-item {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.9);
            font-size: 10.5px;
            font-weight: 800;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .taewang-quick-item-icon {
            color: #64dfdf;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 14px;
          }

          .taewang-quick-item:active {
            background: #64dfdf;
            color: #0B2545;
            border-color: #64dfdf;
          }

          .taewang-quick-item:active .taewang-quick-item-icon {
            color: #0B2545;
          }

          /* 모바일 토글 런처 버튼 */
          .taewang-mobile-toggle-btn {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 50px;
            background-color: #0B2545;
            color: #ffffff;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 6px 16px rgba(11, 37, 69, 0.3);
            cursor: pointer;
            gap: 2px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .taewang-mobile-toggle-btn.active {
            background-color: #64dfdf;
            color: #0B2545;
            border-color: #0B2545;
          }

          .taewang-toggle-label {
            font-size: 9px;
            font-weight: 900;
            letter-spacing: -0.02em;
          }

          /* 소통 채널 원형 버튼 */
          .taewang-floating-btn-kakao,
          .taewang-floating-btn-phone {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s ease;
          }

          .taewang-floating-btn-kakao {
            background-color: #FEE500;
          }

          .taewang-floating-btn-phone {
            background-color: #0B2545;
            border: 2px solid #ffffff;
          }

          .taewang-floating-btn-kakao i { font-size: 22px; }
          .taewang-floating-btn-phone i { font-size: 19px; }

          .taewang-floating-btn-kakao:active,
          .taewang-floating-btn-phone:active {
            transform: scale(0.95);
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default TaewangFloatingBar;
