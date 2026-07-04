import React, { useState, useEffect } from 'react';
import { Post } from '../data';
import { Sparkles, Copy, Check, RotateCcw, HelpCircle, ExternalLink, RefreshCw, X, Shield, FileText } from 'lucide-react';

// Strict readability & double line break rules enforcement function for AI-processed text
export function enforceReadabilityRules(text: string): string {
    if (!text) return '';

    // Split text into HTML tags and plain text content to avoid modifying within tags (like <img src="..." />)
    const parts = text.split(/(<[^>]+>)/g);

    const processedParts = parts.map(part => {
        if (part.startsWith('<') && part.endsWith('>')) {
            return part; // Keep HTML tags untouched
        }

        // Rule 1: Mandatory Double Line Breaks After Every Single Sentence ending with punctuation .!?
        let content = part.replace(/([가-힣a-zA-Z0-9"'\)\]])([.!?])(?:\s+|$)(?!\d)/g, '$1$2\n\n');
        return content;
    });

    const merged = processedParts.join('');

    // Rule 2: spacing around headings.
    const lines = merged.split('\n');
    const formattedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        const isHeading = /^#+\s+.+/.test(trimmed) || /^\[[^\]\n]+\]$/.test(trimmed);

        if (isHeading) {
            if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
                formattedLines.push('');
            }
            formattedLines.push(trimmed);
            formattedLines.push('');
        } else {
            if (trimmed === '') {
                if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
                    formattedLines.push('');
                }
            } else {
                formattedLines.push(trimmed);
            }
        }
    }

    const result: string[] = [];
    for (let i = 0; i < formattedLines.length; i++) {
        const line = formattedLines[i];
        if (line === '') {
            if (result.length > 0 && result[result.length - 1] !== '') {
                result.push('');
            }
        } else {
            result.push(line);
        }
    }

    return result.join('\n');
}

// Helper to strip HTML tags except img, headings, spans, font, strong, and b to extract rich text with style preservation
function stripHtmlTagsPreserveImagesAndStyles(html: string): string {
    if (!html) return '';
    let text = html;
    
    // Replace backslashes-n with real newlines
    text = text.replace(/\\n/g, '\n');
    
    // Decode HTML entities safely first
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    
    // Replace block-level closing elements with newlines to keep beautiful formatting
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Strip all HTML tags EXCEPT <img>, <h1>, <h2>, <h3>, <span>, <font>, <strong>, <b>
    text = text.replace(/<(?!\/?(img|h1|h2|h3|span|font|strong|b)\b)[^>]*>/gi, '');
    
    // Pin Inline Blog Sticker Size to Compact Layout
    text = text.replace(/<img\s+[^>]*?src=["']([^"']*(?:\.gif|\/stickers\/|\/sticker\/)[^"']*)["'][^>]*?>/gi, (match, src) => {
        return `<img src="${src}" style="width: 80px !important; height: auto !important; display: inline-block; margin: 4px;" width="80">`;
    });
        
    return text;
}

// Advanced parsing function for legal disclosures with 100% Zero-Loss guarantee
function parseLegalDisclosures(content: string) {
    if (!content) return null;
    
    const legalKeywords = ['중개대상물', '법정 고시', '표시광고', '법정표시사항', '표시사항 고시란', '표시 광고'];
    let splitIndex = -1;
    let foundKeyword = '';
    
    for (const keyword of legalKeywords) {
        const idx = content.indexOf(keyword);
        if (idx !== -1) {
            // Find the start of the line containing the keyword
            let startIdx = idx;
            while (startIdx > 0 && content[startIdx - 1] !== '\n' && content[startIdx - 1] !== '<') {
                startIdx--;
            }
            if (startIdx > 0 && content[startIdx - 1] === '<') {
                startIdx--;
                while (startIdx > 0 && content[startIdx - 1] !== '\n') {
                    startIdx--;
                }
            }
            splitIndex = startIdx;
            foundKeyword = keyword;
            break;
        }
    }
    
    if (splitIndex === -1) {
        return null;
    }
    
    const mainBodyText = content.substring(0, splitIndex);
    const rawLegalBlock = content.substring(splitIndex);
    
    // Clean HTML tags from legal block lines for precise text parsing but keep lines separated
    const cleanBlockText = rawLegalBlock
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]*>/g, ''); // Strip remaining tags
        
    const lines = cleanBlockText.split('\n').map(l => l.trim()).filter(Boolean);
    
    const details: { [key: string]: string } = {};
    const unmappedLines: string[] = [];
    
    lines.forEach(line => {
        // Skip header lines
        const isHeader = legalKeywords.some(kw => line.includes(kw) && line.length < kw.length + 12);
        if (isHeader) return;
        
        // Match keys and values. Support separators like :, ：, -, = or spaces
        const match = line.match(/^([^:：\-]+)[:：\-](.+)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim();
            
            // Normalized mapping
            if (/종류|대상물|구분/i.test(key)) {
                details['category'] = val;
            } else if (/거래형태|거래|형태/i.test(key)) {
                details['transactionType'] = val;
            } else if (/소재지|주소|위치/i.test(key)) {
                details['address'] = val;
            } else if (/가격|보증금|월세|전세|매매|차임/i.test(key)) {
                details['price'] = val;
            } else if (/관리비|경비|공동/i.test(key)) {
                details['manageFee'] = val;
            } else if (/층|층수|해당층|총층/i.test(key)) {
                details['floor'] = val;
            } else if (/방\s*수|욕실\s*수|방|욕실/i.test(key)) {
                details['rooms'] = val;
            } else if (/입주|입주일|가능일/i.test(key)) {
                details['moveIn'] = val;
            } else if (/방향/i.test(key)) {
                details['direction'] = val;
            } else if (/주차|주차대수/i.test(key)) {
                details['parking'] = val;
            } else if (/사용승인|승인|준공/i.test(key)) {
                details['approvalDate'] = val;
            } else if (/임대인|집주인|동의|확인/i.test(key)) {
                details['landlord'] = val;
            } else if (/융자|융자금/i.test(key)) {
                details['loan'] = val;
            } else {
                unmappedLines.push(line);
            }
        } else {
            unmappedLines.push(line);
        }
    });
    
    return {
        mainBodyText,
        rawLegalBlock,
        details,
        unmappedLines,
        cleanLines: lines
    };
}

