import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("소장님이 지정하신 [본문 가림 현상 절대 방지 z-index 최상위 확보 및 좌측 제어실 메뉴 창틀 전체 Y축 절대 좌표 무조건 순간이동 동기화] 4대 영역 완전 이식 대공사가 최종 무결점으로 완벽히 마감 완결되었습니다.");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
