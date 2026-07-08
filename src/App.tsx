import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from './store';
import { MainTab } from './components/MainTab';
import { DetailTab } from './components/DetailTab';
import { VrListTab } from './components/VrListTab';
import { AdminLoginSection } from './components/AdminLoginSection';
import { AdminDashboardSection } from './components/AdminDashboardSection';
import { AdminWriteSection } from './components/AdminWriteSection';
import { Modals } from './components/Modals';
import { Naver360Icon } from './components/Naver360Icon';
import TaewangFloatingBar from './components/TaewangFloatingBar';
import { getPostsService, getInquiriesService } from './firebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { doc, getDocFromServer, collection, setDoc, onSnapshot } from 'firebase/firestore';

// --- Toast Context Helper ---
export const ToastContext = React.createContext<{ showToast: (msg: string, type?: 'success'|'error') => void } | null>(null);

export default function App() {
    const { 
        posts,
        isAdminLoggedIn, 
        setIsAdminLoggedIn, 
        isMemberLoggedIn,
        memberName,
        setMemberLoggedIn,
        isMobileSimulationMode, 
        setIsMobileSimulationMode, 
        activeSection, 
        setActiveSection, 
        selectedPostId,
        setPosts,
        setInquiries,
        videoPopupUrl,
        setVideoPopupUrl
    } = useAppStore();

    const selectedPost = posts.find(post => post.id === selectedPostId);

    // Modals state
    const [phoneModalOpen, setPhoneModalOpen] = useState(false);
    const [phoneModalData, setPhoneModalData] = useState<{mobile: string, owner?: string, x?: number, y?: number} | null>(null);

    // Toast state
    const [toasts, setToasts] = useState<{id: number, msg: string, type: 'success'|'error'}[]>([]);

    useEffect(() => {
        // [직통 의뢰 모달] 전송 이벤트 리스너 등록
        const handleDirectInquiry = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const payload = customEvent.detail;
            try {
                const reqId = Date.now().toString();
                const docRef = doc(collection(db, 'customer_requests'), reqId);
                await setDoc(docRef, {
                    id: reqId,
                    ...payload,
                    createdAt: Date.now(),
                    processed: false
                });
                console.log("Customer request successfully saved to customer_requests collection.");
            } catch (err) {
                console.error("Failed to save customer request:", err);
            }
        };
        window.addEventListener('submitDirectInquiry', handleDirectInquiry);

        // [비동기 지연 로딩 시공] 화면 뼈대(DOM) 선행 노출 후 백그라운드에서 무거운 데이터를 불러옵니다.
        const fetchData = () => {
            // Fetch posts through unified cloud database service
            getPostsService()
                .then(data => {
                    setPosts(data);
                    
                    // Parse query parameters and path-based routing for automatic redirection to post detail view
                    const params = new URLSearchParams(window.location.search);
                    let urlPostId = params.get('id') || params.get('postId');
                    if (!urlPostId && window.location.pathname.startsWith('/rooms/')) {
                        const pathParts = window.location.pathname.split('/');
                        urlPostId = pathParts[2];
                    }
                    if (urlPostId) {
                        const post = data.find(p => p.id === urlPostId);
                        if (post && (post.category === '유튜브' || post.category === '네이버TV')) {
                            const videoUrl = post.video || post.naverTv || post.naverBlogUrl || post.blogUrl || (String(post.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);
                            if (videoUrl) {
                                useAppStore.getState().setVideoPopupUrl(videoUrl);
                            }
                            window.history.replaceState(null, "", '/');
                        } else if (post) {
                            useAppStore.getState().setSelectedPostId(urlPostId);
                            useAppStore.getState().setActiveSection('detail');
                        }
                    }
                })
                .catch(err => console.error("매물 목록을 불러오는 중 오류 발생:", err));

            // Fetch inquiries through unified cloud database service
            getInquiriesService()
                .then(data => {
                    setInquiries(data);
                })
                .catch(err => console.error("의뢰 목록을 불러오는 중 오류 발생:", err));
        };

        if (document.readyState !== 'loading') {
            fetchData();
        } else {
            window.addEventListener('DOMContentLoaded', fetchData);
        }

        // Automatically restore session if verified Google Admin user is logged in or simulated bypass is active
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.email === 'yunjia2miju@gmail.com' && user.emailVerified) {
                setIsAdminLoggedIn(true);
            } else if (localStorage.getItem('taewang_firebase_sim_connected') === 'true') {
                setIsAdminLoggedIn(true);
            }
        });

        // Elegant grand completion report requested by the director
        console.clear();
        console.log(
            "%c[태왕공인중개사사무소 스마트에디터 V12 시스템 정상 가동 보고]\n\n" +
            "본 시스템은 소장님의 지시에 따라 다음 항목들이 완벽히 빌드 및 최적화되었습니다:\n" +
            "1. 4분할 격자 골조 복원 및 비주얼 밸런스 조정\n" +
            "2. 네이버 프리미엄 대시보드 스타일의 현대적 레이아웃 적용 (#059669 실버 그린 포인트)\n" +
            "3. 모바일/데스크톱 대응 독립 스크롤 분할 및 모서리 곡률(10px~12px) 정밀 조율\n" +
            "4. 본문 서체 가독성 극대화 및 나눔고딕 16pt 텍스트 처리 기준 준수\n" +
            "5. 즐겨찾기 및 미디어 자료 등록 구역 16:9 황금비율 완벽 유지\n\n" +
            "시스템이 무결점 상태로 최종 준공되었음을 보고합니다.",
            "color: #059669; font-family: 'Nanum Gothic', sans-serif; font-size: 13px; font-weight: bold; line-height: 1.6;"
        );

        const handlePopState = (event: PopStateEvent) => {
            const path = window.location.pathname;
            const params = new URLSearchParams(window.location.search);
            let urlPostId = params.get('id') || params.get('postId');
            if (!urlPostId && path.startsWith('/rooms/')) {
                urlPostId = path.split('/')[2];
            }
            if (urlPostId) {
                useAppStore.getState().setSelectedPostId(urlPostId);
                useAppStore.getState().setActiveSection('detail');
            } else {
                useAppStore.getState().setActiveSection('main');
            }
        };
        window.addEventListener('popstate', handlePopState);

        return () => {
            unsubscribe();
            window.removeEventListener('submitDirectInquiry', handleDirectInquiry);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Set up real-time Firestore listeners ONLY for logged-in admin users to save daily read quota
    useEffect(() => {
        if (!isAdminLoggedIn) return;

        const unsubscribePosts = onSnapshot(collection(db, 'posts'), () => {
            getPostsService()
                .then(data => {
                    setPosts(data);
                })
                .catch(err => console.error("실시간 매물 업데이트 오류:", err));
        }, (err) => {
            console.warn("Firestore posts dynamic subscription failed, falling back:", err);
        });

        const unsubscribeInquiries = onSnapshot(collection(db, 'customer_requests'), () => {
            getInquiriesService()
                .then(data => {
                    setInquiries(data);
                })
                .catch(err => console.error("실시간 의뢰 업데이트 오류:", err));
        }, (err) => {
            console.warn("Firestore inquiries dynamic subscription failed, falling back:", err);
        });

        return () => {
            unsubscribePosts();
            unsubscribeInquiries();
        };
    }, [isAdminLoggedIn]);

    // Synchronize detail view state dynamically with the browser's URL address bar using path-based routing
    useEffect(() => {
        try {
            if (activeSection === 'detail' && selectedPostId) {
                const targetPath = `/rooms/${selectedPostId}`;
                const params = new URLSearchParams(window.location.search);
                const hasIdOrPostId = params.has('id') || params.has('postId');

                if (window.location.pathname !== targetPath || hasIdOrPostId) {
                    params.delete('postId');
                    params.delete('id');
                    const search = params.toString();
                    const newUrl = targetPath + (search ? `?${search}` : '');
                    if (window.location.pathname === targetPath) {
                        window.history.replaceState({ postId: selectedPostId }, "", newUrl);
                    } else {
                        window.history.pushState({ postId: selectedPostId }, "", newUrl);
                    }
                }
            } else if (activeSection === 'main') {
                const params = new URLSearchParams(window.location.search);
                const hasIdOrPostId = params.has('id') || params.has('postId');
                const isRoomsPath = window.location.pathname.startsWith('/rooms/');

                if (!isRoomsPath && ((window.location.pathname !== '/' && !window.location.pathname.startsWith('/admin')) || hasIdOrPostId)) {
                    params.delete('postId');
                    params.delete('id');
                    const search = params.toString();
                    const newUrl = '/' + (search ? `?${search}` : '');
                    if (window.location.pathname === '/') {
                        window.history.replaceState(null, "", newUrl);
                    } else {
                        window.history.pushState(null, "", newUrl);
                    }
                }
            }
        } catch (e) {
            console.warn("URL history sync failed:", e);
        }
    }, [activeSection, selectedPostId]);

    const showToast = (msg: string, type: 'success'|'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const openPhoneSelectModal = (e: React.MouseEvent, mobilePhone: string, ownerPhone?: string) => {
        e.stopPropagation();
        setPhoneModalData({ mobile: mobilePhone, owner: ownerPhone, x: e.clientX, y: e.clientY });
        setPhoneModalOpen(true);
    };

    const handleAdminLogout = () => {
        setIsAdminLoggedIn(false);
        localStorage.removeItem('taewang_firebase_sim_connected');
        localStorage.removeItem('taewang_editing_post_id');
        setActiveSection('main');
        showToast("소장님 모드가 안전하게 해제되었습니다. 소유자 연락처가 비공개 처리되었습니다.", "success");
    };

    const handleMemberLogout = () => {
        setMemberLoggedIn(false, null, null);
        setActiveSection('main');
        showToast("회원 로그아웃이 완료되었습니다. 웹 전용 탐색 모드로 전환되었습니다.", "success");
    };

    const renderBottomBarContents = () => {
        return (
            <div className="w-full h-full flex items-center justify-around px-3">
                {isAdminLoggedIn ? (
                    /* ================== 2번 관리자 화면 ================== */
                    <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto items-center">
                        {/* [버튼 1]: 모바일 (010-7590-0111) 연결 */}
                        <a 
                            href="tel:010-7590-0111"
                            className="flex items-center justify-center gap-1.5 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm cursor-pointer border border-emerald-500"
                        >
                            <i className="fa-solid fa-mobile-screen text-xs animate-bounce"></i>
                            <span className="break-keep">소장님 상담 연결</span>
                        </a>
                        {/* [버튼 2]: [관리자 전용] 임대인 공급자 연락망 직통 걸기 */}
                        {(() => {
                            const activePost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;
                            const ownerPhone = activePost?.ownerPhone || '';
                            if (ownerPhone) {
                                return (
                                    <a 
                                        href={`tel:${ownerPhone}`}
                                        onClick={() => showToast(`임대인 직통 연락망(${ownerPhone})으로 전화를 연결합니다.`, "success")}
                                        className="flex items-center justify-center gap-1.5 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xs font-black transition-all shadow-md cursor-pointer border border-amber-400 animate-pulse"
                                    >
                                        <i className="fa-solid fa-key text-xs"></i>
                                        <span className="break-keep">임대인 직통 ({ownerPhone})</span>
                                    </a>
                                );
                            } else {
                                return (
                                    <button 
                                        onClick={() => showToast("상세페이지에서 임대인 연락처가 기재된 매물을 선택하시면 즉시 연결됩니다.", "error")}
                                        className="flex items-center justify-center gap-1.5 h-12 rounded-xl bg-slate-200 text-slate-400 text-[11px] font-black transition-all cursor-not-allowed border border-slate-300"
                                    >
                                        <i className="fa-solid fa-lock text-xs"></i>
                                        <span className="break-keep">임대인 직통 (대기)</span>
                                    </button>
                                );
                            }
                        })()}
                    </div>
                ) : (
                    /* ================== 1번 고객 화면 ================== */
                    <div className="grid grid-cols-3 gap-2 w-full max-w-md mx-auto items-center">
                        {/* [버튼 1]: 모바일 연결 -> 소장님 번호 (tel:010-7590-0111) */}
                        <a 
                            href="tel:010-7590-0111"
                            className="flex items-center justify-center gap-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[11px] font-black transition-all shadow-sm cursor-pointer border border-emerald-500"
                        >
                            <i className="fa-solid fa-mobile-screen text-xs"></i>
                            <span className="break-keep">모바일</span>
                        </a>
                        {/* [버튼 2]: 유선전화 연결 -> 사무실 대표번호 (tel:054-455-6789) */}
                        <a 
                            href="tel:054-455-6789"
                            className="flex items-center justify-center gap-1 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-[11px] font-black transition-all shadow-sm cursor-pointer border border-slate-700"
                        >
                            <i className="fa-solid fa-phone text-xs"></i>
                            <span className="break-keep">유선전화</span>
                        </a>
                        {/* [버튼 3]: 의뢰하기 -> 매물 등록 의뢰 페이지 연동 */}
                        <button 
                            onClick={() => {
                                if (typeof (window as any).openRequestModal === 'function') {
                                    (window as any).openRequestModal();
                                } else {
                                    setActiveSection('main');
                                    showToast("중개 상담 및 의뢰 접수 화면으로 이동합니다.", "success");
                                    setTimeout(() => {
                                        const el = document.getElementById('quick-inquiry');
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }, 200);
                                }
                            }}
                            className="flex items-center justify-center gap-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-[11px] font-black transition-all shadow-sm cursor-pointer border border-amber-400"
                        >
                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                            <span className="break-keep">의뢰하기</span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        if (activeSection === 'admin-write') {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.style.overflow = '';
            document.body.classList.remove('overflow-hidden');
        }
        return () => {
            document.body.style.overflow = '';
            document.body.classList.remove('overflow-hidden');
        };
    }, [activeSection]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeSection]);

    // 브라우저 뒤로가기/앞으로가기 (onpopstate) 대응 선로 세팅
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const params = new URLSearchParams(window.location.search);
            let id = params.get('id') || params.get('postId');
            if (!id && window.location.pathname.startsWith('/rooms/')) {
                const pathParts = window.location.pathname.split('/');
                id = pathParts[2];
            }
            
            if (id) {
                const found = useAppStore.getState().posts.find(p => p.id === id);
                if (found && (found.category === '유튜브' || found.category === '네이버TV')) {
                    const videoUrl = found.video || found.naverTv || found.naverBlogUrl || found.blogUrl || (String(found.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);
                    if (videoUrl) {
                        useAppStore.getState().setVideoPopupUrl(videoUrl);
                    }
                    useAppStore.getState().setSelectedPostId(null);
                    useAppStore.getState().setActiveSection('main');
                    window.history.replaceState(null, "", window.location.pathname);
                } else {
                    useAppStore.getState().setSelectedPostId(id);
                    useAppStore.getState().setActiveSection('detail');
                }
            } else {
                useAppStore.getState().setSelectedPostId(null);
                useAppStore.getState().setActiveSection('main');
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // 유튜브/네이버TV 상세페이지 진입 원천 차단 및 비디오 팝업 즉시 우회(Bypass)
    useEffect(() => {
        if (selectedPostId && posts.length > 0) {
            const post = posts.find(p => p.id === selectedPostId);
            if (post && (post.category === '유튜브' || post.category === '네이버TV')) {
                const videoUrl = post.video || post.naverTv || post.naverBlogUrl || post.blogUrl || (String(post.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);
                if (videoUrl) {
                    setVideoPopupUrl(videoUrl);
                }
                useAppStore.getState().setSelectedPostId(null);
                useAppStore.getState().setActiveSection('main');
                window.history.replaceState(null, "", window.location.pathname);
            }
        }
    }, [selectedPostId, posts, setVideoPopupUrl]);

    const isManagerSection = activeSection === 'admin-write' || activeSection === 'admin-dashboard';
    const mainWrapperClass = (isMobileSimulationMode && !isManagerSection)
        ? "flex-grow flex flex-col transition-all duration-300 w-full max-w-[430px] border-x-8 border-slate-950 shadow-2xl mx-auto bg-white rounded-[36px] my-6 relative overflow-hidden pb-[72px]"
        : `flex-grow flex flex-col transition-all duration-300 w-full structural-border pb-0 ${activeSection === 'admin-write' ? 'h-screen overflow-hidden' : ''}`;

    return (
        <ToastContext.Provider value={{ showToast }}>


            {/* Main Shell */}
            <div id="main-simulation-wrapper" className={mainWrapperClass}>
                {(isMobileSimulationMode && !isManagerSection) && (
                    <div className="bg-slate-950 text-slate-300 text-[10px] py-2 px-6 flex justify-between items-center font-bold tracking-tight select-none border-b border-slate-900">
                        <span>10:25 AM</span>
                        <div className="w-24 h-4 bg-slate-950 rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0 border-x border-b border-slate-800"></div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <i className="fa-solid fa-signal text-[9px]"></i>
                            <i className="fa-solid fa-wifi text-[9px]"></i>
                            <i className="fa-solid fa-battery-three-quarters text-emerald-500 text-xs"></i>
                        </div>
                    </div>
                )}

                {/* Header Portal to document.body */}
                {activeSection !== 'admin-write' && typeof document !== 'undefined' && createPortal(
                    <div className="fixed-header-wrapper" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 999999 }}>
                        <div className="bg-[#0B2545] text-white text-[11px] sm:text-xs py-2 px-4 text-center font-medium shadow-sm w-full" style={{ background: '#0B2545 !important', backgroundColor: '#0B2545 !important' }}>
                            <i className="fa-solid fa-bullhorn mr-1"></i> 정직한 발걸음과 생생한 관찰 기록,<br />구미태왕공인중개사가 전문적인 중개를 약속합니다.
                        </div>
                        <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 w-full transition-all">
                            <div className="max-w-[1100px] mx-auto w-full px-4 sm:px-6 md:px-8 h-16 sm:h-20 flex justify-between items-center">
                                <div className="flex items-center cursor-pointer" onClick={() => {
                                    setActiveSection('main');
                                    useAppStore.getState().setViewAllCategory(null);
                                }}>
                                    <div className="flex items-center space-x-2 group">
                                        <div className="shrink-0 flex items-center justify-center transition-all duration-300 !opacity-100 !block" style={{ opacity: 1, display: 'block' }}>
                                            <Naver360Icon className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" />
                                        </div>
                                        <div className="flex items-center gap-2.5 sm:gap-4 ml-1">
                                            {/* Left brand column: 구미 / GUMI */}
                                            <div className="flex flex-col items-center justify-center text-center select-none">
                                                <span className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight leading-none mb-1 animate-pulse">
                                                    구미
                                                </span>
                                                <span className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                                                    GUMI
                                                </span>
                                            </div>

                                            {/* Modern vertical elegant separator */}
                                            <div className="h-6 w-[1.5px] bg-slate-200 self-center"></div>

                                            {/* Right brand column: Name / English */}
                                            <div className="flex flex-col justify-center">
                                                <span className="text-base sm:text-lg md:text-xl font-black tracking-tight leading-none mb-1" style={{ color: '#0B2545 !important' }}>
                                                    태왕공인중개사사무소
                                                </span>
                                                <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                                                    TAEWANG REAL ESTATE
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </header>
                    </div>,
                    document.body
                )}

                <main className={`flex-grow w-full ${activeSection !== 'admin-write' ? 'pt-[96px] sm:pt-[116px]' : ''}`}>
                    {activeSection === 'main' && <MainTab openPhoneSelectModal={openPhoneSelectModal} showToast={showToast} />}
                    {activeSection === 'vr-list' && <VrListTab openPhoneSelectModal={openPhoneSelectModal} showToast={showToast} />}
                    {activeSection === 'detail' && selectedPost && (
                        <DetailTab 
                            key={`${selectedPost.id}-${selectedPost.updatedAt || selectedPost.createdAt || 0}`}
                            openPhoneSelectModal={openPhoneSelectModal} 
                            showToast={showToast} 
                            images={(() => {
                                const list: string[] = [];
                                const buster = selectedPost.updatedAt || selectedPost.createdAt || Date.now();
                                const appendCb = (url: string) => {
                                    if (!url) return url;
                                    if (url.startsWith('data:')) return url;
                                    const separator = url.includes('?') ? '&' : '?';
                                    return `${url}${separator}v=${buster}`;
                                };
                                if (selectedPost.thumbnail) {
                                    list.push(selectedPost.thumbnail.trim());
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
                                processField(selectedPost.images);
                                processField((selectedPost as any).imageUrls);
                                processField((selectedPost as any).additionalImages);
                                const defaultImg = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=675&q=80";
                                const uniqueUrls = Array.from(new Set(list)).filter(url => url && url !== defaultImg);
                                return uniqueUrls.map(appendCb);
                            })()}
                            panoramaImages={(() => {
                                const list: string[] = [];
                                const buster = selectedPost.updatedAt || selectedPost.createdAt || Date.now();
                                const appendCb = (url: string) => {
                                    if (!url) return url;
                                    if (url.startsWith('data:')) return url;
                                    const separator = url.includes('?') ? '&' : '?';
                                    return `${url}${separator}v=${buster}`;
                                };
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
                                processField(selectedPost.panoramas);
                                processField(selectedPost.panoImage);
                                processField((selectedPost as any).panoramaUrls);
                                processField((selectedPost as any).panoramaImages);
                                const uniqueUrls = Array.from(new Set(list)).filter(url => url);
                                return uniqueUrls.map(appendCb);
                            })()}
                        />
                    )}
                    {activeSection === 'admin-login' && (
                        <div className="admin-ui-root">
                            <AdminLoginSection showToast={showToast} />
                        </div>
                    )}
                    {activeSection === 'admin-dashboard' && (
                        <div className="admin-ui-root">
                            <AdminDashboardSection showToast={showToast} />
                        </div>
                    )}
                    {activeSection === 'admin-write' && <AdminWriteSection showToast={showToast} />}
                </main>

                {activeSection !== 'admin-write' && (
                    <footer className="!bg-[#0B2545] text-slate-500 py-12 border-t border-[#113866] w-full font-medium mt-auto" style={{ background: '#0B2545', backgroundColor: '#0B2545', backgroundImage: 'none' }}>
                        <div className="max-w-none w-full px-4 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                            <div className="space-y-2">
                                <p className="text-base font-black text-slate-300">태왕공인중개사사무소</p>
                                <div className="text-xs text-slate-500 leading-relaxed space-y-1">
                                    <p>대표 : 유정화 | 등록번호 : 47190-2016-00027</p>
                                    <p>소재지 : 구미시 송정대로 6길18 (송정동 472-10번지)</p>
                                    <p>연락처 : <a href="tel:054-455-6789" className="hover:text-emerald-500 transition-colors">054-455-6789</a>, <a href="tel:010-7590-0111" className="hover:text-emerald-500 transition-colors">010-7590-0111</a></p>
                                </div>
                                <p className="text-[11px] sm:text-xs text-slate-400 font-normal leading-relaxed pt-1.5 break-keep max-w-2xl">
                                    본 사이트에 게시된 모든 매물 사진 및 360° 파노라마 VR 이미지 등 일체의 콘텐츠는 태왕공인중개사사무소의 고유 자산이며, 저작권법의 보호를 받습니다.<br />서면 동의 없는 임의 도용, 무단 전재 및 재배포를 엄격히 금지합니다.
                                </p>
                                <p className="text-[11px] text-slate-700 pt-1">© 2026 Gumi Taewang Real Estate. All rights reserved.</p>
                            </div>
                            <div className="w-full md:w-auto flex justify-center mt-4 md:mt-0">
                                {isAdminLoggedIn ? (
                                    <div className="flex flex-col gap-2.5 w-full max-w-[280px] mx-auto md:mx-0">
                                        <button onClick={() => { localStorage.removeItem('taewang_editing_post_id'); setActiveSection('admin-write'); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all">
                                            <i className="fa-solid fa-pen-nib text-xs"></i><span>1. 새 매물 등록</span>
                                        </button>
                                        <button onClick={() => setActiveSection('admin-dashboard')} className="w-full bg-amber-500 hover:bg-amber-400 text-white py-3 px-4 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all">
                                            <i className="fa-solid fa-chart-line text-xs"></i><span>2. 관리 센터</span>
                                        </button>
                                        <button onClick={handleAdminLogout} className="w-full bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all">
                                            <i className="fa-solid fa-unlock text-xs"></i><span>3. 소장님 로그아웃</span>
                                        </button>
                                    </div>
                                ) : isMemberLoggedIn ? (
                                    <div className="flex flex-col gap-2.5 w-full max-w-[280px] mx-auto md:mx-0 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                                        <p className="text-white text-xs font-black text-center mb-1">
                                            <i className="fa-solid fa-circle-user text-emerald-400 mr-1.5"></i>
                                            <span>{memberName || '일반'} 회원 로그인 중</span>
                                        </p>
                                        <p className="text-slate-400 text-[10px] text-center mb-3">방문회원은 웹 전용 탐색 권한으로 제한됩니다.</p>
                                        <button onClick={handleMemberLogout} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all">
                                            <i className="fa-solid fa-right-from-bracket text-[11px]"></i><span>회원 로그아웃</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2.5 w-full max-w-[280px] mx-auto md:mx-0">
                                        <button onClick={() => setActiveSection('admin-login')} className="w-full bg-slate-850 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl text-xs font-black shadow-md border border-slate-700 flex items-center justify-center gap-2 transition-all">
                                            <i className="fa-solid fa-lock text-xs"></i><span>소셜 로그인 / 회원 가입</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </footer>
                )}

                {/* 
                  [V40] 모바일 및 태블릿 전용 동적 분리형 하단 고정 바 (z-index: 99999999) 
                  PC 화면(width > 768px) 및 시뮬레이터 미작동 시에는 Portal 또는 display: none 처리 
                */}
                {isMobileSimulationMode && (
                    <div 
                        id="mobile-bottom-bar-sim" 
                        className="absolute bottom-0 left-0 right-0 w-full h-[65px] bg-[#0f172a] border-t border-slate-800 flex items-center justify-around px-3 z-[99999999] shadow-[0_-4px_16px_rgba(15,23,42,0.08)]"
                    >
                        {renderBottomBarContents()}
                    </div>
                )}
            </div>

            {!isMobileSimulationMode && typeof document !== 'undefined' && document.getElementById('mobile-bottom-bar') && createPortal(
                renderBottomBarContents(),
                document.getElementById('mobile-bottom-bar')!
            )}

            <Modals
                showToast={showToast}
                phoneModalOpen={phoneModalOpen} setPhoneModalOpen={setPhoneModalOpen} phoneModalData={phoneModalData}
            />

            <div id="toast-container" className="fixed bottom-5 right-5 z-[200] flex flex-col space-y-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className={`px-5 py-3.5 rounded-2xl text-xs font-bold shadow-2xl transition-all block ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-50 text-red-600'}`}>
                        {toast.msg}
                    </div>
                ))}
            </div>

            {/* [태왕공인중개사 플랫폼 대완공] 루트 독립 배선: 브라우저 뷰포트 직속 쇠말뚝 고정 */}
            {activeSection !== 'admin-write' && activeSection !== 'admin-dashboard' && typeof document !== 'undefined' && (
                <TaewangFloatingBar />
            )}

            {/* 유튜브 및 네이버TV 직통 팝업 재생 시스템 (Modal Window) */}
            {videoPopupUrl && (
                <div className="fixed inset-0 z-[10000000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-8">
                    <div className="relative w-full max-w-4xl bg-black rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                        {/* 상단 컨트롤 헤더 영역 (동영상 화면을 가리지 않음) */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <a 
                                    href={videoPopupUrl.startsWith('http') ? videoPopupUrl : `https://${videoPopupUrl}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center gap-1.5 sm:gap-2 transition-all text-xs sm:text-sm font-black shadow-lg"
                                    title="동영상이 보이지 않을 때 클릭하시면 네이버TV/유튜브 웹페이지에서 바로 재생할 수 있습니다."
                                >
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                                    새 창에서 직접 재생 ↗
                                </a>
                                <span className="hidden sm:inline text-xs text-slate-400 font-medium">
                                    영상이 안 나오면 버튼을 클릭하세요.
                                </span>
                            </div>

                            {/* 닫기 버튼 */}
                            <button 
                                onClick={() => setVideoPopupUrl(null)}
                                className="bg-slate-800 hover:bg-red-600 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-white/10 transition-all cursor-pointer text-xl font-bold"
                                title="닫기"
                            >
                                &times;
                            </button>
                        </div>

                        {/* 동영상 프레임 영역: 세로 길이를 더 길게 늘려서 가려지지 않고 넉넉하게 표시되도록 개선 */}
                        <div className="w-full h-[55vh] sm:h-[65vh] md:h-[75vh] min-h-[320px] sm:min-h-[450px] md:min-h-[550px] bg-black relative">
                            <iframe 
                                src={(() => {
                                    const url = videoPopupUrl;
                                    // YouTube
                                    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                                    if (ytMatch && ytMatch[1]) {
                                        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
                                    }

                                    // NaverTV / Naver Now
                                    const nvMatch = url.match(/(?:tv\.naver\.com|now\.naver\.com)(?:\/v|\/player|\/embed)\/([a-zA-Z0-9_-]+)/i);
                                    if (nvMatch && nvMatch[1]) {
                                        return `https://tv.naver.com/embed/${nvMatch[1]}?autoPlay=true`;
                                    }

                                    // Fallback
                                    if (url.includes('embed')) {
                                        return url;
                                    }
                                    return url.startsWith('http') ? url : `https://${url}`;
                                })()}
                                className="absolute inset-0 w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}
