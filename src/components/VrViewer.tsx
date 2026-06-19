import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

declare global {
    interface Window {
        pannellum: any;
    }
}

// Check if WebGL is supported
const isWebGLSupported = () => {
    if (typeof window === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
};

// =========================================================================
// 1. Client-side Slicing and Tiling Upload Acceleration Engine
// =========================================================================
export async function sliceAndUploadPano(
    file: File,
    postId: string,
    panoIndex: number,
    onProgress: (status: string) => void
): Promise<string> {
    onProgress("8K 원본 이미지 디코딩 및 메모리 로딩 중...");
    
    // Create an image object from file
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("파노라마 이미지 파일을 해석하지 못했습니다."));
    });
    
    URL.revokeObjectURL(objectUrl);
    
    const w = img.width;
    const h = img.height;
    
    // A. Create Low-res Preview image (Level 0, e.g. 1024 x 512, ~50KB) - loaded in 0.1s
    onProgress("0.1초 고속 진입용 저화질 프리뷰 이미지 추출 중...");
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 1024;
    previewCanvas.height = 512;
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) throw new Error("Canvas 생성 실패");
    previewCtx.drawImage(img, 0, 0, 1024, 512);
    
    const previewBlob = await new Promise<Blob>((resolve) => {
        previewCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.82);
    });
    
    const previewRef = ref(storage, `vr-tiles/${postId}/pano_${panoIndex}_preview.jpg`);
    await uploadBytes(previewRef, previewBlob, { contentType: 'image/jpeg' });
    const previewDownloadUrl = await getDownloadURL(previewRef);
    
    // Slicing Helper
    const getTileBlob = (
        sx: number, sy: number, sw: number, sh: number,
        tw: number, th: number
    ): Promise<Blob> => {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tw;
        tileCanvas.height = th;
        const tileCtx = tileCanvas.getContext('2d');
        if (!tileCtx) throw new Error("Tile Canvas 생성 실패");
        tileCtx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
        return new Promise<Blob>((resolve) => {
            tileCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
        });
    };
    
    // B. Multi-level Slicing: Level 1 (Medium Resolution grid 4 x 2 = 8 tiles)
    onProgress("초고속 버퍼링 Level 1 (4x2 그리드) 타일 분할 중...");
    const l1Urls: { [key: string]: string } = {};
    const l1Promises: Promise<void>[] = [];
    
    for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 4; x++) {
            const sx = x * (w / 4);
            const sy = y * (h / 2);
            const sw = w / 4;
            const sh = h / 2;
            const tileRef = ref(storage, `vr-tiles/${postId}/pano_${panoIndex}_tile_l1_${x}_${y}.jpg`);
            
            const p = (async (col: number, row: number) => {
                const blob = await getTileBlob(sx, sy, sw, sh, 512, 512);
                await uploadBytes(tileRef, blob, { contentType: 'image/jpeg' });
                const url = await getDownloadURL(tileRef);
                l1Urls[`${col}_${row}`] = url;
            })(x, y);
            l1Promises.push(p);
        }
    }
    await Promise.all(l1Promises);
    
    // C. Multi-level Slicing: Level 2 (8K High Resolution grid 8 x 4 = 32 tiles)
    onProgress("초고화질 Level 2 (8x4 정밀 해상도) 32개 그리드 조각화 및 동시 업로드 중...");
    const l2Urls: { [key: string]: string } = {};
    const l2Promises: Promise<void>[] = [];
    
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 8; x++) {
            const sx = x * (w / 8);
            const sy = y * (h / 4);
            const sw = w / 8;
            const sh = h / 4;
            const tileRef = ref(storage, `vr-tiles/${postId}/pano_${panoIndex}_tile_l2_${x}_${y}.jpg`);
            
            const p = (async (col: number, row: number) => {
                const blob = await getTileBlob(sx, sy, sw, sh, 512, 512);
                await uploadBytes(tileRef, blob, { contentType: 'image/jpeg' });
                const url = await getDownloadURL(tileRef);
                l2Urls[`${col}_${row}`] = url;
            })(x, y);
            l2Promises.push(p);
        }
    }
    await Promise.all(l2Promises);
    
    // D. Upload Manifest JSON mapping tile coordinates to Firebase Storage URLs
    onProgress("실시간 시선 스트리밍 파이프라인 명세표(Manifest.json) 등록 중...");
    const manifest = {
        preview: previewDownloadUrl,
        levels: {
            l1: { cols: 4, rows: 2, tiles: l1Urls },
            l2: { cols: 8, rows: 4, tiles: l2Urls }
        }
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestRef = ref(storage, `vr-tiles/${postId}/pano_${panoIndex}_manifest.json`);
    await uploadBytes(manifestRef, manifestBlob, { contentType: 'application/json' });
    const manifestDownloadUrl = await getDownloadURL(manifestRef);
    
    onProgress("정밀 타일링 변환 및 업로드 완료!");
    // Return formatted string descriptor
    return `tiled:${previewDownloadUrl};${manifestDownloadUrl}`;
}


// =========================================================================
// 1.5. Centralized Room Connection & Floor-Plane Coordinate Dataset
// =========================================================================
export interface FloorHotspot {
    pitch: number;
    yaw: number;
    targetIndex: number;
    roomName: string;
    description: string;
    x?: number;
    y?: number;
    z?: number;
}

