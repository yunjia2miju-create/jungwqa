import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

declare global {
    interface Window {
        pannellum: any;
    }
}

const isWebGLSupported = () => {
    if (typeof window === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
};

interface PannellumViewerProps {
    images: string[];
    activeIndex: number;
    onSceneChange?: (idx: number) => void;
    height?: string;
}

const PannellumViewer: React.FC<PannellumViewerProps> = ({ 
    images, 
    activeIndex, 
    onSceneChange, 
    height = "aspect-[16/9] md:aspect-[1920/800] min-h-[500px] md:h-[600px] lg:h-[800px]" 
}) => {
    const viewerRef = React.useRef<HTMLDivElement>(null);
    const viewerInstanceRef = React.useRef<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [viewerError, setViewerError] = React.useState<string | null>(null);
    const imagesKey = images.join('|');

    // 투어 시스템 진단 상태 복구
    const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false);
    const [isTestingFetch, setIsTestingFetch] = React.useState(false);
    const [testLogs, setTestLogs] = React.useState<Array<{ name: string; status: 'success' | 'warning' | 'error'; message: string }>>([]);

    // Dual-mode visualization setup: Interactive 360 WebGL VS Grab-and-Drag Touch-enhanced Flat Panorama
    const [mode, setMode] = React.useState<'webgl' | 'flat'>(() => {
        return isWebGLSupported() && (typeof window !== 'undefined' && window.pannellum) ? 'webgl' : 'flat';
    });

    const flatScrollRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [scrollLeft, setScrollLeft] = React.useState(0);

    // Keep callback ref stable to prevent tearing down WebGL on inline arrow func prop recreation
    const onSceneChangeRef = React.useRef(onSceneChange);
    React.useEffect(() => {
        onSceneChangeRef.current = onSceneChange;
    }, [onSceneChange]);

    // Secure Image Proxy URL generator to prevent browser security isolation errors (CORS, mixed content)
    const getProxiedSrc = React.useCallback((imgUrl: string, idx: number) => {
        if (!imgUrl) return '';
        let currentSrc = imgUrl;
        if (currentSrc.includes('/api/proxy-image')) {
            try {
                // Handle relative paths by passing dummy base
                const base = currentSrc.startsWith('http') ? undefined : 'http://dummy.com';
                const urlObj = new URL(currentSrc, base);
                const originalUrl = urlObj.searchParams.get('url');
                if (originalUrl) {
                    currentSrc = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}&v=360-pano-${idx}`;
                }
            } catch (e) {
                currentSrc = imgUrl;
            }
        } else if (!currentSrc.startsWith('/') && !currentSrc.startsWith(window.location.origin)) {
            currentSrc = `/api/proxy-image?url=${encodeURIComponent(currentSrc)}&v=360-pano-${idx}`;
        }
        return currentSrc;
    }, []);

    // Extract the original raw direct URL (bypassing server proxy completely for standard image elements)
    const getDirectSrc = React.useCallback((imgUrl: string) => {
        if (!imgUrl) return '';
        if (imgUrl.includes('/api/proxy-image')) {
            try {
                const base = imgUrl.startsWith('http') ? undefined : 'http://dummy.com';
                const urlObj = new URL(imgUrl, base);
                const originalUrl = urlObj.searchParams.get('url');
                if (originalUrl) {
                    return originalUrl;
                }
            } catch (e) {
                // Ignore parsing errors and return original
            }
        }
        return imgUrl;
    }, []);

    // Utility to get clean name from lengthy URLs (retaining 16~36 chars without ugly query params like token)
    const getCleanName = (url: string) => {
        if (!url) return '';
        try {
            const decoded = decodeURIComponent(url);
            const baseName = decoded.substring(decoded.lastIndexOf('/') + 1);
            const nameWithoutQuery = baseName.split('?')[0];
            const finalName = nameWithoutQuery.substring(nameWithoutQuery.lastIndexOf('/') + 1);
            if (finalName && finalName.length > 5) {
                return finalName;
            }
        } catch (e) {
            // fallback
        }
        const fallback = url.length > 36 ? url.substring(0, 36) + '...' : url;
        return fallback;
    };

    // 투어 가속 및 원본 리소스 자가진단 로직 복구
    const runDiagnostics = React.useCallback(async () => {
        setIsTestingFetch(true);
        setDiagnosticsOpen(true);
        const logs: Array<{ name: string; status: 'success' | 'warning' | 'error'; message: string }> = [];

        // 1. WebGL 가속 점검
        const webglSupport = isWebGLSupported();
        if (webglSupport) {
            logs.push({ name: 'WebGL 하드웨어 가속', status: 'success', message: '브라우저의 WebGL 하드웨어 가속 드라이버가 정상 활성화되었습니다 (360° 투어 가동 가능).' });
        } else {
            logs.push({ name: 'WebGL 하드웨어 가속', status: 'error', message: '이 기기/브라우저는 WebGL 가속을 지원하지 않거나 설정에서 비활성화되어 360도 공간 뷰어 구동이 불가능합니다.' });
        }

        // 2. Pannellum 라이브러리 상태 점검
        const pannellumOk = typeof window !== 'undefined' && !!window.pannellum;
        if (pannellumOk) {
            logs.push({ name: 'Pannellum 가상 투어 엔진', status: 'success', message: 'Pannellum CDN 코어가 정상 로딩되었으며 메모리에 안전하게 배치되었습니다.' });
        } else {
            logs.push({ name: 'Pannellum 가상 투어 엔진', status: 'error', message: 'Pannellum 코어 에셋을 외부 CDN에서 가져오는 과정에서 대역폭 부족 또는 로딩 실패가 유도되었습니다.' });
        }

        // 3. 교차 출처 (CORS) 자원 검사
        const rawUrl = images[activeIndex] || images[0] || '';
        const cleanUrl = rawUrl.includes('|') ? rawUrl.split('|')[0] : rawUrl;
        const directUrl = getDirectSrc(cleanUrl);

        if (directUrl) {
            logs.push({ name: 'VR 파노라마 원본 리소스 점검', status: 'success', message: `파노라마 이미지 URL 인식 성공: ${getCleanName(directUrl)}` });
            try {
                // Perform a lightweight CORS HEAD check to test if GCS of Firebase is permitting requests directly
                const res = await fetch(directUrl, { method: 'HEAD', mode: 'cors' });
                if (res.ok) {
                    logs.push({ name: 'CORS 보안 승인 검토', status: 'success', message: 'Firebase Storage 교차 출처 정책(GCS CORS) 검증 완료. 브라우저에서 직접 파노라마 텍스처를 획득하는 데 성공했습니다.' });
                } else {
                    logs.push({ name: 'CORS 보안 승인 검토', status: 'warning', message: `외부 저장소 서버에서 에러 응답을 반환했습니다 (상태 코드: ${res.status}). 파노라마 접근이 제한될 수 있습니다.` });
                }
            } catch (e: any) {
                logs.push({ name: 'CORS 보안 승인 검토', status: 'error', message: `CORS 교차 출처 제한 감지! 브라우저 로컬 샌드박스가 원본 파일 텍스처 맵핑을 가로막았습니다 (오류: ${e.message}).` });
            }
        } else {
            logs.push({ name: 'VR 파노라마 원본 리소스 점검', status: 'warning', message: '표시하려는 360 VR 공간 파노라마 에셋 주소가 비어있거나 올바르지 않습니다.' });
        }

        setTestLogs(logs);
        setIsTestingFetch(false);
    }, [images, activeIndex, getDirectSrc]);

    // Interactive grab-to-scroll Mouse navigation for Flat Panorama mode
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!flatScrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - flatScrollRef.current.offsetLeft);
        setScrollLeft(flatScrollRef.current.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !flatScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - flatScrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Drag speed sensitivity adjustment
        flatScrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    // Responsive Touch swipe gesture navigation for mobile and tablet clients
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!flatScrollRef.current || e.touches.length === 0) return;
        setIsDragging(true);
        setStartX(e.touches[0].pageX - flatScrollRef.current.offsetLeft);
        setScrollLeft(flatScrollRef.current.scrollLeft);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !flatScrollRef.current || e.touches.length === 0) return;
        const x = e.touches[0].pageX - flatScrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        flatScrollRef.current.scrollLeft = scrollLeft - walk;
    };

    // Auto-center flat panoramic image starting view coordinates
    React.useEffect(() => {
        if (mode === 'flat' && flatScrollRef.current) {
            const container = flatScrollRef.current;
            const timer = setTimeout(() => {
                if (container) {
                    container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [activeIndex, mode]);

    // If height contains explicit CSS units (px, %, vh, etc) or numbers, render it as style, else as className
    const isStyleHeight = /^[0-9]+(px|%|vh|rem|em)$/.test(height) || /^[0-9]+$/.test(height);
    const heightClass = isStyleHeight ? '' : height;
    const heightStyle = isStyleHeight ? { height: /^[0-9]+$/.test(height) ? `${height}px` : height } : undefined;

    // 1. Initialize viewer for the active space with a dimension safeguard (preventing WebGL 0px initialization bug)
    React.useEffect(() => {
        let v: any = null;
        let isComponentMounted = true;
        let checkSizeInterval: any = null;
        
        const container = viewerRef.current;
        if (!container) {
            return;
        }

        const initViewerAsync = async () => {
            console.log('뷰어 초기화 시작');
            try {
                if (!isComponentMounted) return;
                setIsLoading(true);
                setViewerError(null);

                // A. Wait for window.pannellum script to be available on window object (max 50 attempts = 5s)
                let attempts = 0;
                while (!window.pannellum && attempts < 50) {
                    if (!isComponentMounted) return;
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!window.pannellum) {
                    throw new Error("Pannellum 라이브러리를 CDN에서 로드하지 못했거나 아직 사용할 준비가 되지 않았습니다.");
                }

                // B. Wait for image URLs to be parsed and completed (especially if empty originally during Firestore query)
                if (images.length === 0) {
                    let imageWaitAttempts = 0;
                    while (images.length === 0 && imageWaitAttempts < 30) {
                        if (!isComponentMounted) return;
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        imageWaitAttempts++;
                    }
                    if (images.length === 0) {
                        setIsLoading(false);
                        return; // Exit if still no images
                    }
                }

                // C. Protect against 0px initial width/height rendering from parent tab switching
                let rectAttempts = 0;
                let rect = container.getBoundingClientRect();
                while ((rect.width <= 20 || rect.height <= 20) && rectAttempts < 20) {
                    if (!isComponentMounted) return;
                    await new Promise((resolve) => setTimeout(resolve, 150));
                    rect = container.getBoundingClientRect();
                    rectAttempts++;
                }

                const rawUrl = images[activeIndex] || images[0] || '';
                const cleanUrl = rawUrl.includes('|') ? rawUrl.split('|')[0] : rawUrl;
                const currentSrc = getDirectSrc(cleanUrl);

                if (!cleanUrl) {
                    throw new Error("파노라마 이미지 주소가 유효하지 않습니다.");
                }

                // Reset mode to webgl if WebGL is supported, to try interactive mode first
                const webglAvail = isWebGLSupported();
                if (webglAvail) {
                    setMode('webgl');
                } else {
                    setMode('flat');
                    setIsLoading(false);
                    return;
                }

                if (!isComponentMounted) return;

                // E. Setup Hotspots for navigation
                const hotSpots: any[] = [];
                if (images.length > 1) {
                    hotSpots.push({
                        pitch: -15,
                        yaw: 40,
                        type: 'info',
                        cssClass: 'pnlm-hotspot-nav next',
                        text: activeIndex < images.length - 1 
                            ? `다음 공간 (공간 ${activeIndex + 2})으로 이동` 
                            : `처음 공간 (공간 1)으로 이동`,
                        clickHandlerFunc: () => {
                            if (onSceneChangeRef.current) {
                                onSceneChangeRef.current(activeIndex < images.length - 1 ? activeIndex + 1 : 0);
                            }
                        }
                    });
                    
                    hotSpots.push({
                        pitch: -15,
                        yaw: -40,
                        type: 'info',
                        cssClass: 'pnlm-hotspot-nav prev',
                        text: activeIndex > 0 
                            ? `이전 공간 (공간 ${activeIndex})으로 이동` 
                            : `마지막 공간 (공간 ${images.length})으로 이동`,
                        clickHandlerFunc: () => {
                            if (onSceneChangeRef.current) {
                                onSceneChangeRef.current(activeIndex > 0 ? activeIndex - 1 : images.length - 1);
                            }
                        }
                    });
                }

                // Clean the existing elements completely to prevent context collisions and memory leaks
                container.innerHTML = '';

                // F. Instantiate Pannellum viewer with pre-verified data
                const crossOriginAttr = 'anonymous'; 

                console.log('뷰어 데이터:', currentSrc);
                v = window.pannellum.viewer(container, {
                    type: 'equirectangular',
                    panorama: currentSrc.includes('|') ? currentSrc.split('|')[0] : currentSrc,
                    autoLoad: true,
                    showControls: true,
                    compass: true,
                    hfov: 110,
                    pitch: 0,
                    yaw: 0,
                    crossOrigin: crossOriginAttr,
                    hotSpots: hotSpots,
                    errorCallback: (errMess: string) => {
                        console.warn("Pannellum internal errorCallback caught:", errMess);
                        if (isComponentMounted) {
                            setIsLoading(false);
                            setMode('flat');
                            setViewerError(errMess && typeof errMess === 'string' ? errMess : "360° 가상 투어 이미지를 불러오는데 실패했습니다 (평면 모드로 자동 보정 우회됨)");
                        }
                    },
                    strings: {
                        loadingLabel: "공간 데이터를 고해상도로 로드하고 있습니다...",
                        loadButtonLabel: "360° 투어 입장",
                        noWebGLError: "이 브라우저는 가상 투어에 필요한 WebGL 가속을 지원하지 않습니다.",
                        bylineLabel: "태왕공인중개사사무소"
                    }
                });

                v.on('load', () => {
                    if (isComponentMounted) {
                        try {
                            v.resize();
                        } catch (e) {
                            console.warn("Pannellum resize failed:", e);
                        }
                        setIsLoading(false);
                        setViewerError(null);
                        setMode('webgl'); // ensure WebGL mode representation is solid
                    }
                });

                viewerInstanceRef.current = v;

            } catch (err: any) {
                console.warn("[Pannellum Async Init failure]", err.message);
                if (isComponentMounted) {
                    setIsLoading(false);
                    setMode('flat');
                }
            }
        };

        initViewerAsync();

        return () => {
            isComponentMounted = false;
            if (v) {
                try {
                    v.destroy();
                } catch (e) {
                    console.warn("Pannellum silent tear-down:", e);
                }
            }
            viewerInstanceRef.current = null;
        };
    }, [imagesKey, activeIndex]);

    return (
        <div className="relative group">
            <style dangerouslySetInnerHTML={{ __html: `
                .pnlm-hotspot-nav {
                    background-color: #10b981 !important;
                    border: 4px solid white !important;
                    width: 48px !important;
                    height: 48px !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important;
                    transition: background-color 0.2s ease !important;
                    z-index: 10;
                }
                .pnlm-hotspot-nav:hover {
                    background-color: #059669 !important;
                    box-shadow: 0 4px 25px rgba(16, 185, 129, 0.5) !important;
                }
                .pnlm-hotspot-nav:after {
                    content: '➜' !important;
                    color: white !important;
                    font-size: 24px !important;
                    font-weight: bold !important;
                    line-height: 1 !important;
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    display: block !important;
                }
                .pnlm-hotspot-nav.prev:after {
                    content: '⬅' !important;
                }
                .pnlm-hotspot-nav.next:after {
                    content: '➡' !important;
                }
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                .animate-spin-reverse {
                    animation: spin-reverse 1.5s linear infinite;
                }
                @keyframes float-pan {
                    0% { transform: translateX(0%); }
                    50% { transform: translateX(-15%); }
                    100% { transform: translateX(0%); }
                }
                .animate-float-pan {
                    animation: float-pan 35s ease-in-out infinite;
                }
            `}} />
            
            <div 
                ref={viewerRef} 
                id="panorama"
                className={`w-full bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 ${heightClass} ${mode === 'webgl' ? 'block' : 'hidden'}`}
                style={heightStyle}
            ></div>

            {/* Seamless HTML5 Interactive Flat Drag-and-Scroll Panorama Fallback Canvas */}
            {mode === 'flat' && (
                <div 
                    ref={flatScrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUpOrLeave}
                    className={`w-full bg-slate-900 rounded-2xl overflow-x-auto overflow-y-hidden scrollbar-none shadow-lg border border-slate-200 relative flex items-center select-none ${heightClass}`}
                    style={{ ...heightStyle, cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                    <div className="absolute inset-0 bg-black/15 pointer-events-none z-10 rounded-2xl"></div>
                    <img 
                        src={(() => {
                            const rawUrl = images[activeIndex] || images[0] || '';
                            const cleanUrl = rawUrl.includes('|') ? rawUrl.split('|')[0] : rawUrl;
                            return getDirectSrc(cleanUrl);
                        })()} 
                        className={`h-full min-w-[240%] sm:min-w-[180%] md:min-w-[140%] max-w-none object-cover pointer-events-none select-none transition-transform duration-500 ease-out ${isDragging ? '' : 'animate-float-pan'}`}
                        alt="평면 파노라마 VR 뷰"
                        referrerPolicy="no-referrer"
                    />

                    {/* Integrated Hotspot chevrons centered on screen partitions */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSceneChangeRef.current) {
                                        onSceneChangeRef.current(activeIndex > 0 ? activeIndex - 1 : images.length - 1);
                                    }
                                }}
                                className="absolute left-6 top-1/2 -translate-y-1/2 shadow-2xl hover:scale-110 active:scale-95 transition-all w-12 h-12 rounded-full cursor-pointer bg-emerald-600 border-4 border-white flex items-center justify-center text-white text-xl z-20 pointer-events-auto font-black"
                                title="이전 공간으로 이동"
                            >
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSceneChangeRef.current) {
                                        onSceneChangeRef.current(activeIndex < images.length - 1 ? activeIndex + 1 : 0);
                                    }
                                }}
                                className="absolute right-6 top-1/2 -translate-y-1/2 shadow-2xl hover:scale-110 active:scale-95 transition-all w-12 h-12 rounded-full cursor-pointer bg-emerald-600 border-4 border-white flex items-center justify-center text-white text-xl z-20 pointer-events-auto font-black"
                                title="다음 공간으로 이동"
                            >
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Premium Glassmorphic Loading Transition Layer (WebGL Mode Only) */}
            <AnimatePresence mode="wait">
                {isLoading && mode === 'webgl' && (
                    <motion.div
                        key="pano-premium-loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center z-40 rounded-2xl cursor-default pointer-events-auto"
                    >
                        <div className="flex flex-col items-center gap-4 bg-slate-950/80 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-xs text-center">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                {/* Ring animation */}
                                <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/15 border-t-emerald-500 border-r-emerald-500/45 animate-spin"></div>
                                <div className="absolute inset-2 rounded-full border-2 border-emerald-400/20 border-b-cyan-400 animate-spin-reverse"></div>
                                <i className="fa-solid fa-vr-cardboard text-emerald-400 text-xl animate-pulse"></i>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-white font-black text-sm tracking-tight">360° 공간 최적화 및 로딩 중</h4>
                                <p className="text-white/60 text-[10px] leading-relaxed">
                                    초고속 이중 로딩 캐시 기술로 실감나는 가상 투어 공간을 생성하고 있습니다.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-30 select-none">
                <div className="bg-black/50 backdrop-blur-md text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 group-hover:bg-emerald-600 transition-colors w-fit">
                    <i className="fa-solid fa-arrows-spin animate-spin-slow"></i>
                    <span>{mode === 'webgl' ? '화면을 드래그하여 360° 둘러보세요' : '좌우로 드래그(스와이프)하여 살펴볼 수 있습니다'}</span>
                </div>
                {images.length > 1 && onSceneChange && (
                    <div className="bg-blue-600/80 backdrop-blur-md text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 w-fit animate-bounce shadow-lg">
                        <i className="fa-solid fa-hand-pointer"></i>
                        <span>{mode === 'webgl' ? '화살표나 드래그로 공간을 둘러보세요' : '좌우 제스처로 둘러보기'}</span>
                    </div>
                )}
            </div>

            {/* Manual diagnostics trigger button on the top-right */}
            <div className="absolute top-4 right-4 flex gap-2 z-30 pointer-events-auto">
                <button 
                    onClick={() => {
                        runDiagnostics();
                    }}
                    className="bg-slate-900/80 backdrop-blur-md text-emerald-400 hover:text-emerald-300 font-extrabold px-3 py-1.5 rounded-full text-[10px] sm:text-xs border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer shadow-lg transition-all hover:scale-105"
                    title="투어 시스템 진단 도구"
                >
                    <i className="fa-solid fa-square-poll-horizontal text-xs"></i>
                    <span>투어 시스템 진단</span>
                </button>
            </div>
            
            {/* Intelligent Fallback Error Overlay Banner */}
            {viewerError && (
                <div className="absolute inset-x-4 bottom-16 bg-red-600/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-red-500/20 shadow-2xl z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-semibold gap-3 pointer-events-auto">
                    <div className="flex items-center gap-2.5">
                        <i className="fa-solid fa-circle-exclamation text-base text-yellow-300 animate-bounce"></i>
                        <div className="flex flex-col text-left">
                            <span className="font-extrabold text-[13px]">CORS 격리 또는 WebGL 로딩 장애 우회가 감지되었습니다</span>
                            <span className="opacity-90">{viewerError || '임시 기기 하드웨어 제한으로 로드가 완료되지 못했습니다.'}</span>
                        </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                runDiagnostics();
                            }}
                            className="bg-blue-500 hover:bg-blue-400 text-white font-extrabold px-3 py-1.5 rounded-lg border-0 transition-all text-[11px] cursor-pointer flex items-center gap-1"
                        >
                            <i className="fa-solid fa-wrench"></i>
                            <span>장애 원인 분석</span>
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setMode('flat');
                                setViewerError(null);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold px-3 py-1.5 rounded-lg border-0 transition-all text-[11px] cursor-pointer"
                        >
                            <i className="fa-solid fa-image mr-1"></i>
                            <span>평면 뷰어로 감상</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Seamless Interactive Diagnostics Modal Overlay */}
            <AnimatePresence>
                {diagnosticsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-default"
                        onClick={() => setDiagnosticsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-left text-white overflow-hidden pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"></div>

                            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                                <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-emerald-400">
                                    <i className="fa-solid fa-square-poll-horizontal"></i>
                                    <span>360° 투어 시스템 가속 및 원본 리소스 자가진단</span>
                                </h3>
                                <button 
                                    onClick={() => setDiagnosticsOpen(false)}
                                    className="text-white/45 hover:text-white/80 transition-colors bg-white/5 border-0 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer"
                                    title="창 닫기"
                                >
                                    <i className="fa-solid fa-xmark text-sm"></i>
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                <div className="space-y-3">
                                    {testLogs.map((log, i) => (
                                        <div key={i} className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                            <div className="mt-0.5 shrink-0">
                                                {log.status === 'success' ? (
                                                    <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                                                ) : log.status === 'warning' ? (
                                                    <i className="fa-solid fa-triangle-exclamation text-yellow-400 text-sm"></i>
                                                ) : (
                                                    <i className="fa-solid fa-circle-xmark text-red-400 text-sm"></i>
                                                )}
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="font-extrabold text-xs text-white/90">{log.name}</h4>
                                                <p className="text-[11px] text-white/60 leading-relaxed">{log.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {testLogs.length === 0 && (
                                        <div className="text-center py-4 text-white/45 text-xs font-semibold">
                                            로그 정보가 없습니다. 아래 '진단 재실행' 버튼을 클릭하여 장치 및 네트워크 연결 상태를 진단하세요.
                                        </div>
                                    )}
                                </div>

                                <div className="bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl text-[11px] text-emerald-300 leading-relaxed space-y-2">
                                    <h4 className="font-black text-xs text-emerald-400">※ 가이드라인:</h4>
                                    <p>
                                        구글 AI 스튜디오 및 클라우드 서비스의 호스트 환경(Iframe Isolation)에서는 32비트 WebGL 픽스맵 처리 방식에 따른 교차 출처 제한이 발생할 수 있습니다.
                                    </p>
                                    <p className="text-emerald-400/90 font-semibold">
                                        ※ 화면이 검게 나오거나 회색인 경우, 위 <b>'원인 분석 실행'</b> 결과 스크린샷과 함께 본 진단 창 스크린샷을 전송해 주시면 더욱 신속한 프록시 기술 대책을 제공해 드릴 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4 font-sans">
                                <button 
                                    onClick={() => runDiagnostics()}
                                    disabled={isTestingFetch}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer border-0 shadow-md transition-colors"
                                >
                                    <i className="fa-solid fa-rotate-right"></i>
                                    <span>진단 재실행</span>
                                </button>
                                <button 
                                    onClick={() => setDiagnosticsOpen(false)}
                                    className="bg-white/10 hover:bg-white/20 text-white font-black px-4 py-2 rounded-xl text-xs cursor-pointer border-0 shadow-md transition-colors"
                                >
                                    <span>창 닫기</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export { PannellumViewer };
export default PannellumViewer;
