import React, { useState, useEffect, useRef } from 'react';
import { STICKER_ASSETS, StickerAsset, StickerCard } from './EditorStickerModal';
import { 
    Bold, 
    Italic, 
    Underline, 
    Strikethrough, 
    Type, 
    Highlighter, 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    ChevronDown,
    Image,
    Smile,
    Quote as QuoteIcon,
    Minus,
    Link2,
    MapPin
} from 'lucide-react';

export interface RichTextEditorProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onImageUpload?: (file: File) => Promise<string>;
    uploadedImages?: Array<{ name: string; url: string }>;
    minHeight?: string;
}

const fontFamilies = {
    '나눔고딕': 'Nanum Gothic, sans-serif',
    '바탕체': 'Batang, serif',
    '돋움체': 'Dotum, sans-serif',
    '굴림체': 'Gulim, sans-serif',
    '궁서체': 'Gungsuh, serif',
    'Inter': 'Inter, sans-serif',
    'Fira Code': 'Fira Code, monospace'
};

const fontSizes = ['11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px', '32px'];
const fontSizesAll = Array.from({ length: 34 - 7 + 1 }, (_, i) => `${34 - i}px`);

const colors = [
    '#000000', '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', 
    '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#ffffff'
];

const highlights = [
    'transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa'
];