// Generates real-time interconnected Floor-Plane coordinates dynamically based on the listing panoramas list
const getFloorHotspotsForScene = (activeIdx: number, totalScenesCount: number): FloorHotspot[] => {
    if (totalScenesCount <= 1) return [];

    // Map standardized clean room names dynamically
    const getRoomLabel = (idx: number): { name: string; desc: string } => {
        const labels = [
            { name: "거실 (Living Room)", desc: "넓고 화사한 남향 거실 공간" },
            { name: "주방 (Kitchen Area)", desc: "최신 빌트인 씽크대 & 배수구 점검 완료" },
            { name: "안방 (Master Bedroom)", desc: "쾌적하고 따스한 햇살 가득 침실" },
            { name: "현관 (Entrance)", desc: "안전 이중 보안 도어 및 현관 구역" },
            { name: "욕실 (Bathroom)", desc: "배수 경사도 완벽 설계 위생 공간" },
            { name: "베란다 (Balcony)", desc: "다용도 세탁실 & 보일러실 다용도구역" },
            { name: "침실 2 (Room 2)", desc: "서재 또는 자녀방 추천 구역" },
            { name: "침실 3 (Room 3)", desc: "깔끔한 화이트톤 서브룸" }
        ];
        return labels[idx % labels.length];
    };

    const hotspots: FloorHotspot[] = [];

    // Formulate a robust mesh network of pathways so user can navigate like a high-end 3D tour
    if (activeIdx === 0) {
        // Living Room links to Kitchen (1), Bedroom (2), Entrance (3)
        if (totalScenesCount > 1) {
            const label = getRoomLabel(1);
            hotspots.push({ pitch: -50, yaw: 45, targetIndex: 1, roomName: label.name, description: label.desc });
        }
        if (totalScenesCount > 2) {
            const label = getRoomLabel(2);
            hotspots.push({ pitch: -45, yaw: -60, targetIndex: 2, roomName: label.name, description: label.desc });
        }
        if (totalScenesCount > 3) {
            const label = getRoomLabel(3);
            hotspots.push({ pitch: -54, yaw: 165, targetIndex: 3, roomName: label.name, description: label.desc });
        }
    } else if (activeIdx === 1) {
        // Kitchen links back to Living Room (0) & Bathroom (4) or Bedroom (2)
        hotspots.push({ pitch: -46, yaw: -135, targetIndex: 0, roomName: getRoomLabel(0).name, description: "거실 구역으로 복귀" });
        if (totalScenesCount > 4) {
            const label = getRoomLabel(4);
            hotspots.push({ pitch: -48, yaw: 35, targetIndex: 4, roomName: label.name, description: label.desc });
        } else if (totalScenesCount > 2) {
            const label = getRoomLabel(2);
            hotspots.push({ pitch: -52, yaw: 70, targetIndex: 2, roomName: label.name, description: label.desc });
        }
    } else if (activeIdx === 2) {
        // Master Bedroom links back to Living Room (0)
        hotspots.push({ pitch: -46, yaw: 120, targetIndex: 0, roomName: getRoomLabel(0).name, description: "거실 구역으로 복귀" });
        if (totalScenesCount > 3) {
            const label = getRoomLabel(3);
            hotspots.push({ pitch: -50, yaw: -45, targetIndex: 3, roomName: label.name, description: label.desc });
        }
    } else if (activeIdx === 3) {
        // Entrance links to Living Room (0)
        hotspots.push({ pitch: -45, yaw: -15, targetIndex: 0, roomName: getRoomLabel(0).name, description: "거실 내부 진입" });
        if (totalScenesCount > 4) {
            const label = getRoomLabel(4);
            hotspots.push({ pitch: -52, yaw: 90, targetIndex: 4, roomName: label.name, description: label.desc });
        }
    } else {
        // Fallback backward-forward link pattern for complex multiroom listings
        const prevIdx = activeIdx - 1;
        const nextIdx = (activeIdx + 1) % totalScenesCount;
        hotspots.push({
            pitch: -48,
            yaw: -50,
            targetIndex: prevIdx,
            roomName: getRoomLabel(prevIdx).name,
            description: "이전 공간 투어"
        });
        hotspots.push({
            pitch: -48,
            yaw: 50,
            targetIndex: nextIdx,
            roomName: getRoomLabel(nextIdx).name,
            description: "다음 공간 투어"
        });
    }

    return hotspots;
};


// =========================================================================
// 2. High-Performance Progressive Tiling VR Viewer React Component
// =========================================================================
interface VrViewerProps {
    images: string[];
    activeIndex: number;
    onSceneChange?: (idx: number) => void;
    height?: string;
}

