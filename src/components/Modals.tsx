import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store';

interface ModalsProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
    phoneModalOpen: boolean;
    setPhoneModalOpen: (val: boolean) => void;
    phoneModalData: { mobile: string; owner?: string; x?: number; y?: number } | null;
}

export function Modals({
    showToast,
    phoneModalOpen,
    setPhoneModalOpen,
    phoneModalData
}: ModalsProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const { isAdminLoggedIn } = useAppStore();

    // 외부 클릭 시 모달 닫기
    useEffect(() => {
        if (!phoneModalOpen) return;
        
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setPhoneModalOpen(false);
            }
        };

        // mousedown 이벤트를 사용하여 클릭 감지
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [phoneModalOpen, setPhoneModalOpen]);

    if (!phoneModalOpen || !phoneModalData) return null;

    // 모달 위치 계산 (화면 밖으로 나가지 않도록 조정)
    const modalWidth = 320;
    const modalHeight = phoneModalData.owner ? 220 : 160;
    
    let left = (phoneModalData.x ?? 0) - 320;
    if (left < 10) left = 10;
    if (left + modalWidth > window.innerWidth) left = window.innerWidth - modalWidth - 10;
    
    let top = (phoneModalData.y ?? 0);
    if (top + modalHeight > window.innerHeight) {
        top = window.innerHeight - modalHeight - 10;
    }
    if (top < 10) top = 10;

    const modalContent = (
        <div 
            ref={modalRef}
            id="phone-modal-popup" 
            className="bg-white rounded-3xl w-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200 p-6 space-y-5 animate-fadeIn" 
            style={{ 
                position: 'fixed', 
                zIndex: 99999999, 
                top: `${top}px`, 
                left: `${left}px`,
                maxWidth: `${modalWidth}px`
            }}
        >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-phone-volume text-emerald-600 animate-pulse"></i>
                    <span>연락처 상담 채널 선택</span>
                </h3>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setPhoneModalOpen(false);
                    }} 
                    className="text-slate-400 hover:text-slate-650"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                상담 전용 모바일 번호 또는 임대인 직통 번호로 즉각 연결을 시도할 수 있습니다.
            </p>
            <div className="space-y-3 font-semibold">
                <a 
                    href="tel:010-7590-0111"
                    onClick={(e) => {
                        e.stopPropagation();
                        showToast("상담 전용 번호 통화를 안내합니다.", "success");
                        setPhoneModalOpen(false);
                    }}
                    className="w-full bg-[#0B2545] hover:bg-[#113866] text-white py-3.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all block text-center"
                >
                    <i className="fa-solid fa-mobile-screen"></i>
                    <span>상담 모바일 (010-7590-0111) 연결</span>
                </a>
                {isAdminLoggedIn && phoneModalData.owner && (
                    <div className="pt-2 border-t border-dashed border-slate-100">
                        <span className="block text-[10px] text-amber-600 font-extrabold uppercase tracking-wider mb-2">[관리자 전용] 임대인 공급자 연락망</span>
                        <a 
                            href={`tel:${phoneModalData.owner}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                showToast("임대인 연동 통화를 우회 개통 완료했습니다.", "success");
                                setPhoneModalOpen(false);
                            }}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all block text-center"
                        >
                            <i className="fa-solid fa-key"></i>
                            <span>임대인 ({phoneModalData.owner}) 직통 걸기</span>
                        </a>
                    </div>
                )}
            </div>
            <div className="pt-1">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setPhoneModalOpen(false);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                    닫기
                </button>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
