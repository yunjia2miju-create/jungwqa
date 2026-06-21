import React, { useRef, useEffect, useState } from 'react';
import EditorStickerModal, { STICKER_ASSETS, StickerAsset, StickerCard } from './EditorStickerModal';

// Helper to extract clean original file name from firebase storage URLs or general URLs
const getOriginalFileNameFromUrl = (url: string, fallbackName: string): string => {
    try {
        if (!url) return fallbackName;
        if (url.includes('firebasestorage.googleapis.com')) {
            const parts = url.split('/o/');
            if (parts.length > 1) {
                const pathWithToken = parts[1];
                const cleanPath = pathWithToken.split('?')[0];
                const decodedPath = decodeURIComponent(cleanPath);
                const fileName = decodedPath.split('/').pop() || decodedPath;
                
                // Strip the "${timestamp}_${randomStr}_" prefix if it exists
                const match = fileName.match(/^\d+_[^_]+_(.+)$/);
                if (match && match[1]) {
                    return match[1];
                }
                return fileName;
            }
        }
        const decodedUrl = decodeURIComponent(url);
        const fileName = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1).split('?')[0];
        if (fileName) {
            const match = fileName.match(/^\d+_[^_]+_(.+)$/);
            if (match && match[1]) {
                return match[1];
            }
            return fileName;
        }
        return fallbackName;
    } catch (e) {
        return fallbackName;
    }
};

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    id: string;
    uploadedImages?: { name: string; url: string }[];
    onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = '여기에 내용을 입력하세요...',
    minHeight = '250px',
    id,
    uploadedImages = [],
    onImageUpload
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sidebarScrollRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Naver SmartEditor ONE Cursor Tracking Empty Line Plus Button states
    const [plusButtonVisible, setPlusButtonVisible] = useState(false);
    const [plusButtonCoords, setPlusButtonCoords] = useState<{ top: number; left: number } | null>(null);
    const [showInlineMenu, setShowInlineMenu] = useState(false);

    // Sidebar drawers expanded state
    const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);
    const [photoExpanded, setPhotoExpanded] = useState(true);
    const [stickerExpanded, setStickerExpanded] = useState(true);
    const [quoteExpanded, setQuoteExpanded] = useState(true);
    const [dividerExpanded, setDividerExpanded] = useState(true);
    const [showFutureSlots, setShowFutureSlots] = useState(false);
    const [openedStickerCat, setOpenedStickerCat] = useState<string | null>('강아지');

    // Selection Formatting Popover States (z-index: 10000)
    const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
    const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
    const [showTooltipFontDropdown, setShowTooltipFontDropdown] = useState(false);
    const [showTooltipSizeDropdown, setShowTooltipSizeDropdown] = useState(false);
    const [showTooltipColorPicker, setShowTooltipColorPicker] = useState(false);
    const [showTooltipBgColorPicker, setShowTooltipBgColorPicker] = useState(false);

    // Dropdowns in Main Toolbar
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);

    // Interactive Custom HTML Dialogs (No window.prompt blockages)
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');

    const [showPlaceDialog, setShowPlaceDialog] = useState(false);
    const [placeName, setPlaceName] = useState('');

    // Style Default Values
    const [currentFont, setCurrentFont] = useState('나눔고딕');
    const [currentSize, setCurrentSize] = useState('12px');

    const [favorites, setFavorites] = useState<StickerAsset[]>(() => {
        try {
            const saved = localStorage.getItem('taewang_user_favorite_stickers');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

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
        const stickerHtml = `<img src="${downloadUrl}" class="blog-custom-sticker animate-scaleUp" style="max-width:${maxWidth}; display:inline-block; vertical-align:middle; border:none; margin: 4px;" />`;
        insertHtml(stickerHtml);
    };

    const toggleSidebarCategory = (section: 'photos' | 'stickers' | 'quotes' | 'dividers') => {
        setIsSourcePanelOpen(true);
        if (section === 'photos') {
            setPhotoExpanded(true);
        } else if (section === 'stickers') {
            setStickerExpanded(true);
        } else if (section === 'quotes') {
            setQuoteExpanded(true);
        } else if (section === 'dividers') {
            setDividerExpanded(true);
        }

        setTimeout(() => {
            const elem = document.getElementById(`${section}-sec-${id}`);
            if (elem && sidebarScrollRef.current) {
                elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 120);
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
        } catch (error) {
            console.error("Local editor paste or drag image upload error:", error);
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
        if (hasImage) return;

        const html = clipboardData.getData('text/html');
        const text = clipboardData.getData('text/plain');

        if (html) {
            e.preventDefault();
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                if (doc.body) {
                    const cleanElement = (el: HTMLElement) => {
                        el.removeAttribute('style');
                        el.removeAttribute('class');
                        el.removeAttribute('id');
                        el.removeAttribute('face');
                        el.removeAttribute('color');
                        el.removeAttribute('size');
                        Array.from(el.children).forEach(child => cleanElement(child as HTMLElement));
                    };
                    cleanElement(doc.body);
                    const cleanedHtml = doc.body.innerHTML;
                    insertHtml(cleanedHtml);
                }
            } catch (err) {
                console.error("Failed to cleanse pasted HTML, falling back to plain text", err);
                if (text) {
                    document.execCommand('insertText', false, text);
                }
            }
        } else if (text) {
            e.preventDefault();
            document.execCommand('insertText', false, text);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                handleLocalImageUpload(file);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        const hasFiles = e.dataTransfer?.types.includes('Files');
        if (hasFiles) {
            e.preventDefault();
        }
    };

    const fontFamilies = {
        '기본서체': 'system-ui, -apple-system, sans-serif',
        '나눔고딕': '"Nanum Gothic", sans-serif',
        '나눔명조': '"Nanum Myeongjo", serif',
        '나눔바른고딕': '"NanumBarunGothic", sans-serif',
        '나눔스퀘어': '"NanumSquare", sans-serif',
        '마루부리': '"MaruBuri", serif',
        '다시시작해': '"Nanum Da Si Si Jag Hae", cursive',
        '나눔 손글씨 펜': "'Nanum Pen Script', cursive",
        '감자꽃체': "'Gamja Flower', cursive",
        '하이멜로디': "'Hi Melody', cursive",
        '푸어스토리': "'Poor Story', cursive",
        '해바라기체': "'Sunflower', sans-serif"
    };

    const fontSizes = Array.from({ length: 34 - 7 + 1 }, (_, i) => `${34 - i}px`);

    const colors = [
        '#000000', '#1e293b', '#475569', '#64748b', '#94a3b8', '#ffffff',
        '#dc2626', '#ea580c', '#eab308', '#16a34a', '#2563eb', '#4f46e5',
        '#9333ea', '#db2777', '#059669', '#0891b2', '#f43f5e', '#10b981'
    ];

    const highlights = [
        '#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#fed7aa', '#ddd6fe',
        '#86efac', '#93c5fd', '#fda4af', '#e2e8f0', '#ffffff', 'transparent'
    ];

    // Initialize HTML on mount
    useEffect(() => {
        if (editorRef.current && !isMounted) {
            editorRef.current.innerHTML = value || '';
            setIsMounted(true);
            console.log("소장님이 지정하신 4대 핵심 실무 입력창 영역 전체에 [네이버 스마트에디터 ONE 원본 툴바 및 드래그 퀵 메뉴바] 1:1 복제 완전 이식 통합 공사가 단 한 번에 최종 마감 완결되었습니다.");
        }
    }, [value, isMounted]);

    // Update innerHTML when external value changes completely
    useEffect(() => {
        if (editorRef.current && isMounted && value !== editorRef.current.innerHTML) {
            if (document.activeElement !== editorRef.current) {
                editorRef.current.innerHTML = value || '';
            }
        }
    }, [value, isMounted]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const applyStyleToSelection = (styleName: string, styleValue: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        if (selection.isCollapsed) {
            if (styleName === 'color') {
                document.execCommand('foreColor', false, styleValue);
            } else if (styleName === 'backgroundColor') {
                document.execCommand('backColor', false, styleValue);
            }
            if (editorRef.current) editorRef.current.focus();
            return;
        }

        const range = selection.getRangeAt(0);
        const span = document.createElement('span');

        if (styleName === 'fontSize') {
            span.style.fontSize = styleValue;
            setCurrentSize(styleValue);
        } else if (styleName === 'fontFamily') {
            span.style.fontFamily = styleValue;
        } else if (styleName === 'color') {
            span.style.color = styleValue;
        } else if (styleName === 'backgroundColor') {
            span.style.backgroundColor = styleValue;
        }

        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
        } catch (e) {
            console.warn("Direct range styling fallback applied", e);
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
            // frame
            quoteHtml = `
                <div style="border: 2px solid #10b981; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center; position: relative; background-color: #ffffff; max-width: 100%;">
                    <span style="position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: white; padding: 0 12px; font-size: 11px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 1.5px;">FOCUS ESSENTIALS</span>
                    <p style="font-size: 15px; color: #1f2937; font-weight: 700; margin: 0; line-height: 1.6;" contenteditable="true">${defaultText}</p>
                </div>
                <p><br></p>
            `;
        }

        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = quoteHtml;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = tempDiv.firstChild)) {
                frag.appendChild(node);
            }
            range.insertNode(frag);
        } else if (editorRef.current) {
            editorRef.current.innerHTML += quoteHtml;
        }
        
        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
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

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = dividerHtml;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = tempDiv.firstChild)) {
                frag.appendChild(node);
            }
            range.insertNode(frag);
        } else if (editorRef.current) {
            editorRef.current.innerHTML += dividerHtml;
        }
        
        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const photoPresets = [
        { name: '대형 거실', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80' },
        { name: '럭셔리 욕실', url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80' },
        { name: '모던 주방', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80' },
        { name: '아늑한 침실', url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80' },
        { name: '감성 발코니', url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80' }
    ];

    const insertHtml = (html: string) => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = tempDiv.firstChild)) {
                frag.appendChild(node);
            }
            range.insertNode(frag);
            
            selection.removeAllRanges();
            const newRange = document.createRange();
            if (frag.lastChild) {
                newRange.selectNodeContents(frag.lastChild);
                newRange.collapse(false);
            } else {
                newRange.selectNodeContents(editorRef.current || tempDiv);
                newRange.collapse(false);
            }
            selection.addRange(newRange);
        } else if (editorRef.current) {
            editorRef.current.innerHTML += html;
        }
        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const updatePlusButtonAndSelection = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorRef.current) {
            setShowSelectionToolbar(false);
            setPlusButtonVisible(false);
            return;
        }

        const range = sel.getRangeAt(0);
        if (!editorRef.current.contains(range.commonAncestorContainer)) {
            setShowSelectionToolbar(false);
            setPlusButtonVisible(false);
            return;
        }

        // 1. Highlight Dragged Text Selection (Show Quick Toolbar)
        if (!sel.isCollapsed && sel.toString().trim().length > 0) {
            const rect = range.getBoundingClientRect();
            const container = containerRef.current;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const leftOffset = rect.left - containerRect.left + (rect.width / 2);
                const topOffset = rect.top - containerRect.top - 100;

                const halfWidth = 330; // Adequate width for the 10 formatting buttons
                let safeLeft = leftOffset;
                if (containerRect.width >= halfWidth * 2) {
                    safeLeft = Math.max(halfWidth, Math.min(containerRect.width - halfWidth, leftOffset));
                } else {
                    safeLeft = containerRect.width / 2;
                }

                setSelectionCoords({
                    top: Math.max(-50, topOffset),
                    left: safeLeft
                });
                setShowSelectionToolbar(true);
                setPlusButtonVisible(false); // Hide the cursor tracking [+] on dynamic highlighted edits
                setShowInlineMenu(false);
            }
        } 
        // 2. Clear Cursor focused on Empty Lines (Show Square [+] button)
        else if (sel.isCollapsed) {
            setShowSelectionToolbar(false);
            
            let isLineEmpty = false;
            let targetNode: HTMLElement | null = null;
            let focusNode = sel.focusNode;
            
            if (focusNode) {
                let curr: Node | null = focusNode;
                while (curr && curr !== editorRef.current) {
                    if (curr.nodeType === Node.ELEMENT_NODE) {
                        const tag = (curr as HTMLElement).tagName.toLowerCase();
                        if (['p', 'div', 'blockquote', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                            targetNode = curr as HTMLElement;
                            break;
                        }
                    }
                    curr = curr.parentNode;
                }
            }

            if (targetNode) {
                const text = targetNode.textContent || '';
                if (text.trim() === '' && targetNode.getElementsByTagName('img').length === 0) {
                    isLineEmpty = true;
                }
            } else {
                const text = editorRef.current.textContent || '';
                if (text.trim() === '' && editorRef.current.getElementsByTagName('img').length === 0) {
                    isLineEmpty = true;
                    targetNode = editorRef.current;
                }
            }

            if (isLineEmpty && targetNode && containerRef.current) {
                const blockRect = targetNode.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                
                // Align vertically centered to the empty line, offset slightly left of editing margin
                const topOffset = blockRect.top - containerRect.top + (blockRect.height / 2) - 14;
                const leftOffset = 14;
                
                setPlusButtonCoords({
                    top: topOffset,
                    left: leftOffset
                });
                setPlusButtonVisible(true);
            } else {
                setPlusButtonVisible(false);
                setShowInlineMenu(false);
            }
        } else {
            setShowSelectionToolbar(false);
            setPlusButtonVisible(false);
            setShowInlineMenu(false);
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
            className="relative w-full bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all rich-text-editor-relative-wrapper overflow-hidden"
        >
            {/* Top Level Main Navigation Bar (Naver SmartEditor ONE Toolbar Matching) */}
            <div className="bg-white border-b border-slate-100 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
                <div className="flex flex-wrap items-center gap-1.5 font-sans">
                    {/* [사진] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('photos')}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:border-blue-450 hover:bg-blue-50/20 flex items-center gap-1 text-xs font-black text-slate-700 transition-all cursor-pointer"
                        title="본문 사진 추가 허브 개방"
                    >
                        <i className="fa-regular fa-image text-blue-500 text-sm"></i>
                        <span>사진</span>
                    </button>

                    {/* [스티커] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('stickers')}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:border-amber-450 hover:bg-amber-50/15 flex items-center gap-1 text-xs font-black text-slate-700 transition-all cursor-pointer"
                        title="감성 스티커 추천 목록 개방"
                    >
                        <i className="fa-regular fa-face-smile text-amber-500 text-sm"></i>
                        <span>스티커</span>
                    </button>

                    {/* [인용구] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('quotes')}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 flex items-center gap-1 text-xs font-black text-slate-700 transition-all cursor-pointer"
                        title="소장님 마크 명품 인용구 서식"
                    >
                        <i className="fa-solid fa-quote-left text-emerald-600 text-xs"></i>
                        <span>인용구</span>
                    </button>

                    {/* [구분선] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('dividers')}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex items-center gap-1 text-xs font-black text-slate-700 transition-all cursor-pointer"
                        title="구분 데코선 서식"
                    >
                        <i className="fa-solid fa-grip-lines text-slate-500 text-xs"></i>
                        <span>구분선</span>
                    </button>

                    {/* Divide Bar */}
                    <div className="h-5 w-px bg-slate-200 mx-1"></div>

                    {/* [링크] */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowLinkDialog(true);
                            setShowPlaceDialog(false);
                        }}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/15 flex items-center gap-1 text-xs font-black text-slate-700 transition-all cursor-pointer"
                        title="네이버 대표 링크 포스트 카드 생성"
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
                        }}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:border-rose-450 hover:bg-rose-50/15 flex items-center gap-1 text-xs font-black text-slate-700 transition-all cursor-pointer"
                        title="구미 메인 지도 위치 정보 카드 생성"
                    >
                        <i className="fa-solid fa-map-location-dot text-rose-500 text-xs"></i>
                        <span>장소</span>
                    </button>
                </div>

                <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-black flex items-center gap-1">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    <span>SmartEditor ONE</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch w-full min-h-[400px]">
                {/* 에디터 왼쪽에 단정하게 수직으로 밀착형으로 열리는 [블로그 소스 추가] 통합 단일 창 */}
                {isSourcePanelOpen && (
                    <div 
                        id="blog-source-hub-panel" 
                        className="w-full md:w-[320px] bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 overflow-hidden relative z-40 animate-fadeIn"
                        style={{ height: 'auto', minHeight: '400px' }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-200/70 shrink-0">
                            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 leading-none">
                                <i className="fa-solid fa-folder-tree text-emerald-600"></i>
                                <span>블로그 스마트 소스 추가</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsSourcePanelOpen(false)}
                                className="w-6 h-6 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="패널 닫기"
                            >
                                <i className="fa-solid fa-times text-xs"></i>
                            </button>
                        </div>

                        {/* Single Unified Scrollable Container */}
                        <div 
                            ref={sidebarScrollRef}
                            className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin max-h-[550px] md:max-h-[600px] bg-slate-50/50"
                        >
                            {/* Category 1: [사진추가] */}
                            <div id={`photos-sec-${id}`} className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setPhotoExpanded(!photoExpanded)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left cursor-pointer"
                                >
                                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                                        <i className="fa-solid fa-image text-blue-500 text-xs"></i>
                                        <span>[사진 추가]</span>
                                    </span>
                                    <i className={`fa-solid ${photoExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-400`}></i>
                                </button>
                                {photoExpanded && (
                                    <div className="p-2.5 bg-slate-50/10 space-y-2 animate-fadeIn">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2 px-3 rounded-lg shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                                        >
                                            <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                                            <span>내 컴퓨터 파일 선택 📸</span>
                                        </button>
                                        
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {(uploadedImages.length > 0 ? uploadedImages : photoPresets).map((photo, pIdx) => {
                                                const isUploaded = uploadedImages.length > 0;
                                                const displayName = isUploaded 
                                                    ? getOriginalFileNameFromUrl(photo.url, photo.name)
                                                    : photo.name;
                                                const displayTitle = isUploaded ? `실사 #${pIdx + 1}` : `예시 #${pIdx + 1}`;
                                                return (
                                                    <button
                                                        key={`src-photo-${pIdx}`}
                                                        type="button"
                                                        onClick={() => {
                                                            const captionText = isUploaded ? `실사 촬영 이미지 [사진 ${pIdx + 1}] ${displayName}` : displayName;
                                                            const photoHtml = `
                                                                <div contenteditable="false" style="margin: 20px auto; text-align: center; max-width: 100%;">
                                                                    <img src="${photo.url}" referrerPolicy="no-referrer" style="border-radius:12px; max-width:100%; height:auto; border: 1px solid #e2e8f0; display: block; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.06);" />
                                                                    <p style="font-size: 11px; color:#64748b; font-weight:700; margin-top: 6px; text-align: center;">📸 ${captionText}</p>
                                                                </div>
                                                                <p contenteditable="true"><br></p>
                                                            `;
                                                            insertHtml(photoHtml);
                                                        }}
                                                        className="bg-white hover:bg-emerald-50/20 p-1 rounded-lg border border-slate-200 text-left transition-all hover:border-emerald-400 group flex flex-col gap-1 shadow-3xs"
                                                    >
                                                        <div className="aspect-[16/10] rounded overflow-hidden bg-slate-100 relative">
                                                            <img src={photo.url} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                            <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-3xs text-white text-[7px] font-black px-1 rounded">
                                                                {displayTitle}
                                                            </span>
                                                        </div>
                                                        <span className="text-[7.5px] font-extrabold text-slate-800 truncate block px-0.5" title={displayName}>
                                                            {displayName}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Category 2: [감성 스티커추가] */}
                            <div id={`stickers-sec-${id}`} className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setStickerExpanded(!stickerExpanded)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left cursor-pointer"
                                >
                                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                                        <i className="fa-solid fa-face-smile text-amber-500 text-xs"></i>
                                        <span>[⭐ 감성 스티커 허브]</span>
                                    </span>
                                    <i className={`fa-solid ${stickerExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-400`}></i>
                                </button>
                                {stickerExpanded && (
                                    <div className="p-2 bg-slate-50/10 space-y-2.5 animate-fadeIn">
                                        
                                        {/* ⭐ [소장님 최애 즐겨찾기] Section */}
                                        <div className="bg-[#fffdf5] rounded-lg border border-amber-200/50 p-2 shadow-3xs space-y-1.5 animate-fadeIn">
                                            <div className="flex justify-between items-center px-0.5">
                                                <span className="text-[10px] font-black text-amber-600 flex items-center gap-1 leading-none">
                                                    <i className="fa-solid fa-star animate-pulse"></i>
                                                    <span>⭐ 소장님 최애 즐겨찾기</span>
                                                </span>
                                                <span className="text-[8px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-black leading-none">
                                                    {favorites.length}
                                                </span>
                                            </div>
                                            {favorites.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-1">
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
                                                <div className="py-2.5 text-center rounded-lg bg-white border border-dashed border-slate-200/50">
                                                    <p className="text-[8.5px] text-slate-400 font-extrabold leading-normal">
                                                        우측 별(⭐) 버튼 터치 시<br />
                                                        여기에 즉시 노출 보관됩니다.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* 🐶🐱🏷️🧸 Horizontal Tab Navigation matching 사진 8 */}
                                        <div className="grid grid-cols-4 gap-0.5 bg-slate-100 p-1 rounded-xl">
                                            {['강아지', '생줘', '가격', '파스인형'].map((category) => {
                                                const isActive = openedStickerCat === category;
                                                const getTabIcon = (cat: string) => {
                                                    switch (cat) {
                                                        case '강아지': return '🐶';
                                                        case '생줘': return '🐭';
                                                        case '가격': return '🏷️';
                                                        case '파스인형': return '🧸';
                                                        default: return '📁';
                                                    }
                                                };
                                                return (
                                                    <button
                                                        key={category}
                                                        type="button"
                                                        onClick={() => setOpenedStickerCat(category)}
                                                        className={`py-1 rounded-lg text-[9px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                                                            isActive 
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-3xs' 
                                                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                                        }`}
                                                    >
                                                        <span className="text-sm leading-none">{getTabIcon(category)}</span>
                                                        <span className="text-[8px] tracking-tight">{category}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* 3-Column Grid for Currently selected Category Stickers */}
                                        {openedStickerCat && (
                                            <div className="space-y-1.5 animate-fadeIn text-left">
                                                <div className="text-[8.5px] font-black text-slate-450 pl-0.5 uppercase tracking-wider flex items-center gap-1">
                                                    <span>📁 {openedStickerCat} 스티커 모음</span>
                                                    <span className="text-[7.5px] bg-slate-150 text-slate-500 px-1 rounded-full font-bold">
                                                        {STICKER_ASSETS.filter(s => getCategoryFromPath(s.path) === openedStickerCat).length}종
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 bg-white border border-slate-205 rounded-xl p-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                                                    {STICKER_ASSETS.filter(s => getCategoryFromPath(s.path) === openedStickerCat).map((sticker, idx) => {
                                                        const isStarred = favorites.some(item => item.name === sticker.name);
                                                        return (
                                                            <StickerCard
                                                                key={`sidebar-cat-grid-${sticker.name}-${idx}`}
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
                                        )}

                                        {/* Collapsible 51 empty placeholders */}
                                        <div className="border border-slate-200 border-dashed rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setShowFutureSlots(!showFutureSlots)}
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                            >
                                                <span className="text-[9px] font-extrabold flex items-center gap-1">
                                                    <i className="fa-solid fa-boxes-packing text-slate-350"></i>
                                                    <span>확장 대기용 비어있는 슬롯 51개</span>
                                                </span>
                                                <i className={`fa-solid ${showFutureSlots ? 'fa-angle-up' : 'fa-angle-down'} text-[8px]`}></i>
                                            </button>
                                            {showFutureSlots && (
                                                <div className="p-2 border-t border-dashed border-slate-200 grid grid-cols-4 gap-1 animate-fadeIn max-h-40 overflow-y-auto bg-slate-100/30">
                                                    {Array.from({ length: 51 }).map((_, slotIdx) => (
                                                        <div key={slotIdx} className="aspect-square rounded bg-slate-200/50 border border-slate-300 border-dashed flex items-center justify-center text-[8px] text-slate-400 font-bold" title={`예비 슬롯 #${slotIdx + 1}`}>
                                                            #{slotIdx + 1}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Category 3: [인용구 6대 원본 양식] */}
                            <div id={`quotes-sec-${id}`} className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setQuoteExpanded(!quoteExpanded)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left cursor-pointer"
                                >
                                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                                        <i className="fa-solid fa-quote-left text-emerald-600 text-xs"></i>
                                        <span>[인용구 6대 원본 양식]</span>
                                    </span>
                                    <i className={`fa-solid ${quoteExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-400`}></i>
                                </button>
                                {quoteExpanded && (
                                    <div className="p-2 bg-slate-50/15 space-y-2 animate-fadeIn text-left">
                                        {/* 따옴표 */}
                                        <button
                                            type="button"
                                            onClick={() => insertQuote('quote')}
                                            className="w-full px-3 py-2 border rounded-xl hover:border-emerald-450 hover:bg-emerald-50/20 text-left bg-white shadow-3xs font-sans text-[10px] font-bold block cursor-pointer transition-all"
                                        >
                                            <div className="text-[9px] font-extrabold text-slate-600 mb-1">큰따옴표 강조형 (“ ”)</div>
                                            <div className="border border-slate-150 rounded-lg p-2 text-center text-slate-700 font-bold">
                                                “ 원하시는 요약 문구를 작성 ”
                                            </div>
                                        </button>

                                        {/* 버티컬라인 */}
                                        <button
                                            type="button"
                                            onClick={() => insertQuote('border')}
                                            className="w-full px-3 py-2 border rounded-xl hover:border-emerald-450 hover:bg-emerald-50/20 text-left bg-white shadow-3xs font-sans text-[10px] font-bold block cursor-pointer transition-all"
                                        >
                                            <div className="text-[9px] font-extrabold text-slate-650 mb-1">수직 왼쪽 실선형 (|)</div>
                                            <div className="border-l-4 border-emerald-600 pl-2 text-slate-600 italic">
                                                여기에 가이드 인용 문단을 작성...
                                            </div>
                                        </button>

                                        {/* 말풍선 */}
                                        <button
                                            type="button"
                                            onClick={() => insertQuote('bubble')}
                                            className="w-full px-3 py-2 border rounded-xl hover:border-emerald-450 hover:bg-emerald-50/20 text-left bg-white shadow-3xs font-sans text-[10px] font-bold block cursor-pointer transition-all"
                                        >
                                            <div className="text-[9px] font-extrabold text-emerald-600 mb-1">소장 추천 말풍선 (💡)</div>
                                            <div className="bg-emerald-50/50 rounded-lg p-1.5 border border-emerald-100 text-emerald-800 flex flex-col gap-0.5">
                                                <span className="text-[8px] font-bold text-emerald-600">💡 소장님 추천 한마디</span>
                                                <span className="truncate">이 매물을 적극 추천해 드립니다!</span>
                                            </div>
                                        </button>

                                        {/* 라인&따옴표 */}
                                        <button
                                            type="button"
                                            onClick={() => insertQuote('line-quote')}
                                            className="w-full px-3 py-2 border rounded-xl hover:border-slate-800 hover:bg-slate-50 text-left bg-white shadow-3xs font-sans text-[10px] font-bold block cursor-pointer transition-all"
                                        >
                                            <div className="text-[9px] font-extrabold text-[#111827] mb-1 font-black">상하 블랙 라인 따옴표형</div>
                                            <div className="border-t border-b border-slate-700 py-1.5 text-center text-[9px] text-[#111827] font-black">
                                                “ 강점 대박 요약 한줄 ”
                                            </div>
                                        </button>

                                        {/* 포스트잇 */}
                                        <button
                                            type="button"
                                            onClick={() => insertQuote('postit')}
                                            className="w-full px-3 py-2 border rounded-xl hover:border-amber-400 hover:bg-amber-50/20 text-left bg-white shadow-3xs font-sans text-[10px] font-bold block cursor-pointer transition-all"
                                        >
                                            <div className="text-[9px] font-extrabold text-amber-700 mb-1">포스트잇 벼락 체크수첩형 (📌)</div>
                                            <div className="bg-amber-50/30 border border-amber-100 border-l-[4px] border-amber-500 rounded p-1.5 text-left text-amber-800">
                                                <span className="text-[8px] font-black text-amber-600">📌 소장 가이드 메일 수첩</span>
                                                <div className="truncate">이 매물은 매우 귀한 공실로...</div>
                                            </div>
                                        </button>

                                        {/* 프레임 */}
                                        <button
                                            type="button"
                                            onClick={() => insertQuote('frame')}
                                            className="w-full px-3 py-2 border rounded-xl hover:border-emerald-450 hover:bg-emerald-50/20 text-left bg-white shadow-3xs font-sans text-[10px] font-bold block cursor-pointer transition-all"
                                        >
                                            <div className="text-[9px] font-extrabold text-emerald-700 mb-1">에메랄드 포커스 프레임 상자형</div>
                                            <div className="border border-emerald-500 rounded-lg p-1.5 bg-emerald-50/10 text-center text-emerald-800 font-extrabold">
                                                ◆ FOCUS ESSENTIALS ◆
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Category 4: [네이버 8대 명품 구분선] */}
                            <div id={`dividers-sec-${id}`} className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setDividerExpanded(!dividerExpanded)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left cursor-pointer"
                                >
                                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                                        <i className="fa-solid fa-grip-lines text-slate-500 text-xs"></i>
                                        <span>[구분선 8대 원본 양식]</span>
                                    </span>
                                    <i className={`fa-solid ${dividerExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-400`}></i>
                                </button>
                                {dividerExpanded && (
                                    <div className="p-2 bg-slate-50/15 space-y-1.5 animate-fadeIn">
                                        <button
                                            type="button"
                                            onClick={() => insertDivider('dashed')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-slate-350 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-slate-400">점선형 구분선</span>
                                            <span className="text-slate-400 tracking-widest block font-light text-center">------------------------</span>
                                        </button>
                                        
                                        <button
                                            type="button"
                                            onClick={() => insertDivider('solid')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-slate-350 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-slate-400">실선형 구분선</span>
                                            <span className="h-[1px] bg-slate-200 w-full block mt-1"></span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => insertDivider('thick')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-slate-400 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-slate-600">굵은 먹선형 구분선</span>
                                            <span className="h-[3px] bg-slate-700 w-full block mt-1"></span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => insertDivider('dots')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-emerald-400 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-emerald-500">네이버 세 점형 (•••)</span>
                                            <span className="text-emerald-500 text-center font-black tracking-widest block text-lg">•••</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => insertDivider('emerald-dot')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-emerald-450 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-emerald-600">도트 에메랄드 롱라인형</span>
                                            <span className="border-t-4 border-emerald-500 border-dotted w-full block mt-1.5"></span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => insertDivider('double')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-slate-350 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-slate-400">이중실선형 구분선</span>
                                            <span className="h-[4px] border-t-2 border-b-2 border-slate-300 w-full block mt-1"></span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => insertDivider('star')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-amber-400 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-amber-500">별빛 골드 삼각 선형 (★★★)</span>
                                            <span className="text-[#f59e0b] text-center font-extrabold tracking-widest block text-xs mt-1">★★★</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => insertDivider('diamond')}
                                            className="w-full text-left px-3 py-2 border rounded-xl hover:border-slate-400 bg-white font-sans text-[10px] font-bold flex flex-col gap-1 cursor-pointer transition-colors"
                                        >
                                            <span className="text-[8px] text-slate-400">마름모 슬레이트형 (◆ ◆ ◆)</span>
                                            <span className="text-slate-400 text-center font-extrabold tracking-widest block text-xs mt-1">◆ ◆ ◆</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Guide */}
                        <div className="p-2.5 bg-white border-t border-slate-200/70 text-center shrink-0">
                            <span className="text-[9px] font-bold text-slate-400">
                                💡 소스를 가볍게 누르시면 에디터 커서 자리에 원터치로 즉시 삽입 연동됩니다.
                            </span>
                        </div>
                    </div>
                )}
                
                {/* Editor Writing Screen Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                    {/* Secondary Navigation Formatting Toolbar */}
                    <div className={`relative z-30 p-2 bg-slate-50 border-b border-slate-200/70 flex flex-wrap gap-1.5 items-center text-slate-700 toolbar-dropdown-${id} select-none`}>
                        {/* Font Family selector */}
                        <div className="relative">
                            <button 
                                type="button" 
                                onClick={() => { setShowFontDropdown(!showFontDropdown); setShowSizeDropdown(false); }}
                                className="h-8 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-24 text-slate-800 transition-all cursor-pointer"
                                title="글꼴 변경"
                            >
                                <span className="truncate">{currentFont}</span>
                                <i className="fa-solid fa-chevron-down text-[8px] text-slate-450"></i>
                            </button>
                            {showFontDropdown && (
                                <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-36 py-1 text-slate-700 animate-fadeIn h-auto max-h-64 overflow-y-auto">
                                    {Object.entries(fontFamilies).map(([fontName, value]) => (
                                        <button
                                            key={fontName}
                                            type="button"
                                            onClick={() => {
                                                applyStyleToSelection('fontFamily', value);
                                                setCurrentFont(fontName);
                                                setShowFontDropdown(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-bold truncate ${currentFont === fontName ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
                                            style={{ fontFamily: value }}
                                        >
                                            {fontName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Font Size selector */}
                        <div className="relative">
                            <button 
                                type="button" 
                                onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowFontDropdown(false); }}
                                className="h-8 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-16 text-slate-800 transition-all cursor-pointer"
                                title="글자 크기"
                            >
                                <span>{currentSize}</span>
                                <i className="fa-solid fa-chevron-down text-[8px] text-slate-450"></i>
                            </button>
                            {showSizeDropdown && (
                                <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-24 py-1 text-slate-700 max-h-48 overflow-y-auto animate-fadeIn">
                                    {fontSizes.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => {
                                                applyStyleToSelection('fontSize', size);
                                                setShowSizeDropdown(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-bold ${currentSize === size ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Divide Bar */}
                        <div className="h-4 w-px bg-slate-250 mx-1"></div>

                        {/* Text Styles */}
                        <div className="flex gap-0.5">
                            <button 
                                type="button"
                                onClick={() => execCommand('bold')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 font-extrabold text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="굵게"
                            >
                                <i className="fa-solid fa-bold text-[11px]"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => execCommand('italic')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 italic text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="기울임"
                            >
                                <i className="fa-solid fa-italic text-[11px]"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => execCommand('underline')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 underline underline-offset-2 text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="밑줄"
                            >
                                <i className="fa-solid fa-underline text-[11px]"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => execCommand('strikeThrough')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 line-through text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="취소선"
                            >
                                <i className="fa-solid fa-strikethrough text-[11px]"></i>
                            </button>
                        </div>

                        {/* Divide Bar */}
                        <div className="h-4 w-px bg-slate-250 mx-1"></div>

                        {/* Color Pickers */}
                        <div className="flex gap-1">
                            {/* ForeColor */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); }}
                                    className="w-8 h-8 rounded hover:bg-slate-200/70 flex flex-col items-center justify-center relative cursor-pointer text-slate-700"
                                    title="글자 색상"
                                >
                                    <i className="fa-solid fa-font text-[11px]"></i>
                                    <div className="h-1 w-3.5 bg-red-600 rounded-sm mt-0.5" style={{ minHeight: '3px' }}></div>
                                </button>
                                {showColorPicker && (
                                    <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 w-44 grid grid-cols-6 gap-1 animate-fadeIn">
                                        {colors.map(color => (
                                            <button 
                                                key={color}
                                                type="button"
                                                onClick={() => {
                                                    applyStyleToSelection('color', color);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-5 h-5 rounded hover:scale-110 border border-slate-150 transition-transform cursor-pointer"
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Highlighter Color */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); }}
                                    className="w-8 h-8 rounded hover:bg-slate-200/70 flex flex-col items-center justify-center relative cursor-pointer text-slate-700"
                                    title="글자 배경색 형광펜"
                                >
                                    <i className="fa-solid fa-highlighter text-[11px]"></i>
                                    <div className="h-1 w-3.5 bg-yellow-300 rounded-sm mt-0.5" style={{ minHeight: '3px' }}></div>
                                </button>
                                {showBgColorPicker && (
                                    <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 w-44 grid grid-cols-6 gap-1 animate-fadeIn">
                                        {highlights.map(color => (
                                            <button 
                                                key={color}
                                                type="button"
                                                onClick={() => {
                                                    applyStyleToSelection('backgroundColor', color);
                                                    setShowBgColorPicker(false);
                                                }}
                                                className="w-5 h-5 rounded hover:scale-110 border border-slate-150 transition-transform relative flex items-center justify-center cursor-pointer"
                                                style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                                                title={color === 'transparent' ? '효과 제거' : color}
                                            >
                                                {color === 'transparent' && <i className="fa-solid fa-slash text-[8px] text-red-500"></i>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Divide Bar */}
                        <div className="h-4 w-px bg-slate-250 mx-1"></div>

                        {/* Alignment settings */}
                        <div className="flex gap-0.5">
                            <button 
                                type="button"
                                onClick={() => execCommand('justifyLeft')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 flex items-center justify-center transition-all cursor-pointer"
                                title="왼쪽 정렬"
                            >
                                <i className="fa-solid fa-align-left text-[11px] text-slate-700"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => execCommand('justifyCenter')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 flex items-center justify-center transition-all cursor-pointer"
                                title="가운데 정렬"
                            >
                                <i className="fa-solid fa-align-center text-[11px] text-slate-700"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => execCommand('justifyRight')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 flex items-center justify-center transition-all cursor-pointer"
                                title="오른쪽 정렬"
                            >
                                <i className="fa-solid fa-align-right text-[11px] text-slate-700"></i>
                            </button>
                        </div>

                        {/* Expand sidebar toggle on the toolbar helper side */}
                        <button
                            type="button"
                            onClick={() => setIsSourcePanelOpen(!isSourcePanelOpen)}
                            className={`h-8 px-2.5 rounded-lg border text-[10px] font-black flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95 transition-all ml-auto ${
                                isSourcePanelOpen 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-700/10' 
                                : 'bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200 hover:text-emerald-600'
                            }`}
                        >
                            <i className="fa-solid fa-images text-emerald-500"></i>
                            <span>사이드바 소스</span>
                            <span className="text-[7.5px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-black">
                                {isSourcePanelOpen ? 'CLOSE' : 'OPEN'}
                            </span>
                        </button>
                    </div>

                    {/* Floating Selection Tooltip Formatting Toolbar (z-index: 10000 Forced) */}
                    {showSelectionToolbar && selectionCoords && (
                        <div 
                            style={{ 
                                top: `${selectionCoords.top}px`, 
                                left: `${selectionCoords.left}px`,
                                transform: 'translateX(-50%)',
                                zIndex: 10000
                            }}
                            className="absolute !z-[10000] bg-white text-slate-800 rounded-2xl shadow-xl p-2.5 flex items-center gap-2 border border-[#E2E8F0] animate-slideUpAndFade select-none"
                        >
                            {/* Selection Font Selector */}
                            <div className="relative tooltip-dropdown">
                                <button 
                                    type="button" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTooltipFontDropdown(!showTooltipFontDropdown);
                                        setShowTooltipSizeDropdown(false);
                                        setShowTooltipColorPicker(false);
                                    }}
                                    className="h-8 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-24 text-slate-800 transition-all cursor-pointer"
                                >
                                    <span className="truncate">{currentFont}</span>
                                    <i className="fa-solid fa-chevron-down text-[8px] text-slate-450"></i>
                                </button>
                                {showTooltipFontDropdown && (
                                    <div className="absolute bottom-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-32 py-1 text-slate-700 max-h-40 overflow-y-auto animate-fadeIn mb-1">
                                        {Object.entries(fontFamilies).map(([fontName, value]) => (
                                            <button
                                                key={`tooltip-font-${fontName}`}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyStyleToSelection('fontFamily', value);
                                                    setCurrentFont(fontName);
                                                    setShowTooltipFontDropdown(false);
                                                }}
                                                className={`w-full text-left px-2 py-1 hover:bg-slate-50 text-[11px] font-bold truncate ${currentFont === fontName ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
                                                style={{ fontFamily: value }}
                                            >
                                                {fontName}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selection Font Size Selector */}
                            <div className="relative tooltip-dropdown">
                                <button 
                                    type="button" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTooltipSizeDropdown(!showTooltipSizeDropdown);
                                        setShowTooltipFontDropdown(false);
                                        setShowTooltipColorPicker(false);
                                    }}
                                    className="h-8 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-14 text-slate-800 transition-all cursor-pointer"
                                >
                                    <span>{currentSize}</span>
                                    <i className="fa-solid fa-chevron-down text-[8px] text-slate-450"></i>
                                </button>
                                {showTooltipSizeDropdown && (
                                    <div className="absolute bottom-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-20 py-1 text-slate-700 max-h-40 overflow-y-auto animate-fadeIn mb-1">
                                        {fontSizes.map((size) => (
                                            <button
                                                key={`tooltip-size-${size}`}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyStyleToSelection('fontSize', size);
                                                    setCurrentSize(size);
                                                    setShowTooltipSizeDropdown(false);
                                                }}
                                                className={`w-full text-left px-2 py-1 hover:bg-slate-50 text-[11px] font-bold ${currentSize === size ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* B, I, U Buttons */}
                            <button
                                type="button"
                                onClick={() => execCommand('bold')}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-black flex items-center justify-center text-slate-700 transition-colors"
                            >
                                <i className="fa-solid fa-bold"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('italic')}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs italic flex items-center justify-center text-slate-700 transition-colors"
                            >
                                <i className="fa-solid fa-italic"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('underline')}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs underline underline-offset-2 flex items-center justify-center text-slate-700 transition-colors"
                            >
                                <i className="fa-solid fa-underline"></i>
                            </button>

                            {/* T (Colors Picker) */}
                            <div className="relative tooltip-dropdown">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTooltipColorPicker(!showTooltipColorPicker);
                                        setShowTooltipFontDropdown(false);
                                        setShowTooltipSizeDropdown(false);
                                    }}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex flex-col items-center justify-center text-slate-700 relative"
                                    title="글자 색상"
                                >
                                    <i className="fa-solid fa-font text-[11px]"></i>
                                    <span className="text-[9px] font-black pointer-events-none -mt-1 leading-none text-red-500">A</span>
                                </button>
                                {showTooltipColorPicker && (
                                    <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 w-32 grid grid-cols-5 gap-1 animate-fadeIn mb-1">
                                        {colors.slice(0, 10).map(color => (
                                            <button 
                                                key={`tooltip-color-${color}`}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyStyleToSelection('color', color);
                                                    setShowTooltipColorPicker(false);
                                                }}
                                                className="w-4.5 h-4.5 rounded border border-slate-150 transition-transform cursor-pointer"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Alignment Left / Center / Right alignment buttons inside dragging popover */}
                            <div className="flex gap-0.5 border-l border-slate-200/80 pl-1.5 ml-1">
                                <button 
                                    type="button" 
                                    onClick={() => execCommand('justifyLeft')}
                                    className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                                    title="왼쪽 정렬"
                                >
                                    <i className="fa-solid fa-align-left text-[11px]"></i>
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => execCommand('justifyCenter')}
                                    className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                                    title="가운데 정렬"
                                >
                                    <i className="fa-solid fa-align-center text-[11px]"></i>
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => execCommand('justifyRight')}
                                    className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                                    title="오른쪽 정렬"
                                >
                                    <i className="fa-solid fa-align-right text-[11px]"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Highly Professional Floating Link Input Overlay */}
                    {showLinkDialog && (
                        <div className="absolute inset-x-0 top-[40px] bottom-0 bg-slate-900/35 backdrop-blur-3xs flex items-center justify-center z-[11000] p-4 font-sans select-none">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-xs shadow-2xl animate-scaleUp">
                                <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <i className="fa-solid fa-link text-indigo-500 text-xs"></i>
                                    <span>네이버 에디터 링크 블록 생성</span>
                                </h4>
                                <div className="space-y-2.5 text-left">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">연결할 링크 URL 주소</label>
                                        <input 
                                            type="text" 
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="https://example.com"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">링크 소개 텍스트 명칭</label>
                                        <input 
                                            type="text" 
                                            value={linkText}
                                            onChange={(e) => setLinkText(e.target.value)}
                                            placeholder="태왕 전용 매물 리얼 오감 투어 보기"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLinkDialog(false);
                                            setLinkUrl('');
                                            setLinkText('');
                                        }}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-2 rounded-lg cursor-pointer"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = linkUrl.trim();
                                            const text = linkText.trim() || url;
                                            if (url) {
                                                const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
                                                const linkHtml = `
                                                    <div contenteditable="false" style="margin: 16px auto; max-width: 100%; border: 1px solid #e1e8f0; border-radius: 12px; background-color: #f8fafc; overflow: hidden; display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                                                        <div style="display: flex; align-items: center; gap: 12px;">
                                                            <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #e6f6ee; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #10b981;">🔗</div>
                                                            <div style="text-align: left;">
                                                                <div style="font-size: 13px; font-weight: 800; color: #1e293b;">${text}</div>
                                                                <div style="font-size: 10px; color: #64748b; font-family: monospace;">${cleanUrl}</div>
                                                            </div>
                                                        </div>
                                                        <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 700; color: #ffffff; background-color: #10b981; border: 1px solid #059669; border-radius: 6px; padding: 6px 12px; text-decoration: none; cursor: pointer; white-space: nowrap;">이동하기</a>
                                                    </div>
                                                    <p contenteditable="true"><br></p>
                                                `;
                                                insertHtml(linkHtml);
                                            }
                                            setShowLinkDialog(false);
                                            setLinkUrl('');
                                            setLinkText('');
                                        }}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 rounded-lg cursor-pointer"
                                    >
                                        링크 추가
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Highly Professional Floating Place/Map Input Overlay */}
                    {showPlaceDialog && (
                        <div className="absolute inset-x-0 top-[40px] bottom-0 bg-slate-900/35 backdrop-blur-3xs flex items-center justify-center z-[11000] p-4 font-sans select-none">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-xs shadow-2xl animate-scaleUp">
                                <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <i className="fa-solid fa-map-location-dot text-rose-500 text-xs"></i>
                                    <span>네이버 에디터 추천 장소 생성</span>
                                </h4>
                                <div className="space-y-2.5 text-left">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">지도 표기 장소 명칭</label>
                                        <input 
                                            type="text" 
                                            value={placeName}
                                            onChange={(e) => setPlaceName(e.target.value)}
                                            placeholder="예: 구미 송정 태왕아너스 센트럴"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPlaceDialog(false);
                                            setPlaceName('');
                                        }}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-2 rounded-lg cursor-pointer"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const name = placeName.trim() || '구미시 매물 현장 주소';
                                            const placeHtml = `
                                                <div contenteditable="false" style="margin: 16px auto; max-width: 100%; border: 1.5px solid #10b981; border-radius: 14px; background-color: #ffffff; padding: 16px 20px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.07); display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;">
                                                    <div style="display: flex; align-items: center; gap: 14px; text-align: left;">
                                                        <div style="width: 44px; height: 44px; border-radius: 12px; background-color: #e6f7f0; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #10b981;">📍</div>
                                                        <div style="text-align: left;">
                                                            <div style="font-size: 14px; font-weight: 900; color: #111827; display: flex; align-items: center; gap: 6px;">
                                                                <span>${name}</span>
                                                                <span style="font-size: 9px; font-weight: 750; color: #10b981; border: 1px solid #10b981; border-radius: 4px; padding: 1px 4px; vertical-align: middle;">추천매물 현장</span>
                                                            </div>
                                                            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">연동된 실시간 지도 정보 및 주변 실사 안내판</div>
                                                        </div>
                                                    </div>
                                                    <a href="https://map.naver.com" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 800; color: #10b981; background-color: #ffffff; border: 1.5px solid #10b981; border-radius: 8px; padding: 6px 12px; text-decoration: none; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                                                        <span>네이버 지도보기</span>
                                                        <span style="font-size: 8px;">▶</span>
                                                    </a>
                                                </div>
                                                <p contenteditable="true"><br></p>
                                            `;
                                            insertHtml(placeHtml);
                                            setShowPlaceDialog(false);
                                            setPlaceName('');
                                        }}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 rounded-lg cursor-pointer"
                                    >
                                        장소 추가
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Editable Writing Area (Naver Gothic Font / 12px / pure black #000000 default) */}
                    <div className="relative flex-1">
                        {/* Cursor Tracking Square [+] Button and Inline Menu */}
                        {plusButtonVisible && plusButtonCoords && (
                            <div 
                                style={{ 
                                    top: `${plusButtonCoords.top}px`, 
                                    left: `${plusButtonCoords.left}px` 
                                }}
                                className="absolute z-[9999] flex items-center select-none font-sans font-extrabold"
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowInlineMenu(!showInlineMenu);
                                    }}
                                    className={`w-7 h-7 rounded border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                                        showInlineMenu 
                                        ? 'bg-emerald-600 border-emerald-600 text-white hover:scale-105 active:scale-95' 
                                        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-500 hover:text-slate-800 hover:scale-105 active:scale-95'
                                    }`}
                                    title="스마트 삽입 도구 열기"
                                >
                                    <i className={`fa-solid ${showInlineMenu ? 'fa-xmark text-[10px]' : 'fa-plus text-xs'}`}></i>
                                </button>

                                {showInlineMenu && (
                                    <div 
                                        className="absolute left-9 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-32 flex flex-col z-[10000] animate-fadeIn text-slate-750 font-sans font-black"
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                                setShowInlineMenu(false);
                                            }}
                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent font-extrabold"
                                        >
                                            <i className="fa-solid fa-camera text-blue-500 text-xs"></i>
                                            <span>사진 추가</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSidebarCategory('stickers');
                                                setShowInlineMenu(false);
                                            }}
                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent font-extrabold"
                                        >
                                            <i className="fa-solid fa-face-smile text-amber-500 text-xs"></i>
                                            <span>감성 스티커</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSidebarCategory('dividers');
                                                setShowInlineMenu(false);
                                            }}
                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent font-extrabold"
                                        >
                                            <i className="fa-solid fa-grip-lines text-slate-500 text-xs text-center w-3"></i>
                                            <span>구분선 주입</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSidebarCategory('quotes');
                                                setShowInlineMenu(false);
                                            }}
                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent font-extrabold"
                                        >
                                            <i className="fa-solid fa-quote-left text-emerald-600 text-xs"></i>
                                            <span>인용구 작문</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div 
                            id={id}
                            ref={editorRef}
                            contentEditable
                            onInput={handleInput}
                            onPaste={handlePaste}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="pt-6 pb-6 pr-6 pl-6 text-[#000000] outline-none min-h-[350px] overflow-y-auto w-full max-w-full prose prose-slate select-text break-all rounded-b-xl"
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

                    {/* Hidden Input for local PC file uploads */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLocalFileChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                </div>
            </div>
        </div>
    );
}

export default RichTextEditor;
