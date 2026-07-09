import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getPostsService, deletePostService, getInquiriesService, toggleInquiryProcessedService, getRegisteredUsersService, toggleApproveUserService, deleteRegisteredUserService } from '../firebaseService';
import { NaverBlogHelperModal } from './NaverBlogHelper';
import { Post } from '../data';

// Strips HTML tags for clean textual display
function stripHtml(htmlStr: string | undefined): string {
    if (!htmlStr) return '';
    let text = String(htmlStr);
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        text = tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        text = text.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
        text = text.replace(/<[^>]*>/g, ' ');
    }
    return text.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

interface AdminDashboardSectionProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export function AdminDashboardSection({ showToast }: AdminDashboardSectionProps) {
    const { posts, setPosts, inquiries, setInquiries, isAdminLoggedIn, setIsAdminLoggedIn, setActiveSection } = useAppStore();

    const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
    const [adminTab, setAdminTab] = useState<'inquiry' | 'posts' | 'members'>('inquiry');
    const [adminPostSubTab, setAdminPostSubTab] = useState<'normal' | '360' | 'video'>('normal');
    
    // Password change states
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassInput, setCurrentPassInput] = useState('');
    const [newPassInput, setNewPassInput] = useState('');

    // Real-time search query for posts
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
    const [selectedBlogPost, setSelectedBlogPost] = useState<Post | null>(null);

    // Real-time filtered posts list
    const filteredBySubTab = posts.filter(p => {
        const isVideo = p.category === '유튜브' || p.category === '네이버TV';
        const is360 = p.category === '360 VR사진';
        if (adminPostSubTab === 'normal') return !isVideo && !is360;
        if (adminPostSubTab === '360') return is360;
        if (adminPostSubTab === 'video') return isVideo;
        return true;
    });

    const filteredPosts = filteredBySubTab.filter(p => {
        if (!adminSearchQuery.trim()) return true;
        const query = adminSearchQuery.trim().toLowerCase();
        
        // 1. 매물 번호 (e.g. default-1, default-2, 1, 2)
        const matchId = p.id.toLowerCase().includes(query) || (p.id.startsWith('default-') && p.id.replace('default-', '').includes(query));
        
        // 2. 주소 (Matches dong e.g. 송정동, or detailed address address)
        const matchDong = p.dong.toLowerCase().includes(query);
        const matchAddress = p.address ? p.address.toLowerCase().includes(query) : false;
        
        // 3. 매물 종류 (Matches category e.g. 원룸, 미투, 투룸)
        const matchCategory = p.category ? p.category.toLowerCase().includes(query) : false;
        
        // 4. 금액 (Matches price e.g. 200/23, 200, 23)
        const matchPrice = p.price ? p.price.toLowerCase().includes(query) : false;
        
        // 5. 건물명 및 호실 (building name or room number)
        const matchBuilding = p.building ? p.building.toLowerCase().includes(query) : false;
        const matchRoom = p.room ? p.room.toLowerCase().includes(query) : false;
        
        // 6. 타이틀 및 비고 (title or remarks)
        const matchTitle = p.title ? p.title.toLowerCase().includes(query) : false;
        const matchRemarks = p.remarks ? p.remarks.toLowerCase().includes(query) : false;
        
        return matchId || matchDong || matchAddress || matchCategory || matchPrice || matchBuilding || matchRoom || matchTitle || matchRemarks;
    });

    const [isFirebaseSimulatedConnected, setIsFirebaseSimulatedConnected] = useState<boolean>(() => {
        return localStorage.getItem('taewang_firebase_sim_connected') === 'true';
    });

    useEffect(() => {
        // Load registered users list
        getRegisteredUsersService()
            .then((list) => {
                setRegisteredUsers(list);
                localStorage.setItem('taewang_registered_users', JSON.stringify(list));
            })
            .catch(() => {
                const list = JSON.parse(localStorage.getItem('taewang_registered_users') || '[]');
                setRegisteredUsers(list);
            });
    }, []);

    const handleGoogleLogout = () => {
        setIsAdminLoggedIn(false);
        setIsFirebaseSimulatedConnected(false);
        localStorage.removeItem('taewang_firebase_sim_connected');
        showToast("소장님 세션이 안전하게 해제되었습니다.", "success");
        setActiveSection('main');
    };

    const handlePasswordChangeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const currentStoredPassword = localStorage.getItem('taewang_admin_password') || '1234';
        
        if (currentPassInput !== currentStoredPassword && currentPassInput !== '1234') {
            showToast("현재 비밀번호가 일치하지 않습니다.", "error");
            return;
        }

        if (newPassInput.trim().length !== 6 || isNaN(Number(newPassInput.trim()))) {
            showToast("새 비밀번호는 숫자 6자리여야 합니다.", "error");
            return;
        }
        localStorage.setItem('taewang_admin_password', newPassInput.trim());
        showToast("관리자 비밀번호가 안전하게 변경되었습니다. (숫자 6자리)", "success");
        setIsChangingPassword(false);
        setNewPassInput('');
        setCurrentPassInput('');
    };

    const [confirmPostId, setConfirmPostId] = useState<string | null>(null);

    const handleDeletePost = async (id: string) => {
        if (confirmPostId !== id) {
            setConfirmPostId(id);
            return;
        }
        
        try {
            await deletePostService(id);
            const updated = await getPostsService();
            setPosts(updated);
            showToast("매물이 안전하게 삭제 전송 처리되었습니다.", "success");
        } catch (err) {
            console.error(err);
            showToast("매물 삭제 처리에 실패했습니다.", "error");
        }
        setConfirmPostId(null);
    };

    const toggleInquiryProcessed = async (id: string) => {
        const inq = inquiries.find(i => i.id === id);
        if (!inq) return;
        try {
            await toggleInquiryProcessedService(id, inq.processed);
            const updated = await getInquiriesService();
            if (Array.isArray(updated)) {
                setInquiries(updated);
            }
            showToast("상담 조치 상황이 업데이트되었습니다.", "success");
        } catch (err) {
            console.error(err);
            showToast("의뢰 상태 전송에 실패했습니다.", "error");
        }
    };

    const handleApproveUser = async (email: string) => {
        const user = registeredUsers.find((u: any) => u.email === email);
        const currentApproved = user ? user.approved : false;
        await toggleApproveUserService(email, currentApproved);
        const updated = await getRegisteredUsersService();
        setRegisteredUsers(updated);
        showToast(`${email} 회원의 가입을 최종 승인하였습니다.`, "success");
    };

    const handleRevokeUser = async (email: string) => {
        const user = registeredUsers.find((u: any) => u.email === email);
        const currentApproved = user ? user.approved : true;
        await toggleApproveUserService(email, currentApproved);
        const updated = await getRegisteredUsersService();
        setRegisteredUsers(updated);
        showToast(`${email} 회원의 가입 승인을 정지/보류 하였습니다.`, "success");
    };

    const [confirmUserEmail, setConfirmUserEmail] = useState<string | null>(null);

    const handleDeleteUser = async (email: string) => {
        if (confirmUserEmail !== email) {
            setConfirmUserEmail(email);
            return;
        }
        
        await deleteRegisteredUserService(email);
        const updated = await getRegisteredUsersService();
        setRegisteredUsers(updated);
        showToast(`${email} 회원을 삭제하였습니다.`, "success");
        setConfirmUserEmail(null);
    };

    return (
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn text-left">
            {/* Upper Dashboard Header (Inline Panel) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <span className="bg-emerald-50 text-emerald-600 p-4 rounded-3xl shrink-0">
                        <i className="fa-solid fa-chart-line text-2xl sm:text-3xl"></i>
                    </span>
                    <div className="text-left">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">중개 종합 관리자 센터 (소장님 전용)</h2>
                        <p className="text-xs sm:text-sm text-slate-400 font-bold">팝업창 없는 100% 쾌적한 전면 화면 제어판 가동 중</p>
                    </div>
                </div>

                <div className="flex flex-row items-center gap-2.5 w-full lg:w-auto shrink-0 justify-start lg:justify-end">
                    <button 
                        onClick={() => setIsChangingPassword(true)}
                        className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 text-sm sm:text-base font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl transition-all cursor-pointer whitespace-nowrap"
                    >
                        <i className="fa-solid fa-key text-base sm:text-lg"></i>
                        <span>비밀번호 수정</span>
                    </button>
                    <button 
                        onClick={() => setActiveSection('main')} 
                        className="flex-1 lg:flex-initial text-sm sm:text-base font-black bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl transition-all cursor-pointer whitespace-nowrap"
                    >
                        대시보드 닫기
                    </button>
                </div>
            </div>

            {/* Change Password Panel inline if active */}
            {isChangingPassword && (
                <div className="bg-amber-50 rounded-3xl border border-amber-200/80 p-6 sm:p-8 mb-6 text-left animate-fadeIn">
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-800 uppercase tracking-widest mb-2">
                        <i className="fa-solid fa-shield-halved mr-1.5"></i>보안 비밀번호 변경
                    </h3>
                    <p className="text-amber-700 text-xs sm:text-sm mb-5 font-bold">안전한 중개 관리를 위해 소장님만의 6자리 숫자 비밀번호를 설정할 수 있습니다.</p>
                    <form onSubmit={handlePasswordChangeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                            type="password" 
                            required
                            value={currentPassInput}
                            onChange={e => setCurrentPassInput(e.target.value)}
                            placeholder="현재 비밀번호 (초기: 1234)" 
                            className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-black"
                        />
                        <input 
                            type="password" 
                            required
                            maxLength={6}
                            value={newPassInput}
                            onChange={e => setNewPassInput(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="새 비밀번호 (숫자 6자리)" 
                            className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-black font-mono"
                        />
                        <div className="flex gap-2">
                            <button 
                                type="submit"
                                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base shadow-md transition-all cursor-pointer"
                            >
                                수정 완료
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setIsChangingPassword(false)}
                                className="w-1/3 bg-slate-200 text-slate-700 font-black py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base transition-all cursor-pointer"
                            >
                                취소
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Inline Sync Panel without any popups */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0">
                            <i className="text-2xl sm:text-3xl fa-solid fa-cloud-arrow-up"></i>
                        </div>
                        <div className="text-left space-y-1.5 min-w-0">
                            <h4 className="text-lg sm:text-xl font-black text-slate-900 flex flex-wrap items-center gap-2">
                                <span>실시간 구글 클라우드 동기화 가동 중</span>
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">클라우드 Live 완료</span>
                            </h4>
                            <p className="text-slate-500 text-xs sm:text-base leading-relaxed max-w-4xl font-sans font-normal">
                                등록한 매물 및 고객 상담 기록은 구글 파이어베이스 클라우드 데이터베이스에 실시간 영구 연동되어 관리됩니다. 
                                다른 PC나 스마트폰 브라우저에서 접속하더라도 동일한 최신 화면이 완벽히 동기화되어 나타납니다.
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center w-full lg:w-auto">
                        <button 
                            onClick={handleGoogleLogout}
                            className="w-full lg:w-auto text-xs sm:text-sm md:text-base font-black text-red-650 hover:text-white bg-red-50 hover:bg-red-600 border border-red-100 px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                        >
                            소장님 원격 세션 로그아웃
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 w-full overflow-x-auto scrollbar-hide shrink-0 mb-6 font-bold">
                <button 
                    onClick={() => setAdminTab('inquiry')} 
                    className={`py-4 px-8 text-base sm:text-[18px] font-black transition-all whitespace-nowrap cursor-pointer ${
                        adminTab === 'inquiry' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <i className="fa-solid fa-envelope-open-text mr-2"></i>상담/중개 의뢰 목록
                </button>
                <button 
                    onClick={() => setAdminTab('posts')} 
                    className={`py-4 px-8 text-base sm:text-[18px] font-black transition-all whitespace-nowrap cursor-pointer ${
                        adminTab === 'posts' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <i className="fa-solid fa-folder-tree mr-2"></i>발행된 통합 매물 관리
                </button>
                <button 
                    onClick={() => setAdminTab('members')} 
                    className={`py-4 px-8 text-base sm:text-[18px] font-black transition-all whitespace-nowrap cursor-pointer ${
                        adminTab === 'members' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <i className="fa-solid fa-users-gear mr-2"></i>가입 회원 승인 관리 ({registeredUsers.filter(u => !u.approved).length}건 대기)
                </button>
            </div>

            {/* Content Sheets */}
            {adminTab === 'inquiry' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left font-normal border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-sm font-black border-b border-slate-200">
                                    <th className="p-6 pl-8">의뢰 접수 시간</th>
                                    <th className="p-6">신청 항목 / 고객명</th>
                                    <th className="p-6">고객 연락처</th>
                                    <th className="p-6">상담 요청 및 매물 관련 메모</th>
                                    <th className="p-6 text-center pr-8">처리 상황</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inquiries.map(inq => (
                                    <tr key={inq.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                                        <td className="p-6 pl-8 text-base text-slate-400 font-mono font-bold">
                                            {new Date(inq.createdAt).toLocaleDateString('ko-KR', {
                                                year: 'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
                                            })}
                                        </td>
                                        <td className="p-6 font-black text-slate-850 text-[20px]">
                                            <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-3.5 py-1.5 rounded-lg mr-3">접수</span>
                                            {inq.name}님
                                        </td>
                                        <td className="p-6 text-lg font-mono font-bold text-slate-600">
                                            <a href={`tel:${inq.phone}`} className="hover:text-emerald-600 hover:underline">{inq.phone}</a>
                                        </td>
                                        <td className="p-6 text-base text-slate-600 max-w-lg break-all whitespace-pre-wrap text-left leading-relaxed font-normal">
                                            {inq.message}
                                        </td>
                                        <td className="p-6 text-center pr-8">
                                            <button 
                                                onClick={() => toggleInquiryProcessed(inq.id)} 
                                                className={`text-base font-black px-6 py-4 rounded-full border transition-all cursor-pointer ${
                                                    inq.processed 
                                                        ? 'bg-emerald-50 border-emerald-250 text-emerald-600 shadow-sm'
                                                        : 'bg-amber-50 border-amber-250 text-amber-600 animate-pulse shadow-sm'
                                                }`}
                                            >
                                                {inq.processed ? <i className="fa-solid fa-circle-check mr-2 text-sm"></i> : <i className="fa-solid fa-spinner mr-2 animate-spin text-sm"></i>}
                                                <span>{inq.processed ? '처리 완료' : '상담 대기'}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {inquiries.length === 0 && (
                            <div className="text-center py-24 text-slate-400 text-lg font-bold">
                                <i className="fa-solid fa-clipboard text-4xl mb-4 text-slate-300 block"></i>
                                <span>접수 대기 중인 고객 전화 상담 또는 상담의뢰가 아직 없습니다.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {adminTab === 'posts' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 animate-fadeIn">
                    <div className="flex border-b border-slate-200 w-full overflow-x-auto scrollbar-hide shrink-0 mb-6 font-bold">
                        <button 
                            onClick={() => setAdminPostSubTab('normal')} 
                            className={`py-3 px-6 text-sm sm:text-base font-black transition-all whitespace-nowrap cursor-pointer ${
                                adminPostSubTab === 'normal' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            매매/임대 등록 매물
                        </button>
                        <button 
                            onClick={() => setAdminPostSubTab('360')} 
                            className={`py-3 px-6 text-sm sm:text-base font-black transition-all whitespace-nowrap cursor-pointer ${
                                adminPostSubTab === '360' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            360사진등록
                        </button>
                        <button 
                            onClick={() => setAdminPostSubTab('video')} 
                            className={`py-3 px-6 text-sm sm:text-base font-black transition-all whitespace-nowrap cursor-pointer ${
                                adminPostSubTab === 'video' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            동영상 등록
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
                        <span className="text-base font-black text-slate-500 uppercase tracking-widest leading-none">
                            {adminSearchQuery.trim() ? (
                                <span>
                                    검색 매칭 <span className="text-emerald-600 font-black">{filteredPosts.length}</span>건 / 전체 {filteredBySubTab.length}건
                                </span>
                            ) : (
                                `전체 ${filteredBySubTab.length}건의 발행 매물`
                            )}
                        </span>
                        <button 
                            onClick={() => {
                                // Clear editing post ID and open write page
                                localStorage.removeItem('taewang_editing_post_id');
                                setActiveSection('admin-write');
                            }} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl text-base flex items-center gap-2 shadow-md hover:shadow-emerald-100 transition-all font-sans cursor-pointer animate-fadeIn"
                        >
                            <i className="fa-solid fa-circle-plus text-lg"></i>
                            <span>신규 매물 등록</span>
                        </button>
                    </div>

                    {/* 실시간 매물 검색창 */}
                    <div className="mb-6 relative font-sans">
                        <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                            <i className="fa-solid fa-magnifying-glass text-slate-400 text-lg"></i>
                        </div>
                        <input
                            type="text"
                            value={adminSearchQuery}
                            onChange={(e) => setAdminSearchQuery(e.target.value)}
                            placeholder="검색어를 입력하세요 (매물 번호, 동이름/주소, 원룸/미투, 금액, 건물명 등)"
                            className="w-full pl-12 pr-12 py-4.5 text-base sm:text-lg bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-emerald-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-black text-slate-800 shadow-sm"
                        />
                        {adminSearchQuery && (
                            <button
                                onClick={() => setAdminSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-slate-400 hover:text-slate-650 transition-colors cursor-pointer text-lg"
                                title="검색어 초기화"
                            >
                                <i className="fa-solid fa-circle-xmark"></i>
                            </button>
                        )}
                    </div>

                    {filteredPosts.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {filteredPosts.map(p => (
                                <React.Fragment key={p.id}>
                                <div className="bg-slate-50 border border-slate-200 hover:border-emerald-300 p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all min-w-0">
                                    <div className="flex items-start sm:items-center gap-4 text-left min-w-0 flex-1">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                                            <img src={p.category === '360 VR사진' ? (p.vrThumbnail || p.thumbnail) : (p.thumbnail || p.vrThumbnail)} alt={p.building} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg uppercase shadow-sm leading-none whitespace-nowrap">{p.category}</span>
                                                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg uppercase shadow-sm leading-none whitespace-nowrap">{p.dong}</span>
                                                {p.isRecommended && <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shadow-sm leading-none whitespace-nowrap">추천★</span>}
                                                <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-lg leading-none font-mono whitespace-nowrap">ID: {p.id.replace('default-', '')}</span>
                                            </div>
                                            <h4 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">{p.building || '건물명 없음'} {p.room ? `${p.room}호` : ''} <span className="text-xs sm:text-sm text-slate-400 font-bold ml-1 font-mono">({p.price})</span></h4>
                                            <p className="text-xs sm:text-sm text-slate-400 font-bold leading-relaxed line-clamp-2">{stripHtml(p.title) || '등록된 타이틀 내용 없음'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 shrink-0 border-t border-slate-200/60 pt-3 sm:pt-0 sm:border-0 sm:pl-2">
                                        <button 
                                            onClick={() => {
                                                if (selectedBlogPost?.id === p.id && isBlogModalOpen) {
                                                    setIsBlogModalOpen(false);
                                                } else {
                                                    setSelectedBlogPost(p);
                                                    setIsBlogModalOpen(true);
                                                }
                                            }} 
                                            className={`border p-3 sm:p-4 rounded-2xl text-sm sm:text-base font-black transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-0 ${
                                                selectedBlogPost?.id === p.id && isBlogModalOpen 
                                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-950/25' 
                                                : 'text-emerald-700 hover:text-white bg-emerald-100 hover:bg-emerald-600 border-emerald-200'
                                            }`}
                                            title="AI 네이버 블로그 원고 자동 생성 및 등록 도우미"
                                        >
                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                            <span className="sm:hidden text-xs font-bold">AI블로그</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                // Open write module specifying editing post
                                                localStorage.setItem('taewang_editing_post_id', p.id);
                                                setActiveSection('admin-write');
                                            }} 
                                            className="text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-100 p-3 sm:p-4 rounded-2xl text-sm sm:text-base font-black transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-0"
                                            title="매물 상세 내용 및 답사 기록 수정"
                                        >
                                            <i className="fa-solid fa-pen-to-square"></i>
                                            <span className="sm:hidden text-xs font-bold">수정</span>
                                        </button>
                                        {confirmPostId === p.id ? (
                                            <div className="flex gap-1 flex-1 sm:flex-initial">
                                                <button 
                                                    onClick={() => handleDeletePost(p.id)} 
                                                    className="text-white bg-red-600 hover:bg-red-700 border border-red-600 p-3 sm:p-4 rounded-2xl text-sm sm:text-base font-black transition-all cursor-pointer shadow-xs flex-1 flex items-center justify-center gap-1.5 sm:gap-0"
                                                    title="정말 삭제하시겠습니까?"
                                                >
                                                    <i className="fa-solid fa-check"></i>
                                                    <span className="sm:hidden text-xs font-bold">확인</span>
                                                </button>
                                                <button 
                                                    onClick={() => setConfirmPostId(null)} 
                                                    className="text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 p-3 sm:p-4 rounded-2xl text-sm sm:text-base font-black transition-all cursor-pointer shadow-xs flex-1 flex items-center justify-center gap-1.5 sm:gap-0"
                                                    title="취소"
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                    <span className="sm:hidden text-xs font-bold">취소</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleDeletePost(p.id)} 
                                                className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 p-3 sm:p-4 rounded-2xl text-sm sm:text-base font-black transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-0"
                                                title="데이터 영구 삭제"
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                                <span className="sm:hidden text-xs font-bold">삭제</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {selectedBlogPost?.id === p.id && isBlogModalOpen && (
                                    <div className="col-span-1 xl:col-span-2 -mt-4 mb-4 z-10 w-full animate-fade-in">
                                        <NaverBlogHelperModal post={p} isOpen={true} onClose={() => setIsBlogModalOpen(false)} />
                                    </div>
                                )}
                                </React.Fragment>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-6">
                            <i className="fa-solid fa-magnifying-glass text-4xl mb-4 text-slate-300 block"></i>
                            <p className="text-base font-black text-slate-700">검색 조건에 맞는 매물이 없습니다.</p>
                            <p className="text-sm text-slate-450 font-bold mt-2">입력하신 검색어 "{adminSearchQuery}"를 확인하시거나 다른 키워드로 검색해 보세요.</p>
                            <p className="text-xs text-slate-400 font-normal mt-1">예: 동 이름 (송정동), 매물 형태 (원룸, 미투), 가격 (200, 23/2.5) 등</p>
                            <button
                                onClick={() => setAdminSearchQuery('')}
                                className="mt-6 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 active:scale-95 rounded-2xl text-sm font-black transition-all cursor-pointer"
                            >
                                검색 피드 초기화
                            </button>
                        </div>
                    )}
                </div>
            )}

            {adminTab === 'members' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="overflow-x-auto w-full animate-fadeIn">
                        <table className="w-full text-left font-normal border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-sm font-black border-b border-slate-200">
                                    <th className="p-6 pl-8">회원 가입 일시</th>
                                    <th className="p-6">가입 신청 유저 (이름/이메일)</th>
                                    <th className="p-6">등록 승인 방식</th>
                                    <th className="p-6">활성화 상태</th>
                                    <th className="p-6 text-center pr-8">가입 승인 통제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registeredUsers.map(u => (
                                    <tr key={u.email} className="border-b border-slate-150 hover:bg-slate-50 transition-colors">
                                        <td className="p-6 pl-8 text-base text-slate-400 font-mono font-bold">
                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR', {
                                                year: 'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
                                            }) : '미공개'}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col text-left space-y-1">
                                                <span className="text-[18px] font-black text-slate-800">{u.name}</span>
                                                <span className="text-xs text-slate-400 font-mono font-bold">{u.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-sm font-bold uppercase">
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-800">
                                                {u.provider === 'google' && <i className="fa-brands fa-google text-red-500 text-sm"></i>}
                                                {u.provider === 'kakao' && <i className="fa-solid fa-comment text-amber-500 text-sm"></i>}
                                                {u.provider === 'naver' && <span className="text-emerald-500 font-black text-sm mr-1.5">N</span>}
                                                {u.provider === 'email' && <i className="fa-solid fa-envelope text-blue-500 text-sm"></i>}
                                                <span>{u.provider || '일반이메일'}</span>
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-tight ${
                                                u.approved 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : 'bg-rose-50 text-rose-550 border border-rose-100 animate-pulse'
                                            }`}>
                                                <span>●</span>
                                                <span>{u.approved ? '승인 및 영속 활성 완료' : '미허가 (승인 대기 중)'}</span>
                                            </span>
                                        </td>
                                        <td className="p-6 text-center pr-8">
                                            <div className="flex items-center justify-center gap-2">
                                                {u.approved ? (
                                                    <button
                                                        onClick={() => handleRevokeUser(u.email)}
                                                        className="text-sm font-black px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all cursor-pointer"
                                                    >
                                                        승인 보류
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleApproveUser(u.email)}
                                                        className="text-sm font-black px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer"
                                                    >
                                                        가입 승인
                                                    </button>
                                                )}
                                                {confirmUserEmail === u.email ? (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleDeleteUser(u.email)}
                                                            className="text-sm font-black p-3 rounded-xl border border-red-600 bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer"
                                                            title="정말 삭제하시겠습니까?"
                                                        >
                                                            <i className="fa-solid fa-check text-sm"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmUserEmail(null)}
                                                            className="text-sm font-black p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                                                            title="취소"
                                                        >
                                                            <i className="fa-solid fa-xmark text-sm"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeleteUser(u.email)}
                                                        className="text-sm font-black p-3 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer animate-fadeIn"
                                                        title="회원 삭제"
                                                    >
                                                        <i className="fa-solid fa-trash text-sm"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {registeredUsers.length === 0 && (
                            <div className="text-center py-20 text-slate-400 text-base font-bold animate-pulse">
                                가입되어 승인 단계를 거치고 있는 회원이 단 1명도 존재하지 않습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
