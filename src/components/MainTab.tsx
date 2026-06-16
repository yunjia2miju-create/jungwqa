import React from 'react';
import { useAppStore } from '../store';
import { gumiDongs } from '../data';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { submitInquiryService, getInquiriesService } from '../firebaseService';

export const MainTab = ({ 
    openPhoneSelectModal, 
    showToast 
}: { 
    openPhoneSelectModal: (e: React.MouseEvent, mobilePhone: string, ownerPhone?: string) => void;
    showToast: (msg: string, type: 'success' | 'error') => void;
}) => {
    const { 
        posts, 
        isAdminLoggedIn, 
        showOnlyRecommended, 
        setShowOnlyRecommended, 
        showOnlyVR,
        setShowOnlyVR,
        activeCategory, 
        setActiveCategory, 
        activeDong, 
        setActiveDong,
        searchVal, 
        setSearchVal,
        currentPage, 
        setCurrentPage,
        isMobileSimulationMode,
        setSelectedPostId,
        inquiries,
        setInquiries
    } = useAppStore();

    const activeDongsInPosts = React.useMemo(() => {
        const dongsWithPosts = Array.from(new Set(posts.map(p => p.dong).filter(dong => dong && dong.trim() !== '')));
        const presentGumiDongs = gumiDongs.filter(d => dongsWithPosts.includes(d));
        const extraDongs = dongsWithPosts.filter(d => !gumiDongs.includes(d));
        return [...presentGumiDongs, ...extraDongs];
    }, [posts]);

    const [tickerPosts, setTickerPosts] = React.useState<any[]>([]);

    React.useEffect(() => {
        const filteredPosts = posts.filter(
            p => p && p.category
        );
        if (filteredPosts.length === 0) {
            setTickerPosts([]);
            return;
        }
        // Shuffle using Fisher-Yates algorithm for genuine randomness on load/visit
        const shuffled = [...filteredPosts];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // Duplicate the entire set to allow beautiful, seamless infinite looping
        setTickerPosts([...shuffled, ...shuffled]);
    }, [posts]);

    const [isFetching, setIsFetching] = React.useState(true);

    React.useEffect(() => {
        setIsFetching(true);
        const t = setTimeout(() => setIsFetching(false), 500);
        return () => clearTimeout(t);
    }, [activeCategory, activeDong, showOnlyRecommended, showOnlyVR, searchVal, currentPage]);

    const itemsPerPage = 30;

    const formatDisplayPrice = (price: any, _manageFee: any) => {
        return String(price || '');
    };

    const stripHtml = (htmlText: string | undefined | null) => {
        if (!htmlText) return '';
        return String(htmlText)
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const formatDisplayAddress = (addr: string | undefined | null) => {
        if (!addr) return '';
        return addr.split(/\s+/)
            .filter(word => !/\d/.test(word))
            .join(' ')
            .trim();
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchVal(e.target.value.toLowerCase().trim());
    };

    let filtered = posts.filter(p => {
        if (!p) return false;
        if (showOnlyRecommended && !(p.isRecommended === true || String(p.isRecommended) === 'true')) return false;

        const pPanoramas = String(p.panoramas || '');
        const pPanoImage = String(p.panoImage || '');
        const hasVR = !((!pPanoramas.trim()) && (!pPanoImage.trim()));
        if (showOnlyVR && !hasVR) return false;

        let categoryMatch = false;
        if (activeCategory === 'all') {
            categoryMatch = true;
        } else if (activeCategory === '빌라') {
            const pCat = String(p.category || '');
            categoryMatch = pCat === '빌라' || pCat === '다세대' || pCat === '주택' || pCat === '상가주택';
        } else {
            categoryMatch = String(p.category || '') === activeCategory;
        }

        const dongMatch = activeDong === 'all' || (p.dong && String(p.dong) === activeDong) || (p.address && String(p.address).includes(activeDong));
        
        const buildingMatch = String(p.building || '').toLowerCase().includes(searchVal);
        const addressMatch = String(p.address || '').toLowerCase().includes(searchVal);
        const remarksMatch = stripHtml(p.remarks).toLowerCase().includes(searchVal);
        return categoryMatch && dongMatch && (buildingMatch || addressMatch || remarksMatch);
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    let safeCurrentPage = currentPage;
    if (safeCurrentPage > totalPages) safeCurrentPage = totalPages;

    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024 || isMobileSimulationMode);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024 || isMobileSimulationMode);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobileSimulationMode]);

    const [inquiryData, setInquiryData] = React.useState({ name: '', phone: '', message: '' });
    const handleInquirySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newInq = { ...inquiryData, id: 'inq-' + Date.now(), processed: false, createdAt: Date.now() };
        try {
            await submitInquiryService(newInq);
            const updated = await getInquiriesService();
            if (Array.isArray(updated)) {
                setInquiries(updated);
            } else {
                setInquiries([newInq, ...inquiries]);
            }
            setInquiryData({ name: '', phone: '', message: '' });
            showToast("의뢰 접수 완료! 소장님이 곧 연락드리겠습니다.", "success");
        } catch (err) {
            console.error(err);
            showToast("의뢰 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.", "error");
        }
    };

    return (
        <section id="main-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 transition-opacity duration-300 w-full">
            {/* Desktop Hero */}
            {!isMobile && (
                <div id="hero-desktop-wrapper" className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-10 text-white mb-12 shadow-xl relative overflow-hidden w-full hidden lg:block">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none"></div>
                    <div className="space-y-4 text-left relative z-10 w-full max-w-4xl">
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-widest inline-block">태왕 오리지널 현장 브리핑</span>
                        <h1 className="text-3xl lg:text-5xl font-black leading-tight tracking-tight">
                            발로 뛰어 검증한 <br/>정직한 지역 가치와 현장 답사기
                        </h1>
                        <div className="flex items-center gap-4 py-6 w-full max-w-full">
                            <div className="h-px bg-gradient-to-r from-transparent to-emerald-500/40 flex-grow max-w-[150px] lg:max-w-[250px] animate-pulse hidden md:block"></div>
                            <div 
                                onClick={() => {
                                    setShowOnlyVR(true);
                                    setShowOnlyRecommended(false);
                                    setCurrentPage(1);
                                    setActiveCategory('all');
                                    setActiveDong('all');
                                    showToast("360° VR 현장 투어가 포함된 매물을 필터링하여 보여줍니다.", "success");
                                    setTimeout(() => {
                                        document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                }}
                                className="flex flex-col items-center cursor-pointer hover:scale-[1.03] active:scale-95 transition-all select-none bg-emerald-500/10 border border-emerald-500/30 px-6 sm:px-10 py-4 sm:py-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:bg-emerald-500/20 shrink-0 max-w-full box-border"
                                title="클릭하여 360° VR 매물 모아보기"
                            >
                                <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
                                    <i className="fa-solid fa-vr-cardboard text-emerald-400 text-2xl sm:text-3xl lg:text-3xl animate-vr-icon shrink-0"></i>
                                    <span className="text-emerald-400 font-black text-xl sm:text-2xl md:text-3xl lg:text-3xl tracking-tight shrink-0 drop-shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-vr-glow">
                                        공간 실감 360° 현장 VR 투어
                                    </span>
                                </div>
                                <span className="text-emerald-300 text-[10px] sm:text-xs font-black tracking-[0.15em] mt-2 flex items-center gap-1.5 uppercase shrink-0">
                                    <i className="fa-solid fa-circle-play text-[9px] text-emerald-400 animate-pulse"></i>
                                    <span>클릭하여 360° VR 매물 모아보기</span>
                                </span>
                            </div>
                            <div className="h-px bg-gradient-to-l from-transparent to-emerald-500/40 flex-grow max-w-[150px] lg:max-w-[250px] animate-pulse hidden md:block"></div>
                        </div>
                        <p className="text-slate-200 text-base lg:text-lg leading-relaxed font-black mb-2 shadow-black/20 text-shadow-sm">
                            "압도적 공간감! 사진으로는 볼 수 없던 구석구석을 360° 가상 투어로 경험하세요."
                        </p>
                        <p className="text-slate-400 text-xs lg:text-sm leading-relaxed max-w-2xl">
                            태왕은 단순히 정보를 전달하는 것을 넘어, 고객님이 현장에 직접 계신 것처럼 생생한 경험을 선사하기 위해 모든 매물을 360° 입체 촬영하여 제공합니다. 
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => { 
                                    setShowOnlyRecommended(true); 
                                    setShowOnlyVR(false);
                                    setCurrentPage(1);
                                    setActiveCategory('all'); 
                                    setActiveDong('all');
                                    setTimeout(() => {
                                        document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                }} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-center px-6 py-3.5 rounded-xl font-bold transition-all shadow-md shadow-emerald-900/40 text-sm cursor-pointer select-none"
                            >
                                추천 매물 목록 둘러보기
                            </button>
                            <a href="#quick-inquiry" className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-center px-6 py-3.5 rounded-xl font-bold transition-all text-sm">
                                실시간 1:1 중개 상담 신청
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Hero */}
            {isMobile && (
                <div id="hero-mobile-wrapper" className="block bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 text-white mb-8 shadow-xl relative overflow-hidden w-full lg:hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col space-y-4">
                        <h1 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-left">
                            발로 뛰어 검증한 <br/>정직한 지역 가치와 현장 답사기
                        </h1>
                        <div 
                            onClick={() => {
                                setShowOnlyVR(true);
                                setShowOnlyRecommended(false);
                                setCurrentPage(1);
                                setActiveCategory('all');
                                setActiveDong('all');
                                showToast("360° VR 현장 투어가 포함된 매물을 필터링하여 보여줍니다.", "success");
                                setTimeout(() => {
                                    document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                            }}
                            className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 my-2.5 shadow-[inset_0_1px_15px_rgba(16,185,129,0.25)] cursor-pointer hover:bg-emerald-500/25 active:scale-[0.98] transition-all"
                            title="터치하여 360° VR 매물 모아보기"
                        >
                            <div className="text-emerald-400 font-black text-lg sm:text-xl tracking-tight text-left flex items-center gap-2">
                                <i className="fa-solid fa-vr-cardboard text-xl sm:text-2xl animate-vr-icon"></i>
                                <span className="animate-vr-glow">공간 실감 360° 현장 VR 투어</span>
                            </div>
                            <p className="text-slate-300 text-[10px] leading-relaxed text-left font-semibold italic mt-1.5 flex items-center justify-between">
                                <span>"구미 전 지역 공실을 360° 가상 투어로 생생하게"</span>
                                <span className="text-emerald-400 font-extrabold text-[10px] shrink-0 ml-1">터치하여 모아보기 ➔</span>
                            </p>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed text-left">
                            직접 문을 열어보고 소음을 측정하여 엄선한 솔직한 현장 답사 브리핑입니다.
                        </p>
                        <div className="pt-0.5 text-left">
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest inline-block w-fit">태왕 오리지널 현장 브리핑</span>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button 
                                onClick={() => { 
                                    setShowOnlyRecommended(true); 
                                    setShowOnlyVR(false);
                                    setCurrentPage(1);
                                    setActiveCategory('all'); 
                                    setActiveDong('all');
                                    setTimeout(() => {
                                        document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                }} 
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-center py-3 rounded-xl font-bold transition-all shadow-md shadow-emerald-950/40 text-xs cursor-pointer select-none"
                            >
                                추천 매물 목록 둘러보기
                            </button>
                            <a href="#quick-inquiry" className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-center py-3 rounded-xl font-bold transition-all text-xs">
                                실시간 1:1 중개 상담 신청
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Notice Message */}
            {activeCategory === 'all' && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 shadow-sm flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                    <p className="text-red-500 font-black text-xs sm:text-sm">
                        원룸 5만원, 미투 7만원, 투룸 9만원, 쓰리룸 12만원 관리비별도
                    </p>
                </div>
            )}

            {/* Real-time Vacancy Ticker */}
            {activeCategory === 'all' && (
            <div className="w-full bg-white border border-slate-200 sm:rounded-2xl rounded-xl shadow-sm mb-6 sm:mb-8 overflow-hidden flex flex-col">
                <div className="bg-slate-50 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between z-10 shadow-sm relative">
                    <h3 className="text-[13px] sm:text-[15px] font-black text-slate-800 flex items-center gap-2">
                        <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
                        </span>
                        실시간 <span className="text-emerald-700">공실현황</span>
                    </h3>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors bg-white hover:bg-slate-50 shadow-sm text-[10px] sm:text-xs">
                        <i className="fa-solid fa-plus"></i>
                    </div>
                </div>
                <div className="relative h-[540px] sm:h-[720px] overflow-hidden bg-white px-2">
                    {/* Create a duplicate list to ensure smooth infinite scrolling. */}
                    <div 
                        className="animate-scroll-up flex flex-col pt-2 pb-2"
                        style={{ animationDuration: `${tickerPosts.length * 0.5}s` }}
                    >
                        {tickerPosts.map((p, idx) => {
                            const isRec = p.isRecommended === true || String(p.isRecommended) === 'true';
                            const pPanoramas = String(p.panoramas || '');
                            const pPanoImage = String(p.panoImage || '');
                            const hasVR = !((!pPanoramas.trim()) && (!pPanoImage.trim()));
                            const floorVal = p.floor ? String(p.floor) : '';
                            const totalFloorVal = p.totalFloor ? String(p.totalFloor) : '';
                            const roomVal = p.room ? String(p.room) : '';
                            const floorLabel = floorVal && totalFloorVal ? `${floorVal}/${totalFloorVal}층` : (roomVal ? `${roomVal}호` : '지상층');
                            const dongVal = String(p.dong || '');
                            const addrVal = String(p.address || '');
                            const remarksVal = String(p.remarks || '');
                            return (
                                <div key={`${p.id}-${idx}`} onClick={() => setSelectedPostId(p.id)} className="flex items-center gap-2 sm:gap-4 px-3 py-1.5 sm:px-4 sm:py-2 border-b border-dashed border-slate-200/80 hover:bg-slate-50/90 cursor-pointer transition-colors w-full group select-none">
                                    <div className="w-4 sm:w-6 shrink-0 flex items-center justify-center">
                                        {isRec && <span className="text-amber-500 animate-sparkle text-[11px] sm:text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"><i className="fa-solid fa-star"></i></span>}
                                    </div>
                                    <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black border tracking-tight ${
                                        p.transactionType === '매매' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                        p.transactionType === '전세' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                        'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    }`}>
                                        {p.transactionType || '월세'}
                                    </span>
                                    <div className="text-xs sm:text-[13.5px] font-extrabold text-slate-900 group-hover:text-emerald-700 truncate min-w-[70px] sm:w-[170px] sm:min-w-0 flex items-center gap-1.5 transition-colors">
                                        <span className="shrink-0 font-black">{p.building}</span>
                                        {hasVR && (
                                            <span className="shrink-0 bg-emerald-100 text-emerald-800 text-[8.5px] font-black px-1 py-[1px] rounded flex items-center gap-0.5 animate-pulse border border-emerald-200">
                                                <i className="fa-solid fa-vr-cardboard"></i>
                                                <span>360°</span>
                                            </span>
                                        )}
                                        <span className="text-slate-600 bg-slate-100 px-1.5 py-[1px] rounded text-[9px] sm:text-[10px] font-bold border border-slate-200/60 leading-none shrink-0">{floorLabel}</span>
                                    </div>
                                    <div className="text-xs sm:text-[13.5px] font-black text-red-500 whitespace-nowrap sm:w-[110px] shrink-0 font-mono tracking-tight leading-none">
                                        {formatDisplayPrice(p.price, p.manageFee)}
                                    </div>
                                    <div className="text-[10px] sm:text-[11.5px] font-black text-slate-700 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-md whitespace-nowrap sm:w-[70px] text-center shrink-0">
                                        {p.category}
                                    </div>
                                    <div className="text-[10px] sm:text-[12px] font-semibold text-slate-600 truncate hidden sm:block ml-0 flex-1 border-l border-slate-200 pl-3">
                                        {dongVal || (addrVal && addrVal.split(' ')[0]) || ''} {remarksVal && `· ${stripHtml(remarksVal).replace(/▶|■/g, '').slice(0, 50)}...`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"></div>
                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
                </div>
            </div>
            )}

            {/* Filter Tabs & Search */}
            <div id="blog-list" className="flex flex-col mb-4 sm:mb-6 gap-5 sm:gap-6 border-b border-slate-200 pb-5 sm:pb-6 w-full">
                {/* 대형 매물검색 섹션 타이틀 */}
                <div id="property-search-title" className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 select-none w-full bg-slate-50 border border-slate-200/80 p-5 rounded-2xl shadow-sm mt-2">
                    <div className="flex items-center gap-4">
                        {/* 눈에 확 띄는 큼직한 집 모양 아이콘 */}
                        <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-600 to-indigo-950 text-white rounded-xl sm:rounded-2xl shadow-md shrink-0 border border-emerald-400">
                            <i className="fa-solid fa-house-chimney text-2xl sm:text-3xl text-emerald-300 drop-shadow-[0_2px_8px_rgba(52,211,153,0.4)] animate-pulse-slow"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                                    매물검색
                                </h2>
                                <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] sm:text-xs font-black px-2 mt-0.5 sm:mt-0 py-0.5 rounded-full shadow-sm">
                                    SEARCH
                                </span>
                            </div>
                            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1.5">
                                구미 대표 브랜드 태왕공인중개사사무소에서 검증한 추천 매물 찾기
                            </p>
                        </div>
                    </div>
                </div>

                {/* 카테고리 기획 수정: 버튼 크기 확대 및 디자인 시인성 극대화 */}
                <div className="w-full">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-3 w-full">
                        {['all', '원룸매매', '원룸', '미투', '투룸', '쓰리룸', '상가', '아파트', '오피스텔', '빌라', '땅', '기타'].map((cat) => {
                            const isSelected = activeCategory === cat;
                            return (
                                <button 
                                    key={cat} 
                                    onClick={() => { setActiveCategory(cat); setCurrentPage(1); }} 
                                    className={`category-tab select-none cursor-pointer flex items-center justify-center text-center whitespace-nowrap transition-all duration-200 ease-out rounded-2xl py-3.5 sm:py-4.5 px-2.5 font-black text-sm sm:text-base border-2 shadow-[0_4px_10px_rgba(15,23,42,0.08)] ${
                                        isSelected 
                                            ? 'active bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500 scale-[1.03] shadow-[0_6px_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/20' 
                                            : 'bg-white text-slate-800 border-slate-200 hover:bg-emerald-50/50 hover:text-emerald-700 hover:border-emerald-500 hover:scale-[1.04] hover:shadow-[0_8px_16px_rgba(16,185,129,0.15)] active:scale-95'
                                    }`}
                                >
                                    {cat === 'all' ? '전체' : cat}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full font-medium mt-1">
                    <label className="flex items-center justify-center space-x-2 cursor-pointer bg-white border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm shadow-sm hover:bg-slate-50 transition-all select-none whitespace-nowrap w-full sm:w-auto">
                        <input type="checkbox" checked={showOnlyRecommended} onChange={(e) => { setShowOnlyRecommended(e.target.checked); setCurrentPage(1); }} className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                            <i className="fa-solid fa-star text-amber-500 animate-sparkle"></i>
                            <span>추천 매물만 보기</span>
                        </span>
                    </label>
                    <label className="flex items-center justify-center space-x-2 cursor-pointer bg-white border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm shadow-sm hover:bg-slate-50 transition-all select-none whitespace-nowrap w-full sm:w-auto">
                        <input type="checkbox" checked={showOnlyVR} onChange={(e) => { setShowOnlyVR(e.target.checked); setCurrentPage(1); }} className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                            <i className="fa-solid fa-vr-cardboard text-emerald-500"></i>
                            <span>360° VR 매물만 보기</span>
                        </span>
                    </label>
                    <div className="relative w-full sm:w-80 ml-auto">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-emerald-600 z-10">
                            <i className="fa-solid fa-magnifying-glass text-xs sm:text-sm"></i>
                        </span>
                        <input type="text" value={searchVal} onChange={handleSearch} placeholder="건물명 또는 주소 검색..." className="w-full bg-emerald-50/80 border border-emerald-300 text-emerald-900 font-bold rounded-xl pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/15 transition-all placeholder-emerald-700/60 shadow-inner" />
                    </div>
                </div>
            </div>

            {/* Dong Filter Tabs */}
            {['원룸', '미투', '투룸', '쓰리룸'].includes(activeCategory) && (
                <div id="dong-tabs-container" className="transition-all duration-300 bg-slate-50 border border-slate-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-6 sm:mb-8 w-full">
                    <div className="text-[11px] sm:text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                        <i className="fa-solid fa-map-location-dot text-emerald-500"></i>
                        <span>구미시 세부 동네 필터</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <button onClick={() => { setActiveDong('all'); setCurrentPage(1); }} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeDong === 'all' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                            전체 동
                        </button>
                        {activeDongsInPosts.map(dong => (
                            <button key={dong} onClick={() => { setActiveDong(dong); setCurrentPage(1); }} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeDong === dong ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                {dong}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {totalItems === 0 && !isFetching && (
                <div className="text-center py-16 sm:py-20 w-full">
                    <div className="bg-slate-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-slate-400">
                        <i className="fa-solid fa-folder-open text-xl sm:text-2xl"></i>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-700">검색 조건에 맞는 매물이 없습니다</h3>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">다른 검색어를 입력하시거나 분류를 다시 선택해 보세요.</p>
                </div>
            )}


            {/* Notice Message Above List */}
            {['all', '원룸', '미투', '투룸', '쓰리룸'].includes(activeCategory) && (totalItems > 0 || isFetching) && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 shadow-sm flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                    <p className="text-red-500 font-black text-xs sm:text-sm">
                        원룸 5만원, 미투 7만원, 투룸 9만원, 쓰리룸 12만원 관리비별도
                    </p>
                </div>
            )}

            {/* Desktop Table View */}
            {!isMobile && (totalItems > 0 || isFetching) && (
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm w-full hidden lg:block">
                    <table className="w-full text-center text-xs sm:text-sm border-collapse min-w-[1000px]">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-left pl-5 whitespace-nowrap">건물명</th>
                                <th className="p-4 whitespace-nowrap">해당층/총층</th>
                                <th className="p-4 whitespace-nowrap">거래형태</th>
                                <th className="p-4 whitespace-nowrap">구분</th>
                                <th className="p-4 whitespace-nowrap">금액 (보/월)</th>
                                <th className="p-4 whitespace-nowrap">주소</th>
                                <th className="p-4 text-left whitespace-nowrap">비고</th>
                                <th className="p-4 whitespace-nowrap">사진여부</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {isFetching ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-1/2 mx-auto animate-pulse"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-1/2 mx-auto animate-pulse"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-1/2 mx-auto animate-pulse"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full animate-pulse"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full animate-pulse"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-6 mx-auto animate-pulse"></div></td>
                                    </tr>
                                ))
                            ) : (
                                paginatedItems.map(p => {
                                    const isRec = p.isRecommended === true || String(p.isRecommended) === 'true';
                                    const pPanoramas = String(p.panoramas || '');
                                    const pPanoImage = String(p.panoImage || '');
                                    const hasVR = !((!pPanoramas.trim()) && (!pPanoImage.trim()));
                                    const thumbnailVal = String(p.thumbnail || '');
                                    const imagesVal = String(p.images || '');
                                    return (
                                        <tr key={p.id} onClick={() => setSelectedPostId(p.id)} className="hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer text-sm">
                                            <td className="p-4 font-bold text-slate-800 text-left pl-5">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-5 shrink-0 flex items-center justify-center">
                                                         {isRec && <span className="text-amber-500 animate-sparkle"><i className="fa-solid fa-star"></i></span>}
                                                    </div>
                                                    <span className="truncate max-w-[150px] lg:max-w-none">{p.building}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 text-center whitespace-nowrap">{p.floor || '-'}/{p.totalFloor || '-'}층</td>
                                            <td className="p-4 text-center whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                                    p.transactionType === '매매' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                                                    p.transactionType === '전세' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                    'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                }`}>
                                                    {p.transactionType || '월세'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600 font-bold text-center whitespace-nowrap">{p.category}</td>
                                            <td className="p-4 text-red-500 font-black text-center whitespace-nowrap">{formatDisplayPrice(p.price, p.manageFee)}</td>
                                            <td className="p-4 text-slate-600 text-center"><span className="block truncate max-w-[140px] lg:max-w-none">{formatDisplayAddress(p.address)}</span></td>
                                            <td className="p-4 text-slate-500 text-xs text-left max-w-xs break-all">{stripHtml(p.remarks)}</td>
                                            <td className="p-4 text-center whitespace-nowrap">
                                                 <div className="flex items-center justify-center gap-1.5 sm:gap-2 font-black">
                                                     {hasVR ? (
                                                         <div className="flex items-center bg-emerald-500 text-white px-2 py-1 rounded-md shadow-sm animate-pulse scale-105">
                                                             <i className="fa-solid fa-vr-cardboard mr-1"></i>
                                                             <span className="text-[10px]">360° 투어</span>
                                                         </div>
                                                     ) : (thumbnailVal || imagesVal) ? (
                                                         <div className="flex items-center text-slate-400">
                                                             <i className="fa-solid fa-camera mr-1"></i>
                                                             <span className="text-[10px]">일반사진</span>
                                                         </div>
                                                     ) : (
                                                         <span className="text-slate-300">-</span>
                                                     )}
                                                 </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile List View */}
            {isMobile && (totalItems > 0 || isFetching) && (
                <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                    <div className="flex flex-col">
                        {isFetching ? (
                            Array.from({length: 5}).map((_, i) => (
                                <div key={i} className="p-4 border-b border-slate-100 transition-all flex items-center justify-between gap-4 w-full animate-pulse">
                                    <div className="flex-grow space-y-2">
                                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                                        <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                                    </div>
                                    <div className="w-9 h-9 bg-slate-200 rounded-xl shrink-0"></div>
                                </div>
                            ))
                        ) : (
                            paginatedItems.map(p => {
                                const isRec = p.isRecommended === true || String(p.isRecommended) === 'true';
                                const pPanoramas = String(p.panoramas || '');
                                const pPanoImage = String(p.panoImage || '');
                                const hasVR = !((!pPanoramas.trim()) && (!pPanoImage.trim()));
                                const thumbnailVal = String(p.thumbnail || '');
                                const imagesVal = String(p.images || '');
                                const floorVal = p.floor ? String(p.floor) : '';
                                const totalFloorVal = p.totalFloor ? String(p.totalFloor) : '';
                                const roomVal = p.room ? String(p.room) : '';
                                const floorLabel = floorVal && totalFloorVal ? `${floorVal}/${totalFloorVal}층` : (roomVal ? `${roomVal}호` : '지상층');
                                return (
                                    <div key={p.id} onClick={() => setSelectedPostId(p.id)} className="p-4.5 sm:p-5 border-b border-slate-100 hover:bg-slate-50/60 transition-all flex items-center justify-between gap-4 cursor-pointer text-left w-full">
                                        <div className="flex-grow min-w-0 flex flex-col gap-1.5">
                                            {/* Row 1: Badges & Building Name - Styled to prevent overlap and truncate beautifully */}
                                            <div className="text-[14px] font-black text-slate-900 flex items-center gap-1.5 min-w-0 w-full flex-wrap xs:flex-nowrap">
                                                {isRec && (
                                                    <div className="shrink-0 flex items-center justify-center text-amber-500 animate-sparkle">
                                                        <i className="fa-solid fa-star"></i>
                                                    </div>
                                                )}
                                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black border ${
                                                    p.transactionType === '매매' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                                                    p.transactionType === '전세' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                    'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                }`}>
                                                    {p.transactionType || '월세'}
                                                </span>
                                                <span className="font-extrabold text-slate-900 text-[14.5px] truncate flex-grow min-w-0 mr-1 leading-snug">
                                                    {p.building}
                                                </span>
                                                {hasVR && (
                                                    <span className="shrink-0 bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-emerald-200 animate-pulse-slow">
                                                        VR
                                                    </span>
                                                )}
                                            </div>

                                            {/* Row 2: Price & Floor Label moved side by side in a clean layout to guarantee spacing */}
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[14.5px] text-red-500 font-extrabold font-mono tracking-tight leading-none shrink-0">
                                                    {formatDisplayPrice(p.price, p.manageFee)}
                                                </span>
                                                <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 leading-none shrink-0">
                                                    {floorLabel}
                                                </span>
                                            </div>

                                            {/* Row 3: Metadata Row - Category & Address Details */}
                                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 min-w-0 flex-wrap">
                                                <span className="text-slate-700 font-bold bg-slate-100/80 border border-slate-200/50 px-1.5 py-0.5 rounded text-[9.5px] leading-none shrink-0">
                                                    {p.category}
                                                </span>
                                                <span className="text-slate-300 leading-none shrink-0">|</span>
                                                <span className="truncate text-slate-600 leading-relaxed font-semibold">
                                                    {formatDisplayAddress(p.address)}
                                                </span>
                                                {isAdminLoggedIn && (
                                                    <>
                                                        <span className="text-slate-300 leading-none shrink-0">|</span>
                                                        <span className="text-emerald-700 font-black shrink-0 border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 rounded text-[9.5px] leading-none">
                                                            {p.phone || '010-7590-0111'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Row 4: Highlight / Emphasis Field - Beautiful styled box designed for the subscriber */}
                                            {p.remarks && stripHtml(p.remarks) && (
                                                <div className="text-[11.5px] font-black text-emerald-950 bg-emerald-50/60 border border-emerald-200/40 rounded-xl px-2.5 py-1.5 mt-1.5 flex items-start gap-1.5 w-full max-w-full">
                                                    <span className="text-emerald-500 shrink-0 text-xs mt-0.5">✨</span>
                                                    <span className="font-bold text-slate-700 break-all leading-relaxed flex-grow min-w-0">
                                                        {stripHtml(p.remarks)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0 pl-1">
                                            <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                                {hasVR ? (
                                                    <div className="bg-emerald-500 text-white w-full h-full rounded-xl flex flex-col items-center justify-center shadow-lg shadow-emerald-900/30 animate-pulse-slow">
                                                        <i className="fa-solid fa-vr-cardboard text-[14px]"></i>
                                                        <span className="text-[7px] font-black uppercase tracking-tighter">VR</span>
                                                    </div>
                                                ) : (thumbnailVal || imagesVal) ? (
                                                    <div className="text-slate-400">
                                                        <i className="fa-solid fa-camera text-lg"></i>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (isAdminLoggedIn) {
                                                        openPhoneSelectModal(e, p.phone || '010-7590-0111', p.ownerPhone); 
                                                    } else {
                                                        window.location.href = `tel:${p.phone || '010-7590-0111'}`;
                                                    }
                                                }} 
                                                className="w-9 h-9 flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shrink-0 shadow-sm relative">
                                                <i className="fa-solid fa-phone text-sm"></i>
                                                {isAdminLoggedIn && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 border border-white rounded-full"></span>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-6 sm:mt-8 font-semibold font-mono">
                    {/* First Page */}
                    <button onClick={() => { setCurrentPage(1); document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' }); }} disabled={safeCurrentPage === 1} className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${safeCurrentPage === 1 ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>처음</button>
                    
                    {/* Previous Page Arrow */}
                    <button onClick={() => { setCurrentPage(Math.max(1, safeCurrentPage - 1)); document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' }); }} disabled={safeCurrentPage === 1} className={`px-2 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center ${safeCurrentPage === 1 ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`} aria-label="이전 페이지">
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Numeric Pages */}
                    {(() => {
                        const pages: number[] = [];
                        let startPage = Math.max(1, safeCurrentPage - 2);
                        let endPage = Math.min(totalPages, safeCurrentPage + 2);
                        if (safeCurrentPage <= 3) {
                            startPage = 1;
                            endPage = Math.min(totalPages, 5);
                        } else if (safeCurrentPage >= totalPages - 2) {
                            startPage = Math.max(1, totalPages - 4);
                            endPage = totalPages;
                        }
                        for (let p = startPage; p <= endPage; p++) {
                            pages.push(p);
                        }
                        return pages.map(pageNum => {
                            const isActive = pageNum === safeCurrentPage;
                            return (
                                <button key={pageNum} onClick={() => { setCurrentPage(pageNum); document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' }); }} className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all ${isActive ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                    {pageNum}
                                </button>
                            );
                        });
                    })()}

                    {/* Next Page Arrow */}
                    <button onClick={() => { setCurrentPage(Math.min(totalPages, safeCurrentPage + 1)); document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' }); }} disabled={safeCurrentPage === totalPages} className={`px-2 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center ${safeCurrentPage === totalPages ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`} aria-label="다음 페이지">
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Last Page */}
                    <button onClick={() => { setCurrentPage(totalPages); document.getElementById('blog-list')?.scrollIntoView({ behavior: 'smooth' }); }} disabled={safeCurrentPage === totalPages} className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${safeCurrentPage === totalPages ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>마지막</button>
                </div>
            )}

            {/* Quick Consultation & Inquiry Form */}
            <section id="quick-inquiry" className="bg-slate-950 text-white py-12 sm:py-16 mt-12 sm:mt-20 relative overflow-hidden w-full rounded-2xl sm:rounded-3xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_40%)]"></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <span className="text-emerald-400 text-xs sm:text-sm md:text-base font-black tracking-widest uppercase mb-3 sm:mb-4 inline-block bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full animate-pulse">1:1 맞춤 부동산 컨설팅</span>
                    <div className="py-2 overflow-hidden mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight animate-heading-zoom-glow">가려운 곳을 콕 짚어 해결해 드립니다</h2>
                    </div>
                    <p className="text-slate-300 text-xs sm:text-base max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4 font-bold">
                        세법 설계, 좋은 실거주 단지 선택 등 어떤 고민이든 남겨주시면 정직하게 분석하여 직접 답변드리겠습니다.
                    </p>

                    <form onSubmit={handleInquirySubmit} className="bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-2xl text-left max-w-xl mx-auto space-y-3 sm:space-y-4 shadow-2xl w-full">
                        <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">성함 또는 법인명</label>
                            <input type="text" value={inquiryData.name} onChange={e => setInquiryData({...inquiryData, name: e.target.value})} required placeholder="예: 홍길동 소장" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"/>
                        </div>
                        <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">연락처</label>
                            <input type="tel" value={inquiryData.phone} onChange={e => setInquiryData({...inquiryData, phone: e.target.value})} required placeholder="예: 010-7590-0111" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"/>
                        </div>
                        <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">문의 또는 중개 의뢰 요약</label>
                            <textarea rows={3} value={inquiryData.message} onChange={e => setInquiryData({...inquiryData, message: e.target.value})} required placeholder="예: 구미 원룸 매매 상담 또는 방 접수" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"></textarea>
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/50 transition-all flex items-center justify-center space-x-1.5 sm:space-x-2">
                            <i className="fa-solid fa-paper-plane text-xs"></i>
                            <span>중개 상담 및 의뢰 접수</span>
                        </button>
                    </form>
                </div>
            </section>
        </section>
    );
};

