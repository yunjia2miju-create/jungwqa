import { create } from 'zustand';
import { Post, Inquiry, defaultPosts } from './data';

interface AppState {
    posts: Post[];
    inquiries: Inquiry[];
    isAdminLoggedIn: boolean;
    isMemberLoggedIn: boolean;
    memberEmail: string | null;
    memberName: string | null;
    showOnlyRecommended: boolean;
    showOnlyVR: boolean;
    activeCategory: string;
    activeDong: string;
    searchVal: string;
    currentPage: number;
    isMobileSimulationMode: boolean;
    activeSection: 'main' | 'detail' | 'admin-login' | 'admin-dashboard' | 'admin-write' | 'vr-list';
    selectedPostId: string | null;
    videoPopupUrl: string | null;
    viewAllCategory: string | null;
    viewAllItems: Post[];
    fromSection: 'main' | 'vr-list';

    setPosts: (posts: Post[]) => void;
    setInquiries: (inqs: Inquiry[]) => void;
    setIsAdminLoggedIn: (val: boolean) => void;
    setMemberLoggedIn: (val: boolean, email: string | null, name: string | null) => void;
    setShowOnlyRecommended: (val: boolean) => void;
    setShowOnlyVR: (val: boolean) => void;
    setActiveCategory: (cat: string) => void;
    setActiveDong: (dong: string) => void;
    setSearchVal: (val: string) => void;
    setCurrentPage: (page: number) => void;
    setIsMobileSimulationMode: (val: boolean) => void;
    setActiveSection: (sec: 'main' | 'detail' | 'admin-login' | 'admin-dashboard' | 'admin-write' | 'vr-list') => void;
    setSelectedPostId: (id: string | null) => void;
    setVideoPopupUrl: (url: string | null) => void;
    setViewAllCategory: (cat: string | null) => void;
    setViewAllItems: (items: Post[]) => void;
    setFromSection: (sec: 'main' | 'vr-list') => void;
}

export const useAppStore = create<AppState>((set) => ({
    posts: defaultPosts,
    inquiries: [],
    isAdminLoggedIn: false,
    isMemberLoggedIn: false,
    memberEmail: null,
    memberName: null,
    showOnlyRecommended: false,
    showOnlyVR: false,
    activeCategory: 'all',
    activeDong: 'all',
    searchVal: '',
    currentPage: 1,
    isMobileSimulationMode: false,
    activeSection: 'main',
    selectedPostId: null,
    videoPopupUrl: null,
    viewAllCategory: null,
    viewAllItems: [],
    fromSection: 'main',

    setPosts: (posts) => set({ posts }),
    setInquiries: (inqs) => set({ inquiries: inqs }),
    setIsAdminLoggedIn: (val) => set({ isAdminLoggedIn: val }),
    setMemberLoggedIn: (val, email, name) => set({ isMemberLoggedIn: val, memberEmail: email, memberName: name }),
    setShowOnlyRecommended: (val) => set((state) => ({ 
        showOnlyRecommended: val, 
        showOnlyVR: val ? false : state.showOnlyVR, 
        currentPage: 1 
    })),
    setShowOnlyVR: (val) => set((state) => ({ 
        showOnlyVR: val, 
        showOnlyRecommended: val ? false : state.showOnlyRecommended, 
        currentPage: 1 
    })),
    setActiveCategory: (cat) => set({ activeCategory: cat, activeDong: 'all', currentPage: 1 }),
    setActiveDong: (dong) => set({ activeDong: dong, currentPage: 1 }),
    setSearchVal: (val) => set({ searchVal: val, currentPage: 1, activeCategory: 'all', activeDong: 'all' }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setIsMobileSimulationMode: (val) => set({ isMobileSimulationMode: val }),
    setActiveSection: (sec) => set((state) => ({ 
        activeSection: sec,
        selectedPostId: (sec === 'main' || sec === 'admin-login' || sec === 'admin-dashboard' || sec === 'admin-write' || sec === 'vr-list') ? null : state.selectedPostId 
    })),
    setSelectedPostId: (id) => set((state) => ({ 
        selectedPostId: id, 
        activeSection: id ? 'detail' : state.fromSection 
    })),
    setVideoPopupUrl: (url) => set({ videoPopupUrl: url }),
    setViewAllCategory: (cat) => set({ viewAllCategory: cat }),
    setViewAllItems: (items) => set({ viewAllItems: items }),
    setFromSection: (sec) => set({ fromSection: sec }),
}));
