import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Post, gumiDongs } from '../data';
import PannellumViewer from './PannellumViewer';
import RichTextEditor from './RichTextEditor';
import { savePostService, getPostsService } from '../firebaseService';

const ADMIN_CATEGORIES_PRESETS = [
    { value: '원룸', label: '원룸 (One-room)', desc: '1인가구를 위한 최적의 원룸 공간', icon: 'fa-house-user', textColor: 'text-indigo-600', selectedBg: 'bg-indigo-50/90 border-indigo-600 text-indigo-950 ring-indigo-100', hoverBg: 'hover:bg-indigo-50/30 hover:border-indigo-300', lightBg: 'bg-indigo-50/50', iconBg: 'bg-indigo-100/55' },
    { value: '미투', label: '미니투룸 (Mini Two-room)', desc: '실용적인 거실 독립 분리형 미투 구조', icon: 'fa-door-closed', textColor: 'text-sky-600', selectedBg: 'bg-sky-50/90 border-sky-600 text-sky-950 ring-sky-100', hoverBg: 'hover:bg-sky-50/30 hover:border-sky-300', lightBg: 'bg-sky-50/50', iconBg: 'bg-sky-100/55' },
    { value: '투룸', label: '정품투룸 (Two-room)', desc: '안락하고 쾌적한 방 2개와 거실 공간 설계', icon: 'fa-bed', textColor: 'text-cyan-600', selectedBg: 'bg-cyan-50/90 border-cyan-600 text-cyan-950 ring-cyan-100', hoverBg: 'hover:bg-cyan-50/30 hover:border-cyan-300', lightBg: 'bg-cyan-50/50', iconBg: 'bg-cyan-100/55' },
    { value: '쓰리룸', label: '쓰리룸/주인세대 (Three-room)', desc: '가족 단위 가구를 위한 대형 최고급 연립주택', icon: 'fa-hotel', textColor: 'text-emerald-700', selectedBg: 'bg-emerald-50/90 border-emerald-600 text-emerald-950 ring-emerald-100', hoverBg: 'hover:bg-emerald-50/30 hover:border-emerald-300', lightBg: 'bg-emerald-50/50', iconBg: 'bg-emerald-100/55' },
    { value: '오피스텔', label: '주거형 오피스텔', desc: '도심 역세권 중심 초특급 인프라 생활 환경', icon: 'fa-building', textColor: 'text-amber-600', selectedBg: 'bg-amber-50/95 border-amber-600 text-amber-950 ring-amber-100', hoverBg: 'hover:bg-amber-50/30 hover:border-amber-300', lightBg: 'bg-amber-50/50', iconBg: 'bg-amber-100/55' },
    { value: '아파트', label: '공동주택 아파트', desc: '경관 수려하고 주차 자리가 넉넉한 대단지', icon: 'fa-city', textColor: 'text-rose-600', selectedBg: 'bg-rose-50/90 border-rose-600 text-rose-950 ring-rose-100', hoverBg: 'hover:bg-rose-50/30 hover:border-rose-300', lightBg: 'bg-rose-50/50', iconBg: 'bg-rose-100/55' },
    { value: '상가', label: '상업용 점포/상가', desc: '최상의 배후 세대와 유동인구를 품은 상가 및 사무실', icon: 'fa-store', textColor: 'text-purple-600', selectedBg: 'bg-purple-50/90 border-purple-600 text-purple-950 ring-purple-100', hoverBg: 'hover:bg-purple-50/30 hover:border-purple-300', lightBg: 'bg-purple-50/50', iconBg: 'bg-purple-100/55' },
    { value: '상가주택', label: '상가형 단독주택', desc: '내집 주거와 고정 월세 수익을 모두 갖춘 단독주택', icon: 'fa-warehouse', textColor: 'text-violet-600', selectedBg: 'bg-violet-50/90 border-violet-600 text-violet-950 ring-violet-100', hoverBg: 'hover:bg-violet-50/30 hover:border-violet-300', lightBg: 'bg-violet-50/50', iconBg: 'bg-violet-100/55' },
    { value: '원룸매매', label: '구미 통원룸 매매', desc: '풍부한 월 임대수익 연금식 노후 보장형 통건물 매입', icon: 'fa-chart-line', textColor: 'text-fuchsia-600', selectedBg: 'bg-fuchsia-50/90 border-fuchsia-600 text-fuchsia-950 ring-fuchsia-100', hoverBg: 'hover:bg-fuchsia-50/30 hover:border-fuchsia-300', lightBg: 'bg-fuchsia-50/50', iconBg: 'bg-fuchsia-100/55' },
    { value: '땅', label: '토지/임야/대지', desc: '기반 개발 호재가 가득한 알짜배기 구미시 토지', icon: 'fa-mountain', textColor: 'text-lime-700', selectedBg: 'bg-lime-50/90 border-lime-600 text-lime-950 ring-lime-100', hoverBg: 'hover:bg-lime-50/30 hover:border-lime-300', lightBg: 'bg-lime-50/50', iconBg: 'bg-lime-100/55' },
    { value: '기타', label: '기타 매물', desc: '그 외 다용도 개발 대지 또는 특수 목적 매물', icon: 'fa-ellipsis-h', textColor: 'text-slate-600', selectedBg: 'bg-slate-100 border-slate-600 text-slate-950 ring-slate-100', hoverBg: 'hover:bg-slate-50 hover:border-slate-350', lightBg: 'bg-slate-150', iconBg: 'bg-slate-200/70' }
];

