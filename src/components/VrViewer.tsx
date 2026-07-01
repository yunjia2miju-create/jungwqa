import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Minus, Maximize, Minimize, Home, Hand } from 'lucide-react';
import { Naver360Icon } from './Naver360Icon';

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

interface VrViewerProps {
    images: string[];
    activeIndex: number;
    onSceneChange?: (idx: number) => void;
    height?: string;
    title?: string;
    address?: string;
    thumbnail?: string;
}

const VrViewer: React.FC<VrViewerProps> = ({ 
    images, 
    activeIndex, 
    onSceneChange, 
    height = "h-[450px] md:h-[580px] lg:h-[680px] xl:h-[760px] aspect-auto w-full",
    title,
    address,
    thumbnail
}) => {
    const viewerRef = React.useRef<HTMLDivElement>(null);
    const viewerInstanceRef = React.useRef<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [viewerError, setViewerError] = React.useState<string | null>(null);
    const imagesKey = images.join('|');

    const [isStarterClicked, setIsStarterClicked] = React.useState(false);
    const [isStarterDismissed, setIsStarterDismissed] = React.useState(false);

    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const fullscreenViewerRef = React.useRef<HTMLDivElement>(null);
    const fullscreenViewerInstanceRef = React.useRef<any>(null);

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

    React.useEffect(() => {
        setIsStarterClicked(false);
    }, [imagesKey]);

    React.useEffect(() => {
        if (isStarterClicked) {
            const timer = setTimeout(() => {
                setIsStarterDismissed(true);
            }, 350);
            return () => clearTimeout(timer);
        } else {
            setIsStarterDismissed(false);
        }
    }, [isStarterClicked]);

    React.useEffect(() => {
        // Pointer interactions complete
    }, []);

    // Premium physical compass tracking state & damping math
    const [currentYaw, setCurrentYaw] = React.useState(0);
    const targetYawRef = React.useRef(0);
    const currentYawRef = React.useRef(0);

    React.useEffect(() => {
        let animId: number;
        const updateYaw = () => {
            let activeViewer = null;
            if (isFullscreen && fullscreenViewerInstanceRef.current) {
                activeViewer = fullscreenViewerInstanceRef.current;
            } else if (viewerInstanceRef.current) {
                activeViewer = viewerInstanceRef.current;
            }

            if (activeViewer) {
                try {
                    const rawYaw = activeViewer.getYaw() || 0;
                    targetYawRef.current = rawYaw;
                } catch (e) {
                    // Ignore transient errors during viewer reload
                }
            } else if (mode === 'flat' && flatScrollRef.current) {
                const container = flatScrollRef.current;
                const scrollRange = container.scrollWidth - container.clientWidth;
                if (scrollRange > 0) {
                    const ratio = container.scrollLeft / scrollRange;
                    targetYawRef.current = (ratio - 0.5) * 360;
                }
            }

            // Implement buttery-smooth wrapping compass rotation
            let diff = targetYawRef.current - currentYawRef.current;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;

            const damping = 0.08; // Luxuriously responsive physical damping factor
            currentYawRef.current += diff * damping;

            if (currentYawRef.current < -185) currentYawRef.current += 360;
            if (currentYawRef.current > 185) currentYawRef.current -= 360;

            setCurrentYaw(currentYawRef.current);
            animId = requestAnimationFrame(updateYaw);
        };

        animId = requestAnimationFrame(updateYaw);
        return () => cancelAnimationFrame(animId);
    }, [isFullscreen, mode]);

    const renderPremiumCompass = (sizeClass = "vr-compass-responsive", absolutePosClass = "absolute vr-compass-position") => {
        return (
            <div className={`${absolutePosClass} z-30 pointer-events-none select-none ${sizeClass}`}>
                {/* Clean, high-contrast pure white circular base background */}
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden relative">
                    
                    {/* Rotating Inner compass disc containing needle and [북], [남] letters */}
                    <div 
                        className="w-[85%] h-[85%] relative flex flex-col items-center justify-between py-1.5 sm:py-2 select-none" 
                        style={{ transform: `rotate(${-currentYaw}deg)`, transformOrigin: "center center" }}
                    >
                        {/* 정북 방향: 북 (가독성 높은 Bold 빨간색 텍스트) */}
                        <span className="text-red-600 font-extrabold text-[12px] sm:text-[14px] md:text-[16px] leading-none select-none">북</span>
                        
                        {/* 고해상도 SVG 벡터 바늘 침 */}
                        <svg viewBox="0 0 40 120" className="h-[52%] w-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] select-none pointer-events-none">
                            {/* 상단: 날카롭고 강렬한 빨간색 삼각형 화살표 바늘 (3D 음영 적용 기하학) */}
                            <polygon points="20,0 8,60 20,60" fill="#ef4444" />
                            <polygon points="20,0 20,60 32,60" fill="#dc2626" />
                            
                            {/* 하단: 차분하고 선명한 회색 삼각형 화살표 바늘 (3D 음영 적용 기하학) */}
                            <polygon points="20,120 8,60 20,60" fill="#e5e7eb" />
                            <polygon points="20,120 20,60 32,60" fill="#9ca3af" />
                        </svg>
                        
                        {/* 정남 방향: 남 (가독성 높은 Bold 어두운 회색 텍스트) */}
                        <span className="text-slate-600 font-extrabold text-[12px] sm:text-[14px] md:text-[16px] leading-none select-none">남</span>
                    </div>
                </div>
            </div>
        );
    };

    // Custom high-fidelity zoom transition handler
    const handleZoom = (direction: 'in' | 'out', isFullscreenView = false) => {
        const activeViewer = isFullscreenView ? fullscreenViewerInstanceRef.current : viewerInstanceRef.current;
        if (activeViewer) {
            try {
                const currentHfov = activeViewer.getHfov();
                let newHfov = currentHfov;
                if (direction === 'in') {
                    newHfov = Math.max(60, currentHfov - 10);
                } else {
                    newHfov = Math.min(115, currentHfov + 10);
                }
                activeViewer.setHfov(newHfov, 300);
            } catch (e) {
                console.warn("Failed to zoom:", e);
            }
        }
    };

    // Custom high-fidelity view alignment & reset handler
    const handleResetView = (isFullscreenView = false) => {
        const activeViewer = isFullscreenView ? fullscreenViewerInstanceRef.current : viewerInstanceRef.current;
        if (activeViewer) {
            try {
                activeViewer.setPitch(0, 300);
                activeViewer.setYaw(0, 300);
                activeViewer.setHfov(105, 300);
            } catch (e) {
                console.warn("Failed to reset view:", e);
            }
        } else if (mode === 'flat' && flatScrollRef.current) {
            const container = flatScrollRef.current;
            container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
        }
    };

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

    // Complete comprehensive background concurrent prefetcher to load all images instantly in parallel
    React.useEffect(() => {
        if (!images || images.length <= 1) return;
        
        images.forEach((imgUrl, idx) => {
            if (!imgUrl) return;
            const cleanUrl = imgUrl.includes('|') ? imgUrl.split('|')[0] : imgUrl;
            const directUrl = getDirectSrc(cleanUrl);
            if (directUrl) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = directUrl;
            }
        });
    }, [images, getDirectSrc]);

    // Background prefetching engine to completely delete transition latency (로딩 0초 컷)
    React.useEffect(() => {
        if (!images || images.length <= 1) return;

        const nextIndex = (activeIndex + 1) % images.length;
        const prevIndex = (activeIndex - 1 + images.length) % images.length;
        const indicesToPrefetch = Array.from(new Set([nextIndex, prevIndex]));

        indicesToPrefetch.forEach((idx) => {
            const rawUrl = images[idx];
            if (!rawUrl) return;
            const cleanUrl = rawUrl.includes('|') ? rawUrl.split('|')[0] : rawUrl;
            const directUrl = getDirectSrc(cleanUrl);
            if (directUrl) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = directUrl;
            }
        });
    }, [images, activeIndex, getDirectSrc]);

    // Full screen / Theater mode initialization effect
    React.useEffect(() => {
        if (!isFullscreen) return;
        let v_fullscreen: any = null;
        let isModalMounted = true;
        
        const container = fullscreenViewerRef.current;
        if (!container) return;

        const initFullscreenViewer = async () => {
            try {
                // Wait briefly for modal transition to finish so ref attaches
                await new Promise((resolve) => setTimeout(resolve, 310));
                if (!isModalMounted) return;
                const container_ready = fullscreenViewerRef.current;
                if (!container_ready) return;

                if (!window.pannellum) return;

                // Setup hotspots (완전히 차단: 3D 가상 공간 안의 탐색 핫스팟 제거)
                const hotSpots: any[] = [];

                const rawUrl = images[activeIndex] || images[0] || '';
                const cleanUrl = rawUrl.includes('|') ? rawUrl.split('|')[0] : rawUrl;
                const currentSrc = getDirectSrc(cleanUrl);

                // Get the image aspect ratio dynamically to avoid vertical stretch/squeeze
                let imageAspectRatio = 2.0;
                if (currentSrc) {
                    try {
                        imageAspectRatio = await Promise.race([
                            new Promise<number>((resolve) => {
                                const img = new Image();
                                img.crossOrigin = "anonymous";
                                img.onload = () => {
                                    if (img.naturalWidth && img.naturalHeight) {
                                        resolve(img.naturalWidth / img.naturalHeight);
                                    } else {
                                        resolve(2.0);
                                    }
                                };
                                img.onerror = () => {
                                    resolve(2.0);
                                };
                                img.src = currentSrc;
                                if (img.complete && img.naturalWidth) {
                                    resolve(img.naturalWidth / img.naturalHeight);
                                }
                            }),
                            new Promise<number>((resolve) => setTimeout(() => resolve(2.0), 500))
                        ]);
                    } catch (e) {
                        console.warn("Failed to load image metadata for ratio check:", e);
                    }
                }

                // Dynamic hfov based on container aspect ratio to prevent severe stretching on wide screens
                const rect = container_ready.getBoundingClientRect();
                const containerWidth = rect.width || window.innerWidth;
                const containerHeight = rect.height || window.innerHeight || 1;
                const containerAspectRatio = containerWidth / containerHeight;

                const baseHfov = 105; // Starting average hfov
                const computedHfov = Math.min(110, Math.max(100, baseHfov + (containerAspectRatio - 1.5) * 15));

                // 360 degree coordinates setup
                let haov = 360;
                let vaov = 180;

                container_ready.innerHTML = '';
                v_fullscreen = window.pannellum.viewer(container_ready, {
                    type: 'equirectangular',
                    panorama: currentSrc.includes('|') ? currentSrc.split('|')[0] : currentSrc,
                    autoLoad: true,
                    showControls: true,
                    compass: false,
                    friction: 0.12,
                    hfov: computedHfov,
                    minHfov: 60,
                    maxHfov: 115,
                    minPitch: -85,
                    maxPitch: 90,
                    haov: haov,
                    vaov: vaov,
                    vOffset: 0,
                    pitch: 0,
                    yaw: 0,
                    crossOrigin: 'anonymous',
                    hotSpots: hotSpots,
                    strings: {
                        loadingLabel: "대극장 고해상도 공간을 로딩하고 있습니다...",
                        loadButtonLabel: "360° 대극장 투어 입장",
                        noWebGLError: "이 브라우저는 WebGL 가속을 지원하지 않습니다.",
                        bylineLabel: "태왕공인중개사사무소"
                    }
                });

                fullscreenViewerInstanceRef.current = v_fullscreen;

                // Monitor viewport changes for synchronized aspect ratio rendering
                let resizeObserver: ResizeObserver | null = null;
                if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
                    resizeObserver = new ResizeObserver(() => {
                        if (v_fullscreen) {
                            try { v_fullscreen.resize(); } catch (e) {}
                        }
                    });
                    resizeObserver.observe(container_ready);
                }
                (v_fullscreen as any)._resizeObserver = resizeObserver;
            } catch (err: any) {
                console.warn("[Fullscreen Pannellum Init failure]", err);
            }
        };

        initFullscreenViewer();

        return () => {
            isModalMounted = false;
            if (v_fullscreen) {
                if ((v_fullscreen as any)._resizeObserver) {
                    try { (v_fullscreen as any)._resizeObserver.disconnect(); } catch (e) {}
                }
                try { v_fullscreen.destroy(); } catch (e) {}
            }
            fullscreenViewerInstanceRef.current = null;
        };
    }, [isFullscreen, activeIndex, imagesKey]);

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

    // Initialize viewer for the active space with a dimension safeguard
    React.useEffect(() => {
        let v: any = null;
        let isComponentMounted = true;
        
        const container = viewerRef.current;
        if (!container) {
            return;
        }

        const initViewerAsync = async () => {
            try {
                if (!isComponentMounted) return;
                setIsLoading(true);
                setViewerError(null);

                // Wait for pannellum Core script
                let attempts = 0;
                while (!window.pannellum && attempts < 50) {
                    if (!isComponentMounted) return;
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!window.pannellum) {
                    throw new Error("Pannellum 라이브러리를 CDN에서 로드하지 못했거나 아직 사용할 준비가 되지 않았습니다.");
                }

                // Wait for image URLs
                if (images.length === 0) {
                    let imageWaitAttempts = 0;
                    while (images.length === 0 && imageWaitAttempts < 30) {
                        if (!isComponentMounted) return;
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        imageWaitAttempts++;
                    }
                    if (images.length === 0) {
                        setIsLoading(false);
                        return;
                    }
                }

                // Prevent 0px dimension issue during initial load
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

                // Fallback to flat if WebQL not supported
                const webglAvail = isWebGLSupported();
                if (webglAvail) {
                    setMode('webgl');
                } else {
                    setMode('flat');
                    setIsLoading(false);
                    return;
                }

                if (!isComponentMounted) return;

                // Setup hotspots (완전히 차단: 3D 가상 공간 안의 탐색 핫스팟 제거)
                const hotSpots: any[] = [];

                const containerWidth = rect.width;
                const containerHeight = rect.height || 1;
                const containerAspectRatio = containerWidth / containerHeight;

                const baseHfov = 105;
                const computedHfov = Math.min(110, Math.max(100, baseHfov + (containerAspectRatio - 1.5) * 15));

                container.innerHTML = '';

                v = window.pannellum.viewer(container, {
                    type: 'equirectangular',
                    panorama: currentSrc.includes('|') ? currentSrc.split('|')[0] : currentSrc,
                    autoLoad: true,
                    showControls: true,
                    compass: false,
                    friction: 0.12,
                    hfov: computedHfov,
                    minHfov: 60,
                    maxHfov: 115,
                    minPitch: -85,
                    maxPitch: 90,
                    haov: 360,
                    vaov: 180,
                    vOffset: 0,
                    pitch: 0,
                    yaw: 0,
                    crossOrigin: 'anonymous',
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
                        try { v.resize(); } catch (e) {}
                        setIsLoading(false);
                        setViewerError(null);
                        setMode('webgl');
                    }
                });

                viewerInstanceRef.current = v;

                let resizeObserver: ResizeObserver | null = null;
                if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
                    resizeObserver = new ResizeObserver(() => {
                        if (v) {
                            try { v.resize(); } catch (e) {}
                        }
                    });
                    resizeObserver.observe(container);
                }
                (v as any)._resizeObserver = resizeObserver;

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
                if ((v as any)._resizeObserver) {
                    try { (v as any)._resizeObserver.disconnect(); } catch (e) {}
                }
                try { v.destroy(); } catch (e) {}
            }
            viewerInstanceRef.current = null;
        };
    }, [imagesKey, activeIndex]);

    return (
        <div className="w-full flex flex-col">
            {/* SVG Gradients definition for premium deep-emerald guide components of VR touring system */}
            <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
                <defs>
                    <linearGradient id="deep-emerald-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#046a47" />
                        <stop offset="100%" stopColor="#012b1e" />
                    </linearGradient>
                </defs>
            </svg>
            <div className={`relative group w-full ${isStyleHeight ? "" : "pannellum-responsive-container"}`}>
            <style dangerouslySetInnerHTML={{ __html: `
                .pannellum-responsive-container {
                    width: 100% !important;
                    height: 450px !important;
                    min-height: 450px !important;
                    display: block;
                    position: relative;
                }
                @media (min-width: 768px) {
                    .pannellum-responsive-container {
                        height: 580px !important;
                        min-height: 550px !important;
                    }
                }
                @media (min-width: 1024px) {
                    .pannellum-responsive-container {
                        height: 680px !important;
                        min-height: 650px !important;
                    }
                }
                @media (min-width: 1280px) {
                    .pannellum-responsive-container {
                        height: 760px !important;
                        min-height: 700px !important;
                    }
                }
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
                @keyframes soft-pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1.0; }
                }
                .animate-soft-pulse {
                    animation: soft-pulse 2.5s ease-in-out infinite;
                }
                @keyframes float-pan {
                    0% { transform: translateX(0%); }
                    50% { transform: translateX(-15%); }
                    100% { transform: translateX(0%); }
                }
                .animate-float-pan {
                    animation: float-pan 35s ease-in-out infinite;
                }
                @keyframes soft-pulse-bounce {
                    0%, 100% {
                        opacity: 0.45;
                        transform: scale(0.97);
                    }
                    50% {
                        opacity: 1.0;
                        transform: scale(1.03);
                    }
                }
                .animate-soft-pulse-bounce {
                    animation: soft-pulse-bounce 2.2s ease-in-out infinite !important;
                }
                #vr-drag-guide-bar, #vr-drag-guide-bar-fullscreen {
                    position: absolute !important;
                    bottom: 24px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    z-index: 99 !important;
                    box-sizing: border-box !important;
                    width: max-content !important;
                    max-width: 90vw !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                }
                @media (max-width: 1024px) {
                    /* On smaller displays (mobile/tablet), push slightly to the left to secure clear space from the bottom-right compass */
                    #vr-drag-guide-bar, #vr-drag-guide-bar-fullscreen {
                        bottom: 24px !important;
                        left: 50% !important;
                        transform: translate(calc(-50% - 44px), 0) !important;
                    }
                }
                .vr-guide-box {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    width: max-content !important;
                    max-width: 100% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                }
                .vr-guide-text {
                    background: linear-gradient(135deg, #046a47 0%, #012b1e 100%) !important;
                    -webkit-background-clip: text !important;
                    -webkit-text-fill-color: transparent !important;
                    background-clip: text !important;
                    color: transparent !important;
                    font-weight: 850 !important;
                    text-align: center !important;
                    display: block !important;
                }
                .vr-guide-hand-icon {
                    color: transparent !important;
                    stroke: url(#deep-emerald-gradient) !important;
                    flex-shrink: 0 !important;
                }
                @media (max-width: 768px) {
                    .vr-guide-box {
                        font-size: 10px !important;
                    }
                    .vr-guide-text {
                        font-size: 10px !important;
                        line-height: 1.4 !important;
                        white-space: nowrap !important;
                    }
                    .vr-guide-hand-icon {
                        width: 30px !important;
                        height: 30px !important;
                    }
                }
                @media (min-width: 769px) {
                    .vr-guide-box {
                        font-size: 13px !important;
                    }
                    .vr-guide-text {
                        font-size: 13px !important;
                        line-height: 1.5 !important;
                        white-space: nowrap !important;
                    }
                    .vr-guide-hand-icon {
                        width: 39px !important;
                        height: 39px !important;
                    }
                }
                /* Hide scrollbar utility */
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none; /* IE and Edge */
                    scrollbar-width: none; /* Firefox */
                }
                /* Hide default Pannellum zoom controls */
                .pnlm-zoom-controls {
                    display: none !important;
                }

                /* =========================================================
                   Tae-Wang Platform 360 Viewer Responsive CSS Core
                   PC: 100% Original High-Contrasting Master Design
                   Tablet/Mobile: Fluid Micro-Scale Down Optimization
                   ========================================================= */
                
                /* 1. Compass Positioning & Scaling */
                .vr-compass-position {
                    bottom: 1.5rem !important; /* bottom-6 */
                    right: 1.5rem !important;  /* right-6 */
                }
                .vr-compass-responsive {
                    width: 7rem !important;  /* w-28 */
                    height: 7rem !important; /* h-28 */
                }
                .vr-compass-fullscreen-responsive {
                    width: 8rem !important;  /* w-32 */
                    height: 8rem !important; /* h-32 */
                }

                /* Tablet Breakpoint (1024px or lower) */
                @media (max-width: 1024px) {
                    .vr-compass-position {
                        bottom: 0.75rem !important;
                        right: 0.75rem !important;
                    }
                    .vr-compass-responsive {
                        width: 5.5rem !important; /* 88px */
                        height: 5.5rem !important;
                    }
                    .vr-compass-fullscreen-responsive {
                        width: 6.5rem !important; /* 104px */
                        height: 6.5rem !important;
                    }
                    /* Compass inner typography & elements fluid scale */
                    .compass-text-ns {
                        font-size: 11px !important;
                    }
                    .compass-text-ew {
                        font-size: 8px !important;
                    }
                    .compass-needle-core {
                        width: 2.25rem !important; /* w-9 */
                        height: 2.25rem !important; /* h-9 */
                    }
                    .compass-needle-pointer {
                        height: 0.85rem !important;
                    }
                    .compass-azimuth {
                        font-size: 8px !important;
                        padding: 1px 4px !important;
                    }
                    .compass-azimuth-container {
                        bottom: 0.375rem !important;
                    }
                }

                /* Mobile Breakpoint (480px or lower) */
                @media (max-width: 480px) {
                    .vr-compass-position {
                        bottom: 0.5rem !important;
                        right: 0.5rem !important;
                    }
                    .vr-compass-responsive {
                        width: 4.25rem !important; /* 68px */
                        height: 4.25rem !important;
                    }
                    .vr-compass-fullscreen-responsive {
                        width: 5rem !important; /* 80px */
                        height: 5rem !important;
                    }
                    .compass-text-ns {
                        font-size: 9px !important;
                    }
                    .compass-text-ew {
                        font-size: 6.5px !important;
                    }
                    .compass-needle-core {
                        width: 1.75rem !important; /* w-7 */
                        height: 1.75rem !important; /* h-7 */
                    }
                    .compass-needle-pointer {
                        height: 0.65rem !important;
                    }
                    .compass-azimuth {
                        font-size: 7px !important;
                        padding: 0px 3px !important;
                    }
                    .compass-azimuth-container {
                        bottom: 0.25rem !important;
                    }
                }

                /* 2. PC Capsule Controls Wrapper & Buttons Scaling */
                .vr-capsule-box {
                    top: 4rem !important; /* top-16 */
                    left: 1rem !important; /* left-4 */
                    padding: 0.25rem !important;
                    gap: 0.375rem !important;
                }
                .vr-capsule-btn {
                    width: 2rem !important; /* w-8 */
                    height: 2rem !important; /* h-8 */
                }
                .vr-capsule-btn svg {
                    width: 14px !important;
                    height: 14px !important;
                }
                .vr-capsule-btn span {
                    font-size: 15px !important;
                }

                .vr-capsule-box-fullscreen {
                    top: 4rem !important; /* top-16 */
                    left: 1rem !important; /* left-4 */
                    padding: 0.375rem !important;
                    gap: 0.5rem !important;
                }
                .vr-capsule-btn-fullscreen {
                    width: 2.5rem !important; /* w-10 */
                    height: 2.5rem !important; /* h-10 */
                }
                .vr-capsule-btn-fullscreen svg {
                    width: 18px !important;
                    height: 18px !important;
                }
                .vr-capsule-btn-fullscreen span {
                    font-size: 19px !important;
                }

                @media (max-width: 1024px) {
                    .vr-capsule-box {
                        top: 3rem !important; /* top-12 */
                        left: 0.75rem !important; /* left-3 */
                        padding: 0.2rem !important;
                        gap: 0.25rem !important;
                    }
                    .vr-capsule-btn {
                        width: 1.75rem !important; /* w-7 */
                        height: 1.75rem !important; /* h-7 */
                    }
                    .vr-capsule-btn svg {
                        width: 12px !important;
                        height: 12px !important;
                    }
                    .vr-capsule-btn span {
                        font-size: 13px !important;
                    }

                    .vr-capsule-box-fullscreen {
                        top: 3rem !important;
                        left: 0.75rem !important;
                        padding: 0.25rem !important;
                        gap: 0.375rem !important;
                    }
                    .vr-capsule-btn-fullscreen {
                        width: 2rem !important; /* w-8 */
                        height: 2rem !important; /* h-8 */
                    }
                    .vr-capsule-btn-fullscreen svg {
                        width: 14px !important;
                        height: 14px !important;
                    }
                    .vr-capsule-btn-fullscreen span {
                        font-size: 15px !important;
                    }
                }

                @media (max-width: 480px) {
                    .vr-capsule-box {
                        top: 2rem !important; /* top-8 */
                        left: 0.5rem !important; /* left-2 */
                        padding: 0.15rem !important;
                        gap: 0.15rem !important;
                    }
                    .vr-capsule-btn {
                        width: 1.5rem !important; /* w-6 */
                        height: 1.5rem !important; /* h-6 */
                    }
                    .vr-capsule-btn svg {
                        width: 10px !important;
                        height: 10px !important;
                    }
                    .vr-capsule-btn span {
                        font-size: 11px !important;
                    }

                    .vr-capsule-box-fullscreen {
                        top: 2rem !important;
                        left: 0.5rem !important;
                        padding: 0.15rem !important;
                        gap: 0.2rem !important;
                    }
                    .vr-capsule-btn-fullscreen {
                        width: 1.5rem !important; /* w-6 */
                        height: 1.5rem !important; /* h-6 */
                    }
                    .vr-capsule-btn-fullscreen svg {
                        width: 10px !important;
                        height: 10px !important;
                    }
                    .vr-capsule-btn-fullscreen span {
                        font-size: 11px !important;
                    }
                }

                /* 3. Guide Badge Position & Scaling */
                .vr-guide-badge {
                    font-size: 17px !important;
                    padding: 0.625rem 1.25rem !important; /* sm:py-2.5 px-5 equivalent */
                }
                @media (max-width: 1024px) {
                    .vr-guide-badge {
                        font-size: 13px !important;
                        padding: 0.5rem 1rem !important;
                    }
                }
                @media (max-width: 480px) {
                    .vr-guide-badge {
                        font-size: 10px !important;
                        padding: 0.35rem 0.625rem !important;
                    }
                    .vr-diag-btn {
                        padding: 0px !important;
                        width: 1.75rem !important;
                        height: 1.75rem !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 9999px !important;
                    }
                    .vr-diag-btn span {
                        display: none !important;
                    }
                }

                /* 4. Navigation Chevrons (PC: original, Mobile/Tablet: scaled down) */
                .vr-nav-chevron {
                    width: 5rem !important; /* md:w-20 -> 80px */
                    height: 5rem !important;
                }
                .vr-nav-chevron-fullscreen {
                    width: 6rem !important; /* md:w-24 -> 96px */
                    height: 6rem !important;
                }
                @media (max-width: 1024px) {
                    .vr-nav-chevron {
                        width: 3.5rem !important; /* 56px */
                        height: 3.5rem !important;
                    }
                    .vr-nav-chevron-fullscreen {
                        width: 4.5rem !important; /* 72px */
                        height: 4.5rem !important;
                    }
                }
                @media (max-width: 480px) {
                    .vr-nav-chevron {
                        width: 2rem !important; /* 32px */
                        height: 2rem !important;
                    }
                    .vr-nav-chevron-fullscreen {
                        width: 2.5rem !important; /* 40px */
                        height: 2.5rem !important;
                    }
                }
            `}} />
            
            <div 
                ref={viewerRef} 
                id="panorama"
                className={`w-full bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 ${isStyleHeight ? "" : "pannellum-responsive-container"} ${mode === 'webgl' ? 'block' : 'hidden'}`}
                style={heightStyle}
            ></div>

            {/* 3D VR 조작 안내 가이드 바 (최하단 중앙 배치 및 전 기기 반응형 최적화) */}
            <div 
                id="vr-drag-guide-bar"
                className="pointer-events-none select-none"
            >
                <div className="w-full animate-soft-pulse-bounce flex justify-center items-center">
                    <div className="vr-guide-box">
                        <Hand className="vr-guide-hand-icon" strokeWidth={1.5} />
                        <span className="vr-guide-text">
                            드래그하여 360° VR 투어
                        </span>
                    </div>
                </div>
            </div>

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
                    className={`w-full bg-slate-900 rounded-2xl overflow-x-auto overflow-y-hidden scrollbar-none shadow-lg border border-slate-200 relative flex items-center select-none ${isStyleHeight ? "" : "pannellum-responsive-container"}`}
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
                </div>
            )}

            {/* Apple Style Minimal Chevron Arrow Navigation - Fixed absolutely at left and right boundaries */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onSceneChangeRef.current) {
                                onSceneChangeRef.current(activeIndex > 0 ? activeIndex - 1 : images.length - 1);
                            }
                        }}
                        className="absolute left-1 sm:left-3 md:left-5 top-1/2 -translate-y-1/2 z-35 cursor-pointer text-white/95 hover:text-white hover:scale-110 active:scale-90 transition-all duration-300 outline-none border-none bg-transparent hover:bg-transparent shadow-none p-2 pointer-events-auto"
                        title="이전 공간으로 이동"
                        id="vr-nav-prev-inline"
                    >
                        <ChevronLeft 
                            size={64} 
                            strokeWidth={1.2} 
                            className="vr-nav-chevron transition-all duration-300" 
                            style={{ filter: "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.6)) drop-shadow(0px 3px 12px rgba(0, 0, 0, 0.455))" }}
                        />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onSceneChangeRef.current) {
                                onSceneChangeRef.current(activeIndex < images.length - 1 ? activeIndex + 1 : 0);
                            }
                        }}
                        className="absolute right-1 sm:right-3 md:right-5 top-1/2 -translate-y-1/2 z-35 cursor-pointer text-white/95 hover:text-white hover:scale-110 active:scale-90 transition-all duration-300 outline-none border-none bg-transparent hover:bg-transparent shadow-none p-2 pointer-events-auto"
                        title="다음 공간으로 이동"
                        id="vr-nav-next-inline"
                    >
                        <ChevronRight 
                            size={64} 
                            strokeWidth={1.2} 
                            className="vr-nav-chevron transition-all duration-300" 
                            style={{ filter: "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.6)) drop-shadow(0px 3px 12px rgba(0, 0, 0, 0.455))" }}
                        />
                    </button>
                </>
            )}



            {/* Premium Glassmorphic Loading Transition Layer (Unified for WebGL and Flat loads, hyper-fast 0.1s responsive activation) */}
            <AnimatePresence mode="wait">
                {isLoading && isStarterClicked && (
                    <motion.div
                        key="pano-premium-loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center z-40 rounded-2xl cursor-default pointer-events-auto"
                    >
                        <div className="flex flex-col items-center gap-4 bg-slate-950/80 border border-white/10 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-xs text-center border-t-emerald-500/50">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                {/* Dynamic continuous high-speed double ring animation */}
                                <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/15 border-t-emerald-500 border-r-emerald-500 animate-spin"></div>
                                <div className="absolute inset-2 rounded-full border-2 border-emerald-400/20 border-b-cyan-400 animate-spin-reverse"></div>
                                <Naver360Icon size={24} className="text-[#0D4C3C] animate-pulse" />
                            </div>
                            <div className="space-y-1 select-none">
                                <h4 className="text-white font-black text-sm tracking-tight flex items-center justify-center gap-1.5">
                                    <span>360° 대가속 스마트 스캔</span>
                                </h4>
                                <p className="text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">Loading VR space...</p>
                                <p className="text-white/60 text-[10px] leading-relaxed pt-1">
                                    초고속 이중 캐시 기술과 동시 다운로드 채널 가동으로 실감나는 공간 가상 투어를 즉시 동적 생성 중입니다.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* 우측 상단 컨트롤 영역 (수정완료: 오직 대화면 와이드모드 버튼만 정갈하게 반응형으로 배치) */}
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 pointer-events-auto">
                {/* 1. [대화면 와이드모드] 버튼 (명칭 변경 및 반응형 최적화 마감) */}
                <button 
                    onClick={() => setIsFullscreen(true)}
                    className="bg-emerald-600/95 backdrop-blur-md text-white hover:bg-emerald-700 active:scale-95 font-black px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-[10px] sm:text-xs border border-emerald-400/20 flex items-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all hover:scale-105 pointer-events-auto shrink-0 animate-soft-pulse select-none"
                    title="대화면 와이드모드 전환 (전체화면)"
                    id="vr-theater-mode-btn"
                >
                    <Maximize size={12} strokeWidth={2.5} className="text-white shrink-0" />
                    <span>대화면 와이드모드</span>
                </button>
            </div>

            {/* 명품 수직 통합 제어 캡슐 바 (줌인/줌아웃/전체화면/🎯제어 초기화 4종 통합) */}
            {mode === 'webgl' && (
                <div 
                    className="absolute z-30 pointer-events-auto flex flex-col p-1 bg-white/25 backdrop-blur-md border border-white/50 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.08)] select-none items-center vr-capsule-box"
                    id="vr-capsule-controls-wrapper"
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleZoom('in', false);
                        }}
                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn"
                        title="확대 (Zoom In)"
                        id="vr-zoom-in-inline"
                    >
                        <Plus size={14} strokeWidth={2} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleZoom('out', false);
                        }}
                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn"
                        title="축소 (Zoom Out)"
                        id="vr-zoom-out-inline"
                    >
                        <Minus size={14} strokeWidth={2} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFullscreen(true);
                        }}
                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn"
                        title="대극장 모드 전환 (Fullscreen)"
                        id="vr-fullscreen-toggle-inline"
                    >
                        <Maximize size={13} strokeWidth={2} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleResetView(false);
                        }}
                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn"
                        title="화면 정렬/초기화 (Reset View)"
                        id="vr-reset-view-inline"
                    >
                        <span className="leading-none select-none">🎯</span>
                    </button>
                </div>
            )}


            
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

            {/* 360° Immersive Theater Mode View Modal */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="fixed inset-0 z-[9990] bg-slate-950/98 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 md:p-8 text-white select-none pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header columns */}
                        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 max-w-7xl w-full mx-auto">
                            <div className="flex items-center gap-3">
                                <span className="bg-emerald-600 text-white p-2 sm:p-2.5 rounded-2xl shadow-xl shadow-emerald-500/10 flex items-center justify-center">
                                    <Home size={32} className="text-white animate-pulse" strokeWidth={1.8} />
                                </span>
                                <div className="flex flex-col text-left">
                                    <h3 className="text-sm sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                        <span className="animate-vr-glow">구미태왕 360° 실감형 대극장 VR 투어</span>
                                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">HEAVY THEATER</span>
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-slate-400 leading-none mt-1 sm:mt-1.5 font-bold">집 안에 직접 서 있는 듯한 시원시원한 대화면 공간 체험을 만끽해 보세요.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="flex items-center justify-center bg-white/10 hover:bg-white/20 hover:scale-105 hover:rotate-90 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/15 shadow-2xl cursor-pointer transition-all duration-300"
                                title="대극장 투어 닫기"
                            >
                                <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
                            </button>
                        </div>

                        {/* Immersive View Port */}
                        <div className="relative flex-grow w-full max-w-7xl mx-auto bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
                            {/* 3D VR 조작 안내 가이드 바 - 대극장 모드 (최하단 중앙 배치 및 전 기기 반응형 최적화) */}
                            <div 
                                id="vr-drag-guide-bar-fullscreen"
                                className="pointer-events-none select-none"
                            >
                                <div className="w-full animate-soft-pulse-bounce flex justify-center items-center">
                                    <div className="vr-guide-box">
                                        <Hand className="vr-guide-hand-icon" strokeWidth={1.5} />
                                        <span className="vr-guide-text">
                                            드래그하여 360° VR 투어
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {mode === 'webgl' ? (
                                <div 
                                    ref={fullscreenViewerRef} 
                                    id="panorama-fullscreen"
                                    className="w-full h-full min-h-[450px]"
                                ></div>
                            ) : (
                                <div className="relative w-full h-full overflow-auto flex items-center justify-center select-none cursor-grab">
                                    <img 
                                        src={(() => {
                                            const rawUrl = images[activeIndex] || images[0] || '';
                                            const cleanUrl = rawUrl.includes('|') ? rawUrl.split('|')[0] : rawUrl;
                                            return getDirectSrc(cleanUrl);
                                        })()} 
                                        className="max-h-full max-w-none object-contain pointer-events-none select-none"
                                        alt="평면 파노라마 VR 뷰"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            )}

                            {/* 명품 수직 통합 제어 캡슐 바 - 대극장 모드 */}
                            {mode === 'webgl' && (
                                <div 
                                    className="absolute z-30 pointer-events-auto flex flex-col p-1.5 bg-white/25 backdrop-blur-md border border-white/50 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.15)] select-none items-center vr-capsule-box-fullscreen"
                                    id="vr-capsule-controls-wrapper-fullscreen"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleZoom('in', true);
                                        }}
                                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_3px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn-fullscreen"
                                        title="확대 (Zoom In)"
                                        id="vr-zoom-in-fullscreen"
                                    >
                                        <Plus size={18} strokeWidth={2} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleZoom('out', true);
                                        }}
                                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_3px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn-fullscreen"
                                        title="축소 (Zoom Out)"
                                        id="vr-zoom-out-fullscreen"
                                    >
                                        <Minus size={18} strokeWidth={2} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsFullscreen(false);
                                        }}
                                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_3px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn-fullscreen"
                                        title="일반 화면으로 복귀 (Exit Fullscreen)"
                                        id="vr-fullscreen-toggle-fullscreen"
                                    >
                                        <Minimize size={17} strokeWidth={2} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResetView(true);
                                        }}
                                        className="rounded-full bg-white/50 hover:bg-white/80 active:bg-white/95 text-slate-800 hover:text-emerald-600 flex items-center justify-center border-none shadow-[0_1px_3px_rgba(0,0,0,0.05)] active:scale-95 transition-all outline-none cursor-pointer duration-200 vr-capsule-btn-fullscreen"
                                        title="화면 정렬/초기화 (Reset View)"
                                        id="vr-reset-view-fullscreen"
                                    >
                                        <span className="leading-none select-none">🎯</span>
                                    </button>
                                </div>
                            )}

                            {/* Premium circular compass for the fullscreen theater modal - larger scale */}
                            {renderPremiumCompass("vr-compass-fullscreen-responsive", "absolute vr-compass-position")}

                            {/* Fullscreen Apple Style Minimal Chevron Arrow Navigation - Fixed absolutely at left and right boundaries */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSceneChangeRef.current) {
                                                onSceneChangeRef.current(activeIndex > 0 ? activeIndex - 1 : images.length - 1);
                                            }
                                        }}
                                        className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-35 cursor-pointer text-white/95 hover:text-white hover:scale-110 active:scale-90 transition-all duration-305 outline-none border-none bg-transparent hover:bg-transparent shadow-none p-2 pointer-events-auto"
                                        title="이전 공간으로 이동"
                                        id="vr-nav-prev-fullscreen"
                                    >
                                        <ChevronLeft 
                                            size={80} 
                                            strokeWidth={1.0} 
                                            className="vr-nav-chevron-fullscreen transition-all duration-300" 
                                            style={{ filter: "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.6)) drop-shadow(0px 4px 16px rgba(0, 0, 0, 0.455))" }}
                                        />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSceneChangeRef.current) {
                                                onSceneChangeRef.current(activeIndex < images.length - 1 ? activeIndex + 1 : 0);
                                            }
                                        }}
                                        className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-35 cursor-pointer text-white/95 hover:text-white hover:scale-110 active:scale-90 transition-all duration-305 outline-none border-none bg-transparent hover:bg-transparent shadow-none p-2 pointer-events-auto"
                                        title="다음 공간으로 이동"
                                        id="vr-nav-next-fullscreen"
                                    >
                                        <ChevronRight 
                                            size={80} 
                                            strokeWidth={1.0} 
                                            className="vr-nav-chevron-fullscreen transition-all duration-300" 
                                            style={{ filter: "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.6)) drop-shadow(0px 4px 16px rgba(0, 0, 0, 0.455))" }}
                                        />
                                    </button>
                                </>
                            )}

                            {/* 화면 정중앙 반투명 집 모양(Home Icon) 워터마크 레이어 (대극장 모드용) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-25 flex items-center justify-center">
                                <Home 
                                    className="w-20 h-20 sm:w-32 sm:h-32 md:w-44 md:h-44 text-white/15 drop-shadow-[0_4px_16px_rgba(0,0,0,0.08)]" 
                                    strokeWidth={1.2} 
                                />
                            </div>
                        </div>

                        {/* Space Switch thumbnails list with smooth horizontal scrolling */}
                        {images.length > 1 && (
                            <div className="flex flex-col gap-1 max-w-5xl w-full mx-auto mt-4 shrink-0">

                                <div className="flex gap-2 justify-start py-3 bg-slate-900/50 rounded-2xl border border-white/5 w-full px-4 shadow-2xl overflow-x-auto scrollbar-none items-center scroll-smooth">
                                    {images.map((img, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => {
                                                if (onSceneChangeRef.current) {
                                                    onSceneChangeRef.current(idx);
                                                }
                                            }}
                                            className={`relative aspect-video w-20 sm:w-28 rounded-xl overflow-hidden border-2 transition-all leading-none shrink-0 cursor-pointer ${activeIndex === idx ? 'border-emerald-500 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={img.includes('|') ? img.split('|')[0] : img} className="w-full h-full object-cover pointer-events-none" alt="" />
                                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                                <span className="text-[9px] font-black text-white bg-black/60 px-2 py-0.5 rounded-md">공간 {idx + 1}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom close guide banner */}
                        <div className="text-center text-[10px] sm:text-xs text-slate-400 font-extrabold flex items-center gap-1.5 justify-center mt-3 pt-2 lg:pt-3 border-t border-white/5 max-w-7xl w-full mx-auto shrink-0">
                            <i className="fa-solid fa-circle-info text-emerald-400"></i>
                            <span>우측 상단 닫기 X 아이콘을 누르거나 빈 곳을 탭하면 원래 상세페이지로 복귀합니다.</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium circular compass for regular inline container view */}
            {renderPremiumCompass("vr-compass-responsive", "absolute vr-compass-position")}

            {/* 화면 정중앙 반투명 집 모양(Home Icon) 워터마크 레이어 (인라인 뷰용) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-25 flex items-center justify-center">
                <Home 
                    className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 text-white/15 drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]" 
                    strokeWidth={1.2} 
                />
            </div>

            {/* 네이버 부동산 스타일 프리미엄 VR 스타터 썸네일 마스크 레이어 */}
            <div 
                onClick={() => setIsStarterClicked(true)}
                className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden cursor-pointer bg-slate-950 flex items-center justify-center z-38 transition-all duration-300 ease-out select-none ${isStarterClicked ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
                style={{ display: isStarterDismissed ? 'none' : 'flex' }}
                id="vr-starter-thumbnail-mask"
            >
                {/* 썸네일 노이즈 억제 및 가독성 향상 비네트 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50 z-10"></div>

                <img 
                    src={thumbnail || images[0] || ""} 
                    className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transform transition-transform duration-[400ms] hover:scale-105"
                    alt="VR 대표 실사 썸네일"
                    referrerPolicy="no-referrer"
                />

                {/* 3사 디바이스 반응형 무결점 수직 중앙 통합 컨테이너 (녹색 사각 심볼 + 직하단 명찰 박스) */}
                <div 
                    className={`absolute z-20 flex flex-col items-center gap-3 w-full max-w-[85vw] select-none ${isStarterClicked ? 'pointer-events-none' : 'pointer-events-auto'}`}
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                    }}
                    id="vr-starter-unified-container"
                >
                    {/* 1번 영역 - 집 모양 녹색 사각 심볼 확장 및 내부 문자열 강제 결합 */}
                    <div
                        className="relative flex flex-col items-center justify-center w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] rounded-[24px] sm:rounded-[32px] bg-[#0D4C3C] border-2 border-white/20 shadow-[0_12px_36px_rgba(11,37,69,0.35)] hover:scale-105 active:scale-95 hover:bg-[#113866] transition-all duration-300 cursor-pointer"
                        id="vr-starter-green-box-btn"
                    >
                        <div className="flex flex-col items-center justify-center gap-2 font-sans text-center">
                            {/* 상단 수직 축 - 순백색 집 모양 아이콘 심볼 */}
                            <Home className="text-white w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" strokeWidth={1.8} />
                            {/* 하단 수직 축 - 'VR 360 투어' 안내 문자열 */}
                            <span className="text-white font-black text-xs sm:text-sm tracking-tight leading-none drop-shadow-[0_1px_2.5px_rgba(0,0,0,0.2)]">
                                VR 360 투어
                            </span>
                        </div>
                    </div>

                    {/* 2번 영역 - 매물 정보 명찰 박스 일체형 심볼 바로 밑 정중앙 이동 및 다운사이징 */}
                    <div className="bg-slate-950/75 border border-white/10 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center text-center max-w-[85vw] w-auto">
                        <span className="text-[8px] sm:text-[9px] font-black bg-[#0D4C3C] text-white px-2 py-0.5 rounded inline-block mb-1 shadow-sm uppercase tracking-wider select-none">
                            360° VR 투어 지원
                        </span>
                        <h3 className="text-white font-extrabold text-[11px] sm:text-xs md:text-sm leading-tight tracking-tight select-none text-center" style={{ wordBreak: 'keep-all' }}>
                            {title || "태왕아너스타워"}
                        </h3>
                        <p className="text-white/80 font-bold text-[9px] sm:text-[10px] select-none mt-0.5 text-center" style={{ wordBreak: 'keep-all' }}>
                            {address || "구미시 송정동 74"}
                        </p>
                    </div>
                </div>
            </div>
            </div>


        </div>
    );
};

export { VrViewer };
export default VrViewer;
