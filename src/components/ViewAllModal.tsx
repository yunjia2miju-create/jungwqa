import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';


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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8">
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
                                        return (
                                            <div 
                                                key={item.id || idx} 
                                                className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-emerald-300 group cursor-pointer ${isPlaceholder ? 'opacity-80' : ''}`}
                                                onClick={(e) => {
                                                    if (isPlaceholder) {
                                                        window.open(item.blogUrl, '_blank', 'noopener,noreferrer');
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
                                                        src={item.thumbnail} 
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
                                                            {item.building || '건물명 없음'}
                                                            {item.room ? <span className="ml-1 text-sm font-bold text-slate-500">{item.room}호</span> : ''}
                                                        </h3>
                                                    </div>

                                                    <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight mb-3">
                                                        {item.price || '가격협의'}
                                                    </div>

                                                    {item.remarks && (
                                                        <p className="text-xs sm:text-sm text-slate-500 font-medium line-clamp-2 mb-4 flex-1">
                                                            {item.remarks}
                                                        </p>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="mt-auto grid grid-cols-2 gap-2">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isPlaceholder) {
                                                                    window.open(item.blogUrl, '_blank', 'noopener,noreferrer');
                                                                } else {
                                                                    setSelectedPostId(item.id);
                                                                    setActiveSection('detail');
                                                                    onClose();
                                                                }
                                                            }}
                                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-colors text-center"
                                                        >
                                                            {isPlaceholder ? '블로그 보기' : '상세 보기'}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openPhoneSelectModal(e, item.mobilePhone || '010-4065-2751');
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
};
