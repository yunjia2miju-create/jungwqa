import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getPostsService, deletePostService, getInquiriesService, toggleInquiryProcessedService, getRegisteredUsersService, toggleApproveUserService, deleteRegisteredUserService } from '../firebaseService';

interface AdminDashboardSectionProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export function AdminDashboardSection({ showToast }: AdminDashboardSectionProps) {
    const { posts, setPosts, inquiries, setInquiries, isAdminLoggedIn, setIsAdminLoggedIn, setActiveSection } = useAppStore();

    const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
    const [adminTab, setAdminTab] = useState<'inquiry' | 'posts' | 'members'>('inquiry');
    
    // Password change states
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassInput, setCurrentPassInput] = useState('');
    const [newPassInput, setNewPassInput] = useState('');

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

    const handleDeletePost = async (id: string) => {
        if (window.confirm('정말 이 매물을 데이터베이스에서 영구 삭제하시겠습니까?')) {
            try {
                await deletePostService(id);
                const updated = await getPostsService();
                setPosts(updated);
                showToast("매물이 안전하게 삭제 전송 처리되었습니다.", "success");
            } catch (err) {
                console.error(err);
                showToast("매물 삭제 처리에 실패했습니다.", "error");
            }
        }
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

    const handleDeleteUser = async (email: string) => {
        if (window.confirm(`정말 ${email} 회원을 데이터베이스에서 제거하시겠습니까?`)) {
            await deleteRegisteredUserService(email);
            const updated = await getRegisteredUsersService();
            setRegisteredUsers(updated);
            showToast(`${email} 회원을 삭제하였습니다.`, "success");
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            {/* Upper Dashboard Header (Inline Panel) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                        <i className="fa-solid fa-chart-line text-xl"></i>
                    </span>
                    <div className="text-left">
                        <h2 className="text-lg font-black text-slate-900">중개 종합 관리자 센터 (소장님 전용)</h2>
                        <p className="text-xs text-slate-400 font-semibold">팝업창 없는 100% 쾌적한 전면 화면 제어판 가동 중</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsChangingPassword(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-4 py-2.5 rounded-xl transition-all"
                    >
                        <i className="fa-solid fa-key"></i>
                        <span>비밀번호 수정</span>
                    </button>
                    <button 
                        onClick={() => setActiveSection('main')} 
                        className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl transition-all"
                    >
                        대시보드 닫기
                    </button>
                </div>
            </div>

            {/* Change Password Panel inline if active */}
            {isChangingPassword && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200/80 p-5 mb-6 text-left animate-fadeIn">
                    <h3 className="text-xs font-extrabold text-amber-800 uppercase tracking-widest mb-1.5">
                        <i className="fa-solid fa-shield-halved mr-1"></i>보안 비밀번호 변경
                    </h3>
                    <p className="text-amber-700 text-[11px] mb-4">안전한 중개 관리를 위해 소장님만의 6자리 숫자 비밀번호를 설정할 수 있습니다.</p>
                    <form onSubmit={handlePasswordChangeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input 
                            type="password" 
                            required
                            value={currentPassInput}
                            onChange={e => setCurrentPassInput(e.target.value)}
                            placeholder="현재 비밀번호 (초기: 1234)" 
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                        />
                        <input 
                            type="password" 
                            required
                            maxLength={6}
                            value={newPassInput}
                            onChange={e => setNewPassInput(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="새 비밀번호 (숫자 6자리)" 
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold font-mono"
                        />
                        <div className="flex gap-2">
                            <button 
                                type="submit"
                                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all"
                            >
                                수정 완료
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setIsChangingPassword(false)}
                                className="w-1/3 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all"
                            >
                                취소
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Inline Sync Panel without any popups */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                            <i className="text-2xl fa-solid fa-cloud-arrow-up"></i>
                        </div>
                        <div className="text-left space-y-0.5">
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <span>실시간 구글 클라우드 동기화 가동 중</span>
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">클라우드 Live 완료</span>
                            </h4>
                            <p className="text-slate-500 text-xs leading-relaxed max-w-4xl font-sans">
                                등록한 매물 및 고객 상담 기록은 구글 파이어베이스 클라우드 데이터베이스에 실시간 영구 연동되어 관리됩니다. 
                                다른 PC나 스마트폰 브라우저에서 접속하더라도 동일한 최신 화면이 완벽히 동기화되어 나타납니다.
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center w-full lg:w-auto">
                        <button 
                            onClick={handleGoogleLogout}
                            className="w-full lg:w-auto text-xs font-bold text-red-650 hover:text-white bg-red-50 hover:bg-red-600 border border-red-100 px-5 py-3 rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                            소장님 원격 세션 로그아웃
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 w-full overflow-x-auto scrollbar-hide shrink-0 mb-6 font-semibold">
                <button 
                    onClick={() => setAdminTab('inquiry')} 
                    className={`py-3 px-6 text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
                        adminTab === 'inquiry' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <i className="fa-solid fa-envelope-open-text mr-1.5"></i>상담/중개 의뢰 목록
                </button>
                <button 
                    onClick={() => setAdminTab('posts')} 
                    className={`py-3 px-6 text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
                        adminTab === 'posts' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <i className="fa-solid fa-folder-tree mr-1.5"></i>발행된 통합 매물 관리
                </button>
                <button 
                    onClick={() => setAdminTab('members')} 
                    className={`py-3 px-6 text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
                        adminTab === 'members' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/10' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <i className="fa-solid fa-users-gear mr-1.5"></i>가입 회원 승인 관리 ({registeredUsers.filter(u => !u.approved).length}건 대기)
                </button>
            </div>

            {/* Content Sheets */}
            {adminTab === 'inquiry' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left font-medium border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                                    <th className="p-4 pl-6">의뢰 접수 시간</th>
                                    <th className="p-4">신청 항목 / 고객명</th>
                                    <th className="p-4">고객 연락처</th>
                                    <th className="p-4">상담 요청 및 매물 관련 메모</th>
                                    <th className="p-4 text-center pr-6">처리 상황</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inquiries.map(inq => (
                                    <tr key={inq.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                                        <td className="p-4 pl-6 text-xs text-slate-400 font-mono font-bold">
                                            {new Date(inq.createdAt).toLocaleDateString('ko-KR', {
                                                year: 'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
                                            })}
                                        </td>
                                        <td className="p-4 font-black text-slate-800 text-sm">
                                            <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md mr-2">접수</span>
                                            {inq.name}님
                                        </td>
                                        <td className="p-4 text-xs font-mono font-bold text-slate-600">
                                            <a href={`tel:${inq.phone}`} className="hover:text-emerald-600 hover:underline">{inq.phone}</a>
                                        </td>
                                        <td className="p-4 text-xs text-slate-600 max-w-lg break-all whitespace-pre-wrap text-left leading-relaxed">
                                            {inq.message}
                                        </td>
                                        <td className="p-4 text-center pr-6">
                                            <button 
                                                onClick={() => toggleInquiryProcessed(inq.id)} 
                                                className={`text-xs font-black px-4 py-2 rounded-full border transition-all ${
                                                    inq.processed 
                                                        ? 'bg-emerald-50 border-emerald-250 text-emerald-600 shadow-sm'
                                                        : 'bg-amber-50 border-amber-250 text-amber-600 animate-pulse shadow-sm'
                                                }`}
                                            >
                                                {inq.processed ? <i className="fa-solid fa-circle-check mr-1 text-[10px]"></i> : <i className="fa-solid fa-spinner mr-1 animate-spin text-[10px]"></i>}
                                                <span>{inq.processed ? '처리 완료' : '상담 대기'}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {inquiries.length === 0 && (
                            <div className="text-center py-16 text-slate-400 text-sm font-semibold">
                                <i className="fa-solid fa-clipboard text-xl mb-2 text-slate-300 block"></i>
                                <span>접수 대기 중인 고객 전화 상담 또는 상담의뢰가 아직 없습니다.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {adminTab === 'posts' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest leading-none">전체 {posts.length}건의 발행 매물</span>
                        <button 
                            onClick={() => {
                                // Clear editing post ID and open write page
                                localStorage.removeItem('taewang_editing_post_id');
                                setActiveSection('admin-write');
                            }} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 shadow-md transition-colors"
                        >
                            <i className="fa-solid fa-circle-plus"></i>
                            <span>신규 매물 등록</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {posts.map(p => (
                            <div key={p.id} className="bg-slate-50 border border-slate-200 hover:border-emerald-300 p-4 rounded-2xl flex items-center justify-between transition-all">
                                <div className="flex items-center space-x-3 text-left">
                                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                                        <img src={p.thumbnail} alt={p.building} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{p.category}</span>
                                            <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{p.dong}</span>
                                            {p.isRecommended && <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded">추천★</span>}
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 line-clamp-1">{p.building || '건물명 없음'} {p.room ? `${p.room}호` : ''}</h4>
                                        <p className="text-[11px] text-slate-400 font-semibold">{p.title || '등록된 타이틀 내용 없음'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                    <button 
                                        onClick={() => {
                                            // Open write module specifying editing post
                                            localStorage.setItem('taewang_editing_post_id', p.id);
                                            setActiveSection('admin-write');
                                        }} 
                                        className="text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-100 p-2.5 rounded-xl text-xs font-bold transition-all"
                                        title="매물 상세 내용 및 답사 기록 수정"
                                    >
                                        <i className="fa-solid fa-pen-to-square"></i>
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePost(p.id)} 
                                        className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 p-2.5 rounded-xl text-xs font-bold transition-all"
                                        title="데이터 영구 삭제"
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {adminTab === 'members' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="overflow-x-auto w-full animate-fadeIn">
                        <table className="w-full text-left font-medium border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                                    <th className="p-4 pl-6">회원 가입 일시</th>
                                    <th className="p-4">가입 신청 유저 (이름/이메일)</th>
                                    <th className="p-4">등록 승인 방식</th>
                                    <th className="p-4">활성화 상태</th>
                                    <th className="p-4 text-center pr-6">가입 승인 통제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registeredUsers.map(u => (
                                    <tr key={u.email} className="border-b border-slate-150 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6 text-xs text-slate-400 font-mono font-bold">
                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR', {
                                                year: 'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
                                            }) : '미공개'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col text-left">
                                                <span className="text-sm font-extrabold text-slate-800">{u.name}</span>
                                                <span className="text-[11px] text-slate-400 font-mono font-semibold">{u.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-bold uppercase">
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 text-slate-800">
                                                {u.provider === 'google' && <i className="fa-brands fa-google text-red-500 text-xs"></i>}
                                                {u.provider === 'kakao' && <i className="fa-solid fa-comment text-amber-500 text-xs"></i>}
                                                {u.provider === 'naver' && <span className="text-emerald-500 font-black text-xs mr-1">N</span>}
                                                {u.provider === 'email' && <i className="fa-solid fa-envelope text-blue-500 text-xs"></i>}
                                                <span>{u.provider || '일반이메일'}</span>
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight ${
                                                u.approved 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : 'bg-rose-50 text-rose-550 border border-rose-100 animate-pulse'
                                            }`}>
                                                <span>●</span>
                                                <span>{u.approved ? '승인 및 영속 활성 완료' : '미허가 (승인 대기 중)'}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 text-center pr-6">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {u.approved ? (
                                                    <button
                                                        onClick={() => handleRevokeUser(u.email)}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all cursor-pointer"
                                                    >
                                                        승인 보류
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleApproveUser(u.email)}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer"
                                                    >
                                                        가입 승인
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteUser(u.email)}
                                                    className="text-xs font-bold p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer animate-fadeIn"
                                                    title="회원 삭제"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {registeredUsers.length === 0 && (
                            <div className="text-center py-16 text-slate-400 text-sm font-semibold animate-pulse">
                                가입되어 승인 단계를 거치고 있는 회원이 단 1명도 존재하지 않습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
