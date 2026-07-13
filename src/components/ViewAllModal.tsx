import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useAppStore } from '../store';
import { getPostNumber } from '../data';


interface ViewAllModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryTitle: string;
    items: any[];
    openPhoneSelectModal: (e: React.MouseEvent, mobilePhone: string, ownerPhone?: string) => void;
    setSelectedPostId: (id: string) => void;
    setActiveSection: (sec: 'main' | 'detail' | 'admin-login' | 'admin-dashboard' | 'admin-write') => void;
    getBlogUrl: (p: any, defaultUrl: string) => string;
    isAdminLoggedIn: boolean;
}

export const ViewAllModal: React.FC<ViewAllModalProps> = ({
    isOpen,
    onClose,
    categoryTitle,
    items,
    openPhoneSelectModal,
    setSelectedPostId,
    setActiveSection,
    getBlogUrl,
    isAdminLoggedIn
}) => {
    const [displayCount, setDisplayCount] = useState(12);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Reset display count when modal opens or items change
    useEffect(() => {
        if (isOpen) {
            setDisplayCount(12);
        }
    }, [isOpen, items]);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setDisplayCount(prev => Math.min(prev + 12, items.length));
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [items.length]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-10">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                                    <span className="text-[#0B2545]">{categoryTitle}</span> 전체 매물
                                    <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        총 {items.length}건
                                    </span>
                                </h2>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Body with Infinite Scroll */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                        <X className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="font-bold text-lg">해당 카테고리에 등록된 매물이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {items.slice(0, displayCount).map((item, idx) => {
                                        const isPlaceholder = item.id.startsWith('placeholder-');
                                        const isVideoCategory = item.category === '유튜브' || item.category === '네이버TV';
                                        const videoUrl = item.video || item.naverTv || item.naverBlogUrl || item.blogUrl || (String(item.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);
                                        const customBlogUrl = item.naverBlogUrl || item.blogUrl;

                                        return (
                                            <div 
                                                key={item.id || idx} 
                                                className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-emerald-300 group cursor-pointer ${isPlaceholder ? 'opacity-80' : ''}`}
                                                onClick={(e) => {
                                                    if (isVideoCategory && videoUrl) {
                                                        useAppStore.getState().setVideoPopupUrl(videoUrl);
                                                        // Do not close this modal, so that closing the video popup leaves this modal open
                                                        return;
                                                    }
                                                    if (customBlogUrl) {
                                                        const finalUrl = customBlogUrl.startsWith('http') ? customBlogUrl : `https://${customBlogUrl}`;
                                                        window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                                    } else if (isPlaceholder) {
                                                        const fallbackUrl = item.blogUrl || 'https://blog.naver.com/yunjia2miju';
                                                        const finalUrl = fallbackUrl.startsWith('http') ? fallbackUrl : `https://${fallbackUrl}`;
                                                        window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                                    } else {
                                                        setSelectedPostId(item.id);
                                                        setActiveSection('detail');
                                                        onClose();
                                                    }
                                                }}
                                            >
                                                {/* Thumbnail Area */}
                                                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                                                    <img 
                                                        src={item.category === '360 VR사진' ? (item.vrThumbnail || item.thumbnail) : (item.thumbnail || item.vrThumbnail)} 
                                                        alt={item.building}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                        loading="lazy"
                                                    />
                                                    
                                                    {/* Category & Status Badges */}
                                                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                                                        <span className="bg-[#0B2545] text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg uppercase shadow-lg shadow-black/20">
                                                            {item.category}
                                                        </span>
                                                        {item.isRecommended && (
                                                            <span className="bg-amber-400 text-amber-900 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-lg shadow-amber-400/20">
                                                                추천 매물
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* VR / Video Indicator */}
                                                    {(item.panoramas || item.category === '360 VR사진') && (
                                                        <div className="absolute top-3 right-3 bg-[#64dfdf] text-[#0B2545] text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-lg shadow-[#64dfdf]/20 flex items-center gap-1">
                                                            <span>VR</span>
                                                        </div>
                                                    )}
                                                    {(item.category === '유튜브' || item.category === '네이버TV') && (
                                                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-lg shadow-red-500/20 flex items-center gap-1">
                                                            <span>VIDEO</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content Area */}
                                                <div className="p-5 flex flex-col flex-1">
                                                    <div className="mb-3">
                                                        <div className="text-[10px] sm:text-xs font-bold text-slate-400 mb-1 line-clamp-1">{item.address}</div>
                                                        <h3 className="text-base sm:text-lg font-black text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                                            <span className="text-[#0B2545] mr-1">{getPostNumber(item.id)}</span>
                                                            {item.building || '건물명 없음'}
                                                            {isAdminLoggedIn && item.room ? <span className="ml-1 text-sm font-bold text-slate-500">{item.room}호</span> : ''}
                                                        </h3>
                                                    </div>

                                                    {isVideoCategory ? (
                                                        <div className="w-full h-20 bg-white border border-slate-200 rounded-xl flex flex-col justify-center px-3 py-2 relative overflow-hidden select-none shrink-0 mb-3 shadow-sm">
                                                            {/* Top Row: YouTube Logo & NAVER Logo */}
                                                            <div className="flex items-center justify-between px-1 mb-1">
                                                                {/* YouTube Section */}
                                                                <div className="flex items-center gap-1">
                                                                    <div className="bg-red-600 rounded px-1 py-0.5 flex items-center justify-center">
                                                                        <svg className="w-3.5 h-2.5 fill-white" viewBox="0 0 24 24">
                                                                            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" />
                                                                            <polygon points="9.545 15.568 15.818 12 9.545 8.432" className="fill-white" />
                                                                        </svg>
                                                                    </div>
                                                                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 tracking-tighter">YouTube</span>
                                                                </div>

                                                                {/* NAVER Section */}
                                                                <div className="flex items-center gap-1">
                                                                    <div className="bg-[#03C75A] rounded px-1 py-0.5 flex items-center justify-center">
                                                                        <span className="text-white font-black text-[9px] tracking-tighter leading-none">N</span>
                                                                    </div>
                                                                    <span className="text-[10px] sm:text-[11px] font-black text-[#03C75A] tracking-tighter">NAVER</span>
                                                                </div>
                                                            </div>

                                                            {/* Bottom Row: 구미오늘방TV centered / bold text */}
                                                            <div className="flex items-center justify-between px-1">
                                                                <span className="text-base sm:text-lg font-black text-slate-950 tracking-tighter leading-none">
                                                                    구미오늘방TV
                                                                </span>
                                                                {/* Small right accent: play icon with hand pointer */}
                                                                <div className="flex items-center gap-0.5 opacity-90 animate-pulse shrink-0">
                                                                    <div className="bg-red-500 rounded p-0.5 flex items-center justify-center">
                                                                        <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 24 24">
                                                                            <path d="M8 5v14l11-7z" />
                                                                        </svg>
                                                                    </div>
                                                                    {/* Simple hand pointer SVG */}
                                                                    <svg className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight mb-3">
                                                            {item.price || '가격협의'}
                                                        </div>
                                                    )}

                                                    {item.remarks && (
                                                        <p className="text-xs sm:text-sm text-slate-500 font-medium line-clamp-2 mb-4 flex-1">
                                                            {typeof item.remarks === 'string' ? item.remarks.replace(/<[^>]*>/g, '') : ''}
                                                        </p>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="mt-auto grid grid-cols-2 gap-2">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isVideoCategory && videoUrl) {
                                                                    useAppStore.getState().setVideoPopupUrl(videoUrl);
                                                                    // Do not close this modal, so that closing the video popup leaves this modal open
                                                                    return;
                                                                }
                                                                if (customBlogUrl) {
                                                                    const finalUrl = customBlogUrl.startsWith('http') ? customBlogUrl : `https://${customBlogUrl}`;
                                                                    window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                                                } else if (isPlaceholder) {
                                                                    const fallbackUrl = item.blogUrl || 'https://blog.naver.com/yunjia2miju';
                                                                    const finalUrl = fallbackUrl.startsWith('http') ? fallbackUrl : `https://${fallbackUrl}`;
                                                                    window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                                                } else {
                                                                    setSelectedPostId(item.id);
                                                                    setActiveSection('detail');
                                                                    onClose();
                                                                }
                                                            }}
                                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-colors text-center"
                                                        >
                                                            {isVideoCategory ? '영상 재생' : (customBlogUrl || isPlaceholder ? '블로그 보기' : '상세 보기')}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openPhoneSelectModal(e, '010-7590-0111', isAdminLoggedIn ? item.ownerPhone : undefined);
                                                            }}
                                                            className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-colors"
                                                        >
                                                            상담 문의
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {/* Infinite Scroll Observer Target */}
                            {displayCount < items.length && (
                                <div ref={observerTarget} className="w-full h-20 flex items-center justify-center mt-6">
                                    <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