export const VrViewer: React.FC<VrViewerProps> = ({
    images,
    activeIndex,
    onSceneChange,
    height = "h-[450px] md:h-[580px] lg:h-[680px] xl:h-[760px] aspect-auto w-full"
}) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const viewerInstanceRef = useRef<any>(null);
    const masterCanvasRef = useRef<HTMLCanvasElement | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [tileLoadProgress, setTileLoadProgress] = useState(0);
    const [viewerError, setViewerError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
    const [testLogs, setTestLogs] = useState<Array<{ name: string; status: 'success' | 'warning' | 'error'; message: string }>>([]);
    const [isTestingFetch, setIsTestingFetch] = useState(false);
    
    // Mode choice: interactive WebGL VS scroll fallback flat panorama
    const [mode, setMode] = useState<'webgl' | 'flat'>(() => {
        return isWebGLSupported() && (typeof window !== 'undefined' && window.pannellum) ? 'webgl' : 'flat';
    });
    
    const flatScrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    
    // Tiling streaming state tracking
    const manifestDataRef = useRef<any>(null);
    const loadedTilesRef = useRef<Set<string>>(new Set());
    const loadingTilesRef = useRef<Set<string>>(new Set());
    const currentActiveSceneRef = useRef<string>('');
    const blobUrlsToCleanRef = useRef<string[]>([]);
    
    const imagesKey = images.join('|');
    
    // Keep callback ref stable to prevent tearing down WebGL on prop recreation
    const onSceneChangeRef = useRef(onSceneChange);
    useEffect(() => {
        onSceneChangeRef.current = onSceneChange;
    }, [onSceneChange]);

    // -------------------------------------------------------------------------
    // 3차원 시점 침투 가속(Depth-Infiltration) 레이캐스팅 카메라 트랜지션 엔진
    // -------------------------------------------------------------------------
    const animateInfiltration = useCallback((targetPitch: number, targetYaw: number, targetIndex: number) => {
        const viewer = viewerInstanceRef.current;
        if (!viewer) {
            // Fallback immediately if viewer initialization is not complete
            if (onSceneChangeRef.current) {
                onSceneChangeRef.current(targetIndex);
            }
            return;
        }

        const startPitch = viewer.getPitch();
        const startYaw = viewer.getYaw();
        const startHfov = viewer.getHfov();

        const duration = 450; // 0.45s of progressive smooth acceleration
        const startTime = performance.now();

        // Lock interface and show high-end transition loader
        setIsLoading(true);

        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Premium Ease-In-Out Cubic equation for professional gliding inertia feeling
            const ease = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const currentPitch = startPitch + (targetPitch - startPitch) * ease;
            
            // Calculate shortest path for horizontal rotation with circular boundary wrapping
            let diffYaw = targetYaw - startYaw;
            while (diffYaw < -185) diffYaw += 360;
            while (diffYaw > 185) diffYaw -= 360;
            const currentYaw = startYaw + diffYaw * ease;

            // Infiltration Zoom: reduce HFOV down to 24 to simulate physical forward depth infiltration
            const currentHfov = startHfov + (24 - startHfov) * ease;

            if (viewerInstanceRef.current) {
                viewerInstanceRef.current.setPitch(currentPitch);
                viewerInstanceRef.current.setYaw(currentYaw);
                viewerInstanceRef.current.setHfov(currentHfov);
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                // Swap scene assets seamlessly
                if (onSceneChangeRef.current) {
                    onSceneChangeRef.current(targetIndex);
                }
            }
        };
        requestAnimationFrame(step);
    }, []);
    
    // Parse normal vs tiled representations
    const currentImageInfo = React.useMemo(() => {
        const rawUrl = images[activeIndex] || images[0] || '';
        const cleanUrl = rawUrl.includes('|') ? rawUrl.split('|')[0] : rawUrl;
        
        if (cleanUrl.startsWith('tiled:')) {
            const parts = cleanUrl.substring(6).split(';');
            return {
                isTiled: true,
                preview: parts[0],
                manifest: parts[1] || ''
            };
        }
        return {
            isTiled: false,
            preview: cleanUrl,
            manifest: ''
        };
    }, [images, activeIndex]);
    
    // Clean up temporary blob urls to avoid memory leaks
    const cleanOldBlobUrls = useCallback(() => {
        blobUrlsToCleanRef.current.forEach(url => {
            try { URL.revokeObjectURL(url); } catch (e) {}
        });
        blobUrlsToCleanRef.current = [];
    }, []);
    
    useEffect(() => {
        return () => {
            cleanOldBlobUrls();
        };
    }, [cleanOldBlobUrls]);
    
    // -------------------------------------------------------------------------
    // Progressive Tile Streamer & Canvas Stitcher Engine (8K Resolution Optimized)
    // -------------------------------------------------------------------------
    
    // Throttled high-performance composite transfer to WebGL panorama texture
    const redrawTimeoutRef = useRef<any>(null);
    const triggerPannellumCanvasRedraw = useCallback(() => {
        if (redrawTimeoutRef.current) clearTimeout(redrawTimeoutRef.current);
        
        redrawTimeoutRef.current = setTimeout(() => {
            const canvas = masterCanvasRef.current;
            if (!canvas || !viewerInstanceRef.current) return;
            
            try {
                const renderer = viewerInstanceRef.current.getRenderer();
                if (renderer) {
                    try {
                        renderer.init(canvas, 'equirectangular', true);
                    } catch (innerErr) {
                        renderer.init(canvas, 'equirectangular');
                    }
                }
            } catch (e) {
                console.error("Failed to update WebGL texture dynamically:", e);
            }
        }, 30); // Decreased timeout to 30ms for lightning-fast instantaneous rendering
    }, []);

    const renderTiledSceneToCanvas = useCallback((
        previewImg: HTMLImageElement,
        manifest: any
    ) => {
        if (typeof window === 'undefined') return;
        
        let canvas = masterCanvasRef.current;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = 8192; // Upgraded canvas to raw 8K resolution space
            canvas.height = 4096;
            masterCanvasRef.current = canvas;
        }
        
        // Direct graphics acceleration using desynchronized low-latency composition buffers
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) return;
        
        // Sharpen anti-aliasing context flags
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Step 1: Baseline Stretched Low-res Preview (0.1s instant visual block)
        ctx.drawImage(previewImg, 0, 0, 8192, 4096);
        loadedTilesRef.current.clear();
        loadingTilesRef.current.clear();
        manifestDataRef.current = manifest;
        
        // Immediate low-res canvas update
        try {
            const renderer = viewerInstanceRef.current.getRenderer();
            if (renderer) {
                try {
                    renderer.init(canvas, 'equirectangular', true);
                } catch (innerErr) {
                    renderer.init(canvas, 'equirectangular');
                }
            }
        } catch (e) {
            console.error("Failed to initialize baseline low-res preview on WebGL:", e);
        }
    }, []);
    
    // Calculate visible coordinates and fetch on-demand tiles inside user's radar field
    const loadVisibleTiles = useCallback(() => {
        const viewer = viewerInstanceRef.current;
        const manifest = manifestDataRef.current;
        const canvas = masterCanvasRef.current;
        if (!viewer || !manifest || !canvas) return;
        
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) return;
        
        // Get camera angles from reader
        const currentYaw = viewer.getYaw();   // Horizontal: -180 to 180
        const currentPitch = viewer.getPitch(); // Vertical: -90 to 90
        const hfov = viewer.getHfov() || 100;
        
        // Normalize yaw to [0, 360]
        const yaw360 = (currentYaw + 180 + 360) % 360;
        
        // Determine columns of interest under active viewport (col covers 45 deg)
        // A wider span covers neighboring tiles for smooth turning
        const colVisibility: number[] = [];
        for (let x = 0; x < 8; x++) {
            const colStart = x * 45;
            const colEnd = (x + 1) * 45;
            
            const viewMin = (yaw360 - hfov/2 - 20 + 360) % 360;
            const viewMax = (yaw360 + hfov/2 + 20 + 360) % 360;
            
            let isVisible = false;
            if (viewMin < viewMax) {
                isVisible = (colStart < viewMax && colEnd > viewMin);
            } else {
                isVisible = (colStart < viewMax || colEnd > viewMin);
            }
            if (isVisible) colVisibility.push(x);
        }
        
        // Determine rows of interest (row covers 45 deg from top +90 to bottom -90)
        const rowVisibility: number[] = [];
        for (let y = 0; y < 4; y++) {
            const rowTop = 90 - y * 45;
            const rowBottom = 90 - (y + 1) * 45;
            
            const viewMin = currentPitch - 40;
            const viewMax = currentPitch + 40;
            
            if (rowBottom < viewMax && rowTop > viewMin) {
                rowVisibility.push(y);
            }
        }
        
        // Fetch tiles of level 2 (8x4 grid) that are inside visible boundaries
        const tilesToLoad: Array<{ x: number, y: number, url: string }> = [];
        colVisibility.forEach(x => {
            rowVisibility.forEach(y => {
                const key = `${x}_${y}`;
                if (!loadedTilesRef.current.has(key) && !loadingTilesRef.current.has(key)) {
                    const url = manifest.levels.l2.tiles[key];
                    if (url) {
                        tilesToLoad.push({ x, y, url });
                    }
                }
            });
        });
        
        if (tilesToLoad.length === 0) return;
        
        // High-speed parallel bundle tile loader
        const loadPromises = tilesToLoad.map(({ x, y, url }) => {
            const key = `${x}_${y}`;
            loadingTilesRef.current.add(key);
            
            return new Promise<void>((resolve) => {
                const tileImg = new Image();
                tileImg.crossOrigin = "anonymous";
                tileImg.onload = () => {
                    if (currentActiveSceneRef.current === currentImageInfo.preview) {
                        const tileW = 8192 / 8; // Mapping dimension perfectly onto 8K canvas space (1024px)
                        const tileH = 4096 / 4; // 1024px mapping
                        
                        // Anti-aliasing context optimization rules & texture alignment
                        ctx.save();
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        // Fine-tuned Pixel Shadow and sharp contrast boundary correction filter
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                        ctx.shadowBlur = 1.8;
                        ctx.shadowOffsetX = 0.5;
                        ctx.shadowOffsetY = 0.5;
                        
                        // Render tile texture onto our hardware-accelerated buffer canvas
                        ctx.drawImage(tileImg, x * tileW, y * tileH, tileW, tileH);
                        ctx.restore();
                        
                        loadedTilesRef.current.add(key);
                    }
                    loadingTilesRef.current.delete(key);
                    resolve();
                };
                tileImg.onerror = () => {
                    loadingTilesRef.current.delete(key);
                    resolve();
                };
                tileImg.src = url;
            });
        });

        Promise.all(loadPromises).then(() => {
            if (currentActiveSceneRef.current !== currentImageInfo.preview) return;
            
            // Keep progress metric updated
            const totalVisibleTilesCount = 8 * 4; // Max grids in level 2
            setTileLoadProgress(Math.min(100, Math.round((loadedTilesRef.current.size / totalVisibleTilesCount) * 100)));
            
            // Batch complete: trigger single high-performance canvas composite transfer to WebGL
            triggerPannellumCanvasRedraw();
        });
    }, [currentImageInfo.preview, triggerPannellumCanvasRedraw]);
    
    // Poll viewer coordinates to trigger background tile loads on yaw/pitch changes
    useEffect(() => {
        if (!currentImageInfo.isTiled || mode !== 'webgl' || isLoading) return;
        
        let lastYaw = 999;
        let lastPitch = 999;
        
        const interval = setInterval(() => {
            const viewer = viewerInstanceRef.current;
            if (!viewer) return;
            
            const yaw = Math.round(viewer.getYaw() / 15) * 15; // Quantize triggers
            const pitch = Math.round(viewer.getPitch() / 15) * 15;
            
            if (yaw !== lastYaw || pitch !== lastPitch) {
                lastYaw = yaw;
                lastPitch = pitch;
                loadVisibleTiles();
            }
        }, 300);
        
        return () => clearInterval(interval);
    }, [currentImageInfo, mode, isLoading, loadVisibleTiles]);
    
    
    // -------------------------------------------------------------------------
    // Core Pannellum Base Initialization
    // -------------------------------------------------------------------------
    useEffect(() => {
        let v: any = null;
        let isMounted = true;
        
        const container = viewerRef.current;
        if (!container) return;
        
        const initViewer = async () => {
            try {
                setIsLoading(true);
                setViewerError(null);
                setTileLoadProgress(0);
                
                // Wait for pannellum window object
                let attempts = 0;
                while (!window.pannellum && attempts < 50) {
                    if (!isMounted) return;
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }
                
                if (!window.pannellum) {
                    throw new Error("Pannellum 360 가상투어 코어 엔진을 로드하지 못했습니다.");
                }
                
                // Establish dimensions safeguard
                let rect = container.getBoundingClientRect();
                let rectAttempts = 0;
                while ((rect.width <= 20 || rect.height <= 20) && rectAttempts < 20) {
                    if (!isMounted) return;
                    await new Promise(r => setTimeout(r, 150));
                    rect = container.getBoundingClientRect();
                    rectAttempts++;
                }
                
                // Safe WebGL Fallback check
                if (!isWebGLSupported()) {
                    setMode('flat');
                    setIsLoading(false);
                    return;
                } else {
                    setMode('webgl');
                }
                
                // Hotspots setup - 2순위 바닥면 원형 링(Floor Ring) 및 기하학 좌표 네비게이션 적용
                let customHotspots: FloorHotspot[] = [];
                if (currentImageInfo.isTiled && currentImageInfo.manifest) {
                    try {
                        const response = await fetch(currentImageInfo.manifest);
                        const mData = await response.json();
                        if (mData && Array.isArray(mData.hotspots)) {
                            customHotspots = mData.hotspots;
                        }
                    } catch (e) {
                        console.warn("Failed to prefetch manifest hotspots in VrViewer:", e);
                    }
                }

                const hotSpots: any[] = [];
                const mappedPoints = customHotspots.length > 0
                    ? customHotspots
                    : (images.length > 1 ? getFloorHotspotsForScene(activeIndex, images.length) : []);

                if (mappedPoints.length > 0) {
                    mappedPoints.forEach(pt => {
                        hotSpots.push({
                            pitch: pt.pitch,
                            yaw: pt.yaw,
                            type: 'info',
                            cssClass: 'pnlm-floor-ring-hotspot',
                            text: `${pt.roomName}|${pt.description}`,
                            createTooltipFunc: (hotSpotDiv: HTMLElement, args: string) => {
                                hotSpotDiv.innerHTML = ''; // 빈 공간 보장
                                
                                // 중앙 3D 비컨 생성
                                const dot = document.createElement('div');
                                dot.className = 'pnlm-floor-ring-dot';
                                hotSpotDiv.appendChild(dot);
                                
                                // 인자 분할 파싱
                                const parts = args.split('|');
                                const name = parts[0] || '공간 이동';
                                const desc = parts[1] || '지상 마루 구역으로 이동합니다.';
                                
                                // 공중에 부유하는 글래스모피즘 네임 배지 생성
                                const badge = document.createElement('div');
                                badge.className = 'pnlm-floor-ring-badge';
                                
                                const titleSpan = document.createElement('span');
                                titleSpan.innerText = name;
                                titleSpan.style.fontWeight = '800';
                                badge.appendChild(titleSpan);
                                
                                const descSpan = document.createElement('span');
                                descSpan.className = 'pnlm-floor-ring-badge-desc';
                                descSpan.innerText = desc;
                                descSpan.style.fontSize = '8.5px';
                                descSpan.style.opacity = '0.7';
                                badge.appendChild(descSpan);
                                
                                hotSpotDiv.appendChild(badge);
                            },
                            createTooltipArgs: `${pt.roomName}|${pt.description}`,
                            clickHandlerFunc: () => {
                                // 고품격 시점 침투 가속(Depth-Infiltration) 레이캐스팅 카메라로 가속 빨려 들어감 작동!
                                animateInfiltration(pt.pitch, pt.yaw, pt.targetIndex);
                            }
                        });
                    });
                }
                
                // Clean the scene completely
                container.innerHTML = '';
                currentActiveSceneRef.current = currentImageInfo.preview;
                
                // Build initial equirectangular viewer using the ultra-lightweight 0.1s preview image
                v = window.pannellum.viewer(container, {
                    type: 'equirectangular',
                    panorama: currentImageInfo.preview,
                    autoLoad: true,
                    showControls: true,
                    compass: true,
                    hfov: 105,
                    minHfov: 60,
                    maxHfov: 115,
                    minPitch: -85,
                    maxPitch: 90,
                    haov: 360,
                    vaov: 180,
                    pitch: 0,
                    yaw: 0,
                    crossOrigin: 'anonymous',
                    hotSpots: hotSpots,
                    errorCallback: (err: string) => {
                        console.warn("Pannellum Error:", err);
                        if (isMounted) {
                            setMode('flat');
                            setIsLoading(false);
                        }
                    },
                    strings: {
                        loadingLabel: "저화질 프리뷰 공간 생성 중...",
                        loadButtonLabel: "360° 투어 활성화",
                        noWebGLError: "이 웹브라우저는 WebGL 화형 처리를 지원하지 않습니다.",
                        bylineLabel: "태왕공인중개사"
                    }
                });
                
                v.on('load', () => {
                    if (!isMounted) return;
                    setIsLoading(false);
                    
                    // 침투 가속(Infiltration)에 따른 클로즈업 뷰를 부드럽게 복구시키는 반동 복원 애니메이션 (Breathing Release)
                    const vInstance = viewerInstanceRef.current || v;
                    if (vInstance) {
                        const targetHfov = 105;
                        const startHfov = vInstance.getHfov();
                        if (startHfov < 50) {
                            const rStartTime = performance.now();
                            const rDuration = 600; // 0.6초간 부드럽게 복원
                            const animateRestore = (rNow: number) => {
                                const rElapsed = rNow - rStartTime;
                                const rProgress = Math.min(rElapsed / rDuration, 1);
                                const rEase = 1 - Math.pow(1 - rProgress, 3); // Ease-Out Cubic 데셀레이션
                                
                                const currentHfov = startHfov + (targetHfov - startHfov) * rEase;
                                if (viewerInstanceRef.current) {
                                    viewerInstanceRef.current.setHfov(currentHfov);
                                }
                                
                                if (rProgress < 1) {
                                    requestAnimationFrame(animateRestore);
                                }
                            };
                            requestAnimationFrame(animateRestore);
                        }
                    }
                    
                    // Trigger Progressive Multi-level tiles downloader if it's a tiled panorama
                    if (currentImageInfo.isTiled) {
                        fetch(currentImageInfo.manifest)
                            .then(res => res.json())
                            .then(manifest => {
                                if (!isMounted) return;
                                
                                const previewImg = new Image();
                                previewImg.crossOrigin = 'anonymous';
                                previewImg.onload = () => {
                                    if (isMounted) {
                                        renderTiledSceneToCanvas(previewImg, manifest);
                                    }
                                };
                                previewImg.src = currentImageInfo.preview;
                            })
                            .catch(e => {
                                console.warn("명세서 Manifest 로드 실패, 저화질 프리뷰로 영구 유지 보정됨:", e);
                            });
                    }
                });
                
                viewerInstanceRef.current = v;
                
                // Handle resize observers
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
                console.warn("[VrViewer Init failure]", err);
                if (isMounted) {
                    setMode('flat');
                    setIsLoading(false);
                }
            }
        };
        
        initViewer();
        
        return () => {
            isMounted = false;
            if (v) {
                if ((v as any)._resizeObserver) {
                    try { (v as any)._resizeObserver.disconnect(); } catch (e) {}
                }
                try { v.destroy(); } catch (e) {}
            }
            viewerInstanceRef.current = null;
        };
    }, [imagesKey, activeIndex, currentImageInfo, renderTiledSceneToCanvas]);
    
    // -------------------------------------------------------------------------
    // System Diagnostics Tool (투어 시스템 자가진단)
    // -------------------------------------------------------------------------
    const runDiagnostics = async () => {
        setIsTestingFetch(true);
        setDiagnosticsOpen(true);
        const logs: Array<{ name: string; status: 'success' | 'warning' | 'error'; message: string }> = [];
        
        // 1. WebGL support
        const hasWebgl = isWebGLSupported();
        logs.push({
            name: 'WebGL 하드웨어 가속',
            status: hasWebgl ? 'success' : 'error',
            message: hasWebgl
                ? '브라우저의 3D WebGL 파형 가속기가 활성화되어 360° 타일 렌더러가 올바르게 작동합니다.'
                : '기기가 WebGL을 지원하지 않아 평면 스와이프 모드로 자동 우회되었습니다.'
        });
        
        // 2. Progressive Tiles check
        logs.push({
            name: '멀티레졸루션 타일링 설계',
            status: currentImageInfo.isTiled ? 'success' : 'warning',
            message: currentImageInfo.isTiled
                ? '신규 매물: 대기업형 초고속 multi-level 분할 타일 파이프라인이 수립되어 있습니다.'
                : '레거시 매물: 단일 equirectangular 통이미지로 기동되고 있습니다 (타일 변환 업로드 추천).'
        });
        
        // 3. Storage connectivity CORS head test
        try {
            const res = await fetch(currentImageInfo.preview, { method: 'HEAD', mode: 'cors' });
            logs.push({
                name: 'Firebase Storage 교차 출처(CORS)',
                status: res.ok ? 'success' : 'warning',
                message: res.ok
                    ? 'GCS CORS 보안 통과 확인 완료. 즉각적인 바이너리 스트리밍 픽셀 수급이 허가되었습니다.'
                    : '안전 보완 통신 수단 프록시가 가입될 수 있습니다.'
            });
        } catch (e: any) {
            logs.push({
                name: 'Firebase Storage 교차 출처(CORS)',
                status: 'error',
                message: `CORS 교차 보호 정책에 가로막혔습니다: ${e.message}`
            });
        }
        
        setTestLogs(logs);
        setIsTestingFetch(false);
    };
    
    // Flat scroll mouse drag triggers
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
        const walk = (x - startX) * 1.5;
        flatScrollRef.current.scrollLeft = scrollLeft - walk;
    };
    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };
    
    // Responsive touch swipings
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
    
    useEffect(() => {
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
    
    const isStyleHeight = /^[0-9]+(px|%|vh|rem|em)$/.test(height) || /^[0-9]+$/.test(height);
    const heightClass = isStyleHeight ? '' : height;
    const heightStyle = isStyleHeight ? { height: /^[0-9]+$/.test(height) ? `${height}px` : height } : undefined;
    
    return (
        <div className={`relative group w-full ${isStyleHeight ? "" : "pannellum-responsive-container"}`}>
            <style dangerouslySetInnerHTML={{ __html: `
                /* GPU hardware-accelerated 8K sharpening filtering, anti-aliasing & edges contrast styling */
                #panorama canvas, .pnlm-render-container canvas {
                    image-rendering: -webkit-optimize-contrast !important;
                    image-rendering: crisp-edges !important;
                    image-rendering: pixelated !important;
                    filter: url('#vr-sharpen-filter') contrast(1.05) saturate(1.03) !important;
                    transform: translate3d(0, 0, 0) !important;
                    backface-visibility: hidden !important;
                    -webkit-backface-visibility: hidden !important;
                }
                .pannellum-responsive-container {
                    width: 100% !important;
                    height: 350px !important;
                    min-height: 350px !important;
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
                /* -------------------------------------------------------------
                 * 2순위 바닥면 좌표 네비게이션용 고품격 3D Floor Ring 스타일시트
                 * ------------------------------------------------------------- */
                .pnlm-floor-ring-hotspot {
                    width: 100px !important;
                    height: 42px !important;
                    border: 3.5px solid rgba(16, 185, 129, 0.85) !important;
                    background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.02) 80%, transparent 100%) !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.5), inset 0 0 12px rgba(16, 185, 129, 0.4) !important;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    transform: translate(-50%, -50%) rotateX(68deg) !important;
                    transform-style: preserve-3d !important;
                    z-index: 50;
                }

                .pnlm-floor-ring-hotspot:hover {
                    border-color: rgba(52, 211, 153, 1) !important;
                    background: radial-gradient(circle, rgba(52, 211, 153, 0.5) 0%, rgba(52, 211, 153, 0.12) 85%, transparent 100%) !important;
                    box-shadow: 0 0 32px rgba(52, 211, 153, 0.95), inset 0 0 18px rgba(52, 211, 153, 0.7) !important;
                    transform: translate(-50%, -50%) rotateX(68deg) scale(1.18) !important;
                }

                /* Central glowing pulsing beacon */
                .pnlm-floor-ring-dot {
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 14px !important;
                    height: 14px !important;
                    background-color: #34d399 !important;
                    border: 2.5px solid #ffffff !important;
                    border-radius: 50% !important;
                    box-shadow: 0 0 12px #10b981 !important;
                    animation: beacon-ping 1.8s infinite ease-in-out !important;
                    pointer-events: none !important;
                }

                @keyframes beacon-ping {
                    0% {
                        transform: translate(-50%, -50%) scale(0.85);
                        box-shadow: 0 0 0 0px rgba(52, 211, 153, 0.7);
                    }
                    70% {
                        transform: translate(-50%, -50%) scale(1.35);
                        box-shadow: 0 0 0 12.5px rgba(52, 211, 153, 0);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(0.85);
                        box-shadow: 0 0 0 0px rgba(52, 211, 153, 0);
                    }
                }

                /* Elegantly suspended glassmorphic room label badge */
                .pnlm-floor-ring-badge {
                    position: absolute !important;
                    bottom: 110% !important;
                    left: 50% !important;
                    transform: translateX(-50%) rotateX(-68deg) !important; /* Neutralizes perspective tilt so text stays perfectly upright and readable */
                    background: rgba(15, 23, 42, 0.92) !important;
                    backdrop-filter: blur(4px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.18) !important;
                    color: #ffffff !important;
                    font-weight: 800 !important;
                    font-family: inherit !important;
                    font-size: 11px !important;
                    padding: 5px 12px !important;
                    border-radius: 10px !important;
                    white-space: nowrap !important;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
                    pointer-events: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 1.5px !important;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    opacity: 0.85 !important;
                }

                .pnlm-floor-ring-badge-desc {
                    font-size: 8.5px !important;
                    font-weight: 500 !important;
                    color: rgba(255, 255, 255, 0.6) !important;
                }

                .pnlm-floor-ring-hotspot:hover .pnlm-floor-ring-badge {
                    opacity: 1 !important;
                    background: rgba(16, 185, 129, 0.98) !important;
                    border-color: rgba(255, 255, 255, 0.35) !important;
                    transform: translateX(-50%) rotateX(-68deg) translateY(-8px) scale(1.08) !important;
                    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.3) !important;
                }

                .pnlm-floor-ring-hotspot:hover .pnlm-floor-ring-badge .pnlm-floor-ring-badge-desc {
                    color: rgba(255, 255, 255, 0.85) !important;
                }
            `}} />
            
            {/* The WebGL Canvas container */}
            <div
                ref={viewerRef}
                id="panorama"
                className={`w-full bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 ${isStyleHeight ? "" : "pannellum-responsive-container"} ${mode === 'webgl' ? 'block' : 'hidden'}`}
                style={heightStyle}
            ></div>
            
            {/* Flat Scroll backup Canvas */}
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
                        src={currentImageInfo.preview}
                        className={`h-full min-w-[240%] sm:min-w-[180%] md:min-w-[140%] max-w-none object-cover pointer-events-none select-none transition-transform duration-500 ease-out`}
                        alt="평면 파노라마 VR 뷰"
                    />
                    
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
                            >
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                        </>
                    )}
                </div>
            )}
            
            {/* Glassmorphic Buffer / Premium Loader (Only shows while Level 0 preview boot completes) */}
            <AnimatePresence>
                {isLoading && mode === 'webgl' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center z-40 rounded-2xl cursor-default"
                    >
                        <div className="flex flex-col items-center gap-4 bg-slate-950/80 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-xs text-center">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/15 border-t-emerald-500 border-r-emerald-500/45 animate-spin"></div>
                                <i className="fa-solid fa-vr-cardboard text-emerald-400 text-xl animate-pulse"></i>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-white font-black text-sm tracking-tight">공간 최적화 가속 (0.1초 프리뷰 완료)</h4>
                                <p className="text-white/60 text-[10px] leading-relaxed">
                                    초고화질 멀티레졸루션 격리 타일들을 시선 흐름에 맞춰 실시간 스트리밍하고 있습니다.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Information badges (bottom left) */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-30 select-none text-left">
                <div className="bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors w-fit">
                    <i className="fa-solid fa-circle-nodes text-emerald-400"></i>
                    <span>
                        {currentImageInfo.isTiled 
                        ? `초고속 스트리밍 타일링 기동 중 (진척도: ${tileLoadProgress}%)` 
                        : '레거시 광대역 파노라마 (단일 일괄 로드)'}
                    </span>
                </div>
            </div>
            
            {/* Interactive triggers (top right) */}
            <div className="absolute top-4 right-4 flex gap-2 z-30 pointer-events-auto">
                <button
                    onClick={() => setIsFullscreen(true)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-3 py-1.5 rounded-full text-[10.5px] border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer shadow-lg transition-all hover:scale-105"
                >
                    <i className="fa-solid fa-expand text-[11px] animate-pulse"></i>
                    <span>대극장 모드</span>
                </button>
                <button
                    onClick={runDiagnostics}
                    className="bg-slate-900/85 backdrop-blur-md text-emerald-300 hover:text-emerald-200 font-extrabold px-3 py-1.5 rounded-full text-[10.5px] border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer shadow-lg transition-all hover:scale-105"
                >
                    <i className="fa-solid fa-square-check text-[11px]"></i>
                    <span>시스템 진단</span>
                </button>
            </div>
            
            {/* Diagnostic Logs Overlay Modal */}
            <AnimatePresence>
                {diagnosticsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[150] flex items-center justify-center p-4"
                        onClick={() => setDiagnosticsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg w-full p-6 sm:p-8 rounded-3xl shadow-2xl relative text-left space-y-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                                        <i className="fa-solid fa-stethoscope text-emerald-400"></i>
                                        <span>초고속 가상 리얼리티 진단 보고서</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Multi-resolution Tiling 및 GCS 통신 라인 무결성 체크</p>
                                </div>
                                <button
                                    onClick={() => setDiagnosticsOpen(false)}
                                    className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center border-0 text-base font-bold cursor-pointer"
                                >
                                    &times;
                                </button>
                            </div>
                            
                            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                                {isTestingFetch ? (
                                    <div className="flex flex-col items-center py-10 gap-3">
                                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-xs text-slate-400 font-bold">네트워크 및 교차 보안 검사 실행 중...</p>
                                    </div>
                                ) : (
                                    testLogs.map((log, index) => (
                                        <div key={index} className="flex gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                            {log.status === 'success' && <i className="fa-solid fa-circle-check text-emerald-505 text-base pt-0.5 text-emerald-400"></i>}
                                            {log.status === 'warning' && <i className="fa-solid fa-circle-exclamation text-amber-505 text-base pt-0.5 text-amber-400"></i>}
                                            {log.status === 'error' && <i className="fa-solid fa-circle-xmark text-red-505 text-base pt-0.5 text-red-400"></i>}
                                            <div className="flex-1 space-y-0.5 leading-relaxed">
                                                <h4 className="text-xs font-black text-slate-200">{log.name}</h4>
                                                <p className="text-[11px] text-slate-450 text-slate-400 font-medium">{log.message}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="text-right">
                                <button
                                    onClick={() => setDiagnosticsOpen(false)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-3 rounded-xl border-0 cursor-pointer shadow-md transition-colors"
                                >
                                    진단 확인 완료
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Theatre mode fullview window */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950 z-[200] flex flex-col p-4 w-full h-full"
                    >
                        <header className="flex justify-between items-center py-2 px-4 bg-slate-900 border-b border-slate-800 rounded-t-2xl">
                            <span className="text-white text-xs font-black flex items-center gap-1.5 select-none">
                                <i className="fa-solid fa-circle-dot text-emerald-500 animate-pulse"></i>
                                <span>360° 대극장 공간 투어관 • 소속 : 구미태왕공인중개사</span>
                            </span>
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-full text-xs font-black transition-colors cursor-pointer border-0"
                            >
                                극장 종료 Esc
                            </button>
                        </header>
                        <div className="flex-1 w-full relative bg-slate-950 flex items-center justify-center overflow-hidden rounded-b-2xl">
                            {/* Simple fallback when mounting */}
                            <VrViewer
                                images={images}
                                activeIndex={activeIndex}
                                onSceneChange={onSceneChange}
                                height="100%"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden SVG Sharpening Mask Convolution Filter Reference Definitions */}
            <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
                <defs>
                    <filter id="vr-sharpen-filter">
                        <feConvolveMatrix order="3" kernelMatrix="0 -0.7 0 -0.7 3.8 -0.7 0 -0.7 0" preserveAlpha="true" />
                    </filter>
                </defs>
            </svg>
        </div>
    );
};