interface AdminWriteSectionProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export function AdminWriteSection({ showToast }: AdminWriteSectionProps) {
    const { posts, setPosts, setActiveSection } = useAppStore();

    // Fetch editing ID safely from localStorage or store to keep routing robust
    const [editingPostId, setEditingPostId] = useState<string | null>(() => {
        return localStorage.getItem('taewang_editing_post_id') || null;
    });

    const currentEditPost = editingPostId ? posts.find(p => p.id === editingPostId) : null;

    // Form Initial State
    const [formData, setFormData] = useState<Partial<Post>>({
        category: '원룸', transactionType: '월세', dong: '광평동', building: '', room: '', floor: '', totalFloor: '', price: '', manageFee: '', phone: '010-7590-0111', ownerPhone: '',
        title: '', remarks: '', intro: '', body: '', address: '', video: '', thumbnail: '', images: '', panoramas: '', isRecommended: false
    });

    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [activeVRIndex, setActiveVRIndex] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const movePanorama = (fromIndex: number, toIndex: number) => {
        const panos = formData.panoramas ? formData.panoramas.split('|').filter(i => i) : [];
        if (toIndex < 0 || toIndex >= panos.length) return;
        if (fromIndex === toIndex) return;
        
        const newPanos = [...panos];
        const [moved] = newPanos.splice(fromIndex, 1);
        newPanos.splice(toIndex, 0, moved);
        
        setFormData(prev => ({ ...prev, panoramas: newPanos.join('|') }));
        setActiveVRIndex(toIndex);
    };

    // Helpers to render highly prominent, thick-bordered inputs with active background color changes when filled.
    const getInputClass = (value: any, isOwnerPhone = false) => {
        const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
        
        // Base classes: Very thick borders, large readable fonts (text-sm sm:text-base), increased vertical/horizontal padding
        const base = "w-full transition-all duration-300 rounded-2xl px-5 py-4 text-base font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-100/50 ";
        
        if (isOwnerPhone) {
            if (hasValue) {
                return base + "border-[3px] border-amber-600 bg-amber-50 text-amber-950 focus:border-amber-700";
            } else {
                return base + "border-[2.5px] border-slate-400 bg-white text-slate-900 focus:border-amber-500 placeholder-slate-400";
            }
        }
        
        if (hasValue) {
            // Highly visible ACTIVE populated state: Eye-friendly soft mint green background, thick solid emerald-600 border and deep color text
            return base + "border-[3.5px] border-emerald-600 bg-emerald-50/70 text-slate-950 focus:border-emerald-700 focus:bg-emerald-50 placeholder-slate-455";
        } else {
            // UNFILED blank state: Thick slate-400 border, crisp white background, clear and legible
            return base + "border-[2.5px] border-slate-400 bg-white text-slate-900 focus:border-emerald-600 focus:bg-emerald-50/20 placeholder-slate-400/80";
        }
    };

    const getSelectClass = (value: any) => {
        const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
        const base = "w-full transition-all duration-300 rounded-2xl px-5 py-4 text-base font-black shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-100/50 cursor-pointer ";
        if (hasValue) {
            return base + "border-[3px] border-emerald-600 bg-emerald-50/60 text-slate-950 focus:border-emerald-700";
        } else {
            return base + "border-[2.5px] border-slate-400 bg-white text-slate-900 focus:border-emerald-500";
        }
    };

    const getTextareaClass = (value: any) => {
        const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
        const base = "w-full transition-all duration-300 rounded-2xl px-5 py-4 text-base font-bold shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100/50 leading-relaxed ";
        if (hasValue) {
            return base + "border-[3.5px] border-emerald-600 bg-emerald-50/65 text-slate-950 focus:border-emerald-700 placeholder-slate-455";
        } else {
            return base + "border-[2.5px] border-slate-400 bg-white text-slate-900 focus:border-emerald-600 focus:bg-emerald-50/25 placeholder-slate-400/85";
        }
    };

    useEffect(() => {
        if (currentEditPost) {
            setFormData(currentEditPost);
        } else {
            setFormData({
                category: '원룸', transactionType: '월세', dong: '광평동', building: '', room: '', floor: '', totalFloor: '', price: '', manageFee: '', phone: '010-7590-0111', ownerPhone: '',
                title: '', remarks: '', intro: '', body: '', address: '', video: '', thumbnail: '', images: '', panoramas: '', isRecommended: false
            });
        }
        setSelectedImageIndex(null);
        setActiveVRIndex(0);
    }, [editingPostId, currentEditPost]);

    const textAreaRefs = useRef<{[key: string]: HTMLTextAreaElement | null}>({});
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const imagesInputRef = useRef<HTMLInputElement>(null);
    const panoInputRef = useRef<HTMLInputElement>(null);

    const syncHeights = () => {
        Object.values(textAreaRefs.current).forEach(val => {
            const el = val as HTMLTextAreaElement | null;
            if (el) {
                el.style.height = 'auto';
                el.style.height = (el.scrollHeight > 0 ? el.scrollHeight : el.offsetHeight) + 'px';
            }
        });
    };

    useEffect(() => {
        setTimeout(syncHeights, 100);
    }, [formData.intro, formData.body]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        const key = id.replace('post-', '');
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [key]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'images' | 'pano') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const processFile = (file: File, isPano = false): Promise<string> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        
                        const maxDim = isPano ? 4096 : 1920; 
                        
