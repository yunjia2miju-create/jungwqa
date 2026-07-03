import React from 'react';
import ReactDOM from 'react-dom';

/**
 * [태왕공인중개사 플랫폼 최종 준공: 부모 박스 완전 분리 및 유리창 직속 절대 고정 모듈]
 * * 전산망 마스터 절대 규칙:
 * 1) 본문 전체에 이모지 및 인터넷 채팅 은어 사용을 절대 금지합니다.
 * 2) 명품 '딥 킹스 네이비(Deep Kings Navy, #0B2545)' 디자인 시스템을 절대 사수합니다.
 * 3) 모든 문장은 문장부호(.,!?)가 끝나는 지점에서 반드시 1회 줄바꿈 처리합니다.
 */

interface FloatingBarProps {
  // 전산 확장성을 위한 인터페이스 선언선입니다.
}

const TaewangFloatingBar: React.FC<FloatingBarProps> = () => {
  // 국민은행 표준과 동일하게 본문 상자의 스크롤 간섭을 100% 무력화하기 위해 React Portal을 가동합니다.
  // document.body 직속 최상위 2층 레이어로 배선을 완전히 빼내어 매립하는 공정입니다.
  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: '60vh',
        right: '20px',
        zIndex: 9999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'auto',
      }}
      className="taewang-floating-viewport-root"
    >
      {/* 1번 버튼: 태왕공인중개사 1:1 카카오톡 직통 상담선 */}
      <a
        className="taewang-floating-btn-kakao"
        href="https://open.kakao.com/o/sdCbUkCi"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: '55px',
          height: '55px',
          backgroundColor: '#FEE500', // 카카오 옐로우 액센트
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          textDecoration: 'none',
          transition: 'transform 0.2s ease',
        }}
        title="카카오톡 상담"
      >
        <i className="fa-comment fa-solid" style={{ color: '#3A1D1D', fontSize: '26px' }}></i>
      </a>

      {/* 2번 버튼: 태왕공인중개사 대표번호 직통 전화선 */}
      <a
        className="taewang-floating-btn-phone"
        href="tel:010-7590-0111"
        style={{
          width: '55px',
          height: '55px',
          backgroundColor: '#0B2545', // 명품 딥 킹스 네이비 사수
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          textDecoration: 'none',
          transition: 'transform 0.2s ease',
          border: '2px solid #ffffff'
        }}
        title="전화 연결"
      >
        <i className="fa-phone fa-solid taewang-icon-ring" style={{ color: '#ffffff', fontSize: '24px' }}></i>
      </a>

      {/* 3대 기기 해상도별 상단 기준 하강 좌표 제어용 반응형 미디어 스타일 선로입니다. */}
      <style>{`
        /* 애니메이션 선언 */
        @keyframes taewangFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes taewangRingShake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
          20%, 40%, 60%, 80% { transform: rotate(10deg); }
        }
        
        /* 버튼 개별 애니메이션 매핑 (딜레이로 교차 이동) */
        .taewang-floating-btn-kakao {
          animation: taewangFloat 3s ease-in-out infinite;
        }
        .taewang-floating-btn-phone {
          animation: taewangFloat 3s ease-in-out infinite 0.4s;
        }
        
        /* 호버 시 멈춤 및 확대 효과 */
        .taewang-floating-btn-kakao:hover,
        .taewang-floating-btn-phone:hover {
          animation-play-state: paused;
          transform: scale(1.1) !important;
        }
        
        /* 전화기 아이콘 따르릉 애니메이션 */
        .taewang-floating-btn-phone:hover .taewang-icon-ring {
          animation: taewangRingShake 1s ease-in-out infinite;
        }
        
        /* 스마트폰 모바일 환경: 천장에서 60% 내려온 황금 저공비행 고도 설정 */
        @media (max-width: 768px) {
          .taewang-floating-viewport-root {
            top: 60vh !important;
            right: 15px !important;
          }
          .taewang-floating-viewport-root a {
            width: 45px !important;
            height: 45px !important;
          }
          .taewang-floating-viewport-root i {
            font-size: 20px !important;
          }
        }
        
        /* 아이패드 및 태블릿 환경: 화면 정중앙 우측 벽면 자석 고정 */
        @media (min-width: 769px) and (max-width: 1024px) {
          .taewang-floating-viewport-root {
            top: 50vh !important;
          }
        }
        
        /* 데스크톱 PC 환경: 대기업 퀵바 표준 상단 40% 지점 절대 고정 */
        @media (min-width: 1025px) {
          .taewang-floating-viewport-root {
            top: 40vh !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default TaewangFloatingBar;
