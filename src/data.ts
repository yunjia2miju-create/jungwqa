export interface Post {
    id: string;
    category: string;
    dong: string;
    building: string;
    room: string;
    floor?: string;
    totalFloor?: string;
    price: string;
    manageFee: string;
    phone: string;
    ownerPhone?: string;
    title: string;
    remarks?: string;
    thumbnail?: string;
    vrThumbnail?: string;
    intro?: string;
    body?: string;
    images?: string;
    panoImage?: string;
    panoramas?: string;
    video?: string;
    naverTv?: string;
    address: string;
    transactionType: string;
    isRecommended: boolean;
    contractPeriod?: number;
    isShortTerm?: boolean;
    fontFamily?: string;
    fontSize?: string;
    createdAt: number;
    updatedAt?: number;
    blogUrl?: string;
    naverBlogUrl?: string;
}

export interface Inquiry {
    id: string;
    name: string;
    phone: string;
    message: string;
    processed: boolean;
    createdAt: number;
}

export const gumiDongs = ["거의동", "고아읍", "공단동", "광평동", "구평동", "구포동", "금전동", "남통동", "도개면", "도량동", "무을면", "봉곡동", "부곡동", "비산동", "사곡동", "산동읍", "상모동", "선기동", "선산읍", "송정동", "수점동", "시미동", "신동", "신평동", "양호동", "오태동", "옥계동", "옥성면", "원평동", "인의동", "임수동", "임은동", "장천면", "지산동", "진평동", "해평면", "형곡동", "황상동", "칠곡군 석적읍", "칠곡군 북삼읍"];

export const defaultPosts: Post[] = [];

export const getPostNumber = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const positiveHash = Math.abs(hash);
    // Use modulo to ensure it's a 5 digit number (10000 ~ 99999)
    const fiveDigit = (positiveHash % 90000) + 10000;
    return fiveDigit.toString();
};