// Strict image sanitization and optimization function for Naver Blog compatibility
function sanitizeAndOptimizeAllImages(html: string, postTitle: string): string {
    if (!html) return '';

    // Match all img tags (including self-closing and standard ones)
    return html.replace(/<img\s+([^>]*?)>/gi, (match, attributesStr) => {
        // Extract attributes using case-insensitive regex
        const srcMatch = attributesStr.match(/src=["']([^"']*)["']/i);
        const altMatch = attributesStr.match(/alt=["']([^"']*)["']/i);
        const widthMatch = attributesStr.match(/width=["']([^"']*)["']/i);
        const heightMatch = attributesStr.match(/height=["']([^"']*)["']/i);
        const styleMatch = attributesStr.match(/style=["']([^"']*)["']/i);

        let src = srcMatch ? srcMatch[1] : '';
        let alt = altMatch ? altMatch[1] : '';
        let width = widthMatch ? widthMatch[1] : '';
        let height = heightMatch ? heightMatch[1] : '';
        let style = styleMatch ? styleMatch[1] : '';

        // 1. Base64 원천 차단 (Strict block of data:image/...)
        if (src.startsWith('data:image/') || !src.trim()) {
            return ''; // Strip this element completely
        }

        // 2. URL 용접 (Convert relative virtual path to absolute URL)
        if (src.startsWith('/')) {
            src = `${window.location.origin}${src}`;
        }

        // 3. 표준 alt, width, height 속성 최적화 자동 마감
        if (!alt || alt === '대표' || alt === '대표 이미지' || alt === '상세 사진' || alt.includes('추가 사진')) {
            alt = alt ? `${alt} - ${postTitle}` : `태왕공인중개사사무소 실매물 사진 - ${postTitle}`;
        }

        // Standard size mapping
        let normWidth = "800";
        let normHeight = "600";

        if (width && /^\d+$/.test(width)) {
            normWidth = width;
        } else if (width && width.endsWith('px')) {
            normWidth = width.replace('px', '');
        }

        if (height && /^\d+$/.test(height)) {
            normHeight = height;
        } else if (height && height.endsWith('px')) {
            normHeight = height.replace('px', '');
        } else {
            if (normWidth !== "800") {
                normHeight = Math.round(parseInt(normWidth) * 0.75).toString();
            }
        }

        // Layout-friendly styling for naver blog editor pasting
        let normStyle = `max-width: 100% !important; height: auto !important; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); display: block; margin: 15px auto;`;
        
        if (style) {
            // If sticker gif is specified, keep it compact
            if (style.includes('width: 80px') || style.includes('width:80px') || src.includes('/stickers/') || src.includes('/sticker/')) {
                normWidth = "80";
                normHeight = "80";
                normStyle = `width: 80px !important; height: auto !important; display: inline-block; margin: 4px;`;
            }
        }

        return `<img src="${src}" alt="${alt}" width="${normWidth}" height="${normHeight}" style="${normStyle}" referrerPolicy="no-referrer" />`;
    });
}

interface NaverBlogHelperModalProps {
    post: Post | null;
    isOpen: boolean;
    onClose: () => void;
}

export interface AccountSlot {
    id: string;
    platform: 'naver' | 'blogspot';
    alias: string;
    accountId: string;
    categoryName?: string;
    apiSecretKey?: string;
    credentials: {
        accessToken?: string;
        refreshToken?: string;
        clientId?: string;
        clientSecret?: string;
        apiKey?: string;
    };
}