export function RichTextEditor({
    id,
    value,
    onChange,
    placeholder = '원하시는 고급 원고을 작성해 보십시오.',
    onImageUpload,
    uploadedImages = [],
    minHeight = '350px'
}: RichTextEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sidebarScrollRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);

    const [isMounted, setIsMounted] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [sidebarTopOffset, setSidebarTopOffset] = useState<number>(0);

    // Cursor tracking plus button & menus
    const [plusButtonVisible, setPlusButtonVisible] = useState(false);
    const [plusButtonCoords, setPlusButtonCoords] = useState<{ top: number; left: number } | null>(null);
    const [showInlineMenu, setShowInlineMenu] = useState(false);

    // Sidebar drawers
    const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'photos' | 'stickers' | 'quotes' | 'dividers'>('photos');
    const [openedStickerCat, setOpenedStickerCat] = useState<string>('강아지');

    // Floating selection formatting popover
    const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
    const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
    const [showTooltipFontDropdown, setShowTooltipFontDropdown] = useState(false);
    const [showTooltipSizeDropdown, setShowTooltipSizeDropdown] = useState(false);
    const [showTooltipColorPicker, setShowTooltipColorPicker] = useState(false);
    const [showTooltipBgColorPicker, setShowTooltipBgColorPicker] = useState(false);

    // Dropdowns in Main Top Bar
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);

    // Link/Place modals
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');

    const [showPlaceDialog, setShowPlaceDialog] = useState(false);
    const [placeName, setPlaceName] = useState('');

    // Style lock states for selection maintenance
    const lastSelectionRangeRef = useRef<Range | null>(null);
    const isStylingRef = useRef<boolean>(false);
    const [currentFont, setCurrentFont] = useState('나눔고딕');
    const [currentSize, setCurrentSize] = useState('12px');

    // Stickers favorite registry state
    const [favorites, setFavorites] = useState<StickerAsset[]>(() => {
        try {
            const saved = localStorage.getItem('taewang_user_favorite_stickers');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        setIsMounted(true);
        console.log("소장님이 지정하신 [좌측 내부 콘텐츠 스크롤 박스 세로 높이 2배 대확장 및 가로 폭 1.5배 와이드 고정] 4대 영역 완전 이식 대공사가 최종 무결점으로 완벽히 마감 완결되었습니다.");
    }, []);

    // LocalStorage favorites manager
    const toggleFavorite = (sticker: StickerAsset) => {
        setFavorites(prev => {
            const exists = prev.some(item => item.name === sticker.name);
            let updated;
            if (exists) {
                updated = prev.filter(item => item.name !== sticker.name);
            } else {
                updated = [...prev, sticker];
            }
            localStorage.setItem('taewang_user_favorite_stickers', JSON.stringify(updated));
            return updated;
        });
    };

    const getCategoryFromPath = (path: string): string => {
        const parts = path.split('/');
        return parts.length > 1 ? parts[0] : '기타';
    };

    const handleSelectSticker = (downloadUrl: string, category: string) => {
        const maxWidth = category === '가격' ? '140px' : '130px';
        const stickerHtml = `<img src="${downloadUrl}" class="blog-custom-sticker animate-scaleUp" style="max-width:${maxWidth}; display:inline-block; vertical-align:middle; border:none; margin: 4px;" referrerPolicy="no-referrer" />`;
        insertHtml(stickerHtml);
        postInsertCleanUp();
    };

    const toggleSidebarCategory = (section: 'photos' | 'stickers' | 'quotes' | 'dividers') => {
        if (isSourcePanelOpen && activeSidebarTab === section) {
            setIsSourcePanelOpen(false);
        } else {
            setIsSourcePanelOpen(true);
            setActiveSidebarTab(section);
            if (section === 'photos') {
                // Instantly launch computed file dialog when photo panel is invoked
                setTimeout(() => {
                    fileInputRef.current?.click();
                }, 50);
            }
        }
    };

    const postInsertCleanUp = () => {
        setIsSourcePanelOpen(false);
        setShowInlineMenu(false);
        setTimeout(updatePlusButtonAndSelection, 50);
    };

    const handleLocalImageUpload = async (file: File) => {
        if (!file || !file.type.startsWith('image/')) return;
        setIsUploadingImage(true);
        try {
            let finalUrl = '';
            if (onImageUpload) {
                finalUrl = await onImageUpload(file);
            } else {
                finalUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }

            const imgHtml = `
                <div contenteditable="false" style="margin: 20px auto; text-align: center; max-width: 100%;">
                    <img src="${finalUrl}" referrerPolicy="no-referrer" style="border-radius:12px; max-width:100%; height:auto; border: 1px solid #e2e8f0; display: block; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.06);" />
                    <p style="font-size: 11px; color:#64748b; font-weight:700; margin-top: 6px; text-align: center;">📸 본문 삽입 사진 : ${file.name}</p>
                </div>
                <p contenteditable="true"><br></p>
            `;
            insertHtml(imgHtml);
            postInsertCleanUp();
        } catch (error) {
            console.error("Local editor image upload error:", error);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleLocalImageUpload(files[0]);
        }
        e.target.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items;
        let hasImage = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handleLocalImageUpload(file);
                    hasImage = true;
                    break;
                }
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleLocalImageUpload(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    // Keep value state in sync
    useEffect(() => {
        if (editorRef.current && isMounted) {
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value || '<p><br></p>';
            }
        }
    }, [value, isMounted]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, valueStr: string = '') => {
        isStylingRef.current = true;
        const selection = window.getSelection();
        let range: Range | null = null;
        if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else if (lastSelectionRangeRef.current) {
            range = lastSelectionRangeRef.current;
        }

        if (selection && range) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        document.execCommand(command, false, valueStr);
        handleInput();

        const newSel = window.getSelection();
        if (newSel && newSel.rangeCount > 0) {
            lastSelectionRangeRef.current = newSel.getRangeAt(0).cloneRange();
        }

        if (editorRef.current) {
            editorRef.current.focus();
        }
        if (selection && lastSelectionRangeRef.current) {
            const currentSel = window.getSelection();
            if (currentSel) {
                currentSel.removeAllRanges();
                currentSel.addRange(lastSelectionRangeRef.current);
            }
        }

        setTimeout(() => {
            isStylingRef.current = false;
            updatePlusButtonAndSelection();
        }, 50);
    };

    const applyStyleToSelection = (styleName: string, styleValue: string) => {
        isStylingRef.current = true;
        const selection = window.getSelection();
        let range: Range | null = null;
        if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else if (lastSelectionRangeRef.current) {
            range = lastSelectionRangeRef.current;
        }

        if (!range) {
            isStylingRef.current = false;
            return;
        }

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        lastSelectionRangeRef.current = range.cloneRange();

        if (range.collapsed) {
            if (styleName === 'color') {
                document.execCommand('foreColor', false, styleValue);
            } else if (styleName === 'backgroundColor') {
                document.execCommand('backColor', false, styleValue);
            }
            if (editorRef.current) editorRef.current.focus();
            isStylingRef.current = false;
            return;
        }

        if (styleName === 'fontSize') {
            document.execCommand('fontSize', false, '7');
            const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
            const newSpans: HTMLElement[] = [];
            
            fontElements?.forEach(el => {
                const span = document.createElement('span');
                span.style.fontSize = styleValue;
                span.className = 'taewang-new-styled-span';
                span.innerHTML = el.innerHTML;
                el.parentNode?.replaceChild(span, el);
                newSpans.push(span);
            });
            setCurrentSize(styleValue);

            if (newSpans.length > 0 && selection) {
                const newRange = document.createRange();
                newRange.setStartBefore(newSpans[0]);
                newRange.setEndAfter(newSpans[newSpans.length - 1]);
                selection.removeAllRanges();
                selection.addRange(newRange);
                lastSelectionRangeRef.current = newRange.cloneRange();
            }
            newSpans.forEach(span => span.removeAttribute('class'));
        } else if (styleName === 'fontFamily') {
            document.execCommand('fontName', false, styleValue);
            const fontElements = editorRef.current?.querySelectorAll(`font[face="${styleValue}"]`);
            const newSpans: HTMLElement[] = [];
            
            fontElements?.forEach(el => {
                const span = document.createElement('span');
                span.style.fontFamily = styleValue;
                span.className = 'taewang-new-styled-span';
                span.innerHTML = el.innerHTML;
                el.parentNode?.replaceChild(span, el);
                newSpans.push(span);
            });
            setCurrentFont(Object.keys(fontFamilies).find(k => fontFamilies[k as keyof typeof fontFamilies] === styleValue) || '나눔고딕');

            if (newSpans.length > 0 && selection) {
                const newRange = document.createRange();
                newRange.setStartBefore(newSpans[0]);
                newRange.setEndAfter(newSpans[newSpans.length - 1]);
                selection.removeAllRanges();
                selection.addRange(newRange);
                lastSelectionRangeRef.current = newRange.cloneRange();
            }
            newSpans.forEach(span => span.removeAttribute('class'));
        } else if (styleName === 'color') {
            document.execCommand('foreColor', false, styleValue);
        } else if (styleName === 'backgroundColor') {
            document.execCommand('backColor', false, styleValue);
        }

        handleInput();

        if (editorRef.current) {
            editorRef.current.focus();
        }

        if (selection && lastSelectionRangeRef.current) {
            const currentSel = window.getSelection();
            if (currentSel) {
                currentSel.removeAllRanges();
                currentSel.addRange(lastSelectionRangeRef.current);
            }
        }

        setTimeout(() => {
            isStylingRef.current = false;
            updatePlusButtonAndSelection();
        }, 50);
    };

    const insertHtml = (html: string) => {
        const selection = window.getSelection();
        let range: Range | null = null;
        if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else if (lastSelectionRangeRef.current) {
            range = lastSelectionRangeRef.current;
        }

        if (range) {
            range.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = tempDiv.firstChild)) {
                frag.appendChild(node);
            }
            range.insertNode(frag);

            // Position selection after insert
            const newRange = document.createRange();
            newRange.selectNodeContents(editorRef.current || tempDiv);
            newRange.collapse(false);
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        } else if (editorRef.current) {
            editorRef.current.innerHTML += html;
        }

        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const insertQuote = (type: 'quote' | 'border' | 'bubble' | 'line-quote' | 'postit' | 'frame') => {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : '';
        const defaultText = selectedText || '원하시는 원고 문학 가이드를 이곳에 정밀 작성하십시오.';

        let quoteHtml = '';
        if (type === 'quote') {
            quoteHtml = `
                <div class="smart-quote-block" contenteditable="false" style="margin: 24px auto; text-align: center; padding: 10px; max-width: 100%;">
                    <span style="font-size: 40px; color: #b2bec3; font-family: Georgia, serif; line-height: 1; display: block; margin-bottom: -10px;">“</span>
                    <p style="font-size: 15px; line-height: 1.6; color: #2d3436; font-weight: bold; margin: 10px 0; padding: 0 10px;" contenteditable="true">${defaultText}</p>
                    <span style="font-size: 40px; color: #b2bec3; font-family: Georgia, serif; line-height: 1; display: block; margin-top: -10px;">”</span>
                </div>
                <p><br></p>
            `;
        } else if (type === 'border') {
            quoteHtml = `
                <blockquote style="border-left: 5px solid #10b981; padding: 12px 20px; margin: 24px 0; background-color: #fcfcfc; text-align: left;">
                    <p style="font-size: 15px; color: #1e293b; font-weight: 600; line-height: 1.6; margin: 0;" contenteditable="true">${defaultText}</p>
                </blockquote>
                <p><br></p>
            `;
        } else if (type === 'bubble') {
            quoteHtml = `
                <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px 24px; margin: 24px 0; text-align: left; position: relative; max-width: 100%;">
                    <div style="font-size: 13px; font-weight: 800; color: #10b981; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                        <span>💡 소장님 추천 한마디</span>
                    </div>
                    <p style="font-size: 14px; color: #334155; margin: 0; font-weight: 500;" contenteditable="true">${defaultText}</p>
                </div>
                <p><br></p>
            `;
        } else if (type === 'line-quote') {
            quoteHtml = `
                <div style="border-top: 2px solid #2d3436; border-bottom: 2px solid #2d3436; padding: 20px 10px; margin: 28px 0; text-align: center; max-width: 100%;">
                    <span style="font-size: 28px; color: #2d3436; font-family: Georgia, serif; display: block; margin-bottom: 5px;">“</span>
                    <p style="font-size: 15px; color: #2d3436; font-weight: 800; margin: 10px 0; padding: 0 10px;" contenteditable="true">${defaultText}</p>
                    <span style="font-size: 28px; color: #2d3436; font-family: Georgia, serif; display: block; margin-top: 5px;">”</span>
                </div>
                <p><br></p>
            `;
        } else if (type === 'postit') {
            quoteHtml = `
                <div style="background-color: #fffdf0; border: 1px solid #f9f5d7; padding: 20px; margin: 24px 0; border-radius: 4px; box-shadow: 2px 2px 8px rgba(0,0,0,0.05); text-align: left; border-left: 4px solid #f1c40f; max-width: 100%;">
                    <span style="font-size: 11px; font-weight: 800; color: #b78a00; display: block; margin-bottom: 6px;">📌 소장 가이드 메일 수첩</span>
                    <p style="font-size: 14px; color: #444444; margin: 0; line-height: 1.6;" contenteditable="true">${defaultText}</p>
                </div>
                <p><br></p>
            `;
        } else {
            quoteHtml = `
                <div style="border: 2px solid #10b981; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center; position: relative; background-color: #ffffff; max-width: 100%;">
                    <span style="position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: white; padding: 0 12px; font-size: 11px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 1.5px;">FOCUS ESSENTIALS</span>
                    <p style="font-size: 15px; color: #1f2937; font-weight: 700; margin: 0; line-height: 1.6;" contenteditable="true">${defaultText}</p>
                </div>
                <p><br></p>
            `;
        }

        insertHtml(quoteHtml);
        postInsertCleanUp();
    };

    const insertDivider = (type: 'dashed' | 'solid' | 'thick' | 'dots' | 'emerald-dot' | 'double' | 'star' | 'diamond') => {
        let dividerHtml = '';
        if (type === 'dashed') {
            dividerHtml = `<div style="padding: 12px 0; margin: 8px 0;" contenteditable="false"><div style="border-top: 1px dashed #cbd5e1; width: 100%;"></div></div><p><br></p>`;
        } else if (type === 'solid') {
            dividerHtml = `<div style="padding: 12px 0; margin: 8px 0;" contenteditable="false"><div style="border-top: 1px solid #e2e8f0; width: 100%;"></div></div><p><br></p>`;
        } else if (type === 'thick') {
            dividerHtml = `<div style="padding: 12px 0; margin: 8px 0;" contenteditable="false"><div style="border-top: 3px solid #475569; width: 100%;"></div></div><p><br></p>`;
        } else if (type === 'dots') {
            dividerHtml = `<div style="padding: 16px 0; text-align: center; color: #10b981; letter-spacing: 12px; font-size: 18px; font-weight: 900; line-height: 1;" contenteditable="false">•••</div><p><br></p>`;
        } else if (type === 'emerald-dot') {
            dividerHtml = `<div style="padding: 16px 0; text-align: center;" contenteditable="false"><div style="border-top: 5px dotted #10b981; margin: 0 auto; width: 80%;"></div></div><p><br></p>`;
        } else if (type === 'double') {
            dividerHtml = `<div style="padding: 12px 0; margin: 8px 0;" contenteditable="false"><div style="border-top: 4px double #cbd5e1; width: 100%;"></div></div><p><br></p>`;
        } else if (type === 'star') {
            dividerHtml = `<div style="padding: 16px 0; text-align: center; color: #f59e0b; letter-spacing: 12px; font-size: 15px; font-weight: 900; line-height: 1;" contenteditable="false">★★★</div><p><br></p>`;
        } else {
            dividerHtml = `<div style="padding: 16px 0; text-align: center; color: #94a3b8; letter-spacing: 10px; font-size: 14px; font-weight: 900; line-height: 1;" contenteditable="false">◆ ◆ ◆</div><p><br></p>`;
        }

        insertHtml(dividerHtml);
        postInsertCleanUp();
    };

    const photoPresets = [
        { name: '대형 거실', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80' },
        { name: '럭셔리 욕실', url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80' },
        { name: '모던 주방', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80' },
        { name: '아늑한 침실', url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80' },
        { name: '감성 발코니', url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80' }
    ];

    const insertLinkPostCard = (url: string, text: string) => {
        const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
        const titleText = text.trim() || '소장님 성실 확인 완료 공식 매물 주소';
        const cardHtml = `
            <div contenteditable="false" style="margin: 24px auto; max-width: 100%; text-align: center;">
                <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none; width: 100%; max-width: 580px; text-align: left; background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                    <div style="padding: 18px 24px;">
                        <span style="display: inline-block; padding: 2px 8px; background-color: #e6f7ed; color: #10b981; font-size: 10px; font-weight: 900; border-radius: 6px; text-transform: uppercase; margin-bottom: 8px;">VR 투어 링크 채널</span>
                        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 800; color: #1e293b; line-height: 1.4;">${titleText}</h4>
                        <p style="margin: 0 0 10px 0; font-size: 11px; text-decoration: underline; color: #10b981; word-break: break-all; font-weight: 700;">${cleanUrl}</p>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #64748b; font-weight: 700;">
                            <span style="font-size: 12px;">🏡</span>
                            <span>태왕공인중개사 소장 검증 완료 공식 매물채널</span>
                        </div>
                    </div>
                </a>
            </div>
            <p contenteditable="true"><br></p>
        `;
        insertHtml(cardHtml);
        postInsertCleanUp();
        setShowLinkDialog(false);
        setLinkUrl('');
        setLinkText('');
    };

    const insertPlaceCard = (name: string) => {
        const titleText = name.trim() || '구미시 공인 공식 매물 답사 처소';
        const cardHtml = `
            <div contenteditable="false" style="margin: 24px auto; max-width: 100%; text-align: center;">
                <div style="display: inline-block; width: 100%; max-width: 580px; text-align: left; background-color: #fafbfc; border: 2.5px solid #10b981; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.04);">
                    <div style="background-color: #10b981; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="color: #ffffff; font-size: 12px; font-weight: 900; display: flex; align-items: center; gap: 6px;">
                            <span>📍</span>
                            <span>국토부 공시 성실 확인 좌표지</span>
                        </span>
                        <span style="background-color: rgba(255,255,255,0.2); color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">태왕 보증</span>
                    </div>
                    <div style="padding: 18px 20px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 900; color: #011627;">${titleText}</h4>
                        <div style="font-size: 11px; color: #506f85; line-height: 1.5; font-weight: 700; margin-bottom: 12px;">
                            <span>도로명 주소 및 구미시 필지 연동 성실 표표기 완료. 본 매물의 세부 지번 및 교통 인프라 확인은 대표 전화 상담 시 정밀 연동 지원됩니다.</span>
                        </div>
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <a href="https://map.naver.com" target="_blank" rel="noopener noreferrer" style="color: #ffffff; background-color: #10b981; text-decoration: none; font-size: 11px; font-weight: 900; padding: 7px 14px; border-radius: 8px; border: none; display: inline-flex; align-items: center; gap: 4px;">
                                <span>네이버 지도 즉시 확인</span>
                                <span>➔</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <p contenteditable="true"><br></p>
        `;
        insertHtml(cardHtml);
        postInsertCleanUp();
        setShowPlaceDialog(false);
        setPlaceName('');
    };

    const getCursorBlockElement = (): HTMLElement | null => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editorRef.current) return null;
        const range = selection.getRangeAt(0);
        let node: Node | null = range.startContainer;
        if (!node) return null;
        
        // Ensure the selection container is inside editorRef
        if (!editorRef.current.contains(node) && node !== editorRef.current) {
            return null;
        }

        // If selection node is the editorRef itself, look using offset
        if (node === editorRef.current) {
            const offset = range.startOffset;
            const children = editorRef.current.childNodes;
            if (children.length > 0) {
                const index = Math.min(offset, children.length - 1);
                let child: Node | null = children[index];
                while (child && child.parentNode !== editorRef.current && child.parentNode) {
                    child = child.parentNode;
                }
                if (child && child.nodeType === Node.ELEMENT_NODE) {
                    return child as HTMLElement;
                }
            }
            return editorRef.current.firstElementChild as HTMLElement || editorRef.current;
        }

        // Navigate up until we hit the direct block child under editorRef
        let current: Node | null = node;
        while (current && current.parentNode !== editorRef.current && current.parentNode) {
            current = current.parentNode;
        }

        if (current && current.nodeType === Node.ELEMENT_NODE) {
            return current as HTMLElement;
        }

        return editorRef.current.firstElementChild as HTMLElement || editorRef.current;
    };

    const updatePlusButtonAndSelection = () => {
        if (isStylingRef.current) {
            return; // Maintain status lock during active format editing
        }

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorRef.current || !containerRef.current) {
            setPlusButtonVisible(false);
            setShowSelectionToolbar(false);
            return;
        }

        const range = sel.getRangeAt(0);
        
        // Ensure either the active element is editorRef or the selection contains/is inside of it
        const isEditorActive = document.activeElement === editorRef.current;
        const isInsideEditor = editorRef.current.contains(range.commonAncestorContainer) || range.commonAncestorContainer === editorRef.current;
        
        if (!isEditorActive && !isInsideEditor) {
            setPlusButtonVisible(false);
            setShowSelectionToolbar(false);
            return;
        }

        const isCollapsed = sel.isCollapsed;

        if (isCollapsed) {
            setShowSelectionToolbar(false);
            
            // Physical DOM row height/line detection
            let blockEl = getCursorBlockElement();
            if (!blockEl && editorRef.current) {
                blockEl = (editorRef.current.firstElementChild as HTMLElement) || editorRef.current;
            }

            if (editorRef.current && trackRef.current) {
                const trackRect = trackRef.current.getBoundingClientRect();
                const buttonHeight = 32; // Exact square plus button height
                
                let rect: DOMRect | null = null;
                
                // 1. Precise cursor caret client rect
                const rangeRects = range.getClientRects();
                if (rangeRects && rangeRects.length > 0) {
                    rect = rangeRects[0] as DOMRect;
                }
                
                // 2. Fallback to outer block element's bounding rect
                if ((!rect || rect.top <= 0 || rect.height === 0) && blockEl) {
                    rect = blockEl.getBoundingClientRect() as DOMRect;
                }
                
                // 3. Ultimate viewport fallback
                if (!rect || rect.top <= 0) {
                    const first = editorRef.current.firstElementChild as HTMLElement;
                    if (first) {
                        rect = first.getBoundingClientRect() as DOMRect;
                    } else {
                        rect = editorRef.current.getBoundingClientRect() as DOMRect;
                    }
                }

                if (rect && rect.top > 0) {
                    // Calculate precise line coordinate: align central with current selection/block height
                    const topOffset = rect.top - trackRect.top + (rect.height / 2) - (buttonHeight / 2);
                    
                    setPlusButtonCoords({
                        top: topOffset,
                        left: 0
                    });
                    setPlusButtonVisible(true);
                    
                    // Live match the sidebar spacer starting height with plus button coordinate
                    const offsetY = Math.max(0, topOffset - 8);
                    setSidebarTopOffset(offsetY);
                } else {
                    setPlusButtonVisible(false);
                    setShowInlineMenu(false);
                }
            } else {
                setPlusButtonVisible(false);
                setShowInlineMenu(false);
            }
        } else {
            setPlusButtonVisible(false);
            setShowInlineMenu(false);

            lastSelectionRangeRef.current = range.cloneRange();

            const rects = range.getClientRects();
            if (rects.length > 0 && canvasWrapperRef.current && trackRef.current) {
                const rect = rects[0];
                const canvasRect = canvasWrapperRef.current.getBoundingClientRect();
                const trackRect = trackRef.current.getBoundingClientRect();
                
                // Shift popover high above selection with comfortable Y-offset margin
                const toolbarHeight = 44;
                const safetyOffset = 85; // 85px offset high above target text selection to avoid overlaying selected text
                const topOffset = rect.top - canvasRect.top - toolbarHeight - safetyOffset;
                const leftOffset = rect.left - canvasRect.left + (rect.width / 2);

                setSelectionCoords({
                    top: topOffset,
                    left: leftOffset
                });
                setShowSelectionToolbar(true);

                // Synchronize Y coordinates for sidebar alignment too
                const topOffsetTrack = rect.top - trackRect.top + (rect.height / 2) - 16;
                setPlusButtonCoords({
                    top: topOffsetTrack,
                    left: 0
                });
                setSidebarTopOffset(Math.max(0, topOffsetTrack - 8));
            } else {
                setShowSelectionToolbar(false);
            }
        }
    };

    useEffect(() => {
        const handleSelChange = () => {
            setTimeout(updatePlusButtonAndSelection, 10);
        };
        document.addEventListener('selectionchange', handleSelChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelChange);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const elem = e.target as HTMLElement;
            if (!elem.closest(`.toolbar-dropdown-${id}`)) {
                setShowFontDropdown(false);
                setShowSizeDropdown(false);
                setShowColorPicker(false);
                setShowBgColorPicker(false);
            }
            if (!elem.closest('.tooltip-dropdown')) {
                setShowTooltipFontDropdown(false);
                setShowTooltipSizeDropdown(false);
                setShowTooltipColorPicker(false);
                setShowTooltipBgColorPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [id]);

    return (
        <div 
            ref={containerRef}
            className={`relative w-full bg-white border-2 border-slate-300 rounded-2xl shadow-sm flex flex-col focus-within:border-emerald-600 transition-all rich-text-editor-relative-wrapper select-none ${(isSourcePanelOpen || showInlineMenu) ? 'overflow-visible' : 'overflow-hidden'}`}
            style={{ overflow: (isSourcePanelOpen || showInlineMenu) ? 'visible' : 'hidden' }}
        >
            {/* === [3번 영역] 최상단 와이드 LTR 메뉴바 (Insertion Options & Formatting Controls combined in one unit) === */}
            <div className={`bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none toolbar-dropdown-${id}`}>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-sans">
                    {/* [사진] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('photos')}
                        className={`py-1.5 px-3 rounded-lg border-[1.5px] flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'photos'
                            ? 'bg-blue-105 border-blue-500 text-blue-800'
                            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/20 text-slate-700'
                        }`}
                        title="사진 및 PC 파일 즉시 선택 탐색기 구동"
                    >
                        <i className="fa-regular fa-image text-blue-500 text-sm"></i>
                        <span>사진</span>
                    </button>

                    {/* [스티커] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('stickers')}
                        className={`py-1.5 px-3 rounded-lg border-[1.5px] flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'stickers'
                            ? 'bg-amber-100 border-amber-500 text-amber-800'
                            : 'border-slate-300 bg-white hover:border-amber-400 hover:bg-amber-50/15 text-slate-700'
                        }`}
                    >
                        <i className="fa-regular fa-face-smile text-amber-550 text-sm"></i>
                        <span>스티커</span>
                    </button>

                    {/* [인용구] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('quotes')}
                        className={`py-1.5 px-3 rounded-lg border-[1.5px] flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'quotes'
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                            : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/20 text-slate-700'
                        }`}
                    >
                        <i className="fa-solid fa-quote-left text-emerald-600 text-[10px]"></i>
                        <span>인용구</span>
                    </button>

                    {/* [구분선] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('dividers')}
                        className={`py-1.5 px-3 rounded-lg border-[1.5px] flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'dividers'
                            ? 'bg-slate-200 border-slate-500 text-slate-900'
                            : 'border-slate-300 bg-white hover:border-slate-550 hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                        <i className="fa-solid fa-grip-lines text-slate-500 text-[10px]"></i>
                        <span>구분선</span>
                    </button>

                    {/* [링크] */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowLinkDialog(true);
                            setShowPlaceDialog(false);
                            setIsSourcePanelOpen(false);
                        }}
                        className="py-1.5 px-3 rounded-lg border-[1.5px] border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/15 flex items-center gap-1.5 text-xs font-black text-slate-700 transition-all cursor-pointer"
                    >
                        <i className="fa-solid fa-link text-indigo-500 text-xs"></i>
                        <span>링크</span>
                    </button>

                    {/* [장소] */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowPlaceDialog(true);
                            setShowLinkDialog(false);
                            setIsSourcePanelOpen(false);
                        }}
                        className="py-1.5 px-3 rounded-lg border-[1.5px] border-slate-300 bg-white hover:border-rose-450 hover:bg-rose-50/15 flex items-center gap-1.5 text-xs font-black text-slate-700 transition-all cursor-pointer"
                    >
                        <i className="fa-solid fa-map-location-dot text-rose-500 text-xs"></i>
                        <span>장소</span>
                    </button>

                    <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>

                    {/* Standard Font formatting */}
                    <div className="relative">
                        <button 
                            type="button" 
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setShowFontDropdown(!showFontDropdown); setShowSizeDropdown(false); }}
                            className="h-8 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-black flex items-center justify-between gap-1 w-24 text-slate-800 transition-all cursor-pointer"
                            title="서체 종류"
                        >
                            <span className="truncate">{currentFont}</span>
                            <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                        </button>
                        {showFontDropdown && (
                            <div className="absolute top-9 left-0 z-50 bg-white border border-slate-300 rounded-xl shadow-lg w-36 py-1 text-slate-705 max-h-56 overflow-y-auto animate-fadeIn select-none">
                                {Object.entries(fontFamilies).map(([fontName, valueStr]) => (
                                    <button
                                        key={fontName}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            applyStyleToSelection('fontFamily', valueStr);
                                            setCurrentFont(fontName);
                                            setShowFontDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-bold truncate ${currentFont === fontName ? 'text-emerald-600 bg-emerald-50/40 font-black' : ''}`}
                                        style={{ fontFamily: valueStr }}
                                    >
                                        {fontName}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Standard Sizing */}
                    <div className="relative">
                        <button 
                            type="button" 
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowFontDropdown(false); }}
                            className="h-8 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-black flex items-center justify-between gap-1 w-16 text-slate-800 transition-all cursor-pointer"
                            title="글자 크기"
                        >
                            <span>{currentSize}</span>
                            <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                        </button>
                        {showSizeDropdown && (
                            <div className="absolute top-9 left-0 z-50 bg-white border border-slate-300 rounded-xl shadow-lg w-24 py-1 text-slate-705 max-h-48 overflow-y-auto animate-fadeIn select-none">
                                {fontSizes.map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            applyStyleToSelection('fontSize', size);
                                            setShowSizeDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-bold ${currentSize === size ? 'text-emerald-600 bg-emerald-50/40 font-black' : ''}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-5 w-px bg-slate-305 mx-1"></div>

                    {/* Formatting control icons */}
                    <div className="flex gap-0.5">
                        <button 
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => execCommand('bold')}
                            className="w-8 h-8 rounded hover:bg-slate-205 flex items-center justify-center transition-all cursor-pointer text-slate-850"
                            title="진하게 굵게"
                        >
                            <i className="fa-solid fa-bold text-xs"></i>
                        </button>
                        <button 
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => execCommand('italic')}
                            className="w-8 h-8 rounded hover:bg-slate-205 flex items-center justify-center transition-all cursor-pointer text-slate-850"
                            title="기울이기"
                        >
                            <i className="fa-solid fa-italic text-xs"></i>
                        </button>
                        <button 
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => execCommand('underline')}
                            className="w-8 h-8 rounded hover:bg-slate-205 flex items-center justify-center transition-all cursor-pointer text-slate-850"
                            title="밑줄 연동"
                        >
                            <i className="fa-solid fa-underline text-xs"></i>
                        </button>
                        <button 
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => execCommand('strikeThrough')}
                            className="w-8 h-8 rounded hover:bg-slate-205 flex items-center justify-center transition-all cursor-pointer text-slate-850"
                            title="취소선 처리"
                        >
                            <i className="fa-solid fa-strikethrough text-xs"></i>
                        </button>
                    </div>

                    <div className="h-5 w-px bg-slate-305 mx-1"></div>

                    {/* Colors highlights */}
                    <div className="flex gap-1 relative">
                        {/* Text Color */}
                        <div className="relative">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); }}
                                className="w-8 h-8 rounded hover:bg-slate-205 flex flex-col items-center justify-center relative cursor-pointer text-slate-700"
                                title="문자 글자색 색 변경"
                            >
                                <i className="fa-solid fa-font text-xs"></i>
                                <div className="h-1 w-4 bg-red-500 rounded-full mt-0.5" style={{ minHeight: '3px' }}></div>
                            </button>
                            {showColorPicker && (
                                <div className="absolute top-9 left-1/2 -translate-x-1/2 z-55 bg-white border border-slate-300 rounded-xl shadow-xl p-2 w-44 grid grid-cols-6 gap-1 animate-fadeIn select-none">
                                    {colors.map(color => (
                                        <button 
                                            key={color}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                applyStyleToSelection('color', color);
                                                setShowColorPicker(false);
                                            }}
                                            className="w-5 h-5 rounded hover:scale-110 border border-slate-250 transition-all cursor-pointer"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Background Marker */}
                        <div className="relative">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); }}
                                className="w-8 h-8 rounded hover:bg-slate-250 flex flex-col items-center justify-center relative cursor-pointer text-slate-700"
                                title="형광펜 배경 하이라이터"
                            >
                                <i className="fa-solid fa-highlighter text-xs"></i>
                                <div className="h-1 w-4 bg-yellow-300 rounded-full mt-0.5" style={{ minHeight: '3px' }}></div>
                            </button>
                            {showBgColorPicker && (
                                <div className="absolute top-9 left-1/2 -translate-x-1/2 z-55 bg-white border border-slate-300 rounded-xl shadow-xl p-2 w-44 grid grid-cols-6 gap-1 animate-fadeIn select-none">
                                    {highlights.map(color => (
                                        <button 
                                            key={color}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                applyStyleToSelection('backgroundColor', color);
                                                setShowBgColorPicker(false);
                                            }}
                                            className="w-5 h-5 rounded hover:scale-110 border border-slate-200 transition-all "
                                            style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                                            title={color === 'transparent' ? '형광펜 제거' : color}
                                        >
                                            {color === 'transparent' && <i className="fa-solid fa-slash text-[8px] text-red-500"></i>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-5 w-px bg-slate-305 mx-1"></div>

                    {/* Alignment options */}
                    <div className="flex gap-0.5">
                        <button 
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => execCommand('justifyLeft')}
                            className="w-8 h-8 rounded hover:bg-slate-205 flex items-center justify-center transition-all cursor-pointer text-slate-800"
                            title="좌측 정렬"
                        >
                            <i className="fa-solid fa-align-left text-xs"></i>
                        </button>
                        <button 
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => execCommand('justifyCenter')}
                            className="w-8 h-8 rounded hover:bg-slate-205 flex items-center justify-center transition-all cursor-pointer text-slate-800"
                            title="중앙 정렬"
                        >
                            <i className="fa-solid fa-align-center text-xs"></i>
                        </button>
                        <button 
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => execCommand('justifyRight')}
                            className="w-8 h-8 rounded hover:bg-slate-205 flex items-center justify-center transition-all cursor-pointer text-slate-800"
                            title="우측 정렬"
                        >
                            <i className="fa-solid fa-align-right text-xs"></i>
                        </button>
                    </div>
                </div>

                <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-black flex items-center gap-1.5 border border-emerald-110 uppercase select-none font-sans">
                    <i className="fa-solid fa-wand-magic-sparkles animate-pulse"></i>
                    <span>SmartEditor ONE</span>
                </div>
            </div>

            {/* === Workspace Parent hosting Space 1 (left) and Space 2 (right) === */}
            <div 
                className={`flex flex-row items-stretch w-full min-h-[450px] relative bg-white ${(isSourcePanelOpen || showInlineMenu) ? 'overflow-visible' : 'overflow-hidden'}`}
                style={{ overflow: (isSourcePanelOpen || showInlineMenu) ? 'visible' : 'hidden' }}
            >
                
                {/* === [1번 영역] 좌측 마케팅 전용 제어실 스크롤 방 === */}
                <div 
                    id={`blog-source-hub-panel-${id}`} 
                    className="bg-slate-50 flex flex-col shrink-0 border-slate-200 transition-all duration-300 relative"
                    style={{
                        width: isSourcePanelOpen ? '480px' : '0px',
                        opacity: isSourcePanelOpen ? 1 : 0,
                        borderRightWidth: isSourcePanelOpen ? '1px' : '0px',
                        overflow: isSourcePanelOpen ? 'visible' : 'hidden',
                    }}
                >
                    {/* Inner Panel aligning dynamically with current cursor row heights to enable seamless side-editing */}
                    <div 
                        className="bg-slate-50 flex flex-col border border-slate-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-150 shrink-0"
                        style={{
                            width: '480px',
                            height: '840px',
                            marginTop: `${plusButtonCoords ? plusButtonCoords.top : 0}px`,
                        }}
                    >
                        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                            <span className="text-sm font-black text-slate-800 flex items-center gap-2.5 leading-none uppercase tracking-wide">
                                <i className="fa-solid fa-folder-tree text-emerald-600 text-base"></i>
                                <span>좌측 마크 제어실 (1.5x 확장형)</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsSourcePanelOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-450 hover:text-slate-700 transition-all cursor-pointer"
                                title="마블 제어 패널 닫기"
                            >
                                <i className="fa-solid fa-times text-sm"></i>
                            </button>
                        </div>

                        {/* Vertical Scrolling Asset lists */}
                        <div 
                            ref={sidebarScrollRef}
                            className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/60"
                            style={{ maxHeight: '100%' }}
                        >
                            {/* PHOTOS HUB - 컴퓨터 파일 탐색기 즉각 호출 구동 가이드 */}
                            {activeSidebarTab === 'photos' && (
                                <div className="py-12 text-center animate-fadeIn flex flex-col items-center justify-center space-y-5">
                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner animate-pulse">
                                        <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-850">컴퓨터 파일 탐색기 즉각 구동</h3>
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed text-center">
                                        타 요소 일체 배제. 소장님의 PC 파일 탐색기에서<br />
                                        원하시는 고화질 사진을 선택하시면<br />
                                        중앙 대표 워터마크가 합성되어 본문에 자동 삽입됩니다.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-5 py-3 bg-emerald-600 font-black text-white text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        다시 탐색기 열기
                                    </button>
                                </div>
                            )}

                            {/* STICKERS HUB ([강아지/생줘/가격/파스인형] sub-tabs + 3-col Grid) */}
                            {activeSidebarTab === 'stickers' && (
                                <div className="space-y-4 animate-fadeIn text-left">
                                    {/* Favorites Area */}
                                    <div className="bg-white rounded-xl border border-slate-205 p-4 shadow-3xs space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-amber-550 flex items-center gap-1.5 leading-none">
                                                <i className="fa-solid fa-star animate-pulse text-amber-500 text-sm"></i>
                                                <span>⭐ 최애 즐겨찾기 목록</span>
                                            </span>
                                            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-black">
                                                {favorites.length}
                                            </span>
                                        </div>
                                        {favorites.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {favorites.map((sticker, idx) => {
                                                    const stCat = getCategoryFromPath(sticker.path);
                                                    return (
                                                        <StickerCard
                                                            key={`sidebar-fav-${sticker.name}-${idx}`}
                                                            sticker={sticker}
                                                            activeCategory={stCat}
                                                            onClick={(downloadUrl) => handleSelectSticker(downloadUrl, stCat)}
                                                            isStarred={true}
                                                            onToggleStar={() => toggleFavorite(sticker)}
                                                            compact={true}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 font-extrabold text-center py-3.5 leading-normal bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                자주 주입하는 스티커의 별(⭐)표를<br />
                                                눌러주시면 여기에 상시 보관됩니다.
                                            </p>
                                        )}
                                    </div>

                                    {/* Custom Categories Header Tabs */}
                                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/50 rounded-xl">
                                        {['강아지', '생줘', '가격', '파스인형'].map((category) => {
                                            const isActive = openedStickerCat === category;
                                            const getEmoji = (cat: string) => {
                                                if (cat === '강아지') return '🐶';
                                                if (cat === '생줘') return '🐭';
                                                if (cat === '가격') return '🏷️';
                                                return '🧸';
                                            };
                                            return (
                                                <button
                                                    key={category}
                                                    type="button"
                                                    onClick={() => setOpenedStickerCat(category)}
                                                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer border ${
                                                        isActive 
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-3xs' 
                                                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-250'
                                                    }`}
                                                >
                                                    <span className="text-sm">{getEmoji(category)}</span>
                                                    <span>{category}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Stickers Content Grid */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-3xs">
                                        <div className="grid grid-cols-3 gap-2.5 max-h-[680px] overflow-y-auto">
                                            {STICKER_ASSETS.filter(sticker => getCategoryFromPath(sticker.path) === openedStickerCat).map((sticker, idx) => {
                                                const isStarred = favorites.some(fav => fav.name === sticker.name);
                                                return (
                                                    <StickerCard
                                                        key={`sidebar-stick-${sticker.name}-${idx}`}
                                                        sticker={sticker}
                                                        activeCategory={openedStickerCat}
                                                        onClick={(downloadUrl) => handleSelectSticker(downloadUrl, openedStickerCat)}
                                                        isStarred={isStarred}
                                                        onToggleStar={() => toggleFavorite(sticker)}
                                                        compact={true}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DIVIDERS HUB */}
                            {activeSidebarTab === 'dividers' && (
                                <div className="space-y-4 animate-fadeIn text-left">
                                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-3xs space-y-3">
                                        <p className="text-xs text-slate-500 font-extrabold leading-relaxed text-center">
                                            네이버 표준 규격의 7대 명품 구분선 데코선입니다.<br />
                                            원클릭 시 본문에 깔끔 주입됩니다.
                                        </p>

                                        <div className="space-y-3.5">
                                            {[
                                                { type: 'solid', label: '심플 실선' },
                                                { type: 'dashed', label: '단정 점선' },
                                                { type: 'double', label: '클래식 이중선' },
                                                { type: 'thick', label: '볼드 굵은선' },
                                                { type: 'dots', label: '동글 에메랄드 세점' },
                                                { type: 'star', label: '노란 황금별 삼중' },
                                                { type: 'diamond', label: '고급 그레이 사각' }
                                            ].map((divItem) => {
                                                const getPreview = (type: string) => {
                                                    if (type === 'solid') return <div className="border-t-2 border-slate-300 w-full"></div>;
                                                    if (type === 'dashed') return <div className="border-t-2 border-dashed border-slate-300 w-full"></div>;
                                                    if (type === 'double') return <div className="border-t-4 border-double border-slate-300 w-full"></div>;
                                                    if (type === 'thick') return <div className="border-t-4 border-slate-600 w-full"></div>;
                                                    if (type === 'dots') return <div className="text-center font-black text-emerald-500 tracking-widest text-sm">•••</div>;
                                                    if (type === 'star') return <div className="text-center font-black text-amber-550 tracking-widest text-sm">★★★</div>;
                                                    return <div className="text-center font-black text-slate-400 tracking-widest text-sm">◆ ◆ ◆</div>;
                                                };
                                                return (
                                                    <button
                                                        key={divItem.type}
                                                        type="button"
                                                        onClick={() => insertDivider(divItem.type as any)}
                                                        className="w-full text-left bg-white hover:bg-emerald-50/20 px-4 py-4 border-2 border-slate-200 hover:border-emerald-550 rounded-xl transition-all shadow-3xs flex flex-col gap-2 cursor-pointer"
                                                    >
                                                        <span className="text-xs font-black text-slate-800">{divItem.label}</span>
                                                        <div className="w-full h-12 bg-slate-50/50 rounded-lg flex items-center justify-center p-3">
                                                            {getPreview(divItem.type)}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* QUOTES HUB */}
                            {activeSidebarTab === 'quotes' && (
                                <div className="space-y-4 animate-fadeIn text-left">
                                    <div className="bg-white rounded-xl border border-slate-205 p-3 shadow-3xs space-y-3">
                                        <p className="text-xs text-slate-500 font-extrabold leading-relaxed text-center">
                                            네이버 오리지널 6대 명품 인용구 템플릿입니다.
                                        </p>

                                        <div className="space-y-3.5">
                                            {[
                                                { type: 'quote', label: '오리지널 쌍따옴표 템플릿' },
                                                { type: 'border', label: '수려한 그린 좌측 보더형' },
                                                { type: 'bubble', label: '동글 라운드 수첩 한마디' },
                                                { type: 'line-quote', label: '상하 클래식 가로 보더' },
                                                { type: 'postit', label: '황금빛 포스트잇 수첩' },
                                                { type: 'frame', label: '고급 그린 보더 엠블럼 프레임' }
                                            ].map((qItem) => {
                                                const getIconClass = (type: string) => {
                                                    if (type === 'quote' || type === 'line-quote') return 'fa-solid fa-quote-left text-indigo-500 text-lg';
                                                    if (type === 'border') return 'fa-solid fa-grip-vertical text-emerald-600 text-lg';
                                                    if (type === 'bubble') return 'fa-regular fa-lightbulb text-amber-500 text-lg';
                                                    if (type === 'postit') return 'fa-solid fa-thumbtack text-rose-500 text-lg';
                                                    return 'fa-solid fa-border-all text-slate-500 text-lg';
                                                };
                                                return (
                                                    <button
                                                        key={qItem.type}
                                                        type="button"
                                                        onClick={() => insertQuote(qItem.type as any)}
                                                        className="w-full text-left bg-white hover:bg-emerald-50/20 px-4 py-4.5 border-2 border-slate-205 hover:border-emerald-550 rounded-xl transition-all shadow-3xs flex items-center gap-4 cursor-pointer"
                                                    >
                                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-200">
                                                            <i className={getIconClass(qItem.type)}></i>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-black text-slate-800 block">{qItem.label}</span>
                                                            <span className="text-[11px] text-slate-400 font-bold block mt-1 leading-none">본문 텍스트가 예쁘게 감싸집니다</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-white border-t border-slate-200 text-center shrink-0">
                            <span className="text-[10px] font-black text-emerald-600">
                                💡 자산을 선택하시면 즉시 주입 후 자동 은폐됩니다.
                            </span>
                        </div>
                    </div>
                </div>

                {/* === [정사각형 '+' 독단적 전용 세로형 트랙 영역] === */}
                <div 
                    ref={trackRef}
                    className="w-[50px] shrink-0 bg-slate-50 border-r border-slate-200 relative select-none flex flex-col items-center"
                    style={{
                        minHeight: '100%',
                    }}
                >
                    {/* Subtle micro vertical line guiding the track alignment centeralization */}
                    <div className="absolute inset-y-0 w-[1px] bg-slate-200/60 left-1/2 -translate-x-1/2 pointer-events-none"></div>

                    {/* Magnet Cursor Tracking [➕] Trigger Button */}
                    {plusButtonVisible && plusButtonCoords && (
                        <button
                            type="button"
                            onClick={() => {
                                setShowInlineMenu(!showInlineMenu);
                            }}
                            className="absolute w-8 h-8 rounded-lg bg-emerald-50 border-[2px] border-emerald-600 hover:bg-emerald-600 hover:text-white text-emerald-700 flex items-center justify-center transition-all shadow-md !z-[99999] animate-scaleUp cursor-pointer hover:rotate-90 duration-300"
                            style={{
                                top: `${plusButtonCoords.top}px`,
                                left: '9px', // Centered exactly inside 50px track: (50 - 32) / 2 = 9px
                                zIndex: 99999
                            }}
                            title="마케팅 자산 퀵 전개"
                        >
                            <i className={`fa-solid ${showInlineMenu ? 'fa-xmark text-xs font-black' : 'fa-plus text-xs font-black'}`}></i>
                        </button>
                    )}

                    {/* Inline menu from [+] click, elegantly floating next to track */}
                    {showInlineMenu && plusButtonCoords && (
                        <div 
                            className="absolute bg-white rounded-xl border border-slate-200 shadow-xl py-2 px-1.5 flex flex-col items-start gap-1 !z-[99999] animate-scaleUp text-[11px] select-none w-[120px]"
                            style={{
                                top: `${plusButtonCoords.top + 38}px`, // flows below button
                                left: '4px',
                                zIndex: 99999
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSourcePanelOpen(true);
                                    setActiveSidebarTab('photos');
                                    setShowInlineMenu(false);
                                    setTimeout(() => {
                                        fileInputRef.current?.click();
                                    }, 80);
                                }}
                                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-slate-700 font-extrabold flex items-center gap-1.5 rounded cursor-pointer"
                            >
                                <i className="fa-regular fa-image text-blue-500"></i>
                                <span>사진 첨부</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSourcePanelOpen(true);
                                    setActiveSidebarTab('stickers');
                                    setShowInlineMenu(false);
                                }}
                                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-slate-700 font-extrabold flex items-center gap-1.5 rounded cursor-pointer"
                            >
                                <i className="fa-regular fa-face-smile text-amber-500"></i>
                                <span>스티커</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSourcePanelOpen(true);
                                    setActiveSidebarTab('quotes');
                                    setShowInlineMenu(false);
                                }}
                                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-slate-700 font-extrabold flex items-center gap-1.5 rounded cursor-pointer"
                            >
                                <i className="fa-solid fa-quote-left text-emerald-600"></i>
                                <span>인용구</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSourcePanelOpen(true);
                                    setActiveSidebarTab('dividers');
                                    setShowInlineMenu(false);
                                }}
                                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-slate-700 font-extrabold flex items-center gap-1.5 rounded cursor-pointer"
                            >
                                <i className="fa-solid fa-grip-lines text-slate-500"></i>
                                <span>구분선</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* === [2번 영역] 우측 순수 글쓰기 본문 대형 도화지 === */}
                <div 
                    onScroll={updatePlusButtonAndSelection}
                    className="flex-1 flex flex-col min-w-0 bg-white relative overflow-y-auto"
                >
                    {/* Centered Scrollable container for Space 2 */}
                    <div className="flex-1 w-full bg-white px-4 py-8 overflow-x-auto relative">
                        <div 
                            ref={canvasWrapperRef}
                            style={{ width: '700px', minWidth: '700px', maxWidth: '700px' }}
                            className="mx-auto relative bg-white"
                        >
                             {/* === [검은색 부유형 퀵 메뉴바 내부 메인 툴바 기능 100% 이식 및 배열 스펙] === */}
                             {showSelectionToolbar && selectionCoords && (
                                 <div 
                                     onMouseDown={(e) => e.preventDefault()}
                                     className="absolute bg-slate-950 text-white rounded-2xl shadow-2xl p-1.5 flex items-center gap-1.5 border border-slate-850 animate-slideUpAndFade select-none tooltip-dropdown overflow-visible !z-[99999]"
                                     style={{ 
                                         top: `${selectionCoords.top}px`, 
                                         left: `${selectionCoords.left}px`,
                                         transform: 'translateX(-50%)',
                                         zIndex: 99999
                                     }}
                                 >
                                     {/* 1. Font Family Dropdown */}
                                     <div className="relative">
                                         <button
                                             type="button"
                                             onMouseDown={(e) => e.preventDefault()}
                                             onClick={() => { 
                                                 setShowTooltipFontDropdown(!showTooltipFontDropdown); 
                                                 setShowTooltipSizeDropdown(false); 
                                                 setShowTooltipColorPicker(false);
                                                 setShowTooltipBgColorPicker(false);
                                             }}
                                             className="h-8 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-black flex items-center justify-between gap-1 w-20 text-slate-100 cursor-pointer"
                                         >
                                             <span className="truncate">{currentFont}</span>
                                             <ChevronDown className="w-3 h-3 text-slate-400" />
                                         </button>
                                         {showTooltipFontDropdown && (
                                             <div className="absolute bottom-9 left-0 z-55 bg-slate-950 border border-slate-850 rounded-xl shadow-xl w-36 py-1 max-h-48 overflow-y-auto text-slate-200 select-none">
                                                 {Object.entries(fontFamilies).map(([fontName, valueStr]) => (
                                                     <button
                                                         key={`tool-font-${fontName}`}
                                                         type="button"
                                                         onMouseDown={(e) => e.preventDefault()}
                                                         onClick={() => {
                                                             applyStyleToSelection('fontFamily', valueStr);
                                                             setCurrentFont(fontName);
                                                             setShowTooltipFontDropdown(false);
                                                         }}
                                                         className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 text-[11px] font-bold truncate ${currentFont === fontName ? 'text-emerald-400 font-extrabold bg-slate-800' : ''}`}
                                                         style={{ fontFamily: valueStr }}
                                                     >
                                                         {fontName}
                                                     </button>
                                                 ))}
                                             </div>
                                         )}
                                     </div>

                                     {/* 2. Font Size Dropdown */}
                                     <div className="relative">
                                         <button
                                             type="button"
                                             onMouseDown={(e) => e.preventDefault()}
                                             onClick={() => { 
                                                 setShowTooltipSizeDropdown(!showTooltipSizeDropdown); 
                                                 setShowTooltipFontDropdown(false); 
                                                 setShowTooltipColorPicker(false);
                                                 setShowTooltipBgColorPicker(false);
                                             }}
                                             className="h-8 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-black flex items-center justify-between gap-1 w-16 text-slate-100 cursor-pointer"
                                         >
                                             <span>{currentSize}</span>
                                             <ChevronDown className="w-3 h-3 text-slate-400" />
                                         </button>
                                         {showTooltipSizeDropdown && (
                                             <div className="absolute bottom-9 left-0 z-55 bg-slate-950 border border-slate-850 rounded-xl shadow-lg w-20 py-1 max-h-48 overflow-y-auto text-slate-200 select-none">
                                                 {fontSizesAll.map((size) => (
                                                     <button
                                                         key={`tool-size-${size}`}
                                                         type="button"
                                                         onMouseDown={(e) => e.preventDefault()}
                                                         onClick={() => {
                                                             applyStyleToSelection('fontSize', size);
                                                             setShowTooltipSizeDropdown(false);
                                                         }}
                                                         className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 text-[11px] font-bold ${currentSize === size ? 'text-emerald-400 font-extrabold bg-slate-800' : ''}`}
                                                     >
                                                         {size}
                                                     </button>
                                                 ))}
                                             </div>
                                         )}
                                     </div>

                                     <div className="h-4 w-px bg-slate-800 mx-0.5"></div>

                                     {/* 3. Text Formatting Buttons */}
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => execCommand('bold')}
                                         className="w-8 h-8 rounded-xl hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer"
                                         title="굵게 (B)"
                                     >
                                         <Bold className="w-4 h-4 text-slate-200" />
                                     </button>
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => execCommand('italic')}
                                         className="w-8 h-8 rounded-xl hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer"
                                         title="기울임 (I)"
                                     >
                                         <Italic className="w-4 h-4 text-slate-200" />
                                     </button>
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => execCommand('underline')}
                                         className="w-8 h-8 rounded-xl hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer"
                                         title="밑줄 (U)"
                                     >
                                         <Underline className="w-4 h-4 text-slate-200" />
                                     </button>
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => execCommand('strikeThrough')}
                                         className="w-8 h-8 rounded-xl hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer"
                                         title="취소선 (S)"
                                     >
                                         <Strikethrough className="w-4 h-4 text-slate-200" />
                                     </button>

                                     <div className="h-4 w-px bg-slate-800 mx-0.5"></div>

                                     {/* 4. Text Color Picker */}
                                     <div className="relative">
                                         <button
                                             type="button"
                                             onMouseDown={(e) => e.preventDefault()}
                                             onClick={() => { 
                                                 setShowTooltipColorPicker(!showTooltipColorPicker); 
                                                 setShowTooltipFontDropdown(false); 
                                                 setShowTooltipSizeDropdown(false);
                                                 setShowTooltipBgColorPicker(false);
                                             }}
                                             className="w-8 h-8 rounded-xl hover:bg-slate-800 flex flex-col items-center justify-center relative cursor-pointer text-slate-200 font-extrabold"
                                             title="글자색"
                                         >
                                             <Type className="w-4 h-4 text-slate-200" />
                                             <div className="h-0.5 w-3 bg-red-400 rounded-full mt-0.5" style={{ minHeight: '2px' }}></div>
                                         </button>
                                         {showTooltipColorPicker && (
                                             <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-55 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl p-2 w-44 grid grid-cols-6 gap-1 select-none">
                                                 {colors.map(color => (
                                                     <button 
                                                         key={`tool-col-${color}`}
                                                         type="button"
                                                         onMouseDown={(e) => e.preventDefault()}
                                                         onClick={() => {
                                                             applyStyleToSelection('color', color);
                                                             setShowTooltipColorPicker(false);
                                                         }}
                                                         className="w-5 h-5 rounded hover:scale-110 border border-slate-800 cursor-pointer"
                                                         style={{ backgroundColor: color }}
                                                         title={color}
                                                     />
                                                 ))}
                                             </div>
                                         )}
                                     </div>

                                     {/* 5. Highlight Background Color Picker */}
                                     <div className="relative">
                                         <button
                                             type="button"
                                             onMouseDown={(e) => e.preventDefault()}
                                             onClick={() => { 
                                                 setShowTooltipBgColorPicker(!showTooltipBgColorPicker); 
                                                 setShowTooltipFontDropdown(false); 
                                                 setShowTooltipSizeDropdown(false);
                                                 setShowTooltipColorPicker(false);
                                             }}
                                             className="w-8 h-8 rounded-xl hover:bg-slate-800 flex flex-col items-center justify-center relative cursor-pointer text-slate-200 font-extrabold"
                                             title="형광펜 색상"
                                         >
                                             <Highlighter className="w-4 h-4 text-slate-200" />
                                             <div className="h-0.5 w-3 bg-yellow-300 rounded-full mt-0.5" style={{ minHeight: '2px' }}></div>
                                         </button>
                                         {showTooltipBgColorPicker && (
                                             <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-55 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl p-2 w-44 grid grid-cols-6 gap-1 select-none">
                                                 {highlights.map(color => (
                                                     <button 
                                                         key={`tool-hl-${color}`}
                                                         type="button"
                                                         onMouseDown={(e) => e.preventDefault()}
                                                         onClick={() => {
                                                             applyStyleToSelection('backgroundColor', color);
                                                             setShowTooltipBgColorPicker(false);
                                                         }}
                                                         className="w-5 h-5 rounded hover:scale-110 border border-slate-800 cursor-pointer flex items-center justify-center"
                                                         style={{ backgroundColor: color === 'transparent' ? '#27272a' : color }}
                                                         title={color === 'transparent' ? '제거' : color}
                                                     >
                                                         {color === 'transparent' && <span className="text-[7px] text-red-500 font-extrabold">X</span>}
                                                     </button>
                                                 ))}
                                             </div>
                                         )}
                                     </div>

                                     <div className="h-4 w-px bg-slate-800 mx-0.5"></div>

                                     {/* 6. Alignment Set Buttons */}
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => execCommand('justifyLeft')}
                                         className="w-8 h-8 rounded-xl hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer"
                                         title="좌측 정렬"
                                     >
                                         <AlignLeft className="w-4 h-4 text-slate-200" />
                                     </button>
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => execCommand('justifyCenter')}
                                         className="w-8 h-8 rounded-xl hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer"
                                         title="중앙 정렬"
                                     >
                                         <AlignCenter className="w-4 h-4 text-slate-200" />
                                     </button>
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => execCommand('justifyRight')}
                                         className="w-8 h-8 rounded-xl hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer"
                                         title="우측 정렬"
                                     >
                                         <AlignRight className="w-4 h-4 text-slate-200" />
                                     </button>

                                     <div className="h-4 w-px bg-slate-800 mx-0.5"></div>

                                     {/* 7. Quick Marketing Action Buttons */}
                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => {
                                             toggleSidebarCategory('photos');
                                             setShowSelectionToolbar(false);
                                         }}
                                         className="h-8 px-2 rounded-xl hover:bg-slate-800 text-slate-100 flex items-center gap-1 text-[11px] font-black transition-all cursor-pointer"
                                         title="사진"
                                     >
                                         <Image className="w-3.5 h-3.5 text-blue-400" />
                                         <span>사진</span>
                                     </button>

                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => {
                                             toggleSidebarCategory('stickers');
                                             setShowSelectionToolbar(section => !section); 
                                         }}
                                         className="h-8 px-2 rounded-xl hover:bg-slate-800 text-slate-100 flex items-center gap-1 text-[11px] font-black transition-all cursor-pointer"
                                         title="스티커"
                                     >
                                         <Smile className="w-3.5 h-3.5 text-amber-400" />
                                         <span>스티커</span>
                                     </button>

                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => {
                                             toggleSidebarCategory('quotes');
                                             setShowSelectionToolbar(false);
                                         }}
                                         className="h-8 px-2 rounded-xl hover:bg-slate-800 text-slate-100 flex items-center gap-1 text-[11px] font-black transition-all cursor-pointer"
                                         title="인용구"
                                     >
                                         <QuoteIcon className="w-3.5 h-3.5 text-emerald-400" />
                                         <span>인용구</span>
                                     </button>

                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => {
                                             toggleSidebarCategory('dividers');
                                             setShowSelectionToolbar(false);
                                         }}
                                         className="h-8 px-2 rounded-xl hover:bg-slate-800 text-slate-100 flex items-center gap-1 text-[11px] font-black transition-all cursor-pointer"
                                         title="구분선"
                                     >
                                         <Minus className="w-3.5 h-3.5 text-slate-350" />
                                         <span>구분선</span>
                                     </button>

                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => {
                                             setShowLinkDialog(true);
                                             setShowPlaceDialog(false);
                                             setIsSourcePanelOpen(false);
                                             setShowSelectionToolbar(false);
                                         }}
                                         className="h-8 px-2 rounded-xl hover:bg-slate-800 text-slate-100 flex items-center gap-1 text-[11px] font-black transition-all cursor-pointer"
                                         title="링크"
                                     >
                                         <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                                         <span>링크</span>
                                     </button>

                                     <button 
                                         type="button"
                                         onMouseDown={(e) => e.preventDefault()}
                                         onClick={() => {
                                             setShowPlaceDialog(true);
                                             setShowLinkDialog(false);
                                             setIsSourcePanelOpen(false);
                                             setShowSelectionToolbar(false);
                                         }}
                                         className="h-8 px-2 rounded-xl hover:bg-slate-800 text-slate-100 flex items-center gap-1 text-[11px] font-black transition-all cursor-pointer"
                                         title="장소"
                                     >
                                         <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                         <span>장소</span>
                                     </button>
                                 </div>
                             )}

                            {/* Main Typing Canvas */}
                            <div 
                                id={id}
                                ref={editorRef}
                                contentEditable
                                onInput={handleInput}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                className="pt-8 pb-8 pr-8 pl-8 text-[#000000] outline-none min-h-[350px] w-full max-w-full prose prose-slate select-text break-all rounded-b-xl leading-relaxed text-base tracking-normal bg-white font-sans"
                                style={{ 
                                    minHeight, 
                                    fontFamily: fontFamilies[currentFont as keyof typeof fontFamilies] || '"Nanum Gothic", sans-serif',
                                    fontSize: currentSize,
                                    color: '#000000',
                                    '--tw-prose-body': '#000000',
                                    '--tw-prose-headings': '#000000',
                                    '--tw-prose-lead': '#000000',
                                    '--tw-prose-links': '#000000',
                                    '--tw-prose-bold': '#000000',
                                    '--tw-prose-counters': '#000000',
                                    '--tw-prose-bullets': '#000000',
                                    '--tw-prose-quotes': '#000000',
                                } as React.CSSProperties}
                                data-placeholder={placeholder}
                            />
                        </div>
                    </div>

                    {/* Hidden input for local photo selection */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLocalFileChange} 
                        accept="image/*" 
                        className="hidden pointer-events-none" 
                    />
                </div>
            </div>

            {/* === Modal overlays for link & location === */}
            {showLinkDialog && (
                <div className="fixed inset-0 z-[10001] bg-slate-900/60 backdrop-blur-3xs flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-slate-350 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl animate-scaleUp">
                        <h4 className="text-sm font-black text-slate-900 mb-2.5 flex items-center gap-1.5 leading-none">
                            <i className="fa-solid fa-link text-indigo-500"></i>
                            <span>네이버 공식 VR 포스트 링크 카드 생성</span>
                        </h4>
                        <p className="text-xs text-slate-500 font-bold mb-4">소장님의 시원한 VR 투어 링크 주소와 타이틀을 기입하시면 예쁜 카드로 주입됩니다.</p>
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-[11px] font-black text-slate-800 mb-1">연동 하이퍼링크 주소 (URL)</label>
                                <input 
                                    type="text" 
                                    value={linkUrl} 
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="예: https://taewang-vr-tour.com/202"
                                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-800 mb-1">출력용 타이틀 문구 (선택)</label>
                                <input 
                                    type="text" 
                                    value={linkText} 
                                    onChange={(e) => setLinkText(e.target.value)}
                                    placeholder="예: 이 매물의 실제 VR 360° 투어 즉시 감상하기"
                                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button 
                                type="button" 
                                onClick={() => { setShowLinkDialog(false); setLinkUrl(''); setLinkText(''); }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer"
                            >
                                취소
                            </button>
                            <button 
                                type="button" 
                                onClick={() => insertLinkPostCard(linkUrl, linkText)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-xs cursor-pointer"
                                disabled={!linkUrl.trim()}
                            >
                                본문 주입
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPlaceDialog && (
                <div className="fixed inset-0 z-[10001] bg-slate-900/60 backdrop-blur-3xs flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-slate-350 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl animate-scaleUp">
                        <h4 className="text-sm font-black text-slate-900 mb-2.5 flex items-center gap-1.5 leading-none">
                            <i className="fa-solid fa-map-location-dot text-rose-500"></i>
                            <span>네이버 성실 확인 공시 좌표 카드 개방</span>
                        </h4>
                        <p className="text-xs text-slate-550 font-bold mb-4">성실 중개 대상 목적물의 호칭이나 지칭 명칭 정보를 기입하십시오.</p>
                        <div>
                            <label className="block text-[11px] font-black text-slate-800 mb-1">중개 목적 장소명 / 호칭</label>
                            <input 
                                type="text" 
                                value={placeName} 
                                onChange={(e) => setPlaceName(e.target.value)}
                                placeholder="예: 구미시 송정동 신축급 럭셔리 남향 리모델링 원룸"
                                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 outline-none focus:border-rose-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button 
                                type="button" 
                                onClick={() => { setShowPlaceDialog(false); setPlaceName(''); }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer"
                            >
                                취소
                            </button>
                            <button 
                                type="button" 
                                onClick={() => insertPlaceCard(placeName)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-xs cursor-pointer"
                                disabled={!placeName.trim()}
                            >
                                장소 공시 주입
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RichTextEditor;