                        if (width > maxDim || height > maxDim) {
                            if (width > height) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                            } else {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        } else {
                            resolve(reader.result as string);
                        }
                    };
                    img.src = reader.result as string;
                };
                reader.readAsDataURL(file);
            });
        };

        if (type === 'thumbnail') {
            const base64 = await processFile(files[0]);
            setFormData(prev => ({ ...prev, thumbnail: base64 }));
            showToast("대표 대표 사진이 안전하게 등록되었습니다.", "success");
        } else if (type === 'pano') {
            const filePromises = Array.from(files).map((file: File) => processFile(file, true));
            const base64s = await Promise.all(filePromises);
            const currentPanos = formData.panoramas ? formData.panoramas.split('|').filter(i => i) : [];
            setFormData(prev => ({ ...prev, panoramas: [...currentPanos, ...base64s].join('|') }));
            showToast(`${files.length}장의 360° 파노라마 VR 사진이 대형 등록되었습니다.`, "success");
        } else {
            const filePromises = Array.from(files).map((file: File) => processFile(file));
            const base64s = await Promise.all(filePromises);
            const currentImages = formData.images ? formData.images.split('|').filter(i => i) : [];
            setFormData(prev => ({ ...prev, images: [...currentImages, ...base64s].join('|') }));
            showToast(`${files.length}장의 상세 전경 사진이 대형 추가 등록되었습니다.`, "success");
        }
        e.target.value = '';
    };

    const imageRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

    const moveImage = (fromIndex: number, toIndex: number) => {
        const imgs = formData.images ? formData.images.split('|').filter(i => i) : [];
        if (toIndex < 0) toIndex = 0;
        if (toIndex >= imgs.length) toIndex = imgs.length - 1;
        if (fromIndex === toIndex) return;
        
        const newImgs = [...imgs];
        const [moved] = newImgs.splice(fromIndex, 1);
        newImgs.splice(toIndex, 0, moved);
        
        setFormData(prev => ({ ...prev, images: newImgs.join('|') }));
        setSelectedImageIndex(toIndex);
    };

    const handleImageKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            moveImage(index, index - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            moveImage(index, index + 1);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            const imgs = formData.images?.split('|').filter(i => i) || [];
            imgs.splice(index, 1);
            setFormData(prev => ({ ...prev, images: imgs.join('|') }));
            setSelectedImageIndex(null);
        }
    };

    const normalizeAndSetData = (data: any) => {
        if (!data || typeof data !== 'object') return;
        
        const cleanData: Partial<Post> = {};
        const safeStr = (val: any): string => {
            if (val === undefined || val === null) return '';
            return String(val).trim();
        };

        const rawTx = safeStr(data.transactionType);
        if (rawTx.includes('매매')) cleanData.transactionType = '매매';
        else if (rawTx.includes('전세')) cleanData.transactionType = '전세';
        else cleanData.transactionType = '월세';
        
        const rawCat = safeStr(data.category);
        const validCategories = ["원룸매매", "원룸", "미투", "투룸", "쓰리룸", "상가", "아파트", "오피스텔", "다세대", "주택", "땅", "기타"];
        const found = validCategories.find(c => rawCat.includes(c) || c.includes(rawCat));
        cleanData.category = found || '원룸';
        
        const rawDong = safeStr(data.dong).replace(/\s+/g, '');
        if (rawDong) {
            const foundDong = gumiDongs.find(gd => rawDong.includes(gd) || gd.includes(rawDong));
            cleanData.dong = foundDong || '송정동';
        } else {
            cleanData.dong = '송정동';
        }
        
        cleanData.floor = safeStr(data.floor).replace(/층/g, '');
        cleanData.totalFloor = safeStr(data.totalFloor).replace(/층/g, '');
        
        cleanData.building = safeStr(data.building);
        cleanData.room = safeStr(data.room);
        cleanData.price = safeStr(data.price);
        cleanData.manageFee = safeStr(data.manageFee);
        cleanData.ownerPhone = safeStr(data.ownerPhone);
        cleanData.title = safeStr(data.title);
        cleanData.remarks = safeStr(data.remarks);
        cleanData.intro = safeStr(data.intro);
        cleanData.body = safeStr(data.body);
        cleanData.address = safeStr(data.address);
        cleanData.video = safeStr(data.video);
        
        if (data.isRecommended !== undefined) {
            cleanData.isRecommended = data.isRecommended === true || String(data.isRecommended) === 'true';
        }
        
        setFormData(prev => ({ ...prev, ...cleanData }));
        setTimeout(syncHeights, 100);
    };

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const defaultImg = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=675&q=80";
        const newPost: Post = {
            id: editingPostId || ('local-' + Date.now()),
            createdAt: editingPostId && currentEditPost ? currentEditPost.createdAt : Date.now(),
            category: formData.category || '원룸',
            transactionType: formData.transactionType || '월세',
            dong: formData.dong || '광평동',
            building: formData.building || '',
            room: formData.room || '',
            floor: formData.floor || '',
            totalFloor: formData.totalFloor || '',
            price: formData.price || '',
            manageFee: formData.manageFee || '',
            phone: formData.phone || '',
            ownerPhone: formData.ownerPhone || '',
            title: formData.title || '',
            remarks: formData.remarks || '',
            thumbnail: formData.thumbnail || defaultImg,
            intro: formData.intro || '',
            body: formData.body || '',
            images: formData.images || '',
            panoImage: formData.panoImage || '',
            panoramas: formData.panoramas || '',
            video: formData.video || '',
            address: formData.address || '',
            isRecommended: formData.isRecommended || false
        };

        try {
            await savePostService(newPost);
            const updated = await getPostsService();
            setPosts(updated);
            showToast(editingPostId ? "매물 답사기가 최종 수정 저장되었습니다!" : "신규 매물 전고가 완벽 등록 발행되었습니다!", "success");
            
            // Go back to dashboard on complete
            localStorage.removeItem('taewang_editing_post_id');
            setActiveSection('admin-dashboard');
        } catch (err) {
            console.error(err);
            showToast("매물 전고 쓰기에 실패했습니다.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        localStorage.removeItem('taewang_editing_post_id');
        setActiveSection('admin-dashboard');
    };

    return (
        <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-8 lg:px-10 py-8 animate-fadeIn">
            {/* Form Title & Inline Navbar */}
            <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-md p-6 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-left">
                    <span className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl border border-emerald-200">
                        <i className="fa-solid fa-pen-fancy text-xl"></i>
                    </span>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900">{editingPostId ? '매물 정보 세부 수정 발행' : '신규 실내 매물 등록 및 발자취 기록'}</h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-extrabold mt-1">소장님께서 직접 실사하시고 기록하는 고급 매물 레지스트리 양식</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        type="button" 
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className={`text-sm font-black border-2 px-5 py-3 rounded-xl transition-all ${
                            isSubmitting 
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 cursor-pointer'
                        }`}
                    >
                        작성 취소 (목록으로 복귀)
                    </button>
                </div>
            </div>

            <form onSubmit={handlePostSubmit} className="space-y-6">
                {/* Visual Wide Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: Vertical Category Grid Cards (Widescreen layout) */}
                    <div className="lg:col-span-4 bg-white rounded-3xl border-3 border-emerald-500/30 p-6 shadow-md space-y-6">
                        <div className="border-b border-slate-200 pb-3 text-left">
                            <label className="flex items-center gap-2 text-sm font-extrabold uppercase text-slate-900">
                                <i className="fa-solid fa-folder-open text-emerald-600 text-xl animate-bounce"></i>
                                <span className="text-xl font-black tracking-tight text-slate-900">매물 분류 카테고리</span>
                            </label>
                            <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1.5 leading-relaxed">
                                해당 매물의 종류를 세로 목록에서 크게 한눈에 보며 편리하게 선택하세요.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 max-h-[75vh] lg:max-h-[1050px] overflow-y-auto pr-1">
                            {ADMIN_CATEGORIES_PRESETS.map((cat) => {
                                const isSelected = formData.category === cat.value;
                                return (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, category: cat.value }))}
                                        className={`relative text-left w-full rounded-2xl p-5 border-[3.5px] transition-all duration-300 shadow-md flex items-center justify-between group cursor-pointer ${
                                            isSelected 
                                                ? `${cat.selectedBg} border-emerald-600 ring-4 ring-emerald-150 scale-[1.01] shadow-emerald-500/10` 
                                                : `bg-white border-slate-405 ${cat.hoverBg} hover:border-slate-500 hover:scale-[1.01]`
                                        }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                                                isSelected ? 'bg-white shadow-md border-2 border-emerald-500/20' : cat.lightBg
                                            }`}>
                                                <i className={`fa-solid ${cat.icon} text-xl ${cat.textColor}`}></i>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-lg sm:text-xl font-black tracking-tight ${
                                                        isSelected ? 'text-slate-950 font-black' : cat.textColor
                                                    }`}>
                                                        {cat.label}
                                                    </span>
                                                </div>
                                                <p className={`text-xs sm:text-[13px] font-bold mt-1.5 leading-relaxed max-w-[240px] ${
                                                    isSelected ? 'text-emerald-900/90 font-bold' : 'text-slate-500'
                                                }`}>
                                                    {cat.desc}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Selection Indicators with dynamic backgrounds */}
                                        {isSelected ? (
                                            <div className="flex flex-col items-center justify-center gap-0.5 bg-emerald-600 text-white rounded-xl py-2 px-3 shadow-md border-2 border-emerald-700 select-none animate-fadeIn">
                                                <i className="fa-solid fa-check text-xs font-black"></i>
                                                <span className="text-[10px] font-black leading-none tracking-tighter mt-0.5">선택됨</span>
                                            </div>
                                        ) : (
                                            <div className="w-7 h-7 rounded-full border-[2.5px] border-slate-400 flex items-center justify-center group-hover:border-slate-500 transition-colors">
                                                <div className="w-3.5 h-3.5 rounded-full bg-transparent group-hover:bg-slate-300 transition-colors"></div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Extensive Details & Images Form Cards */}
                    <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-md space-y-6">
                        
                        {/* 1. Transaction Type Segment (No dropdown either!) */}
                        <div className="border-b border-slate-100 pb-5">
                            <label className="flex items-center justify-between text-xs font-extrabold mb-3.5 uppercase">
                                <span className="flex items-center gap-1.5 text-emerald-805 font-extrabold text-sm">
                                    <i className="fa-solid fa-handshake"></i>
                                    <span>거래 성격 (계약 방식)</span>
                                </span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['월세', '전세', '매매'].map((t) => {
                                    const isSelected = formData.transactionType === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, transactionType: t }))}
                                            className={`py-4 px-5 rounded-2xl text-sm font-black border-[3px] transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-emerald-600 border-emerald-650 text-white shadow-md scale-[1.01]'
                                                    : 'bg-slate-50 border-slate-200 text-slate-705 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            {t === '월세' ? '임대차 (월세)' : t === '전세' ? '임대차 (전세)' : '소유권 이전 (매매)'}
                                        </button>
                                    );
                                })}
                            </div>
                        {/* Address & Dong Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                            <div>
                                <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">소재지 관할 법정동</label>
                                <select 
                                    id="post-dong"
                                    value={formData.dong}
                                    onChange={handleFormChange}
                                    className={getSelectClass(formData.dong)}
                                >
                                    {gumiDongs.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">매물 상세 지번/도로명 주소</label>
                                <input 
                                    type="text" 
                                    id="post-address" 
                                    required
                                    value={formData.address} 
                                    onChange={handleFormChange}
                                    placeholder="예: 구미시 송정동 472-10 2층" 
                                    className={getInputClass(formData.address)}
                                />
                            </div>
                        </div>
                </div>

                {/* Building Details Structure (Grid) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">건물명 (블록) 명칭</label>
                        <input 
                            type="text" 
                            id="post-building" 
                            required
                            value={formData.building} 
                            onChange={handleFormChange}
                            placeholder="예: 태왕 빌리지" 
                            className={getInputClass(formData.building)}
                        />
                    </div>
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">호수 또는 섹션</label>
                        <input 
                            type="text" 
                            id="post-room" 
                            value={formData.room} 
                            onChange={handleFormChange}
                            placeholder="예: 301호" 
                            className={getInputClass(formData.room)}
                        />
                    </div>
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">해당 매물 층수</label>
                        <input 
                            type="text" 
                            id="post-floor" 
                            value={formData.floor} 
                            onChange={handleFormChange}
                            placeholder="예: 3" 
                            className={getInputClass(formData.floor)}
                        />
                    </div>
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">건물 최고 층수</label>
                        <input 
                            type="text" 
                            id="post-totalFloor" 
                            value={formData.totalFloor} 
                            onChange={handleFormChange}
                            placeholder="예: 4" 
                            className={getInputClass(formData.totalFloor)}
                        />
                    </div>
                </div>

                {/* Price Rates and Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">보증금 / 매매가격 (문자가능)</label>
                        <input 
                            type="text" 
                            id="post-price" 
                            required
                            value={formData.price} 
                            onChange={handleFormChange}
                            placeholder="예: 200 (월세) 또는 2억5천 (매매)" 
                            className={getInputClass(formData.price)}
                        />
                    </div>
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">월세 / 관리비 정보 (문자가능)</label>
                        <input 
                            type="text" 
                            id="post-manageFee" 
                            value={formData.manageFee} 
                            onChange={handleFormChange}
                            placeholder="예: 월세 25만 / 관리비 5만" 
                            className={getInputClass(formData.manageFee)}
                        />
                    </div>
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2 flex items-center gap-1.5 justify-between">
                            <span>임대인 관리자 수첩 (소장님 단독 비공개)</span>
                            <span className="text-[10px] text-amber-800 bg-amber-100 font-black px-2 py-0.5 rounded-lg">보안 기밀</span>
                        </label>
                        <input 
                            type="text" 
                            id="post-ownerPhone" 
                            value={formData.ownerPhone} 
                            onChange={handleFormChange}
                            placeholder="예: 임대인 010-1234-5678" 
                            className={getInputClass(formData.ownerPhone, true)}
                        />
                    </div>
                </div>

                {/* Contact Information */}
                <div>
                    <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2">상담/홍보 담당자 연결 전용 연락처</label>
                    <input 
                        type="text" 
                        id="post-phone" 
                        required
                        value={formData.phone} 
                        onChange={handleFormChange}
                        className={getInputClass(formData.phone)}
                    />
                </div>

                {/* Image upload section (Drag & Drop or Manual selection) - EXTREMELY ENLARGED FOR WIDESCREEN SUPPORT */}
                <div id="image-upload-library" className="border border-slate-200 rounded-3xl p-6 sm:p-7 bg-slate-50/65 font-medium space-y-6">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <i className="fa-solid fa-cloud-arrow-up text-emerald-600 text-lg"></i>
                        <span>대표 사진 및 실내 전경 수집 라이브러리 (대형 크기 지원)</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-6">
                        {/* A. Representative Single Thumbnail Image */}
                        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-black text-slate-450 mb-3 flex items-center gap-1.5">
                                <i className="fa-solid fa-image text-emerald-600"></i>
                                <span>1. 매물 대표 사진 (썸네일 - 와이드 대용량 미리보기)</span>
                            </span>
                            {formData.thumbnail ? (
                                <div className="relative w-full h-[320px] sm:h-[420px] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md mb-4 group">
                                    <img src={formData.thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover transition-transform duration-350 hover:scale-101 animate-fadeIn" />
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData(p => ({ ...p, thumbnail: '' }))}
                                        className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors cursor-pointer z-10"
                                    >
                                        <i className="fa-solid fa-trash-can text-sm"></i>
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    className="w-full h-[320px] sm:h-[420px] flex flex-col items-center justify-center bg-slate-105 rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-emerald-700 border border-slate-200 duration-200 cursor-pointer mb-4 shadow-inner" 
                                    onClick={() => thumbnailInputRef.current?.click()}
                                >
                                    <i className="fa-solid fa-image text-5xl mb-3 text-slate-300 animate-pulse"></i>
                                    <span className="text-sm font-bold">대표 사진(썸네일) 등록 및 파일 선택</span>
                                    <p className="text-[11px] text-slate-450 mt-1 font-semibold">클릭하여 PC 또는 스마트폰 앨범에서 실내 메인 사진을 얹히세요</p>
                                </div>
                            )}
                            <input type="file" ref={thumbnailInputRef} onChange={e => handleFileChange(e, 'thumbnail')} accept="image/*" className="hidden" />
                            <button type="button" onClick={() => thumbnailInputRef.current?.click()} className="bg-slate-100 hover:bg-slate-200 text-slate-705 py-2.5 px-5 rounded-xl text-xs font-black transition-all border border-slate-250 cursor-pointer">기기 컴퓨터 파일 불러오기</button>
                        </div>

                        {/* B. Multiple Detail Images */}
                        <div className="flex flex-col items-center p-6 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-black text-slate-450 mb-3 flex items-center gap-1.5">
                                <i className="fa-solid fa-images text-emerald-600"></i>
                                <span>2. 상세 실내 전경 및 상세 부위 컷들 (한 화면에 크고 화끈하게 표시)</span>
                            </span>
                            
                            {formData.images?.split('|').filter(i => i).length ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full mb-4">
                                    {formData.images.split('|').filter(i => i).map((img, i) => (
                                        <div 
                                            key={i} 
                                            ref={el => { imageRefs.current[i] = el; }}
                                            tabIndex={0}
                                            onKeyDown={e => handleImageKeyDown(e, i)}
                                            onClick={() => setSelectedImageIndex(i)}
                                            className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-md ${selectedImageIndex === i ? 'ring-4 ring-emerald-500 scale-[0.98] border-emerald-650':'border-slate-200 hover:scale-[0.98] hover:border-emerald-400'}`}
                                        >
                                            <img src={img} alt="Detail view" className="w-full h-full object-cover" />
                                            <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const list = formData.images?.split('|').filter(item => item) || [];
                                                    list.splice(i, 1);
                                                    setFormData(p => ({ ...p, images: list.join('|') }));
                                                    setSelectedImageIndex(null);
                                                }}
                                                className="absolute top-2.5 right-2.5 bg-rose-600 hover:bg-rose-700 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg font-black text-xs cursor-pointer z-10"
                                            >
                                                &times;
                                            </button>
                                            <span className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-white font-mono text-[10px] font-black px-2.5 py-1 rounded-lg leading-tight z-10">실내 전경 #{i+1}</span>
                                        </div>
                                    ))}
                                    <div 
                                        onClick={() => imagesInputRef.current?.click()} 
                                        className="aspect-[4/3] flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-105 border-2 border-dashed border-slate-350 rounded-2xl text-slate-400 hover:text-emerald-600 cursor-pointer transition-all shadow-sm"
                                    >
                                        <i className="fa-solid fa-plus text-xl animate-bounce mb-1"></i>
                                        <span className="text-xs font-black">실내 전경 컷 추가하기</span>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="w-full h-[220px] flex flex-col items-center justify-center bg-slate-50/80 border border-slate-250 rounded-2xl text-slate-450 hover:bg-slate-100 hover:text-emerald-600 cursor-pointer transition-all mb-4"
                                    onClick={() => imagesInputRef.current?.click()}
                                >
                                    <i className="fa-solid fa-folder-plus text-4xl mb-2 text-slate-300"></i>
                                    <span className="text-sm font-bold">등록된 추가 전경 사진 파일이 없습니다</span>
                                    <p className="text-[11px] text-slate-450 mt-1">이곳을 터치하거나 클릭하여 부엌, 베란다, 거실 섀시 등의 장비 컷을 대량 첨부하세요.</p>
                                </div>
                            )}

                            <input type="file" ref={imagesInputRef} onChange={e => handleFileChange(e, 'images')} multiple accept="image/*" className="hidden" />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => imagesInputRef.current?.click()} className="bg-slate-100 hover:bg-slate-205 text-slate-705 py-2.5 px-5 rounded-xl text-xs font-black transition-all border border-slate-250 cursor-pointer">추가 사진 앨범에서 선택</button>
                                {formData.images && (
                                    <button type="button" onClick={() => setFormData(p => ({ ...p, images: '' }))} className="bg-rose-50 hover:bg-rose-100 text-rose-600 py-2.5 px-5 rounded-xl text-xs font-black transition-all border border-rose-100 cursor-pointer">추가 전경 일괄 삭제</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* C. VR 360 Panorama upload and preview */}
                    <div className="mt-6 border-t border-slate-200 pt-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="text-left">
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md mr-1.5 uppercase">Premium VR Feature</span>
                                <span className="text-[11px] font-black text-slate-750">360° 파노라마 실내 VR 가상 투어 공간 등록</span>
                            </div>
                            <input type="file" ref={panoInputRef} onChange={e => handleFileChange(e, 'pano')} multiple accept="image/*" className="hidden" />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => panoInputRef.current?.click()} className="bg-amber-50 text-amber-700 hover:bg-amber-100 py-1.5 px-3.5 rounded-xl text-[10px] font-extrabold transition-all border border-amber-200/60 leading-none">파노라마 고해상 원본 사진 등록</button>
                                {formData.panoramas && (
                                    <button type="button" onClick={() => {
                                        setFormData(prev => ({ ...prev, panoramas: '' }));
                                        setActiveVRIndex(0);
                                    }} className="bg-rose-50 hover:bg-rose-100 text-rose-600 py-1.5 px-3.5 rounded-xl text-[10px] font-extrabold transition-all border border-rose-100 leading-none">VR 전체 비우기</button>
                                )}
                            </div>
                        </div>

                        {formData.panoramas ? (
                            <div className="space-y-6">
                                {/* Large Active interactive 360 viewer box */}
                                {(() => {
                                    const panoList = formData.panoramas.split('|').filter(i => i);
                                    const safeVRIndex = Math.min(activeVRIndex, Math.max(0, panoList.length - 1));
                                    return (
                                        <div className="bg-slate-900 rounded-3xl p-5 border-[3px] border-amber-500 shadow-xl space-y-3 relative overflow-hidden text-left">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2">
                                                <div>
                                                    <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider block w-fit mb-1.5 animate-pulse">
                                                        <i className="fa-solid fa-expand mr-1"></i> 현재 활성 360° 대형 가상 체험관
                                                    </span>
                                                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                                                        <span className="text-amber-400">VR 채널 #{safeVRIndex + 1}</span> {panoList.length === 1 ? '단독 공간' : '공간 실시간 연출'}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-amber-300 bg-amber-950 px-3 py-1.5 rounded-xl border border-amber-800">
                                                        등록 공간 총 {panoList.length}개
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {panoList.length > 0 && (
                                                <PannellumViewer 
                                                    key={`admin-vr-${safeVRIndex}-${panoList.length}`}
                                                    images={panoList} 
                                                    activeIndex={safeVRIndex} 
                                                    onSceneChange={(idx) => setActiveVRIndex(idx)} 
                                                    height="480px" 
                                                />
                                            )}
                                            <p className="text-right text-[11px] sm:text-xs text-slate-405 font-bold">
                                                ※ 큰사진 뷰어를 마우스로 드래그하면 동서남북 회전이 진행되며, 가상 VR 화면으로 공간 구석구석을 실시간으로 실사 검토할 수 있습니다.
                                            </p>
                                        </div>
                                    );
                                })()}

                                {/* Small thumbnail/preview list to choose & rearrange below the big viewer */}
                                {(() => {
                                    const panoList = formData.panoramas.split('|').filter(i => i);
                                    const safeVRIndex = Math.min(activeVRIndex, Math.max(0, panoList.length - 1));
                                    return (
                                        <div className="bg-slate-50 border-[2.5px] border-slate-350 rounded-2xl p-5 space-y-3">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2 gap-2 text-left">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                                                    <i className="fa-solid fa-images text-emerald-600"></i>
                                                    <span>등록된 파노라마 채널 순서 정렬 및 세부 조정 (클릭시 위 대형 화면에 즉시 로드)</span>
                                                </h4>
                                                <span className="text-xs text-slate-500 font-bold">원하는 채널을 즉시 이동시키거나 지울 수 있습니다.</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
                                                {panoList.map((pano, idx) => {
                                                    const isActive = idx === safeVRIndex;
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => setActiveVRIndex(idx)}
                                                            className={`bg-white p-3 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                                                                isActive 
                                                                    ? 'border-amber-500 bg-amber-50/20 ring-4 ring-amber-100/30 scale-[1.01]' 
                                                                    : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/55'
                                                            }`}
                                                        >
                                                            {/* 360 preview thumbnail as flat image */}
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className={`text-xs font-black ${isActive ? 'text-amber-700' : 'text-slate-600'}`}>
                                                                        {isActive ? '● ' : ''}공간 #{idx + 1} 채널
                                                                    </span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const list = [...panoList];
                                                                            list.splice(idx, 1);
                                                                            setFormData(prev => ({ ...prev, panoramas: list.join('|') }));
                                                                            if (safeVRIndex >= list.length) {
                                                                                setActiveVRIndex(Math.max(0, list.length - 1));
                                                                            }
                                                                        }}
                                                                        className="text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 font-extrabold text-[10px] px-2 py-0.5 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                                                                    >
                                                                        삭제
                                                                    </button>
                                                                </div>
                                                                
                                                                <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm bg-slate-150 border border-slate-200 relative">
                                                                    <img src={pano} alt={`Panorama Thumbnail ${idx+1}`} className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors flex items-center justify-center">
                                                                        <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded">360° 광대역 원본</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Move/arrange buttons inside each card for easy sorting */}
                                                            <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-slate-100">
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === 0}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        movePanorama(idx, idx - 1);
                                                                    }}
                                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-0.5 cursor-pointer ${
                                                                        idx === 0 
                                                                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                                                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                                    }`}
                                                                >
                                                                    <i className="fa-solid fa-chevron-left text-[9px]"></i>
                                                                    <span>앞쪽으로</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === panoList.length - 1}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        movePanorama(idx, idx + 1);
                                                                    }}
                                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-0.5 cursor-pointer ${
                                                                        idx === panoList.length - 1 
                                                                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                                                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                                    }`}
                                                                >
                                                                    <span>뒤쪽으로</span>
                                                                    <i className="fa-solid fa-chevron-right text-[9px]"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="p-10 text-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200">
                                <i className="fa-solid fa-earth-asia text-3xl text-slate-300 animate-spin pb-1.5 block"></i>
                                <p className="text-slate-405 text-xs font-semibold">동서남북 회전이 가능한 360° 파노라마 사진을 업로드하시면, 현장감 넘치는 VR 가상 주택 실내가 매물 상세 페이지에 즉각 반영되어 가동됩니다.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Body Details: Markdown Rich text areas */}
                <div className="space-y-5">
                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2 flex items-center gap-1.5">
                            <i className="fa-solid fa-signature text-emerald-600"></i>
                            <span>매물 통합 설명 타이틀 (Title)</span>
                        </label>
                        <input 
                            type="text" 
                            id="post-title" 
                            required
                            value={formData.title} 
                            onChange={handleFormChange}
                            placeholder="예: [풀옵션 송정동 신축급] 깔끔하고 햇볕 잘 드는 남향 리모델링 원룸" 
                            className={getInputClass(formData.title)}
                        />
                    </div>

                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-900 mb-2 flex items-center gap-1.5">
                            <i className="fa-solid fa-tag text-emerald-600"></i>
                            <span>요약 및 한줄평 (Remarks)</span>
                        </label>
                        <input 
                            type="text" 
                            id="post-remarks" 
                            value={formData.remarks} 
                            onChange={handleFormChange}
                            placeholder="예: 즉시 입주 가능 / 반려동물 협의 가능 / 깔끔 내부" 
                            className={getInputClass(formData.remarks)}
                        />
                    </div>

                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-905 mb-2 flex items-center gap-1.5">
                            <i className="fa-solid fa-quote-left text-emerald-600"></i>
                            <span>매물 3대 특징 / 한줄 요약 (글머리에 전면 노출됨)</span>
                        </label>
                        <textarea 
                            id="post-intro" 
                            ref={el => { textAreaRefs.current['intro'] = el; }}
                            value={formData.intro} 
                            onChange={handleFormChange}
                            placeholder="예: - 2026년 리모델링을 완전 마친 최상의 에어컨 탑재 신축급 컨디션&#10;- 송정동 먹자골목 및 관공서 도보 5분 천혜의 주거 인프라&#10;- 보증금 조절 적극 지원 및 인근 대비 넓은 서비스 전용 면적" 
                            className={getTextareaClass(formData.intro)}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-left text-[14px] sm:text-base font-black text-slate-905 mb-2 flex items-center gap-1.5">
                            <i className="fa-solid fa-file-pen text-emerald-600"></i>
                            <span>전문가 답사 가이드 기록 및 세부 옵션 안내 (Markdown 마크업 편집 지원)</span>
                        </label>
                        <RichTextEditor 
                            id="admin-write-editor"
                            value={formData.body || ''} 
                            onChange={(val) => setFormData(prev => ({ ...prev, body: val }))} 
                            placeholder="이 매물을 직접 실사하시고 느낀 장점이나 주변 도보 환경을 친절하게 기술해주세요."
                        />
                    </div>
                </div>

                {/* Recommended Post Feature Checkbox */}
                <div className="flex items-center justify-between bg-emerald-50/50 p-6 rounded-2xl border-2 border-emerald-300 font-semibold shadow-sm overflow-hidden">
                    <div className="text-left space-y-1">
                        <span className="text-sm font-black text-emerald-900 flex items-center gap-1.5">
                            <i className="fa-solid fa-star text-amber-500 animate-spin"></i>
                            <span>태왕 추천 랜드마크 매물 등록</span>
                        </span>
                        <p className="text-slate-600 text-xs font-bold leading-relaxed">이 옵션을 선택해 주시면 메인 로비 홈화면 최고 상단에 엠블럼과 함께 고정 노출되어 노출량이 극대화됩니다.</p>
                    </div>
                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            id="post-isRecommended" 
                            checked={formData.isRecommended || false} 
                            onChange={handleFormChange}
                            className="w-6 h-6 accent-emerald-600 cursor-pointer rounded-lg" 
                        />
                        <span className="text-base font-black text-slate-800">추천 매물 고정</span>
                    </label>
                </div>

                {/* Submitting handles */}
                <div className="flex space-x-4 pt-4">
                    <button 
                        type="button" 
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className={`w-1/3 border-2 py-4 rounded-2xl text-sm font-black shadow-sm transition-all ${
                            isSubmitting 
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 cursor-pointer'
                        }`}
                    >
                        작성 종료 / 목록 복귀
                    </button>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-2/3 border-2 py-4 rounded-2xl text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 ${
                            isSubmitting 
                            ? 'bg-emerald-700/80 border-emerald-800 text-white/80 cursor-not-allowed opacity-80' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-700 shadow-emerald-700/25 cursor-pointer'
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <i className="fa-solid fa-circle-notch fa-spin text-base text-emerald-300 animate-spin"></i>
                                <span>{editingPostId ? '정보 수정 및 동기화 중...' : '실시간 정보 저장 및 발행 중...'}</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-cloud-arrow-up text-base"></i>
                                <span>{editingPostId ? '입력된 정보 동기화 및 수정 완료' : '실시간 정보 저장 및 발행 게시'}</span>
                            </>
                        )}
                    </button>
                </div>

                </div> {/* Closes right column: lg:col-span-8 */}
            </div> {/* Closes Visual Wide Column Grid wrapper: grid-cols-12 */}
        </form>
    </div>
    );
}