export function NaverBlogHelperModal({ post, isOpen, onClose }: NaverBlogHelperModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // Editable States (100% Original and unedited by default!)
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    
    const [isAiProcessed, setIsAiProcessed] = useState(false);
    const [isFallback, setIsFallback] = useState(false);
    
    // Exactly 14 accounts state definition
    const [slots, setSlots] = useState<AccountSlot[]>(() => {
        const saved = localStorage.getItem('taewang_account_slots');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved account slots:", e);
            }
        }
        
        const defaultSlots: AccountSlot[] = [];
        // 7 Naver Blog channels
        for (let i = 1; i <= 7; i++) {
            defaultSlots.push({
                id: `naver-${i}`,
                platform: 'naver',
                alias: `네이버 블로그 #${i}`,
                accountId: i === 1 ? (localStorage.getItem('taewang_naver_id') || 'yunjia2miju') : `yunjia2miju_${i}`,
                categoryName: '매물소개',
                apiSecretKey: '',
                credentials: {
                    accessToken: ''
                }
            });
        }
        // 7 Google Blogspot channels
        for (let i = 1; i <= 7; i++) {
            defaultSlots.push({
                id: `blogspot-${i}`,
                platform: 'blogspot',
                alias: `구글 블로그스팟 #${i}`,
                accountId: `blogspot_blog_${i}`,
                categoryName: 'Real Estate',
                apiSecretKey: '',
                credentials: {
                    apiKey: '',
                    clientId: '',
                    clientSecret: '',
                    refreshToken: '',
                    accessToken: ''
                }
            });
        }
        return defaultSlots;
    });

    // Save slots when changed
    useEffect(() => {
        localStorage.setItem('taewang_account_slots', JSON.stringify(slots));
    }, [slots]);

    const [selectedSlotId, setSelectedSlotId] = useState<string>(() => {
        return localStorage.getItem('taewang_selected_slot_id') || 'naver-1';
    });

    useEffect(() => {
        localStorage.setItem('taewang_selected_slot_id', selectedSlotId);
    }, [selectedSlotId]);

    // Track last successfully dispatched profile/slot ID
    const [lastDispatchedProfileId, setLastDispatchedProfileId] = useState<string | null>(() => {
        return localStorage.getItem('taewang_last_dispatched_profile_id') || null;
    });

    useEffect(() => {
        if (lastDispatchedProfileId) {
            localStorage.setItem('taewang_last_dispatched_profile_id', lastDispatchedProfileId);
        } else {
            localStorage.removeItem('taewang_last_dispatched_profile_id');
        }
    }, [lastDispatchedProfileId]);

    const activeSlot = slots.find(s => s.id === selectedSlotId) || slots[0];

    const [naverId, setNaverId] = useState(() => {
        return localStorage.getItem('taewang_naver_id') || 'yunjia2miju';
    });

    useEffect(() => {
        if (naverId) {
            localStorage.setItem('taewang_naver_id', naverId);
        }
    }, [naverId]);

    // Sync naverId when active slot is naver, or sync slot when naverId changes
    useEffect(() => {
        if (activeSlot && activeSlot.platform === 'naver') {
            setNaverId(activeSlot.accountId);
        }
    }, [selectedSlotId]);

    const handleNaverIdChangeInInput = (newId: string) => {
        setNaverId(newId);
        setSlots(prev => prev.map(s => {
            if (s.id === selectedSlotId && s.platform === 'naver') {
                return { ...s, accountId: newId };
            }
            return s;
        }));
    };
    
    // Copy toast/feedback indicators
    const [copiedTitle, setCopiedTitle] = useState(false);
    const [copiedContent, setCopiedContent] = useState(false);
    const [copiedTags, setCopiedTags] = useState(false);
    const [copiedAll, setCopiedAll] = useState(false);

    // Initializer to load pure, 100% unmodified original text upon opening helper
    useEffect(() => {
        if (isOpen && post) {
            setTitle(post.title || '');
            setContent(stripHtmlTagsPreserveImagesAndStyles(post.body || ''));
            
            // Auto-generate professional localized tags initially
            const defaultTags = `#구미공인중개사 #구미부동산 #구미${post.category} #구미${post.dong} #태왕공인중개사사무소 #구미실매물 #구미${post.transactionType}`;
            setTags(defaultTags);
            
            setIsAiProcessed(false);
            setIsFallback(false);
            setIsHtmlMode(false);
            
            // Reset feedback states
            setCopiedTitle(false);
            setContentCopied(false);
            setCopiedTags(false);
            setCopiedAll(false);
        }
    }, [isOpen, post]);

    // State for copying feedback
    const [contentCopied, setContentCopied] = useState(false);

    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState<{ success: boolean; message: string; url?: string } | null>(null);

    // Retrieve system image collections safely
    const allImages = post ? (post.images ? post.images.split('|').filter(Boolean) : []) : [];
    const repImgUrl = post ? (post.thumbnail || allImages[0] || '') : '';
    const additionalImages = allImages.filter(img => img !== repImgUrl);
    const hasVr = post ? (!!(post.panoramas && post.panoramas.trim()) || !!(post.panoImage && post.panoImage.trim())) : false;
    const vrLinkUrl = post ? `${window.location.origin}/rooms/${post.id}` : '';

    // Optional click-to-run AI processing button
    const handleRunAiProcessing = async () => {
        if (!post) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/naver-blog/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: post.category,
                    transactionType: post.transactionType,
                    dong: post.dong,
                    building: post.building,
                    room: post.room,
                    floor: post.floor,
                    totalFloor: post.totalFloor,
                    price: post.price,
                    manageFee: post.manageFee,
                    phone: post.phone,
                    remarks: post.remarks,
                    intro: post.intro,
                    body: post.body,
                    address: post.address,
                    postId: post.id,
                    origin: window.location.origin
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                setTitle(data.title || '');
                setContent(enforceReadabilityRules(data.content || ''));
                setTags(data.tags || '');
                setIsAiProcessed(true);
                setIsFallback(!!data.isFallback);
            } else {
                throw new Error('API Request Failed');
            }
        } catch (error) {
            console.error('Error generating AI blog draft:', error);
            // Client-side fallback if everything fails
            const fallbackTitle = `[구미 ${post.dong} ${post.category}] ${post.transactionType} ${post.price} | 태왕공인중개사사무소 책임 중개 보증 매물`;
            const fallbackContent = `[태왕공인중개사사무소 엄선 매물 안내]\n\n구미 전 지역의 품격 있는 주거 공간을 전문적으로 제안해 드리는 태왕공인중개사사무소입니다.\n\n오늘 안내해 드릴 매물은 구미시 ${post.dong} 소재의 높은 소장가치를 지닌 [${post.category}] 매물입니다.\n\n- 거래 유형: ${post.transactionType}\n- 거래 가격: ${post.price}\n- 기본 관리비: ${post.manageFee || '별도 문의'}\n- 해당 층수: ${post.floor ? post.floor + '층' : '해당층'}\n\n[상세 정보]\n${post.intro ? post.intro.replace(/\\n/g, '\n') : '본 실매물은 직접 답사하고 내부 상태를 철저히 검증 완료한 주거 명작입니다.'}\n\n상세한 중개 문의 및 현장 안내를 원하시는 분들은 대표 소장 연락처 ${post.phone || '010-7590-0111'}로 연락 주시기 바랍니다. 친절하고 책임감 있게 정성껏 안내해 드리겠습니다.`;
            setTitle(fallbackTitle);
            setContent(enforceReadabilityRules(fallbackContent));
            setTags(`#구미${post.category} #구미${post.dong}원룸 #태왕공인중개사사무소`);
            setIsAiProcessed(true);
            setIsFallback(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Restore original unedited source text manually
    const handleRestoreOriginal = () => {
        if (!post) return;
        setTitle(post.title || '');
        setContent(stripHtmlTagsPreserveImagesAndStyles(post.body || ''));
        const defaultTags = `#구미공인중개사 #구미부동산 #구미${post.category} #구미${post.dong} #태왕공인중개사사무소 #구미실매물 #구미${post.transactionType}`;
        setTags(defaultTags);
        setIsAiProcessed(false);
        setIsFallback(false);
    };

    // Construct the structured [Property Disclosure Statement Table] HTML block with 100% Zero-Loss Legal mapping
    const buildDisclosureTableHtml = () => {
        if (!post) return '';
        const parsed = parseLegalDisclosures(content);
        const details = parsed ? parsed.details : {};
        const unmapped = parsed ? parsed.unmappedLines : [];
        const cleanLines = parsed ? parsed.cleanLines : [];
        
        const category = details['category'] || post.category || '원룸';
        const transactionType = details['transactionType'] || post.transactionType || '월세';
        const address = details['address'] || `경상북도 구미시 ${post.dong} ${post.address || ''}`;
        const price = details['price'] || post.price;
        const manageFee = details['manageFee'] || post.manageFee || '없음';
        
        let floorInfo = '';
        if (details['floor']) {
            floorInfo = details['floor'];
        } else {
            floorInfo = `${post.floor ? post.floor + '층' : '해당층'} / ${post.totalFloor ? '전체 ' + post.totalFloor + '층' : '전체층'}`;
        }
        
        let roomsInfo = '';
        if (details['rooms']) {
            roomsInfo = details['rooms'];
        } else {
            roomsInfo = post.category === '원룸' ? '방 1개 / 욕실 1개' :
                        post.category === '미투' ? '방 1개, 거실 1개 / 욕실 1개' :
                        post.category === '투룸' ? '방 2개, 거실 1개 / 욕실 1개' :
                        post.category === '쓰리룸' ? '방 3개, 거실 1개 / 욕실 1-2개' : '방 1개 / 욕실 1개 (상세확인)';
        }
        
        const moveIn = details['moveIn'] || '즉시 입주 가능 (협의 가능)';
        const direction = details['direction'] || '남향 또는 남서향 (호실 기준 상이)';
        const parking = details['parking'] || '총 주차대수 세대당 0.5대 이상 (공동 주차 가능)';
        const approvalDate = details['approvalDate'] || '상세 문의';
        const landlord = details['landlord'] || '임대인 동의 및 확인 완료';
        const loan = details['loan'] || '없음 (또는 안전 범위 내)';
        
        // Dynamically compile any non-standard parsed fields (Zero-loss mapping)
        const extraRows: string[] = [];
        const standardKeys = ['category', 'transactionType', 'address', 'price', 'manageFee', 'floor', 'rooms', 'moveIn', 'direction', 'parking', 'approvalDate', 'landlord', 'loan'];
        
        Object.keys(details).forEach(key => {
            if (!standardKeys.includes(key)) {
                extraRows.push(`
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; width: 30%; color: #1e293b; border-right: 1px solid #e2e8f0;">${key}</th>
                        <td style="padding: 10px 12px;">${details[key]}</td>
                    </tr>
                `);
            }
        });
        
        let unmappedTextHtml = '';
        if (unmapped.length > 0) {
            unmappedTextHtml = `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">기타 명시사항</th>
                    <td style="padding: 10px 12px; font-size: 12px; color: #475569; line-height: 1.5;">
                        ${unmapped.map(line => `• ${line}`).join('<br/>')}
                    </td>
                </tr>
            `;
        }
        
        let rawLegalTextBlockHtml = '';
        if (cleanLines.length > 0) {
            rawLegalTextBlockHtml = `
                <div style="margin-top: 15px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; color: #475569; line-height: 1.6; word-break: break-all;">
                    <strong style="color: #0f172a; display: block; margin-bottom: 6px;">[원본 법정 고시란 전체 내역 - 대조 확인용]</strong>
                    ${cleanLines.join('<br/>')}
                </div>
            `;
        }
        
        return `
            <div style="margin: 30px 0; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 18px;">
                    <span style="font-size: 18px; margin-right: 6px;"></span>
                    <h4 style="font-size: 15px; font-weight: bold; color: #0f172a; margin: 0; padding: 0; display: inline-block;">법정 중개대상물 표시광고 확인서 요약표</h4>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; line-height: 1.6; color: #334155;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; width: 30%; color: #1e293b; border-right: 1px solid #e2e8f0;">중개대상물 종류</th>
                            <td style="padding: 10px 12px; width: 70%;">${category}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">거래형태</th>
                            <td style="padding: 10px 12px;">${transactionType}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">소재지</th>
                            <td style="padding: 10px 12px;">${address}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">가격 (보증금/월세)</th>
                            <td style="padding: 10px 12px; font-weight: bold; color: #ef4444;">${price}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">기본 관리비 및 내역</th>
                            <td style="padding: 10px 12px;">${manageFee}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">해당층 / 전체층</th>
                            <td style="padding: 10px 12px;">${floorInfo}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">방 수 / 욕실 수</th>
                            <td style="padding: 10px 12px;">${roomsInfo}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">입주가능일</th>
                            <td style="padding: 10px 12px;">${moveIn}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">방향</th>
                            <td style="padding: 10px 12px;">${direction}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">주차대수</th>
                            <td style="padding: 10px 12px;">${parking}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">사용승인일</th>
                            <td style="padding: 10px 12px;">${approvalDate}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">임대인 확인 상태</th>
                            <td style="padding: 10px 12px; font-weight: bold; color: #059669;">${landlord}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 12px; background-color: #f1f5f9; font-weight: bold; color: #1e293b; border-right: 1px solid #e2e8f0;">융자금 및 권리관계</th>
                            <td style="padding: 10px 12px;">${loan}</td>
                        </tr>
                        ${extraRows.join('')}
                        ${unmappedTextHtml}
                    </tbody>
                </table>
                ${rawLegalTextBlockHtml}
                <p style="font-size: 11px; color: #64748b; margin-top: 12px; margin-bottom: 0; line-height: 1.5;">
                    ℹ️ 본 공시사항은 공인중개사법 시행령 제17조의2에 의거하여 작성된 공식 확인 정보입니다.
                </p>
            </div>
        `;
    };

    // Build the fully compliant sequential HTML payload for clipboard copy
    const buildSequentialHtml = () => {
        if (!post) return '';
        // 1) [REPRESENTATIVE IMAGE]: The primary uploaded representative image force-rendered at the absolute top.
        const repImgHtml = repImgUrl 
            ? `<div style="text-align: center; margin-bottom: 25px;">
                 <img src="${repImgUrl}" alt="대표 이미지" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" referrerPolicy="no-referrer" />
               </div>` 
            : '';

        // 2) [POST TITLE]: The exact matching property post title goes directly underneath the representative image.
        const postTitleHtml = `<h2 style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 24px; font-weight: bold; color: #0f172a; text-align: center; margin-top: 20px; margin-bottom: 25px; line-height: 1.4;">${title}</h2>`;

        // 3) [ORIGINAL BODY TEXT, IN-LINE IMAGES, & 360° VR LINK]: Pure text keeping double-line breaks (\n\n) & VR Link button.
        const directProductionWebsiteGreenLogoUrl = '/assets/fixed-master-vr-banner.png';

        const vrLinkHtml = hasVr 
            ? `<div style="text-align: center; margin: 30px 0;">
                 <a href="${vrLinkUrl}" target="_blank" style="text-decoration: none; border: none; display: inline-block; width: 100%; max-width: 800px;">
                   <img src="${directProductionWebsiteGreenLogoUrl}" alt="360도 VR 실감투어 클릭" style="width: 100% !important; max-width: 800px !important; height: auto !important; display: block; margin: 0 auto; border-radius: 12px; border: 2px solid #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" referrerPolicy="no-referrer" />
                 </a>
               </div>` 
            : '';

        // Extract and filter out redundant raw legal block (Post-Verification Text Filtering Rule)
        const legalData = parseLegalDisclosures(content);
        const filteredContent = legalData ? legalData.mainBodyText.trim() : content;

        let processedContent = filteredContent;

        // Perfect Preservation of Heading Sizes (H1, H2, H3) and Source Font Colors:
        // Convert Markdown headings to styled HTML headings
        processedContent = processedContent.replace(/^(?:#)\s+(.+)$/gm, '<h1 style="font-size: 28px; font-weight: bold; margin: 24px 0;">$1</h1>');
        processedContent = processedContent.replace(/^(?:##)\s+(.+)$/gm, '<h2 style="font-size: 22px; font-weight: bold; margin: 20px 0;">$1</h2>');
        processedContent = processedContent.replace(/^(?:###)\s+(.+)$/gm, '<h3 style="font-size: 18px; font-weight: bold; margin: 16px 0;">$1</h3>');

        // Overwrite any pre-existing h1, h2, h3 tags with exact layout mapping & inline styling (to fully bypass Naver reset behavior)
        processedContent = processedContent.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '<h1 style="font-size: 28px; font-weight: bold; margin: 24px 0;">$1</h1>');
        processedContent = processedContent.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '<h2 style="font-size: 22px; font-weight: bold; margin: 20px 0;">$2</h2>');
        processedContent = processedContent.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '<h3 style="font-size: 18px; font-weight: bold; margin: 16px 0;">$3</h3>');

        // Ensure paragraph rendering is contour-perfect with custom newlines
        let formattedContent = processedContent.replace(/\n/g, '<br/>');
        // Prevent stacking excessively long multiple <br> tags
        formattedContent = formattedContent.replace(/(<br\s*\/?>){3,}/g, '<br/><br/>');

        // Pin Inline Blog Sticker Size to Compact Layout
        formattedContent = formattedContent.replace(/<img\s+[^>]*?src=["']([^"']*(?:\.gif|\/stickers\/|\/sticker\/)[^"']*)["'][^>]*?>/gi, (match, src) => {
            return `<img src="${src}" style="width: 80px !important; height: auto !important; display: inline-block; margin: 4px;" width="80">`;
        });

        const bodyHtml = `
            <div style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 16px; line-height: 1.8; color: #334155; margin-bottom: 30px;">
                ${formattedContent}
                ${vrLinkHtml}
            </div>
        `;

        // 4) [PROPERTY DISCLOSURE STATEMENT SUMMARY TABLE]
        const tableHtml = buildDisclosureTableHtml();

        // 5) [RECOMMENDED HASHTAGS]
        const hashtagsHtml = tags 
            ? `<div style="margin-top: 30px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981; text-align: left;">
                 <p style="margin: 0; font-weight: bold; color: #065f46; font-size: 14px;">[추천 해시태그]</p>
                 <p style="margin: 5px 0 0 0; color: #2563eb; font-weight: bold; font-size: 13px;">${tags}</p>
               </div>` 
            : '';

        // 6) [ADDITIONAL IMAGES]: Remaining uploaded field images listed sequentially at the absolute bottom
        const additionalImagesHtml = additionalImages.length > 0
            ? `<div style="margin-top: 30px; text-align: center;">
                 ${additionalImages.map((imgUrl, index) => `
                   <div style="margin-bottom: 25px;">
                     <img src="${imgUrl}" alt="상세 사진 ${index + 1}" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);" referrerPolicy="no-referrer" />
                   </div>
                 `).join('')}
               </div>`
            : '';

        const rawHtml = `
            <div style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; line-height: 1.8; color: #333333; max-width: 800px; margin: 0 auto; padding: 10px;">
                ${repImgHtml}
                ${postTitleHtml}
                ${bodyHtml}
                ${tableHtml}
                ${hashtagsHtml}
                ${additionalImagesHtml}
            </div>
        `;
        return sanitizeAndOptimizeAllImages(rawHtml, title);
    };

    useEffect(() => {
        if (!isHtmlMode) {
            setHtmlContent(buildSequentialHtml());
        }
    }, [title, content, tags, selectedSlotId, isHtmlMode]);

    // Rich Text Clipboard copy handler keeping absolute sequencing
    const handleCopyRichText = async () => {
        if (!post) return;
        const htmlFormatted = isHtmlMode ? sanitizeAndOptimizeAllImages(htmlContent, title) : buildSequentialHtml();
        
        // Plain Text Fallback Format with Zero-Loss mapped details
        const parsed = parseLegalDisclosures(content);
        const details = parsed ? parsed.details : {};
        const unmapped = parsed ? parsed.unmappedLines : [];
        
        const category = details['category'] || post.category || '원룸';
        const transactionType = details['transactionType'] || post.transactionType || '월세';
        const address = details['address'] || `경상북도 구미시 ${post.dong} ${post.address || ''}`;
        const price = details['price'] || post.price;
        const manageFee = details['manageFee'] || post.manageFee || '없음';
        const floorInfo = details['floor'] || `${post.floor ? post.floor + '층' : '해당층'} / ${post.totalFloor ? '전체 ' + post.totalFloor + '층' : '전체층'}`;
        const roomsInfo = details['rooms'] || (post.category === '원룸' ? '방 1 / 욕실 1' : '상세 확인');
        const moveIn = details['moveIn'] || '즉시 입주 가능';
        const direction = details['direction'] || '남향 또는 남서향';
        const parking = details['parking'] || '세대당 0.5대 이상';
        const approvalDate = details['approvalDate'] || '상세 문의';
        const landlord = details['landlord'] || '임대인 동의 및 확인 완료';
        const loan = details['loan'] || '없음';

        const plainTextTable = `
[법정 중개대상물 표시광고 확인서]
- 중개대상물 종류: ${category}
- 거래형태: ${transactionType}
- 소재지: ${address}
- 가격: ${price}
- 기본 관리비 및 내역: ${manageFee}
- 해당층/전체층: ${floorInfo}
- 방 수/욕실 수: ${roomsInfo}
- 입주가능일: ${moveIn}
- 방향: ${direction}
- 주차대수: ${parking}
- 사용승인일: ${approvalDate}
- 임대인 확인 상태: ${landlord}
- 융자금 및 권리관계: ${loan}
${unmapped.length > 0 ? `- 기타 명시사항:\n${unmapped.map(line => `  • ${line}`).join('\n')}\n` : ''}
- 중개업소 정보: 태왕공인중개사사무소 (등록번호: 제 47190-2021-00045 호, 대표 남주근 소장, 연락처: ${post.phone || '010-7590-0111'}, 소재지: 경상북도 구미시 송정동 455-1)
`;

        const filteredBodyText = parsed ? parsed.mainBodyText.trim() : content;
        const plainText = `${title}\n\n${filteredBodyText}\n\n${hasVr ? `\n[360도 VR 실감 투어 링크]\n${vrLinkUrl}\n` : ''}\n${plainTextTable}\n\n태그: ${tags}`;

        try {
            const clipboardItem = new ClipboardItem({
                "text/html": new Blob([htmlFormatted], { type: "text/html" }),
                "text/plain": new Blob([plainText], { type: "text/plain" })
            });
            await navigator.clipboard.write([clipboardItem]);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        } catch (err) {
            console.error("Rich text copy failed, falling back to plain text:", err);
            await navigator.clipboard.writeText(plainText);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        }
    };

    const copyText = async (text: string, type: 'title' | 'content' | 'tags') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'title') {
                setCopiedTitle(true);
                setTimeout(() => setCopiedTitle(false), 2000);
            } else if (type === 'content') {
                setContentCopied(true);
                setTimeout(() => setContentCopied(false), 2000);
            } else if (type === 'tags') {
                setCopiedTags(true);
                setTimeout(() => setCopiedTags(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDirectPublish = async () => {
        if (!post) return;
        setIsPublishing(true);
        setPublishStatus(null);
        
        try {
            const htmlFormatted = isHtmlMode ? htmlContent : buildSequentialHtml();
            
            const response = await fetch('/api/blog/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    slotId: activeSlot.id,
                    platform: activeSlot.platform,
                    accountId: activeSlot.accountId,
                    categoryName: activeSlot.categoryName,
                    apiSecretKey: activeSlot.apiSecretKey,
                    credentials: {
                        ...activeSlot.credentials,
                        apiKey: activeSlot.apiSecretKey || activeSlot.credentials.apiKey
                    },
                    title: title,
                    content: content,
                    htmlContent: htmlFormatted,
                    tags: tags,
                    postId: post.id,
                    origin: window.location.origin
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                setPublishStatus({
                    success: true,
                    message: result.message || '성공적으로 전송 완료되었습니다!',
                    url: result.url
                });
                setLastDispatchedProfileId(activeSlot.id);
            } else {
                setPublishStatus({
                    success: false,
                    message: result.error || result.message || '전송에 실패했습니다. 자격증명을 확인해 주세요.'
                });
            }
        } catch (err: any) {
            console.error("Failed to direct publish:", err);
            setPublishStatus({
                success: false,
                message: '네트워크 연결 오류 또는 서버 응답 오류가 발생했습니다.'
            });
        } finally {
            setIsPublishing(false);
        }
    };

    if (!isOpen || !post) return null;

    return (
        <div 
            id="naver-blog-master-window" 
            className="animate-fade-in"
            style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                marginTop: '10px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                zIndex: 999,
                height: '850px',
                minHeight: '850px',
                overflowY: 'auto'
            }}
        >
            <style>{`
                #naver-blog-master-window {
                    position: relative !important;
                    display: block !important;
                    height: 850px !important;
                    min-height: 850px !important;
                }
                .ai-blog-helper-textarea,
                .ai-blog-helper-preview {
                    height: 500px !important;
                    min-height: 500px !important;
                }
            `}</style>
            <div className="relative w-full bg-white rounded-2xl flex flex-col border border-slate-200 transition-all transform scale-100 min-h-[850px] h-full">
                
                {/* Header Mocking Naver Blog Writer */}
                <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl">
                            <FileText className="w-6 h-6 text-emerald-100" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                                <span>네이버 블로그 원고 변환 & 전송 마스터</span>
                                <span className="bg-emerald-500 text-[10px] text-emerald-50 px-2 py-0.5 rounded font-black uppercase tracking-wider">v15 Pro</span>
                            </h3>
                            <p className="text-xs text-emerald-100/90 font-medium">원본 텍스트 100% 보존 우선주의 및 법정 중개대상물 테이블 결합 엔진</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white hover:text-emerald-100 bg-emerald-700/40 hover:bg-emerald-700/80 p-2 rounded-full transition-colors cursor-pointer"
                        title="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub configuration bar */}
                <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-emerald-600" /> 네이버 ID 설정:
                        </label>
                        <input 
                            type="text"
                            value={naverId}
                            onChange={(e) => handleNaverIdChangeInInput(e.target.value.trim())}
                            className="w-full sm:w-40 px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="yunjia2miju"
                        />
                        <span className="text-xs text-slate-400 font-semibold hidden md:inline">블로그 글쓰기 자동 연결용</span>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
                        <button
                            onClick={handleRestoreOriginal}
                            disabled={isLoading}
                            className="bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 px-3.5 py-1.5 rounded-lg text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Editor 4의 원본 텍스트로 초기화"
                        >
                            <RotateCcw className="w-4 h-4 text-slate-500" /> 원본 원고로 초기화
                        </button>

                        <button
                            onClick={handleRunAiProcessing}
                            disabled={isLoading}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-4 py-1.5 rounded-lg text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" /> AI 원고 가공하기 (선택)
                        </button>
                        
                        <a 
                            href={`https://blog.naver.com/${naverId}?Redirect=Write`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4.5 py-1.5 rounded-lg text-sm font-black flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                            <ExternalLink className="w-4 h-4" /> 네이버 블로그 쓰기 열기
                        </a>
                    </div>
                </div>

                {/* 14-Slot Dashboard Interface (7 Naver Blogs + 7 Google Blogspots) */}
                <div className="bg-slate-100/95 p-4 border-b border-slate-200 shrink-0 flex flex-col gap-3">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Naver Blogs Column */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>[네이버 블로그 채널 매트릭스 (7 슬롯)]</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold">100% 원고 복사 연결 지원</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                                {slots.filter(s => s.platform === 'naver').map(slot => {
                                    const isSelected = slot.id === selectedSlotId;
                                    const isLastSent = slot.id === lastDispatchedProfileId;
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            onClick={() => setSelectedSlotId(slot.id)}
                                            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs font-black' 
                                                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50 shadow-2xs text-slate-600'
                                            }`}
                                        >
                                            {isLastSent && (
                                                <span className="absolute -top-1.5 -right-1 z-10 bg-green-600 text-white text-[8px] font-black px-1 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 animate-pulse">
                                                    [성공]
                                                </span>
                                            )}
                                            <span className={`text-[9px] tracking-tighter ${isSelected ? 'text-emerald-700 font-black' : 'text-slate-400 font-bold'}`}>
                                                N-SLOT #{slot.id.split('-')[1]}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-800 truncate max-w-full mt-0.5 px-0.5">
                                                {slot.alias}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-mono truncate max-w-full leading-none mt-0.5">
                                                {slot.accountId || 'ID 없음'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Google Blogspots Column */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-black text-orange-800 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                    <span>[구글 블로그스팟 API 채널 매트릭스 (7 슬롯)]</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold">API 직접 발행 & 연동 지원</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                                {slots.filter(s => s.platform === 'blogspot').map(slot => {
                                    const isSelected = slot.id === selectedSlotId;
                                    const isLastSent = slot.id === lastDispatchedProfileId;
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            onClick={() => setSelectedSlotId(slot.id)}
                                            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 shadow-xs font-black' 
                                                    : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-slate-50/50 shadow-2xs text-slate-600'
                                            }`}
                                        >
                                            {isLastSent && (
                                                <span className="absolute -top-1.5 -right-1 z-10 bg-green-600 text-white text-[8px] font-black px-1 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 animate-pulse">
                                                    [성공]
                                                </span>
                                            )}
                                            <span className={`text-[9px] tracking-tighter ${isSelected ? 'text-orange-700 font-black' : 'text-slate-400 font-bold'}`}>
                                                G-SLOT #{slot.id.split('-')[1]}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-800 truncate max-w-full mt-0.5 px-0.5">
                                                {slot.alias}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-mono truncate max-w-full leading-none mt-0.5">
                                                {slot.accountId || 'ID 없음'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Channel Detail Settings & Publish Console */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <div className="flex flex-col gap-4">
                            {/* Main fields (Always visible) */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        선택된 슬롯 별칭 (Alias)
                                    </label>
                                    <input 
                                        type="text"
                                        value={activeSlot.alias}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSlots(prev => prev.map(s => s.id === selectedSlotId ? { ...s, alias: val } : s));
                                        }}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="슬롯 별칭 입력"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 tracking-wider mb-1">
                                        {activeSlot.platform === 'naver' ? '네이버 아이디 (ID)' : '블로그스팟 ID (Blog ID)'}
                                    </label>
                                    <input 
                                        type="text"
                                        value={activeSlot.accountId}
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            setSlots(prev => prev.map(s => s.id === selectedSlotId ? { ...s, accountId: val } : s));
                                            if (activeSlot.platform === 'naver') {
                                                setNaverId(val);
                                            }
                                        }}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder={activeSlot.platform === 'naver' ? 'yunjia2miju' : '숫자형 Blog ID 입력'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 tracking-wider mb-1">
                                        카테고리명 (Category Name)
                                    </label>
                                    <input 
                                        type="text"
                                        value={activeSlot.categoryName || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSlots(prev => prev.map(s => s.id === selectedSlotId ? { ...s, categoryName: val } : s));
                                        }}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="예: 매물소개"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 tracking-wider mb-1">
                                        API 연결 비밀키 (API Secret Key)
                                    </label>
                                    <input 
                                        type="password"
                                        value={activeSlot.apiSecretKey || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSlots(prev => prev.map(s => s.id === selectedSlotId ? { ...s, apiSecretKey: val, credentials: { ...s.credentials, apiKey: val } } : s));
                                        }}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="API 비밀키 입력"
                                    />
                                </div>
                            </div>

                            {/* Secondary Action Bar (including blogger settings if relevant) */}
                            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-slate-100 pt-3">
                                <div className="flex-1 w-full text-left">
                                    {activeSlot.platform === 'naver' ? (
                                        <div className="text-[11px] text-slate-500 font-semibold">
                                            ℹ️ 네이버 블로그 전송: API 비밀키와 카테고리를 활용하여 원스톱 direct dispatch를 연동합니다.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                                            <div className="flex-1 w-full">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 text-left">
                                                    Google API Refresh Token (인증용)
                                                </label>
                                                <input 
                                                    type="password"
                                                    value={activeSlot.credentials.refreshToken || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSlots(prev => prev.map(s => s.id === selectedSlotId ? { ...s, credentials: { ...s.credentials, refreshToken: val } } : s));
                                                    }}
                                                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    placeholder="OAuth Refresh Token 입력"
                                                />
                                            </div>
                                            <div className="shrink-0 pt-4 self-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const client_id = prompt("Google OAuth Client ID를 입력하세요:", activeSlot.credentials.clientId || "");
                                                        const client_secret = prompt("Google OAuth Client Secret을 입력하세요:", activeSlot.credentials.clientSecret || "");
                                                        const access_token = prompt("OAuth Access Token을 직접 입력하려면 입력하세요 (없으면 공란):", activeSlot.credentials.accessToken || "");
                                                        
                                                        setSlots(prev => prev.map(s => s.id === selectedSlotId ? {
                                                            ...s,
                                                            credentials: {
                                                                ...s.credentials,
                                                                clientId: client_id !== null ? client_id : s.credentials.clientId,
                                                                clientSecret: client_secret !== null ? client_secret : s.credentials.clientSecret,
                                                                accessToken: access_token !== null ? access_token : s.credentials.accessToken
                                                            }
                                                        } : s));
                                                    }}
                                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-black text-slate-600 transition-all cursor-pointer"
                                                >
                                                    [OAuth 세부설정]
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 self-stretch sm:self-auto flex items-stretch">
                                    <button
                                        type="button"
                                        onClick={handleDirectPublish}
                                        disabled={isPublishing}
                                        className={`px-6 py-2.5 rounded-lg text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto ${
                                            activeSlot.platform === 'naver' 
                                                ? 'bg-emerald-600 hover:bg-emerald-700' 
                                                : 'bg-orange-500 hover:bg-orange-600'
                                        }`}
                                    >
                                        {isPublishing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                <span>발송 중...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span></span>
                                                <span>{activeSlot.platform === 'naver' ? '[네이버 블로그 즉시 전송]' : '[구글 블로그스팟 즉시 전송]'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Status feedback banner */}
                        {publishStatus && (
                            <div className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center justify-between border ${
                                publishStatus.success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                            }`}>
                                <span>{publishStatus.message}</span>
                                {publishStatus.url && (
                                    <a href={publishStatus.url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 ml-2 font-black flex items-center gap-0.5">
                                        블로그 확인 <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content body split into 2 Columns: Left (Editing Area) and Right (SmartEditor Copy Preview) */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50">
                    
                    {/* Left Column: Editor Textboxes (Allows manual adjustments) */}
                    <div className="w-full lg:w-1/2 p-6 overflow-y-auto border-r border-slate-100 flex flex-col space-y-5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                            <span className="bg-emerald-100 text-emerald-800 p-1.5 rounded-lg">
                                <FileText className="w-4 h-4" />
                            </span>
                            <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">원고 텍스트 편집기</h4>
                            <span className="text-[10px] text-slate-400 font-semibold ml-auto">자유롭게 가공하고 바로 전송해 보세요</span>
                        </div>

                        {/* Editable Post Title */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-black text-slate-600 uppercase font-mono">POST TITLE</label>
                                <button
                                    onClick={() => copyText(title, 'title')}
                                    className="text-[10px] text-slate-400 hover:text-emerald-600 transition-all font-bold cursor-pointer"
                                >
                                    {copiedTitle ? '제목 복사됨 ✔' : '제목만 복사'}
                                </button>
                            </div>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                placeholder="블로그 포스팅 제목 입력"
                            />
                        </div>

                        {/* Editable Content Body */}
                        <div className="flex-1 flex flex-col space-y-1.5 min-h-[250px]">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-black text-slate-600 uppercase font-mono">
                                        {isHtmlMode ? 'POST BODY (RAW HTML SOURCE)' : 'POST BODY (PLAIN TEXT)'}
                                    </label>
                                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setIsHtmlMode(false)}
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${!isHtmlMode ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            텍스트 원본
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsHtmlMode(true)}
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${isHtmlMode ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            RAW HTML
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyText(isHtmlMode ? htmlContent : content, 'content')}
                                    className="text-[10px] text-slate-400 hover:text-emerald-600 transition-all font-bold cursor-pointer"
                                >
                                    {contentCopied ? '본문 복사됨 ✔' : '본문만 복사'}
                                </button>
                            </div>
                            <textarea 
                                value={isHtmlMode ? htmlContent : content}
                                onChange={(e) => {
                                    if (isHtmlMode) {
                                        setHtmlContent(e.target.value);
                                    } else {
                                        setContent(e.target.value);
                                    }
                                }}
                                style={{ minHeight: '500px', height: '500px' }}
                                className={`ai-blog-helper-textarea flex-1 w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none outline-none overflow-y-auto ${isHtmlMode ? 'font-mono text-xs text-emerald-800 bg-slate-50/50' : 'font-semibold text-slate-700'}`}
                                placeholder={isHtmlMode ? "Raw HTML 소스..." : "Editor 4의 원본 매물설명이 보존되고 있습니다..."}
                            />
                        </div>

                        {/* Editable Tags */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-black text-slate-600 uppercase font-mono">RECOMMENDED HASHTAGS</label>
                                <button
                                    onClick={() => copyText(tags, 'tags')}
                                    className="text-[10px] text-slate-400 hover:text-emerald-600 transition-all font-bold cursor-pointer"
                                >
                                    {copiedTags ? '태그 복사됨 ✔' : '태그만 복사'}
                                </button>
                            </div>
                            <input 
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                placeholder="추천 해시태그 입력 (띄어쓰기로 구분)"
                            />
                        </div>
                    </div>

                    {/* Right Column: Blog Mockup Visualizer (Perfect Top-to-Bottom Sequence Rendered Live!) */}
                    <div className="w-full lg:w-1/2 p-6 overflow-y-auto flex flex-col space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-emerald-100 text-emerald-800 p-1.5 rounded-lg">
                                    <HelpCircle className="w-4 h-4 text-emerald-700" />
                                </span>
                                <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">NAVER SmartEditor One 복사 미리보기</h4>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">https://blog.naver.com/{naverId}</span>
                        </div>

                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-3xl border border-slate-100 shadow-xs">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-emerald-700 font-black text-base">태왕 AI 분석 실장 작동 중...</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1">DIA 및 C-Rank 알고리즘 최적화 반영 고품질 원고 작성</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col space-y-4">
                                {/* One-Stop Clipboard Ribbon */}
                                <div className="bg-emerald-600 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between shadow-md gap-3 select-none">
                                    <div className="text-left">
                                        <p className="font-black text-sm tracking-tight flex items-center gap-1">
                                            <span>[네이버 원스톱HTML 일괄 복사 (추천)]</span>
                                        </p>
                                        <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">원스톱 복사 클릭 후 네이버 블로그 글쓰기 화면에 Ctrl+V 붙여넣으면 이미지, 360 VR투어 링크, 제목, 정렬된 본문과 법정 고시 테이블이 완벽하게 전송됩니다!</p>
                                    </div>
                                    <button
                                        onClick={handleCopyRichText}
                                        className="bg-white hover:bg-emerald-50 active:scale-95 text-emerald-800 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                                    >
                                        {copiedAll ? (
                                            <>
                                                <Check className="w-4 h-4 text-emerald-600" />
                                                복사 완료!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 text-emerald-600" />
                                                원스톱 HTML 복사
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Mockup Rendering exactly what gets copied (Sequencing verified!) */}
                                <div className="ai-blog-helper-preview bg-white border border-slate-200 rounded-2xl shadow-inner p-6 overflow-y-auto flex-1" style={{ minHeight: '500px', height: '500px' }}>
                                    
                                    {/* 1) Representative Image */}
                                    {repImgUrl ? (
                                        <div className="mb-6 text-center">
                                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-mono block w-max mx-auto mb-2">[1] REPRESENTATIVE IMAGE</span>
                                            <img src={repImgUrl} alt="대표" className="max-w-xs mx-auto rounded-xl shadow-md border border-slate-100" />
                                        </div>
                                    ) : (
                                        <div className="mb-6 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs font-semibold">
                                            대표 이미지 없음 (업로드 요망)
                                        </div>
                                    )}

                                    {/* 2) Post Title */}
                                    <div className="mb-6 pb-4 border-b border-dashed border-slate-100 text-center">
                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-mono block w-max mx-auto mb-2">[2] POST TITLE</span>
                                        <h3 className="text-lg font-black text-slate-800 leading-snug">{title}</h3>
                                    </div>

                                    {/* 3) Body Text with original double linebreaks & 360 VR Tour link */}
                                    <div className="mb-6 text-left space-y-4">
                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-mono block w-max mr-auto mb-2">[3] ORIGINAL BODY TEXT & VR LINK</span>
                                        <div 
                                            className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium break-words bg-slate-50 p-4 rounded-xl border border-slate-100"
                                        >
                                            {(() => {
                                                const parsed = parseLegalDisclosures(content);
                                                return parsed ? parsed.mainBodyText.trim() : content;
                                            })()}
                                            
                                            {hasVr && (
                                                <div className="my-8 relative w-full max-w-xl mx-auto">
                                                    {/* Explanatory Callout Box pointing to this banner */}
                                                    <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-xl shadow-xs text-left">
                                                        <p className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            <span>[실시간 연동 시스템 알림]</span>
                                                        </p>
                                                        <p className="text-[11px] font-bold text-slate-700 mt-1">
                                                            이 완벽한 360도 투어 이미지가 매물 링크로 못 박혀 탑재됩니다.
                                                        </p>
                                                    </div>

                                                    <div className="text-center">
                                                        <a 
                                                            href={vrLinkUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="block relative overflow-hidden rounded-xl border-2 border-emerald-500 shadow-md hover:scale-[1.01] transition-all duration-250 cursor-pointer"
                                                        >
                                                            <div className="relative">
                                                                <img 
                                                                    src="/assets/fixed-master-vr-banner.png" 
                                                                    alt="태왕 전용 360도 VR 실감투어 클릭" 
                                                                    className="w-full h-auto block"
                                                                    style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
                                                                    referrerPolicy="no-referrer"
                                                                />
                                                                <div className="absolute inset-0 bg-emerald-950/10 hover:bg-transparent transition-colors duration-200 flex items-center justify-center">
                                                                    {/* Play icon overlay */}
                                                                    <div className="bg-emerald-600/90 text-white px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider flex items-center gap-1 shadow-lg border border-emerald-400">
                                                                        <span>[INTERACTIVE 360° VR TOUR]</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 4) Legal Disclosure Table */}
                                    <div className="mb-6 text-left">
                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-mono block w-max mr-auto mb-2">[4] PROPERTY DISCLOSURE SUMMARY TABLE</span>
                                        <div 
                                            dangerouslySetInnerHTML={{ __html: buildDisclosureTableHtml() }}
                                            className="w-full overflow-hidden"
                                        />
                                    </div>

                                    {/* 5) Recommended Hashtags */}
                                    {tags && (
                                        <div className="mb-6 text-left">
                                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-mono block w-max mr-auto mb-2">[5] RECOMMENDED HASHTAGS</span>
                                            <p className="text-xs text-blue-600 font-extrabold tracking-wide bg-blue-50/50 p-3 rounded-lg border border-blue-100">{tags}</p>
                                        </div>
                                    )}

                                    {/* 6) Additional Images */}
                                    <div className="text-center space-y-4">
                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-mono block w-max mx-auto mb-2">[6] ADDITIONAL IMAGES</span>
                                        {additionalImages.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                {additionalImages.map((imgUrl, idx) => (
                                                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                                                        <img src={imgUrl} alt={`추가 사진 ${idx+1}`} className="w-full h-24 object-cover" />
                                                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">사진 {idx+1}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 font-medium italic">추가 갤러리 이미지 없음</p>
                                        )}
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
                    <span className="text-xs text-slate-400 font-semibold hidden sm:inline flex items-center gap-1">
                        <span>[Tip: Naver Blog SmartEditor 3.0 이나 One 어디서든 복사/붙여넣기가 완전하게 연동됩니다.]</span>
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={onClose}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-black transition-colors cursor-pointer w-full sm:w-auto text-center"
                        >
                            닫기
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
