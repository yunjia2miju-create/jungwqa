import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { ChevronLeft, ChevronRight, Home, Search, Link as LinkIcon, Phone, ArrowUpRight } from 'lucide-react';
import { submitInquiryService, getInquiriesService } from '../firebaseService';
import { Naver360Icon } from './Naver360Icon';
import { ViewAllModal } from './ViewAllModal';
import { motion, AnimatePresence } from 'motion/react';
import VrViewer from './VrViewer';

// 아임웹(imweb) HQ 스타일의 리모델링 대문 컴포넌트
export const MainTab = ({ 
    openPhoneSelectModal, 
    showToast 
}: { 
    openPhoneSelectModal: (e: React.MouseEvent, mobilePhone: string, ownerPhone?: string) => void;
    showToast: (msg: string, type: 'success' | 'error') => void;
}) => {
    const { 
        posts, 
        isAdminLoggedIn, 
        setSelectedPostId,
        setActiveSection,
        setInquiries,
        viewAllCategory,
        viewAllItems,
        setViewAllCategory,
        setViewAllItems,
        setFromSection
    } = useAppStore();

    const [searchInput, setSearchInput] = useState('');
    const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
    const [isMobile, setIsMobile] = useState(false);

    // 스마트 통합검색 실시간 팝업 검색결과 목록 추출용
    const searchResults = useMemo(() => {
        const query = searchInput.toLowerCase().trim();
        if (!query) return [];
        return posts.filter(p => {
            const buildingMatch = String(p.building || '').toLowerCase().includes(query);
            const addressMatch = String(p.address || '').toLowerCase().includes(query);
            return buildingMatch || addressMatch;
        });
    }, [searchInput, posts]);


    const handleViewAll = (categoryTitle: string, items: any[]) => {
        setViewAllCategory(categoryTitle);
        setViewAllItems(items);
    };

    // 대문용 고화질 디폴트 360 VR 파노라마 이미지 슬라이더 전용 데이터

    const defaultPanoramas = useMemo(() => {
        const vrPosts = filteredPosts.filter(p => p.category === '360 VR사진' || (p.panoramas && typeof p.panoramas === 'string' && p.panoramas.trim().length > 0));
        const mapped = [];
        
        for (const post of vrPosts) {
            let firstUrl = '';
            const str = post.panoramas;
            if (str && typeof str === 'string' && str.trim()) {
                if (str.includes('|')) {
                    firstUrl = str.split('|')[0].trim();
                } else if (str.includes(',') && (str.includes('http') || str.includes('/panoramas/'))) {
                    firstUrl = str.split(',')[0].trim();
                } else {
                    firstUrl = str.trim();
                }
            }
            if (firstUrl) {
                mapped.push({
                    title: post.building || 'VR 투어',
                    address: `${post.dong || ''} ${post.building || ''} 360° 가상 투어`.trim(),
                    url: firstUrl
                });
            }
        }
        
        if (mapped.length > 0) {
            return mapped;
        }

        return [
            {
                title: "아늑한 거실 (Living Room)",
                address: "형곡 에코빌 360° 가상 투어",
                url: "https://pannellum.org/images/jure-barca.jpg"
            },
            {
                title: "럭셔리 복층 홀 (Luxury Duplex)",
                address: "시청역 모던빌 360° 가상 투어",
                url: "https://pannellum.org/images/milan.jpg"
            },
            {
                title: "클래식 화이트 서재 (Classic Study)",
                address: "원평 힐탑뷰 360° 가상 투어",
                url: "https://pannellum.org/images/library.jpg"
            },
            {
                title: "송정 도심 스카이라인 (City View)",
                address: "송정 드림하우스 360° 야외 전경",
                url: "https://pannellum.org/images/alma.jpg"
            }
        ];
    }, [filteredPosts]);

    const [activePanoIndex, setActivePanoIndex] = useState(0);
    const panoImages = useMemo(() => defaultPanoramas.map(p => p.url), [defaultPanoramas]);

    // 12초 주기로 룸 씬이 부드럽게 자동 슬라이드 전환되는 스마트 시스템
    useEffect(() => {
        const timer = setInterval(() => {
            setActivePanoIndex(prev => (prev + 1) % defaultPanoramas.length);
        }, 12000);
        return () => clearInterval(timer);
    }, [defaultPanoramas.length]);

    // 반응형 레이아웃 감지를 위한 리사이즈 훅 세팅
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // 실시간 검색 필터링 인프라 매칭
    useEffect(() => {
        const query = searchInput.toLowerCase().trim();
        if (!query) {
            setFilteredPosts(posts);
            return;
        }
        const filtered = posts.filter(p => {
            const buildingMatch = String(p.building || '').toLowerCase().includes(query);
            const addressMatch = String(p.address || '').toLowerCase().includes(query);
            return buildingMatch || addressMatch;
        });
        setFilteredPosts(filtered);
    }, [searchInput, posts]);

    const handleSearchItemClick = (p: any) => {
        const isVideoCategory = p.category === '유튜브' || p.category === '네이버TV';
        const videoUrl = p.video || p.naverTv || p.naverBlogUrl || p.blogUrl || (String(p.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);

        if (isVideoCategory && videoUrl) {
            useAppStore.getState().setVideoPopupUrl(videoUrl);
            return;
        }

        if (!p.id.startsWith('placeholder')) {
            const customBlogUrl = p.naverBlogUrl || p.blogUrl;
            if (customBlogUrl && !isVideoCategory) {
                window.open(customBlogUrl, '_blank', 'noopener,noreferrer');
            } else {
                setSelectedPostId(p.id);
                setActiveSection('detail');
            }
        } else if (p.id.startsWith('placeholder') && (p.naverBlogUrl || p.blogUrl)) {
            window.open(p.naverBlogUrl || p.blogUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // 대기 카드 네이버 블로그 수동 링크 매칭 헬퍼
    const getBlogUrl = (p: any, defaultUrl: string) => {
        if (p.naverBlogUrl) {
            return p.naverBlogUrl;
        }
        if (p.blogUrl) {
            return p.blogUrl;
        }
        const remarksVal = String(p.remarks || '');
        const match = remarksVal.match(/(https?:\/\/blog\.naver\.com\/[^\s]+)/);
        if (match) {
            return match[1];
        }
        return defaultUrl;
    };

    // --- 카테고리별 매물 및 임시 대기 카드 리스트업 ---

    // 1. 원룸 추천 매물 목록
    const oneRoomRecommendData = useMemo(() => {
        const real = [...filteredPosts.filter(p => p.category === '원룸')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-rec-1',
                building: '시청역 라온제나',
                address: '구미시 송정동 54-2',
                price: '300/35',
                remarks: '시청 인근 최상급 풀옵션 리모델링 완료! 강력 추천 원룸 매물입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '원룸',
                transactionType: '월세',
                floor: '2층',
                isRecommended: true,
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-rec-2',
                building: '봉곡 골든클래스',
                address: '구미시 봉곡동 902-5',
                price: '300/33',
                remarks: '채광이 매우 풍부하고 주방 분리형 구조의 적극 추천 풀옵션 원룸입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '원룸',
                transactionType: '월세',
                floor: '3층',
                isRecommended: true,
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-rec-3',
                building: '신평 노블레스',
                address: '구미시 신평동 240-10',
                price: '200/28',
                remarks: '즉시 입주 가능한 깔끔하고 가성비 훌륭한 리모델링 추천 세대입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '원룸',
                transactionType: '월세',
                floor: '3층',
                isRecommended: true,
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    // 2. 미투 추천 매물 목록
    const miRoomRecommendData = useMemo(() => {
        const real = [...filteredPosts.filter(p => p.category === '미투')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-mi-1',
                building: '시청역 모던빌',
                address: '구미시 송정동 479-2',
                price: '200/13',
                remarks: '내 소중한 인생 2막을 채워줄 든든하고 안전한 구미원룸월세 계약 꿀팁!',
                thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '미투',
                transactionType: '월세',
                floor: '2층',
                isRecommended: true,
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-mi-2',
                building: '해마루',
                address: '구미시 형곡동 175-17',
                price: '100/15',
                remarks: '형곡동 4주공네거리와 낙원탕 인근에 위치해서 생활하기 참 편한 실시간 즉시 입주 가능 공실이에요.',
                thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '미투',
                transactionType: '월세',
                floor: '3층',
                isRecommended: true,
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-mi-3',
                building: '문하우스',
                address: '구미시 송정동 13-17',
                price: '200/35',
                remarks: '다이소도 가깝고 구미시청이나 구미역 가기에도 위치가 참 괜찮더라고요.',
                thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '미투',
                transactionType: '월세',
                floor: '4층',
                isRecommended: true,
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    // 3. 투룸 / 쓰리룸 특선 매물 목록
    const specialData = useMemo(() => {
        const real = [...filteredPosts.filter(p => ['투룸', '쓰리룸'].includes(p.category))].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-sp-1',
                building: '더 테라스 투룸',
                address: '구미시 진평동 300-2',
                price: '8000',
                remarks: '넓은 야외 테라스가 인상적인 프라이빗 정남향 명품 투룸입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '투룸',
                transactionType: '전세',
                floor: '3층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-sp-2',
                building: '송정 팰리스',
                address: '구미시 송정동 22-9',
                price: '12000',
                remarks: '초중고 도보 학군 중심지의 여유롭고 완벽한 쓰리룸 주거 공간입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '쓰리룸',
                transactionType: '전세',
                floor: '4층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-sp-3',
                building: '형곡 리버뷰 투룸',
                address: '구미시 형곡동 44-1',
                price: '500/45',
                remarks: '공원 인근 조용하고 전망이 훌륭하게 정비된 대형 투룸입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '투룸',
                transactionType: '월세',
                floor: '2층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    // 4. 오피스텔 특선 매물 목록
    const officetelData = useMemo(() => {
        const real = [...filteredPosts.filter(p => p.category === '오피스텔')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-of-1',
                building: '태왕오피스텔 A타입',
                address: '경북 구미시 송정동 74',
                price: '500/40',
                remarks: '안심하고 쉴 수 있는 구미오피스텔월세 등기부 보는 법부터 안전한 동선까지 하나씩 짚어드릴게요.',
                thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '오피스텔',
                transactionType: '월세',
                floor: '11층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-of-2',
                building: '유성푸르나임',
                address: '구미시 송정동 77',
                price: '300/40',
                remarks: '구미시청 관공서 인접하여 생활편리함 가득한 즉시입주가능 복층 매물입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '오피스텔',
                transactionType: '월세',
                floor: '16층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-of-3',
                building: '유성푸르나임 복층',
                address: '구미시 송정동 77',
                price: '300/40',
                remarks: '24시간 가동되는 CCTV와 철저한 보안 시스템 덕분에 여성분들의 야간 귀가 길도 무척 안전합니다.',
                thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '오피스텔',
                transactionType: '월세',
                floor: '8층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    // 5. 아파트 특선 매물 목록
    const apartmentData = useMemo(() => {
        const real = [...filteredPosts.filter(p => p.category === '아파트')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-ap-1',
                building: '자이언트',
                address: '경북 구미시 비산동 80-7',
                price: '500/37',
                remarks: '깔끔하게 정비된 주방과 리모델링 완료된 화장실 상태가 최고인 즉시 입주 아파트입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '아파트',
                transactionType: '월세',
                floor: '4층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-ap-2',
                building: '티파니',
                address: '구미시 송정동 473-7',
                price: '6000/10',
                remarks: '"내가 꿈꾸던 포근하고 햇살 가득한 남향 안식처, 구미 최고의 자리에 위치한 고품격 공간의 실물을 직접 감상해보세요."',
                thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '아파트',
                transactionType: '월세',
                floor: '3층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-ap-3',
                building: '태왕아너스타워',
                address: '구미시 송정동 74',
                price: '500/55',
                remarks: '풀옵션 깨끗하고 막힘없는 멋진뷰의 고층 실시간 공실입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '아파트',
                transactionType: '월세',
                floor: '20',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    // 6. 빌라 특선
    const villaData = useMemo(() => {
        const real = [...filteredPosts.filter(p => p.category === '빌라')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-villa-1',
                building: '신축 고급 빌라',
                address: '구미시 형곡동 88-2',
                price: '매매 15000',
                remarks: '최고급 자재로 마감된 채광 좋은 신축 빌라 매매입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '빌라',
                transactionType: '매매',
                floor: '3층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-villa-2',
                building: '햇살 가득한 빌라',
                address: '구미시 송정동 12-4',
                price: '전세 8000',
                remarks: '정남향으로 하루종일 채광이 좋은 깔끔한 빌라입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '빌라',
                transactionType: '전세',
                floor: '2층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-villa-3',
                building: '가성비 투룸 빌라',
                address: '구미시 도량동 53-1',
                price: '3000/40',
                remarks: '조용한 주택가, 편의시설 인접한 투룸 구조 빌라입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '빌라',
                transactionType: '월세',
                floor: '1층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    // 7. 상가(사무실) 특선
    const commercialData = useMemo(() => {
        const real = [...filteredPosts.filter(p => ['상가', '사무실', '상가/사무실', '기타'].includes(p.category))].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-com-1',
                building: '대로변 1층 상가',
                address: '구미시 송정동 55-1',
                price: '2000/120',
                remarks: '유동인구 풍부한 대로변 1층 상가 임대합니다.',
                thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '상가',
                transactionType: '월세',
                floor: '1층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-com-2',
                building: '채광 좋은 사무실',
                address: '구미시 공단동 102-1',
                price: '1000/80',
                remarks: '업무 집중도를 높여주는 깔끔하고 채광 좋은 사무실입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '사무실',
                transactionType: '월세',
                floor: '3층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-com-3',
                building: '신축 상가 건물',
                address: '구미시 형곡동 20-5',
                price: '5000/250',
                remarks: '다양한 업종 가능한 신축 상가 건물 통임대입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '상가/사무실',
                transactionType: '월세',
                floor: '건물전체',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    // 8. 원룸매매 추천
    const oneRoomSaleData = useMemo(() => {
        const real = [...filteredPosts.filter(p => p.category === '원룸매매')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-sale-1',
                building: '수익형 원룸매매',
                address: '구미시 진평동 102-3',
                price: '매매 35000',
                remarks: '안정적인 수익률을 자랑하는 풀옵션 원룸 건물 매매입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '원룸매매',
                transactionType: '매매',
                floor: '건물전체',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-sale-2',
                building: '코너 각지 원룸 통매매',
                address: '구미시 인의동 54-2',
                price: '매매 42000',
                remarks: '공실률 제로! 코너에 위치한 수익률 우수 원룸 건물입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '원룸매매',
                transactionType: '매매',
                floor: '건물전체',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-sale-3',
                building: '리모델링 완료 원룸 건물',
                address: '구미시 황상동 110-5',
                price: '매매 28000',
                remarks: '내외부 전면 리모델링 완료, 즉시 수익 창출 가능한 매물입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '원룸매매',
                transactionType: '매매',
                floor: '건물전체',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    const vrData = useMemo(() => {
        const real = [...filteredPosts.filter(p => p.category === '360 VR사진' || (p.panoramas && typeof p.panoramas === 'string' && p.panoramas.trim().length > 0))].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-vr-1',
                building: '시청역 모던빌 (VR 샘플)',
                address: '구미시 송정동 479-2',
                price: '300/35',
                remarks: '360도 가상 투어로 미리 만나보세요.',
                thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '360 VR사진',
                transactionType: '월세',
                floor: '3층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-vr-2',
                building: '형곡 에코빌 (VR 샘플)',
                address: '구미시 형곡동 123-4',
                price: '500/40',
                remarks: '럭셔리한 복층 공간을 360도로 체험하세요.',
                thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '360 VR사진',
                transactionType: '월세',
                floor: '5층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            },
            {
                id: 'placeholder-vr-3',
                building: '원평 힐탑뷰 (VR 샘플)',
                address: '구미시 원평동 45-6',
                price: '400/40',
                remarks: '클래식한 인테리어를 가상 현실에서 만나보세요.',
                thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '360 VR사진',
                transactionType: '월세',
                floor: '11층',
                blogUrl: 'https://blog.naver.com/yunjia2miju'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [filteredPosts]);

    const youtubeData = useMemo(() => {
        const real = [...posts.filter(p => p.category === '유튜브')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-youtube-1',
                building: '구미 원룸 투어',
                address: '유튜브 채널',
                price: '추천 영상',
                remarks: '가성비 좋은 구미 원룸 매물들을 영상으로 생생하게 확인하세요.',
                thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '유튜브',
                transactionType: '동영상',
                floor: '유튜브',
                blogUrl: 'https://youtube.com'
            },
            {
                id: 'placeholder-youtube-2',
                building: '투룸 인테리어 팁',
                address: '유튜브 채널',
                price: '인테리어',
                remarks: '투룸을 더 넓고 쾌적하게 쓰는 인테리어 꿀팁을 영상으로 만나보세요.',
                thumbnail: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '유튜브',
                transactionType: '동영상',
                floor: '유튜브',
                blogUrl: 'https://youtube.com'
            },
            {
                id: 'placeholder-youtube-3',
                building: '구미 핫플 상가',
                address: '유튜브 채널',
                price: '상가 소개',
                remarks: '요즘 가장 뜨는 구미 주요 상권 매물 투어 영상입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '유튜브',
                transactionType: '동영상',
                floor: '유튜브',
                blogUrl: 'https://youtube.com'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [posts]);

    const naverTvData = useMemo(() => {
        const real = [...posts.filter(p => p.category === '네이버TV')].sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
        const placeholders = [
            {
                id: 'placeholder-navertv-1',
                building: '아파트 랜선 투어',
                address: '네이버TV',
                price: '랜선 집들이',
                remarks: '최고급 옵션의 아파트 랜선 집들이 영상입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '네이버TV',
                transactionType: '동영상',
                floor: '네이버TV',
                blogUrl: 'https://tv.naver.com'
            },
            {
                id: 'placeholder-navertv-2',
                building: '신축 빌라 리뷰',
                address: '네이버TV',
                price: '매물 리뷰',
                remarks: '방 구석구석을 꼼꼼하게 살펴보는 신축 빌라 상세 리뷰 영상입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '네이버TV',
                transactionType: '동영상',
                floor: '네이버TV',
                blogUrl: 'https://tv.naver.com'
            },
            {
                id: 'placeholder-navertv-3',
                building: '오피스텔 투자 정보',
                address: '네이버TV',
                price: '투자 가이드',
                remarks: '오피스텔 수익률 분석 및 똑똑한 투자 가이드 영상입니다.',
                thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80',
                category: '네이버TV',
                transactionType: '동영상',
                floor: '네이버TV',
                blogUrl: 'https://tv.naver.com'
            }
        ];
        return real.length > 0 ? [...real, ...placeholders.slice(real.length)] : placeholders;
    }, [posts]);

    // 1:1 상담 및 매물 의뢰 데이터 상태
    const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', message: '' });
    const handleInquirySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inquiryForm.name || !inquiryForm.phone) {
            showToast("신청인 성함과 연락처는 필수 입력 사항입니다.", "error");
            return;
        }
        const newInq = { 
            id: 'inq-' + Date.now(), 
            name: inquiryForm.name, 
            phone: inquiryForm.phone, 
            message: inquiryForm.message, 
            processed: false, 
            createdAt: Date.now() 
        };
        try {
            await submitInquiryService(newInq);
            const updated = await getInquiriesService();
            if (Array.isArray(updated)) {
                setInquiries(updated);
            }
            setInquiryForm({ name: '', phone: '', message: '' });
            showToast("상담 및 의뢰 신청이 성공적으로 접수되었습니다.", "success");
        } catch (err) {
            console.error(err);
            showToast("시스템 오류로 의뢰 접수에 실패하였습니다.", "error");
        }
    };

    return (
        <section id="main-section" className="w-full bg-white text-[#111827] transition-all duration-300">
            
            {/* [최상단 비주얼 브랜드 히어로 배너]: 소장님의 지시에 따라 오직 텍스트로만 웅장하고 미니멀하게 구성 */}
            <div 
                id="hero-desktop-wrapper" 
                className="relative w-full h-auto min-h-[520px] lg:min-h-[620px] bg-[#051124] flex items-center justify-center overflow-hidden border-b border-slate-900 select-none px-6 pt-28 sm:pt-36 pb-20 sm:pb-24"
            >
                {/* 깊고 고급스러운 웅장함을 주는 딥 킹스 네이비(Deep King's Navy) 바탕 백그라운드 */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B2545] via-[#081D33] to-[#040E1A] opacity-100"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent)]"></div>

                <div className="relative z-10 max-w-5xl mx-auto w-full text-center space-y-8 px-4 flex flex-col items-center">
                    
                    {/* 360 집 모양 VR 아이콘 */}
                    <div className="relative mb-3 animate-[pulse_3s_ease-in-out_infinite]">
                        <Naver360Icon className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-[0_16px_48px_rgba(100,223,223,0.35)] hover:scale-110 active:scale-95 transition-all duration-500 cursor-pointer" />
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[#64dfdf] text-xs sm:text-sm lg:text-base font-black uppercase tracking-[0.3em] bg-white/5 border border-white/10 px-6 py-2.5 rounded-full backdrop-blur-md shadow-2xl">
                            GUMI TAEWANG REAL ESTATE
                        </span>
                    </div>

                    <h1 className="flex flex-col items-center gap-3.5 select-none">
                        <span className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none drop-shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                            360 공간 현장 VR 투어
                        </span>
                        <span className="text-xl sm:text-3xl lg:text-4xl font-black text-[#64dfdf] tracking-tight leading-none drop-shadow-[0_5px_15px_rgba(100,223,223,0.3)] mt-1">
                            단 한줄의 정직한 가치
                        </span>
                    </h1>

                    <p className="text-slate-200 text-sm sm:text-lg lg:text-xl leading-relaxed font-semibold max-w-4xl mx-auto">
                        태왕공인중개사사무소는 오랜 경험과 정직함을 바탕으로 구미 전 지역의 프리미엄 부동산 정보를 선별하여 제공합니다.
                        <br />
                        신뢰할 수 있는 구미 대표 자사몰에서 단 한 줄의 정직한 인연을 통해 소중한 주거 공간의 가치를 발견해 보세요.
                    </p>

                    <div className="flex flex-wrap justify-center gap-5 pt-4">
                        <a 
                            href="#property-search-section" 
                            className="bg-white text-[#0b132b] hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all font-black text-sm sm:text-lg px-10 py-5 rounded-full shadow-xl hover:shadow-2xl"
                        >
                            실시간 매물 보러가기
                        </a>
                        <a 
                            href="#direct-consulting-section" 
                            className="bg-white/10 text-white hover:bg-white/25 border border-white/10 hover:scale-105 active:scale-95 transition-all font-black text-sm sm:text-lg px-10 py-5 rounded-full shadow-xl hover:shadow-2xl backdrop-blur-sm"
                        >
                            1:1 중개 의뢰하기
                        </a>
                    </div>
                </div>
            </div>

            {/* [통합 검색창 구역]: 대문 상단 중앙에 배치되어 칼같이 실시간 필터링 수행 */}
            <div 
                id="property-search-section" 
                className="max-w-4xl mx-auto -mt-10 relative z-30 px-4"
            >
                <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
                    <div className="text-center space-y-1.5 select-none">
                        <span className="text-[#3a506b] text-[10px] sm:text-xs font-black uppercase tracking-widest">
                            SMART INTEGRATED SEARCH
                        </span>
                        
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                            스마트 통합 검색
                        </h3>

                        <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">
                            찾으시는 건물의 명칭이나 주소를 입력하시면 실시간으로 아래 매물들이 필터링됩니다.
                        </p>
                    </div>

                    <div className="relative w-full">
                        <span className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-400">
                            <Search className="w-5 h-5 sm:w-6 h-6" />
                        </span>
                        <input 
                            type="text" 
                            value={searchInput} 
                            onChange={(e) => setSearchInput(e.target.value)} 
                            placeholder="건물 주소 또는 건물명(예: 포브스, 모던빌, 젠틀맨)을 입력하세요..." 
                            className="w-full bg-slate-50 border border-slate-200 text-slate-950 font-extrabold rounded-2xl pl-14 sm:pl-16 pr-6 py-5 text-sm sm:text-base focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#3a506b]/15 focus:border-[#3a506b] transition-all placeholder-slate-400" 
                        />

                        {/* 스마트 통합검색 실시간 결과 팝업창 (결과가 있을 때만 렌더링) */}
                        {searchInput.trim() !== '' && searchResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden divide-y divide-slate-100 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-slate-50 px-5 py-3 text-xs font-black text-slate-500 border-b border-slate-100 flex items-center justify-between select-none shrink-0">
                                    <span>실시간 매물 검색 결과 ({searchResults.length}건)</span>
                                    <button 
                                        type="button"
                                        onClick={() => setSearchInput('')}
                                        className="text-slate-400 hover:text-slate-600 transition-colors font-extrabold cursor-pointer px-2 py-1 rounded hover:bg-slate-200/50"
                                    >
                                        닫기
                                    </button>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 scrollbar-none">
                                    {searchResults.map((p) => {
                                        return (
                                            <div 
                                                key={p.id}
                                                onClick={() => {
                                                    handleSearchItemClick(p);
                                                    setSearchInput(''); // 검색창 초기화로 팝업창 닫기 및 필터링 리셋
                                                }}
                                                className="p-3.5 flex items-center gap-3.5 hover:bg-slate-50 cursor-pointer transition-all duration-150 group text-left"
                                            >
                                                <div className="w-14 h-11 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-100 relative">
                                                    <img 
                                                        src={p.category === '360 VR사진' ? (p.vrThumbnail || p.thumbnail) : (p.thumbnail || p.vrThumbnail)} 
                                                        alt={p.building} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[9px] font-black bg-[#1c2541]/10 text-[#1c2541] px-1.5 py-0.5 rounded uppercase">
                                                            {p.category}
                                                        </span>
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                                                            {p.price}
                                                        </span>
                                                        {p.floor && (
                                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded shrink-0">
                                                                {p.floor}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h5 className="text-sm font-black text-slate-900 truncate group-hover:text-[#3a506b] transition-colors leading-snug">
                                                        {p.building}
                                                    </h5>
                                                    <p className="text-[11px] text-slate-400 font-bold truncate leading-relaxed">
                                                        {p.address}
                                                    </p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#3a506b]/10 flex items-center justify-center shrink-0 transition-colors">
                                                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#3a506b] transition-colors" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {searchInput && (
                        <div className="text-center text-xs font-bold text-slate-400 select-none animate-pulse">
                            <span>검색어 "{searchInput}"에 대한 실시간 연동 필터링이 가동 중입니다.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* [실시간 360° 공간 가상 투어 구역]: 스마트 통합검색 밑과 360 최신 매물 사이에 이동 설치 완료 */}
            <div 
                id="vr-showcase-section"
                className="max-w-7xl mx-auto px-4 sm:px-8 py-20 space-y-12 relative z-20"
            >
                <div className="text-center space-y-6 select-none flex flex-col items-center">
                    <span className="text-[#0B2545] text-sm sm:text-base font-black uppercase tracking-widest bg-slate-100 px-5 py-2 rounded-full border border-slate-200">
                        REAL-TIME 360° VR SHOWCASE
                    </span>

                    <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                        실시간 360° 가상 현장 투어
                    </h3>
                    <p className="text-slate-500 text-sm sm:text-base lg:text-lg font-semibold max-w-4xl mx-auto leading-relaxed mt-2">
                        실제 방문하시기 전에 360° 파노라마 뷰어로 현장 인프라와 세대별 내부 공간을 고해상도로 미리 실감나게 탐색해보세요.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto w-full flex flex-col justify-center">
                    <div className="relative bg-slate-950/40 border border-slate-200 rounded-[32px] overflow-hidden shadow-[0_32px_80px_rgba(15,23,42,0.12)] group/pano transition-all duration-500 hover:border-slate-300">
                        
                        {/* 가상 웹 브라우저 상단 장식 바 (실제 360 투어 솔루션 창 느낌을 시각화) */}
                        <div className="flex items-center justify-between px-6 py-4.5 bg-[#0B2545] border-b border-white/5 select-none text-white">
                            <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-md"></span>
                                <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 shadow-md"></span>
                                <span className="w-3.5 h-3.5 rounded-full bg-green-500/80 shadow-md"></span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-mono font-black text-[#64dfdf] uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-inner">
                                TAEWANG 360 VR ENGINE • {defaultPanoramas[activePanoIndex].title}
                            </span>
                            <div className="w-14"></div>
                        </div>

                        {/* 360 파노라마 실감형 뷰어 본체 */}
                        <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[480px]">
                            <VrViewer 
                                images={panoImages} 
                                activeIndex={activePanoIndex} 
                                onSceneChange={(idx) => setActivePanoIndex(idx)}
                                height="h-full w-full"
                                title={defaultPanoramas[activePanoIndex].title}
                                address={defaultPanoramas[activePanoIndex].address}
                            />

                            {/* 슬라이더 컨트롤 좌측 버튼 */}
                            <button 
                                onClick={() => setActivePanoIndex(prev => (prev - 1 + defaultPanoramas.length) % defaultPanoramas.length)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-slate-950/60 hover:bg-[#0B2545] hover:text-white text-white w-12 h-12 rounded-full flex items-center justify-center border border-white/10 hover:scale-110 active:scale-95 transition-all shadow-2xl"
                                aria-label="Previous Panorama Room"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            
                            {/* 슬라이더 컨트롤 우측 버튼 */}
                            <button 
                                onClick={() => setActivePanoIndex(prev => (prev + 1) % defaultPanoramas.length)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-slate-950/60 hover:bg-[#0B2545] hover:text-white text-white w-12 h-12 rounded-full flex items-center justify-center border border-white/10 hover:scale-110 active:scale-95 transition-all shadow-2xl"
                                aria-label="Next Panorama Room"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* 활성 슬라이드 하단 정보 패널 및 도트 인디케이터 */}
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none text-slate-800">
                            <div className="text-left w-full sm:w-auto">
                                <span className="text-[9px] font-black text-[#0B2545] uppercase tracking-widest block">CURRENT VR SCENE</span>
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">{defaultPanoramas[activePanoIndex].address}</h4>
                            </div>

                            <div className="flex items-center gap-2">
                                {defaultPanoramas.map((p, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setActivePanoIndex(idx)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === activePanoIndex ? 'bg-[#0B2545] scale-125 shadow-[0_0_10px_rgba(11,37,69,0.3)]' : 'bg-slate-300 hover:bg-slate-400'}`}
                                        title={p.title}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-20 w-full max-w-full overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none mb-14 flex flex-col items-center">
                        <span className="text-emerald-600 text-sm sm:text-base font-black uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                            360° VIRTUAL REALITY
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            최신 360° VR 매물
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            직접 방문하지 않아도 생생하게 공간을 체험할 수 있는 최신 360도 VR 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => {
                                setFromSection('main');
                                setActiveSection('vr-list');
                                window.scrollTo(0, 0);
                            }} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">360° 현장 VR 투어</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={vrData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal} 
                            setSelectedPostId={setSelectedPostId} 
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>
            </div>

            {/* [카테고리별 3D 슬라이드 판 & 기기별 반응형 최적화 - PC상에서는 화면을 가득 채우는 전체 화면 슬라이더 적용] */}
            <div className="w-full py-24 space-y-36">

                {/* 1. 원룸 추천 매물 구역 */}
                <div id="oneroom-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-emerald-600 text-sm sm:text-base font-black uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                            PREMIUM SELECTION
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            원룸 추천매물
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            직주근접에 탁월하며 완벽한 수리 및 리모델링이 보증된 실용적이고 특별한 원룸 추천 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('원룸추천매물', oneRoomRecommendData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">원룸추천매물</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={oneRoomRecommendData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 2. 미투 추천 매물 구역 */}
                <div id="mitu-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-[#3a506b] text-sm sm:text-base font-black uppercase tracking-widest bg-slate-100 px-5 py-2 rounded-full border border-slate-200">
                            EXCLUSIVE MITU
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            미투 추천매물
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            거실과 방이 분리된 미니투룸 구조로 공간 활용도가 극대화된 최고 평판의 미투 추천 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('미투추천매물', miRoomRecommendData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">미투추천매물</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={miRoomRecommendData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 3. 투룸/쓰리룸 특선 구역 */}
                <div id="tworoom-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-[#3a506b] text-sm sm:text-base font-black uppercase tracking-widest bg-slate-100 px-5 py-2 rounded-full border border-slate-200">
                            EXCLUSIVE SELECTIONS
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            투룸/쓰리룸 특선
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            거주 공간의 여유와 현대적 품격을 선사하는 웅장하고 거창한 프리미엄 투룸 및 쓰리룸 특선 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('투룸/쓰리룸 특선', specialData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">투룸/쓰리룸 특선</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={specialData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 4. 오피스텔 특선 구역 */}
                <div id="officetel-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-emerald-600 text-sm sm:text-base font-black uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                            PREMIUM OFFICETEL
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            오피스텔 특선
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            도심의 편리함과 고품격 인프라를 모두 갖춘 최적의 입지, 완벽하게 정비된 오피스텔 특선 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('오피스텔 특선', officetelData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">오피스텔 특선</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={officetelData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 5. 아파트 특선 구역 */}
                <div id="apartment-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-[#3a506b] text-sm sm:text-base font-black uppercase tracking-widest bg-slate-100 px-5 py-2 rounded-full border border-slate-200">
                            LUXURY APARTMENT
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            아파트 특선
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            넓고 쾌적한 주거 명작, 프리미엄 단지의 풍부한 인프라와 단독 생활의 평화로움을 전하는 아파트 특선 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('아파트 특선', apartmentData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">아파트 특선</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={apartmentData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 6. 빌라 특선 구역 */}
                <div id="villa-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-emerald-600 text-sm sm:text-base font-black uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                            SPECIAL VILLA
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            빌라 특선
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            편안하고 아늑한 생활을 위한 프리미엄 빌라 추천 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('빌라 특선', villaData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">빌라 특선</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={villaData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 7. 상가(사무실) 특선 구역 */}
                <div id="commercial-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-emerald-600 text-sm sm:text-base font-black uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                            SPECIAL COMMERCIAL
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            상가(사무실) 특선
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            성공적인 비즈니스를 위한 최적의 상가 및 사무실 추천 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('상가(사무실) 특선', commercialData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">상가(사무실) 특선</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={commercialData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 8. 원룸매매 추천 구역 */}
                <div id="oneroom-sale-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-emerald-600 text-sm sm:text-base font-black uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                            ONE-ROOM SALE
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            원룸매매 추천
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            안정적인 임대 수익을 창출할 수 있는 수익형 원룸매매 추천 매물입니다.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('원룸매매 추천', oneRoomSaleData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">원룸매매 추천</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={oneRoomSaleData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 9. 유튜브 구역 */}
                <div id="youtube-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-red-500 text-sm sm:text-base font-black uppercase tracking-widest bg-red-50 px-5 py-2 rounded-full border border-red-100">
                            YOUTUBE
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            유튜브
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            생생한 영상으로 매물 투어와 유용한 부동산 정보를 확인하세요.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('유튜브', youtubeData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">유튜브</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={youtubeData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 10. 네이버TV 구역 */}
                <div id="navertv-section" className="space-y-12 w-full scroll-mt-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-6 select-none flex flex-col items-center">
                        <span className="text-[#03c75a] text-sm sm:text-base font-black uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                            NAVER TV
                        </span>

                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mt-4">
                            네이버TV
                        </h3>

                        <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold max-w-4xl mx-auto mt-2">
                            네이버TV에서 제공하는 엄선된 매물 영상과 알짜 정보를 만나보세요.
                        </p>
                        <div className="pt-6 flex justify-center">
                            <button onClick={() => handleViewAll('네이버TV', naverTvData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-black py-4.5 px-10 sm:px-12 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg flex items-center gap-2.5">
                                지금 즉시 <span className="font-black text-[#64dfdf]">네이버TV</span> 전체보기 <ArrowUpRight className="w-5.5 h-5.5 text-[#64dfdf]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full pt-4">
                        <Carousel3D 
                            items={naverTvData} 
                            isMobile={isMobile} 
                            openPhoneSelectModal={openPhoneSelectModal}
                            setSelectedPostId={setSelectedPostId}
                            setActiveSection={setActiveSection}
                            getBlogUrl={getBlogUrl}
                            isAdminLoggedIn={isAdminLoggedIn}
                        />
                    </div>
                </div>

                {/* 하단 폼 및 가이드 영역은 기존처럼 max-w-7xl로 중앙 정렬 배치하여 가독성 유지 */}
                <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full space-y-36 pt-12">
                    {/* [상담 및 매물 등록 의뢰 신청 구역] - 백엔드 연동과 조화된 고급 폼 */}
                    <div 
                        id="direct-consulting-section" 
                        className="bg-[#1c2541] rounded-3xl p-8 sm:p-12 text-white shadow-2xl border border-white/5 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#1c2541] to-[#3a506b] opacity-40"></div>
                        
                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-4 select-none text-left">
                                <span className="text-[#64dfdf] text-xs font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/5">
                                    REAL ESTATE INQUIRY
                                </span>

                                <h3 className="text-2xl sm:text-3.5xl font-black text-white mt-2">
                                    실시간 1:1 중개 상담 신청
                                </h3>

                                <div className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium space-y-3 mt-1">
                                    <p>찾으시는 주거 형태나 임대 및 임차 관련 매물 의뢰 내용을 작성하여 보내주세요.</p>
                                    <p>구미 대표 브랜드 태왕공인중개사사무소에서 오랜 중개 실적을 증명하듯 소장님이 직접 신속하고 무결하게 전화를 드립니다.</p>
                                    <p>정직하고 성실한 자세로 고객님의 소중한 자산 형성을 정성을 다해 돕겠습니다.</p>
                                </div>

                                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-slate-400 text-[10px] font-bold">대표 번호</p>
                                        <p className="text-white text-sm sm:text-base font-black">054-455-6789</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-400 text-[10px] font-bold">소장님 직통</p>
                                        <p className="text-[#64dfdf] text-sm sm:text-base font-black">010-7590-0111</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleInquirySubmit} className="bg-white/5 p-6 sm:p-8 rounded-2xl border border-white/10 space-y-5">
                                <div className="space-y-1 text-left">
                                    <label className="text-xs font-black text-slate-300">신청인 성함</label>
                                    <input 
                                        type="text" 
                                        value={inquiryForm.name}
                                        onChange={(e) => setInquiryForm({...inquiryForm, name: e.target.value})}
                                        placeholder="성함을 입력하세요" 
                                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#64dfdf] transition-all"
                                    />
                                </div>

                                <div className="space-y-1 text-left">
                                    <label className="text-xs font-black text-slate-300">연락처</label>
                                    <input 
                                        type="text" 
                                        value={inquiryForm.phone}
                                        onChange={(e) => setInquiryForm({...inquiryForm, phone: e.target.value})}
                                        placeholder="연락처를 입력하세요" 
                                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#64dfdf] transition-all"
                                    />
                                </div>

                                <div className="space-y-1 text-left">
                                    <label className="text-xs font-black text-slate-300">상담 및 의뢰 내용</label>
                                    <textarea 
                                        value={inquiryForm.message}
                                        onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                                        rows={4}
                                        placeholder="원하시는 동네, 매물 종류, 보증금 수준 등을 자세히 입력해 주세요" 
                                        className="w-full bg-white/10 border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-white focus:outline-none focus:border-[#64dfdf] transition-all resize-none"
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full bg-white hover:bg-slate-100 text-[#1c2541] font-black text-xs sm:text-sm py-4 rounded-xl shadow-lg transition-all"
                                >
                                    중개 상담 및 매물 의뢰 신청 완료하기
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* PC 환경 전용 안내 동선 가이드 (반응형 특성 유지) */}
                    <div className="hidden lg:block bg-slate-100 border border-slate-200 rounded-2xl p-4 select-none">
                        <p className="text-slate-500 text-[11px] font-semibold leading-relaxed text-center">
                            모든 관리자용 매물 등록 및 편집 등의 조작은 오직 PC 최적화 모드에서만 초고속으로 이루어지도록 설계되어 가동되고 있습니다.
                        </p>
                    </div>
                </div>

            </div>
        
                <ViewAllModal 
                    isOpen={viewAllCategory !== null}
                    onClose={() => setViewAllCategory(null)}
                    categoryTitle={viewAllCategory || ''}
                    items={viewAllItems}
                    openPhoneSelectModal={openPhoneSelectModal}
                    setSelectedPostId={setSelectedPostId}
                    setActiveSection={setActiveSection}
                    getBlogUrl={getBlogUrl}
                    isAdminLoggedIn={isAdminLoggedIn}
                />
        </section>
    );
};

// 아임웹(imweb) 갤러리 감성의 2D 플랫 무한 루프 슬라이더 (화살표 제거, 우측에서 좌측으로 매끄럽게 흐르는 슬라이드)
const Carousel3D = ({ 
    items, 
    isMobile, 
    openPhoneSelectModal,
    setSelectedPostId,
    setActiveSection,
    getBlogUrl,
    isAdminLoggedIn
}: {
    items: any[];
    isMobile: boolean;
    openPhoneSelectModal: (e: React.MouseEvent, mobilePhone: string, ownerPhone?: string) => void;
    setSelectedPostId: (id: string) => void;
    setActiveSection: (sec: string) => void;
    getBlogUrl: (p: any, defaultUrl: string) => string;
    isAdminLoggedIn: boolean;
}) => {
    // 완벽한 무한 루프(Seamless Loop) 구성을 위해 카드를 복제하여 충분한 너비를 확보하는 알고리즘
    const repeatedItems = useMemo(() => {
        if (!items || items.length === 0) return [];
        let list = [...items];
        // 카드 수가 너무 적으면 끊길 수 있으므로 최소 8개 이상 채우기
        while (list.length < 8) {
            list = [...list, ...items];
        }
        // 좌우대칭 -50% 평행이동 시 시각적 연속성을 위해 정확히 배열을 2배 복제
        return [...list, ...list];
    }, [items]);

    const handleCardClick = (p: any) => {
        const isVideoCategory = p.category === '유튜브' || p.category === '네이버TV';
        const videoUrl = p.video || p.naverTv || p.naverBlogUrl || p.blogUrl || (String(p.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);

        if (isVideoCategory && videoUrl) {
            useAppStore.getState().setVideoPopupUrl(videoUrl);
            return;
        }

        if (!p.id.startsWith('placeholder')) {
            const customBlogUrl = p.naverBlogUrl || p.blogUrl;
            if (customBlogUrl && !isVideoCategory) {
                window.open(customBlogUrl, '_blank', 'noopener,noreferrer');
            } else {
                setSelectedPostId(p.id);
                setActiveSection('detail');
            }
        } else if (p.id.startsWith('placeholder') && (p.naverBlogUrl || p.blogUrl)) {
            window.open(p.naverBlogUrl || p.blogUrl, '_blank', 'noopener,noreferrer');
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                등록된 매물이 없습니다.
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden py-6 select-none">
            {/* 좌우 사이드 그라데이션 소프트 페이드 마스크로 고급감 극대화 */}
            <div className="absolute inset-y-0 left-0 w-8 sm:w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-8 sm:w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            <div 
                className="w-full overflow-hidden"
            >
                <div className="taewang-flow-track py-2 gap-8">
                    {repeatedItems.map((p, idx) => {
                        const customBlogUrl = p.naverBlogUrl || p.blogUrl || (String(p.remarks || '').match(/(https?:\/\/blog\.naver\.com\/[^\s]+)/)?.[1]);
                        const blogUrl = customBlogUrl || 'https://blog.naver.com/yunjia2miju';
                        const isVideoCategory = p.category === '유튜브' || p.category === '네이버TV';
                        const videoUrl = p.video || p.naverTv || p.naverBlogUrl || p.blogUrl || (String(p.remarks || '').match(/(https?:\/\/[^\s]+)/)?.[1]);

                        return (
                            <div
                                key={`${p.id}-${idx}`}
                                onClick={() => handleCardClick(p)}
                                className="w-[315px] sm:w-[360px] h-[420px] sm:h-[480px] bg-white rounded-[28px] border border-slate-200/80 shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_rgba(100,223,223,0.12)] hover:-translate-y-1.5 overflow-hidden transition-all duration-500 cursor-pointer flex flex-col justify-between shrink-0"
                            >
                                {/* 3D 효과를 배제하고 오직 평면 사진 갤러리 감성을 극대화한 프레임 - 12:9 (4:3) 썸네일로 구성 */}
                                <div className="relative aspect-[12/9] w-full bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100">
                                    <img 
                                        src={p.category === '360 VR사진' ? (p.vrThumbnail || p.thumbnail) : (p.thumbnail || p.vrThumbnail)} 
                                        alt={p.building} 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        style={{ aspectRatio: '12/9' }}
                                    />
                                    <div className="absolute top-3 left-3 flex gap-1.5">
                                        <span className="bg-[#1c2541] text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-md uppercase">
                                            {p.category}
                                        </span>
                                    </div>
                                    {isVideoCategory && (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-all duration-300">
                                            {p.category === '유튜브' ? (
                                                /* YouTube Play Button Logo */
                                                <div className="w-16 h-11 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                                                    <svg className="w-full h-full text-[#FF0000] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" />
                                                        <polygon points="9.545 8.568 15.818 12 9.545 15.432" fill="white" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                /* Naver TV Play Button Logo (Rounded Gradient Square + White Folded Ribbon) */
                                                <div className="w-14 h-14 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
                                                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                                        <defs>
                                                            <linearGradient id="naverTvLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                <stop offset="0%" stopColor="#05D975" />
                                                                <stop offset="100%" stopColor="#00CCD6" />
                                                            </linearGradient>
                                                        </defs>
                                                        {/* Rounded container with exact green-to-cyan gradient */}
                                                        <rect width="100" height="100" rx="28" fill="url(#naverTvLogoGrad)" />
                                                        
                                                        {/* White Folded Triangular Ribbon Loop */}
                                                        <g transform="translate(4, 4)">
                                                            {/* Left Pillar */}
                                                            <path d="M 30 25 C 30 19.5 33.5 17 38 19.5 L 38 80.5 C 33.5 83 30 80.5 30 75 Z" fill="#FFFFFF" opacity="0.95" />
                                                            {/* Top Diagonal */}
                                                            <path d="M 38 19.5 L 72.5 43.5 C 76.5 46.2 76.5 50.8 72.5 53.5 L 61 45.5 L 38 29.5 Z" fill="#FFFFFF" opacity="1" />
                                                            {/* Bottom Diagonal */}
                                                            <path d="M 38 80.5 L 72.5 56.5 C 76.5 53.8 76.5 49.2 72.5 46.5 L 49.5 62.5 L 38 70.5 Z" fill="#FFFFFF" opacity="0.85" />
                                                            {/* Overlapping fold covers for 3D realism */}
                                                            <path d="M 38 29.5 L 38 19.5 L 46 25 Z" fill="#EEEEEE" opacity="0.9" />
                                                            <path d="M 38 70.5 L 38 80.5 L 46 75 Z" fill="#DDDDDD" opacity="0.8" />
                                                        </g>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 상세 텍스트 및 간결하고 명확한 평면 레이아웃 - 9:12 카드 형태에 최적화된 컴팩트 여백과 세로 간격(space-y-1.5) 부여 */}
                                <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between text-left">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[190px] sm:max-w-[220px]">
                                                {p.address}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                                {p.floor || '지상층'}
                                            </span>
                                        </div>
                                        <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-[#1c2541] line-clamp-1 leading-snug">
                                            {p.building}
                                        </h4>
                                        <p className="text-[11px] font-semibold text-slate-500 line-clamp-1 leading-relaxed">
                                            {typeof p.remarks === 'string' ? p.remarks.replace(/<[^>]*>/g, '') : '체계적이고 투명한 권리분석을 통해 완벽한 안심 입주를 지원합니다.'}
                                        </p>

                                        {/* 네이버 블로그 글 수동 링크 칸 - 썸네일과 1:1 대응하여 시인성 극대화 */}
                                        <div className="bg-emerald-50/40 rounded-lg p-2 border border-emerald-100/50 flex items-center justify-between text-[11px] font-bold text-emerald-800">
                                            <span className="truncate max-w-[110px] sm:max-w-[140px] text-slate-400 font-normal">{blogUrl}</span>
                                            <a 
                                                href={blogUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-emerald-700 hover:text-emerald-950 flex items-center gap-1 shrink-0 bg-white border border-emerald-200/50 px-2 py-0.5 rounded-md transition-colors shadow-sm text-[9px]"
                                            >
                                                <span>블로그 리뷰 연결</span>
                                            </a>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                                        <div className="text-sm sm:text-base font-black text-red-500 shrink-0">
                                            {p.transactionType || '월세'} {p.price}
                                        </div>
                                        <div className="flex-grow flex items-center gap-1.5">
                                            {isVideoCategory && videoUrl ? (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        useAppStore.getState().setVideoPopupUrl(videoUrl);
                                                    }}
                                                    className="flex-1 h-9 sm:h-10 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1 border border-red-200 text-red-600 shadow-sm transition-all font-black text-[11px] sm:text-xs"
                                                    title="영상 재생 연결"
                                                >
                                                    <span>영상 재생</span>
                                                </button>
                                            ) : (
                                                <a 
                                                    href={blogUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-1 h-9 sm:h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center gap-1 border border-emerald-200 text-emerald-700 shadow-sm transition-all font-black text-[11px] sm:text-xs"
                                                    title="네이버 블로그 리뷰 연결"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                    <span>블로그</span>
                                                </a>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPhoneSelectModal(e, p.phone || '010-7590-0111', isAdminLoggedIn ? p.ownerPhone : undefined);
                                                }}
                                                className="flex-1 h-9 sm:h-10 rounded-xl bg-[#0B2545] hover:bg-[#1a385f] text-white flex items-center justify-center gap-1 border border-slate-200 shadow-sm transition-all font-black text-[11px] sm:text-xs"
                                                title="문의 전화 걸기"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>전화 문의</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            
        </div>
    );
};

