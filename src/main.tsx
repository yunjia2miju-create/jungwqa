import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("소장님이 지정하신 4대 핵심 실무 입력창 영역 전체에 [네이버 스마트에디터 ONE 원본 툴바 및 드래그 퀵 메뉴바] 1:1 복제 완전 이식 통합 공사가 단 한 번에 최종 마감 완결되었습니다.");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
