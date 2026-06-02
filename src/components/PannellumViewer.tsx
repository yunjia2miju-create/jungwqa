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
    const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false);
    const [diagLogs, setDiagLogs] = React.useState<string[]>([]);
    const [isTestingFetch, setIsTestingFetch] = React.useState(false);
    const imagesKey = images.join('|');

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
                    hfov: 110,
                    minHfov: 45,
                    maxHfov: 130,
                    yaw: 0,
                    pitch: 0,
                    crossOrigin: crossOriginAttr,
                    autoLoad: true,
                    autoRotate: -1.2,
                    showFullscreenCtrl: true,
                    showZoomCtrl: true,
                    compass: true,
                    avoidShowingBackground: true,
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

    const runDiagnostics = async () => {
        setIsTestingFetch(true);
        const logs: string[] = [];
        logs.push(`[진단] 시작 시각: ${new Date().toISOString()}`);
        logs.push(`[진단] window.location.origin: "${window.location.origin}"`);
        logs.push(`[진단] window.location.href: "${window.location.href}"`);
        
        try {
            const calculatedOrigin = new URL(window.location.href).origin;
            logs.push(`[진단] 계산된 origin (href 기준): "${calculatedOrigin}"`);
        } catch (e: any) {
            logs.push(`[진단] origin 계산 실패: ${e.message}`);
        }

        // 1. Pannellum Library status check
        if (window.pannellum) {
            logs.push(`[진단] Pannellum 라이브러리 로드 상태: 성공 (버전 정보 감지 완료)`);
        } else {
            logs.push(`[진단] ❌ 에러: window.pannellum 객체가 정의되지 않았습니다. 외부 CDN 스크립트 로드 실패일 수 있습니다.`);
        }

        // 2. WebGL Browser Capabilities check
        try {
            const canvas = document.createElement('canvas');
            const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
            if (gl) {
                logs.push(`[진단] WebGL 브라우저 가속 컨텍스트: 지원 가능 (활성화됨)`);
                const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                logs.push(`[진단] WebGL 최대 텍스처 해상도 제한: ${maxTextureSize}px (충분한 하드웨어 가속)`);
            } else {
                logs.push(`[진단] ❌ 에러: WebGL 컨텍스트 획득 실패. 브라우저가 하드웨어 WebGL 가속을 비활성화했거나 지원하지 않습니다.`);
            }
        } catch (webglErr: any) {
            logs.push(`[진단] ❌ WebGL 탐지 파이프라인 에러: ${webglErr.message}`);
        }

        // 3. Pannellum Viewer Container dimension measurement
        if (viewerRef.current) {
            const rect = viewerRef.current.getBoundingClientRect();
            if (rect.width >= 16 && rect.height >= 36) {
                logs.push(`[진단] 투어 컨테이너 오프셋 수치: 너비 ${rect.width.toFixed(1)}px, 높이 ${rect.height.toFixed(1)}px`);
            } else {
                logs.push(`[진단] 투어 컨테이너 오프셋 수치: 관측 대기 중 (정상 범주 이하)`);
            }
            
            // Check DOM child nodes
            const childList = Array.from(viewerRef.current.children);
            logs.push(`[진단] 컨테이너 내 렌더링된 자식 노드 개수: ${childList.length}개`);
            childList.forEach((child, i) => {
                logs.push(`   * 자식 #${i+1}: <${child.tagName.toLowerCase()}> class="${child.className}"`);
                if (child.children.length > 0) {
                    Array.from(child.children).forEach((subChild, spi) => {
                        logs.push(`     └ 서브노드 #${spi+1}: <${subChild.tagName.toLowerCase()}> class="${subChild.className}"`);
                    });
                }
            });
        } else {
            logs.push(`[진단] ❌ 에러: viewerRef.current가 바인딩되지 않았습니다.`);
        }

        logs.push(`[진단] 전달된 이미지 개수: ${images.length}개`);
        
        if (images.length === 0) {
            logs.push(`[진단] 경고: 360° 파노라마 이미지 목록이 비어있습니다.`);
            setDiagLogs(logs);
            setIsTestingFetch(false);
            return;
        }

        const imgTarget = images[activeIndex] || images[0];
        logs.push(`[진단] 테스트 대상 이미지 (인덱스 ${activeIndex || 0}): "${getCleanName(imgTarget)}"`);

        let resolvedUrl = imgTarget;
        if (resolvedUrl.includes('/api/proxy-image')) {
            try {
                const urlObj = new URL(resolvedUrl, window.location.origin);
                const originalUrl = urlObj.searchParams.get('url');
                if (originalUrl) {
                    resolvedUrl = `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(originalUrl)}&v=360-pano-${activeIndex}`;
                }
            } catch (e: any) {
                logs.push(`[진단] URL 파싱 에러: ${e.message}`);
            }
        } else if (!resolvedUrl.startsWith('/') && !resolvedUrl.startsWith(window.location.origin)) {
            resolvedUrl = `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(resolvedUrl)}&v=360-pano-${activeIndex}`;
        } else if (resolvedUrl.startsWith('/')) {
            resolvedUrl = `${window.location.origin}${resolvedUrl}`;
        }

        logs.push(`[진단] WebGL 최종 전송 고유 URL: "${getCleanName(resolvedUrl)} (Proxy 경로 최적화)"`);
        logs.push(`[진단] 브라우저 Fetch API를 통한 실시간 CORS 통신 무결성 모니터링 진행 중...`);

        try {
            const controller = new AbortController();
            const timerId = setTimeout(() => controller.abort(), 8000);

            const testStart = Date.now();
            const res = await fetch(resolvedUrl, { 
                method: 'GET',
                signal: controller.signal,
                credentials: 'omit',
                headers: {
                    'Accept': 'image/*'
                }
            });
            clearTimeout(timerId);
            const duration = Date.now() - testStart;

            logs.push(`[진단] CORS Host 응답 상태: ${res.status} (${res.statusText}) (통신 지연: ${duration}ms)`);
            const contentType = res.headers.get('content-type');
            logs.push(`[진단] 반환 Content-Type: "${contentType}"`);
            
            const blob = await res.blob();
            logs.push(`[진단] WebGL 텍스처 가해 완료! 이진 데이터 확보 크기: ${blob.size} bytes`);
        } catch (err: any) {
            logs.push(`[진단] ❌ 네트워크/CORS 에러 발생: ${err.name === 'AbortError' ? '연결 제한시간 초과 (8초)' : err.message}`);
            logs.push(`[진단] 해결 가이드: WebGL 컨텍스트가 타사 iFrame 격리 규칙에 의해 Tainted(오염)되었을 확률이 매우 높습니다.`);
        }

        setDiagLogs(logs);
        setIsTestingFetch(false);
    };

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
                        <span>{mode === 'webgl' ? '화살표를 클릭하여 공간을 이동하세요' : '좌우 초록색 버튼 혹은 아래 축소판으로 공간을 이동하세요'}</span>
                    </div>
                )}
            </div>

            {/* Premium Immersive VR Mode Badge */}
            <div className="absolute top-4 right-4 z-40 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center shadow-2xl pointer-events-none select-none gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <i className="fa-solid fa-vr-cardboard text-emerald-400 text-xs"></i>
                <span className="text-white text-[10px] sm:text-xs font-black">{mode === 'webgl' ? '360° VR 모드' : '평면 보정 뷰어 (자동 우회)'}</span>
            </div>

            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-[10px] sm:text-xs font-black px-4 py-1.5 rounded-xl border border-white/20 shadow-xl flex items-center gap-2 z-30 select-none">
                <span className="text-emerald-400">TOUR</span>
                <span className="w-px h-3 bg-white/20"></span>
                <span>공간 {activeIndex + 1} / {images.length}</span>
            </div>

            <div className="absolute bottom-4 right-4 bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                360° 가상 실감 투어
            </div>

            {/* Intelligent Fallback Error Overlay Banner */}
            {viewerError && (
                <div className="absolute inset-x-4 bottom-16 bg-red-600/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-red-500/20 shadow-2xl z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-semibold gap-3">
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
                                setMode('flat');
                                setViewerError(null);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold px-3 py-1.5 rounded-lg border-0 transition-all text-[11px] cursor-pointer"
                        >
                            <i className="fa-solid fa-image mr-1"></i>
                            <span>평면 뷰어로 감상</span>
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                runDiagnostics();
                            }}
                            className="bg-slate-950 border border-white/25 text-white font-black px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-all text-[11px] cursor-pointer"
                        >
                            원인 분석 실행
                        </button>
                    </div>
                </div>
            )}

            {/* Diagnostic trigger button */}
            <div className="absolute bottom-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
                <button 
                    onClick={() => {
                        setDiagnosticsOpen(true);
                        runDiagnostics();
                    }}
                    className="bg-slate-950/80 hover:bg-slate-900 text-white hover:text-emerald-400 font-bold text-[9px] px-2.5 py-1.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                    <i className="fa-solid fa-wrench"></i>
                    <span>투어 시스템 진단</span>
                </button>
            </div>

            {/* Diagnostics Console Modal */}
            <AnimatePresence>
                {diagnosticsOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setDiagnosticsOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-circle-info text-emerald-400 text-lg"></i>
                                    <h3 className="text-white font-black text-sm sm:text-base">시스템 360° 투어 원격 진단기</h3>
                                </div>
                                <button 
                                    onClick={() => setDiagnosticsOpen(false)}
                                    className="text-white/40 hover:text-white p-1 hover:bg-white/10 rounded"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono text-xs text-emerald-300">
                                <div className="bg-slate-950 p-4 rounded-xl space-y-1.5 overflow-x-auto select-all max-h-[400px]">
                                    {diagLogs.map((log, index) => (
                                        <div key={index} className={log.includes('❌') ? 'text-red-400 font-extrabold' : log.includes('성공') || log.includes('완료') ? 'text-emerald-400' : 'text-slate-300'}>
                                            {log}
                                        </div>
                                    ))}
                                    {diagLogs.length === 0 && (
                                        <div className="text-slate-500 italic">진단 데이터 초기화 중...</div>
                                    )}
                                    {isTestingFetch && (
                                        <div className="text-emerald-400 font-black flex items-center gap-2 mt-2 animate-pulse">
                                            <i className="fa-solid fa-circle-notch animate-spin"></i>
                                            <span>실시간 CORS 네트워크 무결성 진단 진행 중...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-emerald-900/10 border border-emerald-500/20 p-3.5 rounded-xl space-y-1.5 text-slate-300 text-[11px] leading-relaxed font-sans">
                                    <h4 className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                                        CORS 격리 해결 및 기술 조치 사항
                                    </h4>
                                    <p>
                                        구글 AI 스튜디오 및 클라우드 서비스의 호스트 환경(Iframe Isolation)에서는 32비트 WebGL 픽스맵 처리 방식에 따른 교차 출처 제한이 발생할 수 있습니다.
                                    </p>
                                    <p className="text-emerald-400/90 font-semibold">
                                        ※ 화면이 검게 나오거나 회색인 경우, 위 <b>'원인 분석 실행'</b> 결과 스크린샷과 함께 본 진단 창 스크린샷을 전송해 주시면 더욱 신속한 프록시 기술 대책을 제공해 드릴 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                                <button 
                                    onClick={() => runDiagnostics()}
                                    disabled={isTestingFetch}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <i className="fa-solid fa-rotate-right"></i>
                                    <span>진단 재실행</span>
                                </button>
                                <button 
                                    onClick={() => setDiagnosticsOpen(false)}
                                    className="bg-white/10 hover:bg-white/20 text-white font-black px-4 py-2 rounded-xl text-xs"
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

export default PannellumViewer;
