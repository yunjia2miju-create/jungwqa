import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Home, ArrowLeft, Phone } from 'lucide-react';
import { motion } from 'motion/react';

interface VrListTabProps {
    openPhoneSelectModal: (e: React.MouseEvent, mobilePhone: string, ownerPhone?: string) => void;
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export const VrListTab: React.FC<VrListTabProps> = ({ openPhoneSelectModal, showToast }) => {
    const { 
        posts, 
        isAdminLoggedIn, 
        setSelectedPostId, 
        setActiveSection,
        setFromSection 
    } = useAppStore();

    // Filter only 360 VR posts
    const vrItems = React.useMemo(() => {
        return posts.filter(p => p.category === '360 VR사진' || (p.panoramas && typeof p.panoramas === 'string' && p.panoramas.trim().length > 0));
    }, [posts]);

    // Infinite scroll / lazy loading display count
    const [displayCount, setDisplayCount] = useState(12);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && displayCount < vrItems.length) {
                    setDisplayCount(prev => Math.min(prev + 12, vrItems.length));
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(target);
        return () => {
            if (target) observer.unobserve(target);
        };
    }, [displayCount, vrItems.length]);

    const visibleItems = vrItems.slice(0, displayCount);

    const handleItemClick = (item: any) => {
        // Set fromSection to 'vr-list' so DetailTab's back button returns here
        setFromSection('vr-list');
        setSelectedPostId(item.id);
        setActiveSection('detail');
        window.scrollTo(0, 0);
    };

    return (
        <div className="w-full min-h-screen bg-slate-50/50 pb-24">
            {/* 세련된 상단 네비게이션 및 타이틀 영역 */}
            <div className="bg-white border-b border-slate-200/80 sticky top-[96px] sm:top-[116px] z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => {
                            setActiveSection('main');
                            window.scrollTo(0, 0);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all font-semibold text-sm sm:text-base cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>메인 홈으로</span>
                    </button>
                    
                    <div className="flex items-center gap-1.5 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100">
                        <span className="w-2 h-2 rounded-full bg-[#05D975] animate-pulse"></span>
                        <span className="text-[#03c75a] text-xs font-black tracking-wider uppercase select-none">360° VR ONLY</span>
                    </div>
                </div>
            </div>

            {/* 메인 비주얼 배너 */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="bg-gradient-to-r from-[#0B2545] to-[#134074] rounded-[24px] sm:rounded-[32px] p-8 sm:p-12 text-white relative overflow-hidden shadow-xl select-none">
                    {/* Background Light Effects */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#64dfdf]/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 max-w-2xl space-y-4">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                            최신 <span className="text-[#64dfdf]">360° 현장 VR 투어</span>
                        </h1>
                        <p className="text-slate-200 text-sm sm:text-base lg:text-lg font-semibold leading-relaxed">
                            공간의 깊이와 분위기를 직접 방문한 것처럼 실감나게 체험해 보세요. 엄선된 VR 특화 매물 리스트입니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* 매물 리스트 섹션 */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                {vrItems.length === 0 ? (
                    <div className="w-full bg-white rounded-3xl border border-slate-200 p-16 text-center">
                        <p className="text-slate-400 font-bold text-lg">등록된 360° VR 매물이 존재하지 않습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                        {visibleItems.map((item) => {
                            const customBlogUrl = item.naverBlogUrl || item.blogUrl;
                            const isPlaceholder = item.id.startsWith('placeholder');

                            return (
                                <div 
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className="group bg-white rounded-[28px] border border-slate-200/80 shadow-[0_12px_32px_rgba(0,0,0,0.03)] hover:shadow-[0_24px_48px_rgba(5,217,117,0.08)] hover:-translate-y-1.5 overflow-hidden transition-all duration-500 cursor-pointer flex flex-col justify-between"
                                >
                                    {/* Thumbnail Area */}
                                    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden shrink-0 border-b border-slate-100">
                                        <img 
                                            src={item.vrThumbnail || item.thumbnail} 
                                            alt={item.building}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            referrerPolicy="no-referrer"
                                            loading="lazy"
                                        />
                                        
                                        {/* Category & Status Badges */}
                                        <div className="absolute top-3.5 left-3.5 flex gap-1.5 flex-wrap">
                                            <span className="bg-[#0B2545] text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg uppercase shadow-lg shadow-black/20">
                                                {item.category}
                                            </span>
                                            {item.isRecommended && (
                                                <span className="bg-amber-400 text-amber-900 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-lg shadow-amber-400/20">
                                                    추천 매물
                                                </span>
                                            )}
                                        </div>

                                        {/* VR Badge Indicator with animation */}
                                        <div className="absolute top-3.5 right-3.5 bg-[#05D975] text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-lg shadow-lg shadow-emerald-500/35 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                            <span>360° VR</span>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="mb-3">
                                            <div className="text-[11px] font-bold text-slate-400 mb-1 line-clamp-1">{item.address}</div>
                                            <h3 className="text-lg sm:text-xl font-black text-slate-900 line-clamp-1 group-hover:text-[#03c75a] transition-colors">
                                                {item.building || '건물명 없음'}
                                                {isAdminLoggedIn && item.room ? <span className="ml-1 text-sm font-bold text-slate-500">{item.room}호</span> : ''}
                                            </h3>
                                        </div>

                                        <div className="text-2xl font-black text-rose-600 tracking-tight mb-3">
                                            {item.price || '가격협의'}
                                        </div>

                                        {item.remarks && (
                                            <p className="text-xs sm:text-sm text-slate-500 font-medium line-clamp-2 mb-5 flex-grow">
                                                {typeof item.remarks === 'string' ? item.remarks.replace(/<[^>]*>/g, '') : ''}
                                            </p>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleItemClick(item);
                                                }}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs sm:text-sm transition-colors text-center cursor-pointer"
                                            >
                                                상세 보기
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPhoneSelectModal(e, item.phone || '010-4065-2751', item.ownerPhone);
                                                }}
                                                className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>상담 문의</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Infinite Scroll Observer Target */}
                {displayCount < vrItems.length && (
                    <div ref={observerTarget} className="w-full h-24 flex items-center justify-center mt-10">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#05D975] rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    );
};
