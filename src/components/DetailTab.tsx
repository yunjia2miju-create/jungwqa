import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Home } from 'lucide-react';
import { useAppStore } from '../store';

import PannellumViewer from './PannellumViewer';
import { Naver360Icon } from './Naver360Icon';
import { NaverBlogHelperModal } from './NaverBlogHelper';

const cleanNbsp = (text: string | null | undefined): string => {
    if (!text) return '';
    return String(text).replace(/&nbsp;/gi, ' ');
};

const stripHtml = (text: string | null | undefined): string => {
    if (!text) return '\u00A0';
    const stripped = String(text)
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .trim();
    return stripped || '\u00A0';
};

export const DetailTab = ({ 
    openPhoneSelectModal,
    showToast,
    images,
    panoramaImages
}: { 
    openPhoneSelectModal: (e: React.MouseEvent, mobilePhone: string, ownerPhone?: string) => void,
    showToast?: (msg: string, type?: 'success'|'error') => void,
    images?: string[],
    panoramaImages?: string[]
}) => {
    const { posts, isAdminLoggedIn, selectedPostId, setSelectedPostId, setActiveSection, isMobileSimulationMode, fromSection } = useAppStore();

    // 2) 5대 마케팅: 관심 매물 (찜하기) 시스템
    const [favorites, setFavorites] = React.useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('taewang_favorites') || '[]'); } catch { return []; }
    });

    const toggleFavorite = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setFavorites(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem('taewang_favorites', JSON.stringify(next));
            if (showToast) {
                if (next.includes(id)) {
                    showToast("관심 매물에 추가되었습니다.", "success");
                } else {
                    showToast("관심 매물에서 해제되었습니다.", "success");
                }
            }
            return next;
        });
    };

    const [isFetchingDetail, setIsFetchingDetail] = React.useState(true);
    const [copied, setCopied] = React.useState(false);
    const [shareCopied, setShareCopied] = React.useState(false);
    const [zoomedImageId, setZoomedImageId] = React.useState<string | null>(null);
    const [isHovered, setIsHovered] = React.useState<string | null>(null);
    const [isBlogModalOpen, setIsBlogModalOpen] = React.useState(false);

    React.useEffect(() => {
        if (selectedPostId) {
            window.scrollTo(0, 0);
            setIsFetchingDetail(true);
            const t = setTimeout(() => setIsFetchingDetail(false), 500);
            return () => clearTimeout(t);
        }
    }, [selectedPostId]);

    const p = posts.find(post => post.id === selectedPostId);
    
    React.useEffect(() => {
        if (!p && selectedPostId) {
            // Only redirect if we are sure it's not just a loading phase
            const timer = setTimeout(() => {
                if (!p && selectedPostId) {
                    setActiveSection('main');
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [p, selectedPostId, setActiveSection]);

    if (!selectedPostId) return null;

    if (!p) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-emerald-600 rounded-full mb-4" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
                <p className="text-slate-500 font-bold">매물 정보를 찾는 중입니다...</p>
            </div>
        );
    }

    const formatDisplayPrice = (price: any, transactionType: any) => {
        const safePrice = String(price || '');
        const safeType = String(transactionType || '월세');
        if (safeType === '매매') return `매매 ${safePrice}만원`;
        if (safeType === '전세') return `전세 ${safePrice}만원`;
        if (safeType === '월세' && safePrice.includes('/')) {
            const parts = safePrice.split('/');
            return `보 ${parts[0]}만 / 월 ${parts[1]}만`;
        }
        return safePrice;
    };

    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024 || isMobileSimulationMode);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024 || isMobileSimulationMode);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobileSimulationMode]);

    const defaultImg = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=675&q=80";
    const imgUrls = React.useMemo(() => {
        if (images && images.length > 0) {
            return images;
        }
        const list: string[] = [];
        
        // Always include the representative photo as part of the overall sub-images album so it can be seen/zoomed
        if (p.thumbnail) {
            list.push(p.thumbnail.trim());
        }

        const processField = (field: any) => {
            if (!field) return;
            if (Array.isArray(field)) {
                field.forEach(val => {
                    if (val && typeof val === 'string') {
                        list.push(val.trim());
                    }
                });
            } else if (typeof field === 'string') {
                const str = field.trim();
                if (str) {
                    if (str.includes('|')) {
                        str.split('|').forEach(part => {
                            const trimmed = part.trim();
                            if (trimmed) list.push(trimmed);
                        });
                    } else if (str.includes(',') && (str.includes('http') || str.includes('/gallery/') || str.includes('/images/'))) {
                        str.split(',').forEach(part => {
                            const trimmed = part.trim();
                            if (trimmed) list.push(trimmed);
                        });
                    } else {
                        list.push(str);
                    }
                }
            }
        };

        processField(p.images);
        processField((p as any).imageUrls);
        processField((p as any).additionalImages);

        // Remove default image and duplicates while preserving order
        const uniqueUrls = Array.from(new Set(list))
            .filter(url => url && url !== defaultImg);
        return uniqueUrls;
    }, [images, p.images, p.thumbnail, (p as any).imageUrls, (p as any).additionalImages]);

    const panoUrls = React.useMemo(() => {
        if (panoramaImages && panoramaImages.length > 0) {
            return panoramaImages;
        }
        const list: string[] = [];
        
        const processField = (field: any) => {
            if (!field) return;
            if (Array.isArray(field)) {
                field.forEach(val => {
                    if (val && typeof val === 'string') {
                        list.push(val.trim());
                    }
                });
            } else if (typeof field === 'string') {
                const str = field.trim();
                if (str) {
                    if (str.includes('|')) {
                        str.split('|').forEach(part => {
                            const trimmed = part.trim();
                            if (trimmed) list.push(trimmed);
                        });
                    } else if (str.includes(',') && (str.includes('http') || str.includes('/panoramas/'))) {
                        str.split(',').forEach(part => {
                            const trimmed = part.trim();
                            if (trimmed) list.push(trimmed);
                        });
                    } else {
                        list.push(str);
                    }
                }
            }
        };

        processField(p.panoramas);
        processField(p.panoImage);
        processField((p as any).panoramaUrls);
        processField((p as any).panoramaImages);

        return Array.from(new Set(list)).filter(url => url);
    }, [panoramaImages, p.panoramas, p.panoImage, (p as any).panoramaUrls, (p as any).panoramaImages]);

    // Fast-loading Preloader: Calculate next and previous listings to prefetch their panoramas and thumbnails (0-second load tech)
    const adjacentPanoUrls = React.useMemo(() => {
        const currentIndex = posts.findIndex(post => post.id === selectedPostId);
        if (currentIndex === -1) return [];
        const nextPost = posts[(currentIndex + 1) % posts.length];
        const prevPost = posts[(currentIndex - 1 + posts.length) % posts.length];
        const urls: string[] = [];
        
        const processPost = (post: typeof nextPost) => {
            if (!post) return;
            const list: string[] = [];
            const processField = (field: any) => {
                if (!field) return;
                if (Array.isArray(field)) {
                    field.forEach(val => {
                        if (val && typeof val === 'string') {
                            list.push(val.trim());
                        }
                    });
                } else if (typeof field === 'string') {
                    const str = field.trim();
                    if (str) {
                        if (str.includes('|')) {
                            str.split('|').forEach(part => {
                                const trimmed = part.trim();
                                if (trimmed) list.push(trimmed);
                            });
                        } else if (str.includes(',') && (str.includes('http') || str.includes('/panoramas/'))) {
                            str.split(',').forEach(part => {
                                const trimmed = part.trim();
                                if (trimmed) list.push(trimmed);
                            });
                        } else {
                            list.push(str);
                        }
                    }
                }
            };
            processField(post.panoramas);
            processField(post.panoImage);
            processField((post as any).panoramaUrls);
            processField((post as any).panoramaImages);

            list.forEach(url => {
                if (url) urls.push(url);
            });
            if (post.thumbnail) {
                urls.push(post.thumbnail.trim());
            }
        };
        
        processPost(nextPost);
        processPost(prevPost);
        return Array.from(new Set(urls));
    }, [posts, selectedPostId]);

    // Fast-loading Preloader: Proactively fetch all panoramic images in the background
    React.useEffect(() => {
        const allUrlsToPrefetch = [...panoUrls, ...adjacentPanoUrls];
        if (allUrlsToPrefetch.length > 0) {
            allUrlsToPrefetch.forEach((url, idx) => {
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                    // Prevent double-proxying same-origin or already proxied URLs
                    let proxiedUrl = url;
                    if (url.includes('/api/proxy-image')) {
                        try {
                            const base = url.startsWith('http') ? undefined : 'http://dummy.com';
                            const urlObj = new URL(url, base);
                            const originalUrl = urlObj.searchParams.get('url');
                            if (originalUrl) {
                                proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}&v=360-pano-${idx}`;
                            }
                        } catch (e) {
                            console.warn("Preloader URL parse error:", e);
                        }
                    } else if (!url.startsWith('/') && !url.startsWith(window.location.origin)) {
                        proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(url)}&v=360-pano-${idx}`;
                    }

                    const img = new Image();
                    const isSandbox = window.location.hostname.includes('ais-dev') || 
                                      window.location.hostname.includes('ais-pre') ||
                                      window.location.hostname.includes('localhost') ||
                                      window.self !== window.top;
                    img.crossOrigin = isSandbox ? "use-credentials" : "anonymous";
                    img.src = proxiedUrl;
                }
            });
        }
    }, [panoUrls, adjacentPanoUrls]);

    const [activePanoIndex, setActivePanoIndex] = React.useState(0);

    // 360 파노라마 대표사진(vrThumbnail)이 지정되어 있는 경우, 해당 파노라마 사진을 시작 씬(Scene)으로 설정
    React.useEffect(() => {
        if (p && p.vrThumbnail && panoUrls.length > 0) {
            const idx = panoUrls.findIndex(url => url === p.vrThumbnail);
            if (idx !== -1) {
                setActivePanoIndex(idx);
            } else {
                setActivePanoIndex(0);
            }
        } else {
            setActivePanoIndex(0);
        }
    }, [p?.id, p?.vrThumbnail, panoUrls]);

    let embedUrl = String(p.video || '');
    if (embedUrl.includes('watch?v=')) {
        const vid = embedUrl.split('v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${vid}`;
    } else if (embedUrl.includes('youtu.be/')) {
        const vid = embedUrl.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${vid}`;
    }

    // Recommendation logic
    let potentialRecs = posts.filter(item => item && item.id !== p.id);
    let matchingRecs = [];
    const safeCat = String(p.category || '');
    const safeDong = String(p.dong || '');
    if (['원룸', '미투', '투룸', '쓰리룸'].includes(safeCat)) {
        matchingRecs = potentialRecs.filter(item => item && String(item.dong || '') === safeDong);
        if (matchingRecs.length < 18) {
            const extraCategory = potentialRecs.filter(item => item && String(item.category || '') === safeCat && !matchingRecs.some(m => m.id === item.id));
            matchingRecs = [...matchingRecs, ...extraCategory];
        }
    } else {
        matchingRecs = potentialRecs.filter(item => item && String(item.category || '') === safeCat);
    }
    if (matchingRecs.length < 18) {
        const anyExtra = potentialRecs.filter(item => item && !matchingRecs.some(m => m.id === item.id));
        matchingRecs = [...matchingRecs, ...anyExtra];
    }
    matchingRecs = matchingRecs.slice(0, 6);

    const liveKey = p.updatedAt || p.createdAt || Date.now();

    return (
        <section key={`detail-section-${liveKey}`} id="detail-section" className="max-w-[1100px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 sm:py-10 transition-opacity duration-300">
            <button onClick={() => { setActiveSection(fromSection); window.scrollTo(0, 0); }} className="inline-flex items-center justify-center bg-[#0B2545] hover:bg-[#113866] text-white font-black px-6 sm:px-8 py-5 sm:py-6 rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-[#0B2545]/20 text-lg sm:text-2xl mb-4 sm:mb-6 w-full tracking-wider">
                {"<<<< 앞 바로가기 <<<<"}
            </button>

            <article key={`article-live-${liveKey}`} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl overflow-visible sm:overflow-hidden p-5 sm:p-10 w-full">
                {isFetchingDetail ? (
                    <div className="animate-pulse space-y-6">
                        <div className="flex space-x-2 mb-4">
                            <div className="h-6 w-16 bg-slate-200 rounded"></div>
                            <div className="h-6 w-12 bg-slate-200 rounded"></div>
                        </div>
                        <div className="h-10 w-3/4 bg-slate-200 rounded mb-2"></div>
                        <div className="h-8 w-1/2 bg-slate-200 rounded border-b border-slate-100 pb-4 mb-6"></div>
                        
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8 space-y-2">
                            <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                            <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                        </div>

                        <div className="aspect-[4/5] sm:aspect-[16/9] h-[400px] sm:h-auto min-h-[380px] sm:min-h-0 w-[calc(100%+4.5rem)] sm:w-full -mx-9 sm:mx-0 bg-slate-200 rounded-none sm:rounded-2xl mb-6 sm:mb-8 animate-pulse"></div>
                        
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 border-l-4 border-slate-300 rounded-r-2xl space-y-2">
                                <div className="h-3 w-full bg-slate-200 rounded"></div>
                                <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 w-full bg-slate-200 rounded"></div>
                                <div className="h-4 w-full bg-slate-200 rounded"></div>
                                <div className="h-4 w-4/5 bg-slate-200 rounded"></div>
                                <div className="h-4 w-full bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3.5 mb-5">
                            <span className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black border tracking-wide shadow-sm ${
                                p.transactionType === '매매' ? 'bg-indigo-600 text-white border-indigo-700' :
                                p.transactionType === '전세' ? 'bg-amber-500 text-white border-amber-600' :
                                'bg-[#0B2545] text-white border-[#0B2545]'
                            }`}>
                                {p.transactionType || '월세'}
                            </span>
                            <span className="bg-slate-900 text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl tracking-wide shadow-sm">{p.category}</span>
                            <span className="bg-white text-[#0B2545] text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl border border-[#0B2545] tracking-wide shadow-sm">
                                {p.floor && p.totalFloor ? `${p.floor}/${p.totalFloor}층` : (p.floor ? `${p.floor}층` : (isAdminLoggedIn && p.room ? `${p.room}호` : '지상층'))}
                            </span>
                            <span className="bg-slate-100 text-slate-700 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl border border-slate-200 tracking-wide shadow-sm">{p.dong || '구미시'}</span>
                        </div>

                <div className="flex flex-col md:flex-row md:justify-between md:items-start lg:grid lg:grid-cols-2 gap-6 lg:gap-12 lg:items-center border-b border-slate-150 pb-6 mb-6 w-full">
                    {/* 왼쪽: 건축물 정보, 동, 가격 */}
                    <div className="flex-1 min-w-0 w-full">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-3 lg:mb-4 flex items-center gap-2 flex-wrap">
                            <span>{p.building} {isAdminLoggedIn && p.room ? `${p.room}호` : ''}</span>
                            <button 
                                onClick={(e) => toggleFavorite(e, p.id)}
                                className={`ml-1 shrink-0 flex items-center justify-center p-2 sm:p-2.5 rounded-full transition-all duration-300 shadow-sm border cursor-pointer ${
                                    favorites.includes(p.id) 
                                        ? 'bg-red-50 hover:bg-red-100 border-red-200' 
                                        : 'bg-white hover:bg-slate-50 border-slate-200'
                                }`}
                                title={favorites.includes(p.id) ? "관심 매물 해제" : "관심 매물 등록"}
                            >
                                <i className={`fa-solid fa-heart ${favorites.includes(p.id) ? 'text-red-500 scale-110' : 'text-slate-300'} text-lg sm:text-xl transition-transform`}></i>
                            </button>
                            {((p.panoramas && p.panoramas.trim()) || (p.panoImage && p.panoImage.trim())) && (
                                <span className="shrink-0 bg-[#0B2545] text-white text-xs sm:text-sm lg:text-base font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-[#0B2545]/20 animate-pulse">
                                    <Home size={18} className="text-white" strokeWidth={1.8} />
                                    <span>VR 투어 가능</span>
                                </span>
                            )}
                        </h1>
                        <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-red-500 tracking-tight lg:mt-3">{formatDisplayPrice(p.price, p.transactionType || '월세')}</p>
                    </div>

                    {/* 오른쪽: 매물 핵심 요약 제원표 (허전한 우측 여백을 최적화하여 꽉 채움) */}
                    <div className="w-full md:w-[340px] lg:w-full lg:max-w-none bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 lg:p-6.5 flex flex-col gap-3 lg:gap-4.5 shadow-inner text-xs lg:text-sm shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-black text-slate-800 flex items-center gap-1.5 lg:text-base">
                                <i className="fa-solid fa-building-circle-check text-sm lg:text-base" style={{ color: '#0B2545 !important' }}></i>
                                <span>매물 요약 정보 (Fact Sheet)</span>
                            </span>
                            <span className="text-[10px] lg:text-xs font-mono font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                                #{p.id.substring(0, 8)}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 lg:gap-y-4.5 text-slate-600 py-0.5">
                            <div className="flex flex-col gap-0.5 lg:gap-1.5">
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400">거래 구분</span>
                                <span className="font-extrabold text-slate-800 lg:text-base">{p.transactionType || '월세'} / {p.category}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 lg:gap-1.5">
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400">기본 관리비</span>
                                <span className="font-extrabold lg:text-base" style={{ color: '#0B2545 !important' }}>{p.manageFee && p.manageFee !== '없음' ? `${p.manageFee}` : '없음 (상세문의)'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 lg:gap-1.5">
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400">해당/전체 층수</span>
                                <span className="font-extrabold text-slate-800 lg:text-base">
                                    {p.floor && p.totalFloor ? `${p.floor}층 / 전체 ${p.totalFloor}층` : (p.floor ? `${p.floor}층` : '지상층')}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5 lg:gap-1.5">
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400">매물 핵심 지번</span>
                                <span className="font-extrabold text-slate-800 truncate lg:text-base" title={p.address}>{p.address || p.dong || '구미시'}</span>
                            </div>
                        </div>

                        {/* 소장님 직통 빠른 빠른 문의 전화 버튼 */}
                        <a 
                            href="tel:010-7590-0111"
                            onClick={(e) => { 
                                e.preventDefault(); 
                                openPhoneSelectModal(e, '010-7590-0111', isAdminLoggedIn ? p.ownerPhone : undefined); 
                            }}
                            className="mt-1 lg:mt-2 w-full bg-[#0B2545] hover:bg-[#113866] text-white font-black py-2.5 lg:py-4 rounded-xl flex items-center justify-center gap-2 lg:gap-3 shadow-md shadow-[#0B2545]/10 transition-all text-center select-none cursor-pointer text-xs lg:text-base"
                        >
                            <i className="fa-solid fa-phone animate-bounce"></i>
                            <span>태왕공인중개사 전화연결</span>
                        </a>

                        {/* 이 매물 인터넷 주소(링크) 복사하기 버튼 */}
                        <button 
                            onClick={() => {
                                const shareUrl = `${window.location.origin}${window.location.pathname}?postId=${p.id}`;
                                navigator.clipboard.writeText(shareUrl).then(() => {
                                    setShareCopied(true);
                                    if (showToast) {
                                        showToast("매물 상세페이지 인터넷 주소가 복사되었습니다. 카카오톡 채팅창에 붙여넣기(전송)하세요!", "success");
                                    }
                                    setTimeout(() => setShareCopied(false), 3000);
                                }).catch(err => {
                                    console.error("URL copy failed: ", err);
                                });
                            }}
                            className={`mt-2 w-full font-black py-2.5 lg:py-4 rounded-xl flex items-center justify-center gap-2 lg:gap-3 transition-all text-center select-none cursor-pointer text-xs lg:text-base border ${
                                shareCopied 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm'
                            }`}
                        >
                            {shareCopied ? (
                                <>
                                    <i className="fa-solid fa-circle-check text-emerald-500 text-sm lg:text-lg"></i>
                                    <span>주소 복사 완료! (채팅창에 붙여넣으세요)</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-share-nodes text-[#0B2545] text-sm lg:text-lg animate-pulse"></i>
                                    <span>이 매물 인터넷 주소(링크) 복사하기</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 w-full max-w-full overflow-hidden">
                        <span className="text-xs font-bold text-slate-400">책임중개 소장 한마디 및 블로그 원고</span>
                        {p.title && /<[a-z][\s\S]*>/i.test(String(p.title)) ? (
                            <div className="text-sm font-black text-slate-800 break-words prose prose-slate max-w-none text-left" dangerouslySetInnerHTML={{ __html: cleanNbsp(p.title) }} />
                        ) : (
                            <p className="text-sm font-black text-slate-800">"{cleanNbsp(p.title)}"</p>
                        )}
                    </div>
                    <div className="hidden">
                        {isAdminLoggedIn ? (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <button 
                                    onClick={() => {
                                    const titleText = cleanNbsp(p.title);
                                    const introText = cleanNbsp(p.intro);
                                    const bodyText = cleanNbsp(p.body);
                                    
                                    const formatToDoubleSpacing = (text: string) => {
                                        if (!text) return "";
                                        const isHtml = /<[a-z][\s\S]*>/i.test(text);
                                        if (isHtml) {
                                            let cleanText = text
                                                .replace(/<\/p>/gi, '\n\n')
                                                .replace(/<\/div>/gi, '\n\n')
                                                .replace(/<br\s*\/?>/gi, '\n')
                                                .replace(/<blockquote[^>]*>/gi, '\n [인용구시작]\n')
                                                .replace(/<\/blockquote>/gi, '\n[인용구끝]\n\n')
                                                .replace(/<h[1-6][^>]*>/gi, '\n\n[ ')
                                                .replace(/<\/h[1-6]>/gi, ' ]\n\n')
                                                .replace(/<[^>]+>/g, '') // Strip remaining tags
                                                .replace(/&nbsp;/g, ' ')
                                                .replace(/&amp;/g, '&')
                                                .replace(/&lt;/g, '<')
                                                .replace(/&gt;/g, '>');
                                            return cleanText
                                                .split('\n')
                                                .map(line => line.trim())
                                                .filter(line => line.length > 0)
                                                .join('\n\n');
                                        }
                                        return text
                                            .replace(/\\n/g, '\n')
                                            .split('\n')
                                            .map(line => line.trim())
                                            .filter(line => line.length > 0)
                                            .join('\n\n');
                                    };
                                    
                                    const formattedTitle = formatToDoubleSpacing(titleText);
                                    const formattedIntro = formatToDoubleSpacing(introText);
                                    const formattedBody = formatToDoubleSpacing(bodyText);
                                    
                                    // Build the final optimized blog post
                                    const fullContent = ` [블로그 홍보 제목]\n\n${formattedTitle}\n\n [체험적 서론]\n\n${formattedIntro}\n\n [상세한 관찰 본론 및 법정 고시]\n\n${formattedBody}`;
                                    
                                    navigator.clipboard.writeText(fullContent).then(() => {
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }).catch(err => {
                                        console.error("Copy failed: ", err);
                                    });
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 select-none shadow-sm cursor-pointer border ${
                                    copied 
                                    ? 'bg-[#0B2545]/10 text-[#0B2545] border-[#0B2545]/20' 
                                    : 'text-white border-[#0B2545] shadow-[#0B2545]/25 shadow-sm hover:opacity-90'
                                }`}
                                style={!copied ? { background: '#0B2545', backgroundColor: '#0B2545' } : {}}
                            >
                                {copied ? (
                                    <>
                                        <i className="fa-solid fa-circle-check"></i>
                                        <span>원고 복사 완료!</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-paste"></i>
                                        <span>블로그 원고 복사 (원스톱)</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setIsBlogModalOpen(!isBlogModalOpen)}
                                className={`font-black px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm border cursor-pointer ${
                                    isBlogModalOpen 
                                    ? 'bg-[#0B2545] text-white border-[#0B2545] shadow-[#0B2545]/25' 
                                    : 'bg-[#0B2545]/10 hover:bg-[#0B2545]/20 text-[#0B2545] border-[#0B2545]/20'
                                }`}
                            >
                                <i className="fa-solid fa-wand-magic-sparkles text-[#0B2545] group-hover:text-white"></i>
                                <span>AI 네이버 등록 도우미 </span>
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => {
                                if (showToast) {
                                    showToast("소장님(관리자) 로그인 상태에서만 원고 복사 및 AI 블로그 자동화 기능을 사용할 수 있습니다.", "error");
                                } else {
                                    alert("소장님(관리자) 로그인 상태에서만 원고 복사 및 AI 블로그 자동화 기능을 사용할 수 있습니다.");
                                }
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 select-none shadow-sm cursor-pointer border bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200"
                        >
                            <i className="fa-solid fa-lock text-slate-400"></i>
                            <span>블로그 원고 & AI 등록기 (소장님 전용 )</span>
                        </button>
                    )}
                    </div>
                </div>

                <div className="w-full mb-6">
                    <NaverBlogHelperModal post={p} isOpen={isBlogModalOpen} onClose={() => setIsBlogModalOpen(false)} />
                </div>

                {panoUrls.length > 0 ? (
                    <div className="mb-8">
                        <div className="flex flex-col items-start gap-4 mb-5 border-b border-dashed border-slate-200 pb-4 w-full">
                            <h4 className="text-[22px] sm:text-[38px] md:text-[42px] lg:text-[44px] font-black text-slate-900 flex items-center gap-3.5 sm:gap-5 max-w-full">
                                <div className="shrink-0 flex items-center justify-center animate-vr-glow !opacity-100 !block" style={{ opacity: 1, display: 'block' }}>
                                    <Naver360Icon className="w-[57px] h-[57px] sm:w-[90px] sm:h-[90px] drop-shadow-[0_4px_12px_rgba(11,37,69,0.35)]" />
                                </div>
                                <span 
                                    className="animate-vr-glow select-none break-keep"
                                    style={{
                                        color: '#0B2545'
                                    }}
                                >
                                    공간 실감 360° 현장 VR 투어
                                </span>
                            </h4>
                            {panoUrls.length > 1 && (
                                <div className="flex flex-wrap gap-2 overflow-x-auto sm:overflow-x-visible scrollbar-none max-w-full pb-1 shrink-0 select-none items-center scroll-smooth">
                                    {panoUrls.map((_, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setActivePanoIndex(idx)}
                                            className={`px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-black transition-all shrink-0 cursor-pointer ${activePanoIndex === idx ? 'bg-[#0B2545] text-white shadow-md border border-[#0B2545] scale-[1.03]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 border border-transparent'}`}
                                        >
                                            공간 {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative w-full rounded-none sm:rounded-2xl overflow-hidden shadow-sm">
                            <PannellumViewer 
                                key={`${p.id}-${panoUrls.length}`}
                                images={panoUrls} 
                                activeIndex={activePanoIndex} 
                                onSceneChange={(idx) => setActivePanoIndex(idx)} 
                                title={p.building || p.title}
                                address={p.dong ? `구미시 ${p.dong} ${p.address || ''}`.trim() : p.address}
                                thumbnail={p.category === '360 VR사진' ? (p.vrThumbnail || p.thumbnail) : (p.thumbnail || p.vrThumbnail)}
                            />
                            {/* Heart Button Overlay */}
                            <button 
                                onClick={(e) => toggleFavorite(e, p.id)}
                                className={`absolute top-4 right-4 sm:top-5 sm:right-5 z-[50] flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl border cursor-pointer ${
                                    favorites.includes(p.id) 
                                        ? 'bg-white/90 border-red-200' 
                                        : 'bg-[#0B2545]/60 hover:bg-[#0B2545]/80 border-white/20'
                                }`}
                                title={favorites.includes(p.id) ? "관심 매물 해제" : "관심 매물 등록"}
                            >
                                <i className={`fa-solid fa-heart text-2xl ${favorites.includes(p.id) ? 'text-red-500 scale-110' : 'text-white'} transition-transform`}></i>
                            </button>
                        </div>
                        {panoUrls.length > 1 && (
                            <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {panoUrls.map((pano, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setActivePanoIndex(idx)}
                                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${activePanoIndex === idx ? 'border-[#0B2545] scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={pano} className="w-full h-full object-cover" alt={`Scene ${idx + 1}`} loading="lazy" />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <span className="text-[8px] font-black text-white bg-black/40 px-1.5 py-0.5 rounded">Sc-{idx + 1}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div 
                        className={`aspect-[4/5] sm:aspect-[16/9] h-[400px] sm:h-auto min-h-[380px] sm:min-h-0 overflow-hidden rounded-none sm:rounded-2xl border-y sm:border border-slate-150 shadow-sm mb-6 sm:mb-8 watermark-container group relative select-none -mx-9 sm:mx-0 w-[calc(100%+4.5rem)] sm:w-full ${zoomedImageId === 'thumbnail' ? 'cursor-zoom-out shadow-2xl' : 'cursor-zoom-in hover:shadow-xl hover:border-[#0B2545]/30'}`}
                        style={{ 
                            transform: zoomedImageId === 'thumbnail' ? 'scale(2)' : 'scale(1)', 
                            zIndex: zoomedImageId === 'thumbnail' ? 999 : 1, 
                            transition: 'transform 0.25s ease-in-out' 
                        }}
                        onClick={() => {
                            setZoomedImageId(prev => prev === 'thumbnail' ? null : 'thumbnail');
                        }}
                    >
                        {/* Unique [녹색 라운드 사각 뱃지] for 대표사진 */}
                        <div id="representative-badge" className="absolute top-4 left-4 sm:top-5 sm:left-5 bg-[#0B2545] text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl border border-[#0B2545] shadow-md z-30 flex items-center gap-1.5 select-none hover:scale-[1.03] transition-all">
                            <span>대표사진</span>
                        </div>

                        <img 
                            src={p.thumbnail} 
                            className={`w-full h-full object-cover transition-transform duration-500 ${zoomedImageId === 'thumbnail' ? '' : 'group-hover:scale-105'}`} 
                            alt="매물 대표 사진"
                            loading="lazy"
                        />
                        {/* Exact center copyright watermark - House icon only, white with 15~20% opacity */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                            <i 
                                className="fa-solid fa-house select-none pointer-events-none text-4xl sm:text-6xl md:text-7xl"
                                style={{ 
                                    color: '#FFFFFF',
                                    opacity: 0.18,
                                }}
                            ></i>
                        </div>
                        {/* Hover status tip */}
                        <div className={`absolute top-4 right-4 sm:top-5 sm:right-5 bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full transition-opacity flex items-center gap-1 z-20 ${zoomedImageId === 'thumbnail' ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                            <i className="fa-solid fa-magnifying-glass-plus text-emerald-400"></i>
                            <span>크게 보기 (클릭)</span>
                        </div>

                        {/* Heart Button Overlay */}
                        <button 
                            onClick={(e) => toggleFavorite(e, p.id)}
                            className={`absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-30 flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl border cursor-pointer ${
                                favorites.includes(p.id) 
                                    ? 'bg-white/90 border-red-200' 
                                    : 'bg-[#0B2545]/60 hover:bg-[#0B2545]/80 border-white/20'
                            }`}
                            title={favorites.includes(p.id) ? "관심 매물 해제" : "관심 매물 등록"}
                        >
                            <i className={`fa-solid fa-heart text-2xl ${favorites.includes(p.id) ? 'text-red-500 scale-110' : 'text-white'} transition-transform`}></i>
                        </button>
                    </div>
                )}

                {imgUrls.length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-md font-bold text-slate-900 mb-4 flex items-center space-x-1.5">
                            <i className="fa-solid fa-camera text-[#0B2545]"></i>
                            <span>실사 추가 사진첩</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {imgUrls.map((url, i) => (
                                <div 
                                    key={i} 
                                    className={`aspect-[16/9] overflow-hidden rounded-xl border border-slate-150 shadow-sm bg-transparent watermark-container group relative select-none ${zoomedImageId === `img-${i}` ? 'cursor-zoom-out shadow-2xl' : 'cursor-zoom-in hover:shadow-xl hover:border-[#0B2545]/30'}`}
                                    style={{ 
                                        transform: zoomedImageId === `img-${i}` ? 'scale(2)' : 'scale(1)', 
                                        zIndex: zoomedImageId === `img-${i}` ? 999 : 1, 
                                        transition: 'transform 0.25s ease-in-out' 
                                    }}
                                    onClick={() => {
                                        setZoomedImageId(prev => prev === `img-${i}` ? null : `img-${i}`);
                                    }}
                                >
                                    <img 
                                        src={url.trim()} 
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target && typeof target === 'object') {
                                                target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=675&q=80';
                                            }
                                        }} 
                                        className={`w-full h-full object-cover transition-transform duration-500 ${zoomedImageId === `img-${i}` ? '' : 'group-hover:scale-105'}`} 
                                        alt={`실사 추가 사진 ${i+1}`}
                                        loading="lazy"
                                    />
                                    {/* Exact center copyright watermark - House icon only, white with 15~20% opacity */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                                        <i 
                                            className="fa-solid fa-house select-none pointer-events-none text-3xl sm:text-5xl"
                                            style={{ 
                                                color: '#FFFFFF',
                                                opacity: 0.18,
                                            }}
                                        ></i>
                                    </div>
                                    {/* Hover status tip */}
                                    <div className={`absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full transition-opacity flex items-center gap-1 ${zoomedImageId === `img-${i}` ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <i className="fa-solid fa-magnifying-glass-plus text-emerald-400"></i>
                                        <span>크게 보기 (클릭)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-6">
                    <div className="p-6 bg-emerald-50/50 border-l-4 border-emerald-500 rounded-r-2xl">
                        {p.intro && /<[a-z][\s\S]*>/i.test(String(p.intro)) ? (
                            <div className="text-sm font-semibold text-emerald-950/90 italic style-rich-intro break-words" dangerouslySetInnerHTML={{ __html: cleanNbsp(p.intro) }} />
                        ) : (
                            <p className="text-sm font-semibold text-emerald-900 italic">"{cleanNbsp(p.intro)}"</p>
                        )}
                    </div>
                    <div className="text-sm sm:text-base text-slate-600 markdown-content leading-relaxed space-y-4">
                        {p.body ? (() => {
                            let cleared = cleanNbsp(String(p.body).replace(/\\n/g, '\n'));
                            const isHtml = /<[a-z][\s\S]*>/i.test(cleared);

                            if (isHtml) {
                                // Rich HTML layout support with legal disclosures splitter
                                const legalKeywords = ['중개대상물', '법정 고시', '표시광고', '법정표시사항', '표시사항 고시란', '표시 광고'];
                                let splitIndex = -1;
                                for (const keyword of legalKeywords) {
                                    const idx = cleared.indexOf(keyword);
                                    if (idx !== -1) {
                                        let startIdx = idx;
                                        // Look backward around block containers for perfect tag structure integrity
                                        const precedingText = cleared.substring(0, idx);
                                        const blockMatches = [...precedingText.matchAll(/<(h[1-6]|p|div|blockquote|hr|table|ul|ol|li)\b/gi)];
                                        if (blockMatches.length > 0) {
                                            const lastBlockMatch = blockMatches[blockMatches.length - 1];
                                            if (lastBlockMatch.index !== undefined) {
                                                startIdx = lastBlockMatch.index;
                                            }
                                        } else {
                                            while (startIdx > 0 && cleared[startIdx] !== '\n') {
                                                startIdx--;
                                            }
                                        }
                                        splitIndex = startIdx;
                                        break;
                                    }
                                }

                                if (splitIndex !== -1) {
                                    const mainBody = cleared.substring(0, splitIndex).trim();
                                    const legalDisclosures = cleared.substring(splitIndex).trim();
                                    return (
                                        <div className="space-y-6 w-full">
                                            <div dangerouslySetInnerHTML={{ __html: mainBody }} className="style-rich-body break-words w-full" />
                                            <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm text-left">
                                                <div className="flex items-center gap-2 mb-3 text-slate-800 border-b border-slate-200 pb-2 flex-wrap">
                                                    <i className="fa-solid fa-file-shield text-emerald-600 text-base"></i>
                                                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900"> 법정 중개대상물 표시광고 확인서</h4>
                                                </div>
                                                <div dangerouslySetInnerHTML={{ __html: legalDisclosures }} className="text-[11px] sm:text-xs text-slate-600 font-sans bg-white border border-slate-100 p-4 rounded-xl shadow-inner max-h-[350px] overflow-y-auto w-full break-all" />
                                                <p className="text-[9px] sm:text-[10px] text-slate-400 mt-2 font-bold leading-relaxed flex items-center gap-1">
                                                    <i className="fa-solid fa-circle-exclamation text-amber-500"></i>
                                                    <span>공인중개사법시행령 제17조의2(중개대상물 명시의무)를 준수하는 공식 기재 고시란입니다.</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                return <div dangerouslySetInnerHTML={{ __html: cleared }} className="style-rich-body break-words w-full" />;
                            }

                            // Legacy plain text / markdown layout parsing
                            cleared = cleared.replace(/(?:^|\n)###\s*(.*?)(?=\n|$)/g, '\n\n[ $1 ]\n');
                            cleared = cleared.replace(/(?:^|\n)##\s*(.*?)(?=\n|$)/g, '\n\n[ $1 ]\n');
                            cleared = cleared.replace(/(?:^|\n)#\s*(.*?)(?=\n|$)/g, '\n\n[ $1 ]\n');

                            // Detect legal disclosures section
                            const legalKeywords = ['중개대상물', '법정 고시', '표시광고', '법정표시사항', '표시사항 고시란', '표시 광고'];
                            let splitIndex = -1;
                            for (const keyword of legalKeywords) {
                                const idx = cleared.indexOf(keyword);
                                if (idx !== -1) {
                                    let startIdx = idx;
                                    while (startIdx > 0 && cleared[startIdx] !== '\n') {
                                        startIdx--;
                                    }
                                    splitIndex = startIdx;
                                    break;
                                }
                            }

                            if (splitIndex !== -1) {
                                const mainBody = cleared.substring(0, splitIndex).trim();
                                const legalDisclosures = cleared.substring(splitIndex).trim();
                                return (
                                    <div className="space-y-6 whitespace-pre-wrap">
                                        <div className="whitespace-pre-wrap leading-relaxed">{mainBody}</div>
                                        <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm text-left">
                                            <div className="flex items-center gap-2 mb-3 text-slate-800 border-b border-slate-200 pb-2 flex-wrap">
                                                <i className="fa-solid fa-file-shield text-emerald-600 text-base"></i>
                                                <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900"> 법정 중개대상물 표시광고 확인서</h4>
                                            </div>
                                            <div className="text-[11px] sm:text-xs text-slate-600 whitespace-pre-wrap leading-loose font-mono bg-white border border-slate-100 p-4 rounded-xl shadow-inner max-h-[350px] overflow-y-auto w-full break-all">
                                                {legalDisclosures}
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-2 font-bold leading-relaxed flex items-center gap-1">
                                                <i className="fa-solid fa-circle-exclamation text-amber-500"></i>
                                                <span>공인중개사법시행령 제17조의2(중개대상물 명시의무)를 준수하는 공식 기재 고시란입니다.</span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            return <div className="whitespace-pre-wrap leading-relaxed">{cleared.trim()}</div>;
                        })() : ""}
                    </div>
                </div>



                <div className="mt-8">
                    <h4 className="text-md font-bold text-slate-900 mb-4 flex items-center space-x-1.5">
                        <i className="fa-solid fa-map-location-dot text-[#0B2545]"></i>
                        <span>실시간 대화형 정밀 위치</span>
                    </h4>
                    <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-slate-100 shadow-md relative bg-slate-100">
                        <iframe width="100%" height="100%" frameBorder="0" style={{border:0}} src={`https://maps.google.com/maps?q=${encodeURIComponent(p.address)}&t=&z=18&ie=UTF8&iwloc=&output=embed`} loading="lazy" allowFullScreen></iframe>
                    </div>
                </div>

                <div className="mt-12 p-6 sm:p-10 bg-[#0B2545] text-white rounded-3xl shadow-xl flex flex-col justify-center items-center gap-6 border border-slate-700/50 w-full max-w-sm sm:max-w-none mx-auto" style={{ background: '#0B2545 !important', backgroundColor: '#0B2545 !important', backgroundImage: 'none !important' }}>
                    <div className="text-center w-full overflow-hidden py-2">
                        <h4 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight animate-consult-glow flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
                            <i className="fa-solid fa-headset text-xl sm:text-2xl md:text-3xl shrink-0 opacity-90"></i>
                            <span>이 매물 관련 상세 중개 상담이 필요하신가요?</span>
                        </h4>
                        <p className="text-[11px] sm:text-base text-slate-300 mt-3 sm:mt-4 font-black">태왕 대표 공인중개사 직통 무료 상담</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                        <a 
                            href="tel:010-7590-0111" 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                openPhoneSelectModal(e, '010-7590-0111', isAdminLoggedIn ? p.ownerPhone : undefined); 
                            }} 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 sm:py-4.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black text-center flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30 transition-all select-none cursor-pointer">
                            <i className="fa-solid fa-mobile-screen"></i>
                            <span>모바일 연결</span>
                        </a>
                        <a 
                            href="tel:054-455-6789" 
                            className="bg-[#2a3547] hover:bg-[#344259] text-white px-6 py-3.5 sm:py-4.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black text-center flex items-center justify-center gap-2 border border-slate-700/50 transition-all select-none cursor-pointer">
                            <i className="fa-solid fa-phone"></i>
                            <span>유선전화 연결</span>
                        </a>
                        <button 
                            onClick={() => { 
                                if (typeof (window as any).openRequestModal === 'function') {
                                    (window as any).openRequestModal();
                                } else {
                                    setActiveSection('main'); 
                                    setTimeout(() => {
                                        const el = document.getElementById('quick-inquiry');
                                        if (el) el.scrollIntoView({behavior: 'smooth'});
                                    }, 150); 
                                }
                            }} 
                            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-3.5 sm:py-4.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black text-center flex items-center justify-center gap-2 transition-all w-full select-none cursor-pointer">
                            <i className="fa-solid fa-clipboard-question"></i>
                            <span>의뢰하기</span>
                        </button>
                    </div>
                </div>
                </>
                )}
            </article>

            <div className="mt-6 sm:mt-10 text-center w-full">
                <button onClick={() => { setActiveSection(fromSection); window.scrollTo(0, 0); }} className="w-full inline-flex items-center justify-center bg-[#0B2545] hover:bg-[#113866] text-white font-black px-6 sm:px-8 py-5 sm:py-6 rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-[#0B2545]/20 text-lg sm:text-2xl tracking-wider">
                    {"<<<< 앞 바로가기 <<<<"}
                </button>
            </div>

            {matchingRecs.length > 0 && (
                <div className="mt-8 sm:mt-12 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-md p-5 sm:p-8 w-full">
                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                        <span className="text-[#0B2545] text-lg"><i className="fa-solid fa-wand-magic-sparkles"></i></span>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">태왕 공인중개사가 추천하는 또 다른 구미 알짜 매물</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center gap-6 sm:gap-8 w-full">
                        {matchingRecs.map(rec => {
                            const isVideoCategory = rec.category === '유튜브' || rec.category === '네이버TV';
                            const videoUrl = rec.video || rec.naverTv || rec.naverBlogUrl || rec.blogUrl || (String(rec.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);
                            const customBlogUrl = rec.naverBlogUrl || rec.blogUrl;

                            return (
                                <div 
                                    key={rec.id} 
                                    onClick={() => {
                                        if (isVideoCategory && videoUrl) {
                                            useAppStore.getState().setVideoPopupUrl(videoUrl);
                                            return;
                                        }
                                        if (customBlogUrl) {
                                            const finalUrl = customBlogUrl.startsWith('http') ? customBlogUrl : `https://${customBlogUrl}`;
                                            window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                        } else {
                                            setSelectedPostId(rec.id);
                                        }
                                    }} 
                                    className="w-full max-w-[360px] h-auto bg-white rounded-[28px] border border-slate-200/80 shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_rgba(100,223,223,0.12)] hover:-translate-y-1.5 overflow-hidden transition-all duration-500 cursor-pointer flex flex-col justify-between shrink-0 group text-left"
                                >
                                    <div className="relative aspect-[16/9] w-full bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100 watermark-container">
                                        <img src={rec.category === '360 VR사진' ? (rec.vrThumbnail || rec.thumbnail) : (rec.thumbnail || rec.vrThumbnail)} onError={(e) => {
                                             const target = e.target as HTMLImageElement;
                                            if (target && typeof target === 'object') {
                                                target.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80';
                                            }
                                        }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" style={{ aspectRatio: '16/9' }} />
                                        
                                        {/* 카테고리 태그 (왼쪽 상단) */}
                                        <div className="absolute top-3 left-3 flex gap-1.5 z-20">
                                            <span className="bg-[#1c2541] text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-md uppercase">
                                                {rec.category}
                                            </span>
                                        </div>

                                        {isVideoCategory && videoUrl && (
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-all duration-300 z-10">
                                                {rec.category === '유튜브' ? (
                                                    <div className="w-16 h-11 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                                                        <svg className="w-full h-full text-[#FF0000] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" />
                                                            <polygon points="9.545 8.568 15.818 12 9.545 15.432" fill="white" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-14 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
                                                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                                            <defs>
                                                                <linearGradient id="naverTvLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                    <stop offset="0%" stopColor="#05D975" />
                                                                    <stop offset="100%" stopColor="#00CCD6" />
                                                                </linearGradient>
                                                            </defs>
                                                            <rect width="100" height="100" rx="28" fill="url(#naverTvLogoGrad)" />
                                                            <g transform="translate(4, 4)">
                                                                <path d="M 30 25 C 30 19.5 33.5 17 38 19.5 L 38 80.5 C 33.5 83 30 80.5 30 75 Z" fill="#FFFFFF" opacity="0.95" />
                                                                <path d="M 38 19.5 L 72.5 43.5 C 76.5 46.2 76.5 50.8 72.5 53.5 L 61 45.5 L 38 29.5 Z" fill="#FFFFFF" opacity="1" />
                                                                <path d="M 38 80.5 L 72.5 56.5 C 76.5 53.8 76.5 49.2 72.5 46.5 L 49.5 62.5 L 38 70.5 Z" fill="#FFFFFF" opacity="0.85" />
                                                                <path d="M 38 29.5 L 38 19.5 L 46 25 Z" fill="#EEEEEE" opacity="0.9" />
                                                                <path d="M 38 70.5 L 38 80.5 L 46 75 Z" fill="#DDDDDD" opacity="0.8" />
                                                            </g>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Exact center copyright watermark - House icon only, white with 15~20% opacity */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                                            <i
                                                className="fa-solid fa-house select-none pointer-events-none text-3xl sm:text-4xl"
                                                style={{
                                                    color: '#FFFFFF',
                                                    opacity: 0.18,
                                                }}
                                            ></i>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between text-left">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[190px] sm:max-w-[220px]">
                                                    {rec.address || rec.dong || '구미시'}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                                    {rec.floor && rec.totalFloor ? `${rec.floor}/${rec.totalFloor}층` : (rec.floor ? `${rec.floor}층` : (rec.totalFloor ? `${rec.totalFloor}층` : '지상층'))}
                                                </span>
                                            </div>
                                            <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-[#1c2541] line-clamp-1 leading-snug">
                                                {rec.building}
                                            </h4>
                                            <p className="text-[11px] font-semibold text-slate-500 line-clamp-1 leading-relaxed min-h-[1.25rem]">
                                                {typeof rec.remarks === 'string' ? rec.remarks.replace(/<[^>]*>/g, '') : stripHtml(rec.title)}
                                            </p>
                                            
                                            {customBlogUrl ? (
                                                <div className="bg-emerald-50/40 rounded-lg p-2 border border-emerald-100/50 flex items-center justify-between text-[11px] font-bold text-emerald-800 mt-2">
                                                    <span className="truncate max-w-[110px] sm:max-w-[140px] text-slate-400 font-normal">{customBlogUrl.replace(/^https?:\/\//, '')}</span>
                                                    <span className="text-emerald-700 hover:text-emerald-950 flex items-center gap-1 shrink-0 bg-white border border-emerald-200/50 px-2 py-0.5 rounded-md transition-colors shadow-sm text-[9px]">
                                                        <span>블로그 리뷰 연결</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5 items-center mt-2 min-h-[28px]">
                                                    <span className={`text-[10.5px] sm:text-[11px] font-black px-2 py-0.5 rounded-md border ${
                                                        rec.transactionType === '매매' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' :
                                                        rec.transactionType === '전세' ? 'bg-amber-50 text-amber-700 border-amber-200/85' :
                                                        'bg-[#0B2545]/10 text-[#0B2545] border-[#0B2545]/20'
                                                    }`}>
                                                        {rec.transactionType || '월세'}
                                                    </span>
                                                    {((rec.panoramas && rec.panoramas.trim()) || (rec.panoImage && rec.panoImage.trim())) && (
                                                        <span className="bg-[#0B2545]/10 text-[#0B2545] border border-[#0B2545]/20 text-[10.5px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse shrink-0">
                                                            <i className="fa-solid fa-house text-[10px]"></i>
                                                            <span>360°</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                                            <div className="text-sm sm:text-base font-black text-red-500 shrink-0">
                                                {formatDisplayPrice(rec.price, rec.transactionType || '월세')}
                                            </div>
                                            <div className="flex-grow flex items-center justify-end gap-1.5">
                                                <span className="text-[11px] text-[#0B2545] font-bold flex items-center gap-0.5">
                                                    <span>{customBlogUrl ? '블로그 리뷰' : '구경하기'}</span>
                                                    <i className="fa-solid fa-chevron-right text-[9px] group-hover:translate-x-0.5 transition-transform"></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-6 sm:mt-10 text-center w-full pb-4">
                <button onClick={() => { setActiveSection(fromSection); window.scrollTo(0, 0); }} className="w-full inline-flex items-center justify-center bg-[#0B2545] hover:bg-[#113866] text-white font-black px-6 sm:px-8 py-5 sm:py-6 rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-[#0B2545]/20 text-lg sm:text-2xl tracking-wider">
                    {"<<<< 앞 바로가기 <<<<"}
                </button>
            </div>


        </section>
    );
};
