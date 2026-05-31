import React from 'react';

interface ModalsProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
    phoneModalOpen: boolean;
    setPhoneModalOpen: (val: boolean) => void;
    phoneModalData: { mobile: string; owner: string } | null;
}

export function Modals({
    showToast,
    phoneModalOpen,
    setPhoneModalOpen,
    phoneModalData
}: ModalsProps) {
    if (!phoneModalOpen || !phoneModalData) return null;

    return (
        <div id="phone-modal-popup" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5 transform transition-all text-center">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <i className="fa-solid fa-phone-volume text-emerald-600 animate-pulse"></i>
                        <span>연락처 상담 채널 선택</span>
                    </h3>
                    <button 
                        onClick={() => setPhoneModalOpen(false)} 
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
                        href={`tel:${phoneModalData.mobile}`}
                        onClick={() => {
                            showToast("상담 전용 번호 통화를 안내합니다.", "success");
                            setPhoneModalOpen(false);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all block text-center"
                    >
                        <i className="fa-solid fa-mobile-screen"></i>
                        <span>상담 모바일 ({phoneModalData.mobile}) 연결</span>
                    </a>

                    {phoneModalData.owner && (
                        <div className="pt-2 border-t border-dashed border-slate-100">
                            <span className="block text-[10px] text-amber-600 font-extrabold uppercase tracking-wider mb-2">[관리자 전용] 임대인 공급자 연락망</span>
                            <a 
                                href={`tel:${phoneModalData.owner}`}
                                onClick={() => {
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
                        onClick={() => setPhoneModalOpen(false)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
