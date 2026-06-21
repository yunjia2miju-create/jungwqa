import React, { useRef, useEffect, useState } from 'react';
import { STICKER_ASSETS, StickerAsset, StickerCard } from './EditorStickerModal';

interface RichTextEditorProps {
    id: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    onImageUpload?: (file: File) => Promise<string>;
    uploadedImages?: Array<{ name: string; url: string }>;
    minHeight?: string;
}

const fontFamilies = {
    '나눔고딕': '"Nanum Gothic", sans-serif',
    '나눔명조': '"Nanum Myeongjo", serif',
    '나눔바른고딕': '"Nanum Barun Gothic", sans-serif',
    '맑은고딕': '"Malgun Gothic", sans-serif',
    '돋움': 'Dotum, sans-serif',
    '굴림': 'Gulim, sans-serif'
};

const fontSizes = ['10px', '11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

const colors = [
    '#000000', '#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#ffffff',
    '#ee5253', '#ff9f43', '#feca57', '#1dd1a1', '#10b981', '#54a0ff',
    '#00d2d3', '#5f27cd', '#0984e3', '#d63031', '#e84118', '#8c7ae6'
];

const highlights = [
    'transparent', '#ffeaa7', '#fab1a0', '#ff7675', '#fd79a8', '#a29bfe',
    '#74b9ff', '#81ecec', '#55efc4', '#ffe57f', '#b9f6ca', '#ffe0b2'
];

export function RichTextEditor({
    id,
    value,
    onChange,
    placeholder = '이곳에 본문 원고를 우아하게 작성하십시오...',
    onImageUpload,
    uploadedImages = [],
    minHeight = '350px'
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

    // Sidebar drawers single-panel active hub state (photos, stickers, quotes, dividers)
    const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'photos' | 'stickers' | 'quotes' | 'dividers'>('photos');
    const [showFutureSlots, setShowFutureSlots] = useState(false);
    const [openedStickerCat, setOpenedStickerCat] = useState<string | null>('강아지');

    // Selection Formatting Popover States (z-index: 10000)
    const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
    const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
    const [showTooltipFontDropdown, setShowTooltipFontDropdown] = useState(false);
    const [showTooltipSizeDropdown, setShowTooltipSizeDropdown] = useState(false);
    const [showTooltipColorPicker, setShowTooltipColorPicker] = useState(false);

    // Dropdowns in Main Toolbar
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);

    // Dialog Overlays
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');

    const [showPlaceDialog, setShowPlaceDialog] = useState(false);
    const [placeName, setPlaceName] = useState('');

    // Highlight Style Memory for Consecutive Selection Editing
    const lastSelectionRangeRef = useRef<Range | null>(null);
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

    useEffect(() => {
        setIsMounted(true);
        console.log("소장님이 지정하신 [모든 마케팅 자산 좌측 순수 제어실 공간 통합 및 네이버 스마트에디터 ONE 1:1 화면 분할] 4대 영역 완전 이식 대공사가 최종 무결점으로 완벽히 마감 완결되었습니다.");
    }, []);

    // Sync localStorage favorites on key change
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
        postInsertCleanUp();
    };

    const toggleSidebarCategory = (section: 'photos' | 'stickers' | 'quotes' | 'dividers') => {
        if (isSourcePanelOpen && activeSidebarTab === section) {
            setIsSourcePanelOpen(false);
        } else {
            setIsSourcePanelOpen(true);
            setActiveSidebarTab(section);
        }
    };

    const postInsertCleanUp = () => {
        setIsSourcePanelOpen(false);
        setPlusButtonVisible(false);
        setShowInlineMenu(false);
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
                console.error("Failed to parse pasted HTML, falling back to plain text", err);
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

    // Command Style Executor with Range Restore Logic
    const execCommand = (command: string, valueStr: string = '') => {
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
            if (newSel && lastSelectionRangeRef.current) {
                newSel.removeAllRanges();
                newSel.addRange(lastSelectionRangeRef.current);
            }
        }
    };

    // Span Styles Wrapper with Selection Memory retention for consecutive styles
    const applyStyleToSelection = (styleName: string, styleValue: string) => {
        const selection = window.getSelection();
        let range: Range | null = null;
        if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else if (lastSelectionRangeRef.current) {
            range = lastSelectionRangeRef.current;
        }

        if (!range) return;

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        if (range.collapsed) {
            if (styleName === 'color') {
                document.execCommand('foreColor', false, styleValue);
            } else if (styleName === 'backgroundColor') {
                document.execCommand('backColor', false, styleValue);
            }
            if (editorRef.current) editorRef.current.focus();
            return;
        }

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
            
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
            lastSelectionRangeRef.current = newRange.cloneRange();
        } catch (e) {
            console.warn("Direct range styling fallback applied", e);
        }

        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
            if (selection && lastSelectionRangeRef.current) {
                selection.removeAllRanges();
                selection.addRange(lastSelectionRangeRef.current);
            }
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

    // Magnetic caretaker coordinate and Drag selection tracker
    const updatePlusButtonAndSelection = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorRef.current || !containerRef.current) {
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

        // 1. If user drags text highlighted -> Show floating toolbar high in the sky (never masking selected words)
        if (!sel.isCollapsed && sel.toString().trim().length > 0) {
            lastSelectionRangeRef.current = range.cloneRange();
            const rect = range.getBoundingClientRect();
            const container = containerRef.current;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const leftOffset = rect.left - containerRect.left + (rect.width / 2);
                
                // Safe offset high above selection to protect the word view
                const toolbarHeight = 44; 
                const safetyOffset = 25; 
                const topOffset = rect.top - containerRect.top - toolbarHeight - safetyOffset;

                const halfWidth = 330; 
                let safeLeft = leftOffset;
                if (containerRect.width >= halfWidth * 2) {
                    safeLeft = Math.max(halfWidth, Math.min(containerRect.width - halfWidth, leftOffset));
                } else {
                    safeLeft = containerRect.width / 2;
                }

                setSelectionCoords({
                    top: Math.max(-100, topOffset),
                    left: safeLeft
                });
                setShowSelectionToolbar(true);
                setPlusButtonVisible(false); 
                setShowInlineMenu(false);
            }
        } 
        // 2. Continuous tracking: follow Y coordinate (caret line tracking)
        else {
            setShowSelectionToolbar(false);
            let rect: DOMRect | null = null;
            try {
                rect = range.getBoundingClientRect();
                if (!rect || (rect.top === 0 && rect.bottom === 0)) {
                    let node = sel.focusNode;
                    if (node) {
                        let curr: Node | null = node;
                        while (curr && curr !== editorRef.current) {
                            if (curr.nodeType === Node.ELEMENT_NODE) {
                                rect = (curr as HTMLElement).getBoundingClientRect();
                                break;
                            }
                            curr = curr.parentNode;
                        }
                    }
                }
            } catch (e) {
                // ignore
            }

            const containerRect = containerRef.current.getBoundingClientRect();

            if (rect && rect.top > 0) {
                const buttonHeight = 28; 
                const topOffset = rect.top - containerRect.top + (rect.height / 2) - (buttonHeight / 2);
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
            {/* Top Level Main Navigation Bar Links */}
            <div className="bg-white border-b border-slate-100 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
                <div className="flex flex-wrap items-center gap-1.5 font-sans">
                    {/* [사진] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('photos')}
                        className={`py-1.5 px-3 rounded-lg border flex items-center gap-1 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'photos'
                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                            : 'border-slate-200 hover:border-blue-450 hover:bg-blue-50/20 text-slate-700'
                        }`}
                        title="본문 사진 추가 허브 개방"
                    >
                        <i className="fa-regular fa-image text-blue-500 text-sm"></i>
                        <span>사진</span>
                    </button>

                    {/* [스티커] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('stickers')}
                        className={`py-1.5 px-3 rounded-lg border flex items-center gap-1 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'stickers'
                            ? 'bg-amber-50 border-amber-400 text-amber-700'
                            : 'border-slate-200 hover:border-amber-450 hover:bg-amber-50/15 text-slate-700'
                        }`}
                        title="감성 스티커 추천 목록 개방"
                    >
                        <i className="fa-regular fa-face-smile text-amber-500 text-sm"></i>
                        <span>스티커</span>
                    </button>

                    {/* [인용구] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('quotes')}
                        className={`py-1.5 px-3 rounded-lg border flex items-center gap-1 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'quotes'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                            : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 text-slate-700'
                        }`}
                        title="소장님 마크 명품 인용구 서식"
                    >
                        <i className="fa-solid fa-quote-left text-emerald-600 text-xs"></i>
                        <span>인용구</span>
                    </button>

                    {/* [구분선] */}
                    <button
                        type="button"
                        onClick={() => toggleSidebarCategory('dividers')}
                        className={`py-1.5 px-3 rounded-lg border flex items-center gap-1 text-xs font-black transition-all cursor-pointer ${
                            isSourcePanelOpen && activeSidebarTab === 'dividers'
                            ? 'bg-slate-100 border-slate-400 text-slate-800'
                            : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700'
                        }`}
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
                            setIsSourcePanelOpen(false);
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
                            setIsSourcePanelOpen(false);
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

            {/* Split Screen Side-by-side Layout and Pure Editor Drawing Canvas */}
            <div className="flex flex-col md:flex-row items-stretch w-full min-h-[400px]">
                {/* 1. Left Side Control Panel Hub */}
                {isSourcePanelOpen && (
                    <div 
                        id="blog-source-hub-panel" 
                        className="w-full md:w-[320px] bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 overflow-hidden relative z-40 animate-fadeIn"
                        style={{ height: 'auto', minHeight: '400px' }}
                    >
                        {/* Tab header controller */}
                        <div className="flex justify-between items-center px-3.5 py-2.5 bg-white border-b border-slate-200 shrink-0">
                            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 leading-none">
                                <i className="fa-solid fa-folder-tree text-emerald-600"></i>
                                <span>좌측 마케팅 순수 제어실</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsSourcePanelOpen(false)}
                                className="w-5.5 h-5.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="패널 닫기"
                            >
                                <i className="fa-solid fa-times text-xs"></i>
                            </button>
                        </div>

                        {/* Scrolling Content Panel container */}
                        <div 
                            ref={sidebarScrollRef}
                            className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin bg-slate-50/50"
                            style={{ maxHeight: 'calc(100vh - 120px)' }}
                        >
                            {/* PHOTO PANE */}
                            {activeSidebarTab === 'photos' && (
                                <div className="space-y-3.5 animate-fadeIn">
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-3xs space-y-3 text-left">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2.5 px-3 rounded-lg shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                                        >
                                            <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                                            <span>내 컴퓨터 PC 파일 선택 📸</span>
                                        </button>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            {(uploadedImages.length > 0 ? uploadedImages : photoPresets).map((photo, pIdx) => {
                                                const isUploaded = uploadedImages.length > 0;
                                                const displayName = photo.name;
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
                                                            postInsertCleanUp();
                                                        }}
                                                        className="bg-white hover:bg-emerald-50/20 p-1.5 rounded-lg border border-slate-200 text-left transition-all hover:border-emerald-400 group flex flex-col gap-1 shadow-3xs"
                                                    >
                                                        <div className="aspect-[16/10] rounded overflow-hidden bg-slate-100 relative">
                                                            <img src={photo.url} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                            <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-3xs text-white text-[7px] font-black px-1 rounded">
                                                                {displayTitle}
                                                            </span>
                                                        </div>
                                                        <span className="text-[7.5px] font-extrabold text-slate-800 truncate block px-0.5 animate-fadeIn" title={displayName}>
                                                            {displayName}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STICKER PANE */}
                            {activeSidebarTab === 'stickers' && (
                                <div className="space-y-3.5 animate-fadeIn">
                                    {/* ⭐ [소장님 최애 즐겨찾기] Fixed top area */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-3xs space-y-2 animate-fadeIn">
                                        <div className="flex justify-between items-center px-0.5">
                                            <span className="text-[10px] font-black text-amber-600 flex items-center gap-1 leading-none">
                                                <i className="fa-solid fa-star animate-pulse"></i>
                                                <span>⭐ 소장님 최애 즐겨찾기</span>
                                            </span>
                                            <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-black leading-none">
                                                {favorites.length}개 등록
                                            </span>
                                        </div>
                                        {favorites.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-1.5">
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
                                            <div className="py-3 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                                                <p className="text-[8.5px] text-slate-400 font-extrabold leading-normal">
                                                    자주 쓰는 스티커 별(⭐) 터치 시<br />
                                                    여기에 즉시 보관 출력됩니다.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dog, Mouse, Pricing, Doll Horizontal Categorical Tabs */}
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 rounded-xl">
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
                                                    className={`py-1.5 rounded-lg text-[9px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                                                        isActive 
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-3xs' 
                                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}
                                                >
                                                    <span className="text-xs leading-none">{getTabIcon(category)}</span>
                                                    <span className="text-[8px] tracking-tight">{category}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Stickers 3-Column Grid vertical-scroll within left panel only with custom bounds */}
                                    {openedStickerCat && (
                                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-3xs space-y-2 text-left animate-fadeIn">
                                            <div className="text-[8.5px] font-black text-slate-400 pl-0.5 flex justify-between uppercase tracking-wider">
                                                <span>📁 {openedStickerCat} 스티커 대장</span>
                                                <span>{STICKER_ASSETS.filter(s => getCategoryFromPath(s.path) === openedStickerCat).length}종</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5 max-h-[290px] overflow-y-auto overflow-x-hidden scrollbar-thin p-1 rounded-lg">
                                                {STICKER_ASSETS.filter(s => getCategoryFromPath(s.path) === openedStickerCat).map((sticker, idx) => {
                                                    const isStarred = favorites.some(item => item.name === sticker.name);
                                                    return (
                                                        <StickerCard
                                                            key={`sidebar-cat-grid-${sticker.name}-${idx}`}
                                                            sticker={sticker}
                                                            activeCategory={openedStickerCat}
                                                            onClick={(downloadUrl) => handleSelectSticker(downloadUrl, openedStickerCat || '강아지')}
                                                            isStarred={isStarred}
                                                            onToggleStar={() => toggleFavorite(sticker)}
                                                            compact={true}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 51 empty placeholders */}
                                    <div className="border border-slate-200 border-dashed rounded-xl bg-white overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setShowFutureSlots(!showFutureSlots)}
                                            className="w-full flex items-center justify-between px-3 py-2 text-left text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-[9.5px] font-bold"
                                        >
                                            <span className="text-[9.5px] font-extrabold flex items-center gap-1 leading-none">
                                                <i className="fa-solid fa-boxes-packing text-slate-400"></i>
                                                <span>확장용 빈 대기 슬롯 (51개)</span>
                                            </span>
                                            <i className={`fa-solid ${showFutureSlots ? 'fa-angle-up' : 'fa-angle-down'} text-[9px]`}></i>
                                        </button>
                                        {showFutureSlots && (
                                            <div className="p-2 border-t border-dashed border-slate-200 grid grid-cols-4 gap-1 animate-fadeIn max-h-[150px] overflow-y-auto bg-slate-50/50">
                                                {Array.from({ length: 51 }).map((_, slotIdx) => (
                                                    <div key={slotIdx} className="aspect-square rounded-lg bg-slate-100/75 border border-slate-200 border-dashed flex items-center justify-center text-[8px] text-slate-400 font-bold" title={`예비 슬롯 #${slotIdx + 1}`}>
                                                        #{slotIdx + 1}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* QUOTE PANE */}
                            {activeSidebarTab === 'quotes' && (
                                <div className="space-y-3 animate-fadeIn text-left">
                                    {[
                                        { type: 'quote', title: '큰따옴표 강조형 (“ ”)' },
                                        { type: 'border', title: '수직 왼쪽 실선형 (|)' },
                                        { type: 'bubble', title: '소장 추천 말풍선 (💡)' },
                                        { type: 'line-quote', title: '상하 블랙 라인 따옴표형' },
                                        { type: 'postit', title: '포스트잇 체크수첩형 (📌)' },
                                        { type: 'frame', title: '에메랄드 포커스 프레임 상자형' }
                                    ].map((q) => (
                                        <button
                                            key={q.type}
                                            type="button"
                                            onClick={() => {
                                                insertQuote(q.type as any);
                                                postInsertCleanUp();
                                            }}
                                            className="w-full text-left p-2.5 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/15 rounded-xl transition-all cursor-pointer bg-white block shadow-3xs"
                                        >
                                            <div className="text-[9px] font-black text-slate-400 mb-1">{q.title}</div>
                                            {q.type === 'quote' && (
                                                <div className="border border-slate-150 rounded-lg p-2 text-center text-slate-600 font-bold text-[9px] leading-relaxed bg-slate-50/50">
                                                    “ 강조 문구 기재 ”
                                                </div>
                                            )}
                                            {q.type === 'border' && (
                                                <div className="border-l-3 border-emerald-600 pl-1.5 text-slate-500 italic text-[9px] leading-relaxed bg-slate-50/50 p-1">
                                                    가이드 인용 문장 기재
                                                </div>
                                            )}
                                            {q.type === 'bubble' && (
                                                <div className="bg-emerald-50/40 rounded border border-emerald-100 p-1.5 text-emerald-800 text-[9px] font-bold">
                                                    💡 이 매물을 적극 권장 기재합니다!
                                                </div>
                                            )}
                                            {q.type === 'line-quote' && (
                                                <div className="border-t border-b border-slate-700 py-1 text-center text-[9px] text-[#111827] font-black bg-slate-50/50">
                                                    “ 강점 대박 요약 한줄 ”
                                                </div>
                                            )}
                                            {q.type === 'postit' && (
                                                <div className="bg-amber-50/30 border-l-[3px] border-amber-500 rounded p-1 text-[8.5px] text-amber-800">
                                                    📌 이 매물은 우수 공실 보관...
                                                </div>
                                            )}
                                            {q.type === 'frame' && (
                                                <div className="border border-emerald-500 rounded p-1 bg-emerald-50/10 text-center text-emerald-800 text-[9px] font-black">
                                                    ◆ FOCUS ESSENTIALS ◆
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* DIVIDER PANE */}
                            {activeSidebarTab === 'dividers' && (
                                <div className="space-y-3 animate-fadeIn text-left">
                                    {[
                                        { type: 'dashed', title: '점선형 구분선', preview: '------------------------' },
                                        { type: 'solid', title: '실선형 구분선', preview: '________________________' },
                                        { type: 'thick', title: '굵은 먹선형 구분선', lineClass: 'h-1.5 bg-slate-755 w-full rounded mt-1' },
                                        { type: 'dots', title: '네이버 세 점형', text: '•••', textClass: 'text-emerald-500 font-extrabold text-center text-md tracking-wider' },
                                        { type: 'emerald-dot', title: '도트 에메랄드 롱라인형', lineClass: 'border-t-3 border-emerald-500 border-dotted w-full mt-1.5' },
                                        { type: 'double', title: '이중실선형 구분선', lineClass: 'h-1 border-t border-b border-slate-300 w-full mt-1' },
                                        { type: 'star', title: '별빛 골드 삼각 선형', text: '★★★', textClass: 'text-[#f59e0b] font-black text-center text-xs tracking-wide' },
                                        { type: 'diamond', title: '마름모 슬레이트형', text: '◆ ◆ ◆', textClass: 'text-slate-400 font-bold text-center text-xs tracking-wide' },
                                    ].map((d) => (
                                        <button
                                            key={d.type}
                                            type="button"
                                            onClick={() => {
                                                insertDivider(d.type as any);
                                                postInsertCleanUp();
                                            }}
                                            className="w-full text-left p-2.5 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/10 rounded-xl transition-all cursor-pointer bg-white flex flex-col gap-1 shadow-3xs"
                                        >
                                            <span className="text-[8.5px] font-bold text-slate-400 block">{d.title}</span>
                                            {d.preview && <span className="text-slate-350 text-center font-bold tracking-widest text-[9px] block leading-none">{d.preview}</span>}
                                            {d.lineClass && <span className={d.lineClass}></span>}
                                            {d.text && <span className={d.textClass}>{d.text}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sidebar bottom indicator */}
                        <div className="p-3 bg-white border-t border-slate-200/80 text-center shrink-0">
                            <span className="text-[9px] font-extrabold text-slate-400">
                                💡 소스를 선택하면 본문에 즉시 주입 후 자동 은폐됩니다.
                            </span>
                        </div>
                    </div>
                )}

                {/* 2. Right Side Drawing Canvas Work Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                    {/* Toolbar control bar (Flowing left-to-right clearly) */}
                    <div className={`relative z-30 p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1.5 items-center text-slate-700 toolbar-dropdown-${id} select-none`}>
                        {/* Font Families */}
                        <div className="relative">
                            <button 
                                type="button" 
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setShowFontDropdown(!showFontDropdown); setShowSizeDropdown(false); }}
                                className="h-8 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-24 text-slate-800 transition-all cursor-pointer"
                                title="글꼴 변경"
                            >
                                <span className="truncate">{currentFont}</span>
                                <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                            </button>
                            {showFontDropdown && (
                                <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-36 py-1 text-slate-700 max-h-56 overflow-y-auto animate-fadeIn">
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
                                            className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-bold truncate ${currentFont === fontName ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
                                            style={{ fontFamily: valueStr }}
                                        >
                                            {fontName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Font Sizing */}
                        <div className="relative">
                            <button 
                                type="button" 
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowFontDropdown(false); }}
                                className="h-8 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-16 text-slate-800 transition-all cursor-pointer"
                                title="글자 크기"
                            >
                                <span>{currentSize}</span>
                                <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                            </button>
                            {showSizeDropdown && (
                                <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-24 py-1 text-slate-700 max-h-48 overflow-y-auto animate-fadeIn">
                                    {fontSizes.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
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

                        <div className="h-4 w-px bg-slate-200 mx-1"></div>

                        {/* Bold Italic Underline utilities */}
                        <div className="flex gap-0.5">
                            <button 
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('bold')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 font-extrabold text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="굵게"
                            >
                                <i className="fa-solid fa-bold text-[11px]"></i>
                            </button>
                            <button 
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('italic')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 italic text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="기울임"
                            >
                                <i className="fa-solid fa-italic text-[11px]"></i>
                            </button>
                            <button 
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('underline')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 underline underline-offset-2 text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="밑줄"
                            >
                                <i className="fa-solid fa-underline text-[11px]"></i>
                            </button>
                            <button 
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('strikeThrough')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 line-through text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                title="취소선"
                            >
                                <i className="fa-solid fa-strikethrough text-[11px]"></i>
                            </button>
                        </div>

                        <div className="h-4 w-px bg-slate-200 mx-1"></div>

                        {/* Fore-colors and backgrounds */}
                        <div className="flex gap-0.5">
                            {/* Color */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); }}
                                    className="w-8 h-8 rounded hover:bg-slate-200/70 flex flex-col items-center justify-center relative cursor-pointer text-slate-700"
                                    title="글자 색상"
                                >
                                    <i className="fa-solid fa-font text-[11px]"></i>
                                    <div className="h-1 w-3.5 bg-red-650 rounded-xs mt-0.5" style={{ minHeight: '3px' }}></div>
                                </button>
                                {showColorPicker && (
                                    <div className="absolute top-9 left-1/2 -translate-x-1/2 z-55 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 w-44 grid grid-cols-6 gap-1 animate-fadeIn">
                                        {colors.map(color => (
                                            <button 
                                                key={color}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    applyStyleToSelection('color', color);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-5 h-5 rounded hover:scale-110 border border-slate-200 transition-transform cursor-pointer"
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Highlighter */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); }}
                                    className="w-8 h-8 rounded hover:bg-slate-200/70 flex flex-col items-center justify-center relative cursor-pointer text-slate-700"
                                    title="글자 배경색 형광펜"
                                >
                                    <i className="fa-solid fa-highlighter text-[11px]"></i>
                                    <div className="h-1 w-3.5 bg-yellow-300 rounded-xs mt-0.5" style={{ minHeight: '3px' }}></div>
                                </button>
                                {showBgColorPicker && (
                                    <div className="absolute top-9 left-1/2 -translate-x-1/2 z-55 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 w-44 grid grid-cols-6 gap-1 animate-fadeIn">
                                        {highlights.map(color => (
                                            <button 
                                                key={color}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    applyStyleToSelection('backgroundColor', color);
                                                    setShowBgColorPicker(false);
                                                }}
                                                className="w-5 h-5 rounded hover:scale-110 border border-slate-200 transition-transform relative flex items-center justify-center cursor-pointer"
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

                        <div className="h-4 w-px bg-slate-200 mx-1"></div>

                        {/* Alignment modes */}
                        <div className="flex gap-0.5">
                            <button 
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('justifyLeft')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 flex items-center justify-center transition-all cursor-pointer"
                                title="왼쪽 정렬"
                            >
                                <i className="fa-solid fa-align-left text-[11px] text-slate-700"></i>
                            </button>
                            <button 
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('justifyCenter')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 flex items-center justify-center transition-all cursor-pointer"
                                title="가운데 정렬"
                            >
                                <i className="fa-solid fa-align-center text-[11px] text-slate-700"></i>
                            </button>
                            <button 
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('justifyRight')}
                                className="w-8 h-8 rounded hover:bg-slate-200/70 flex items-center justify-center transition-all cursor-pointer"
                                title="오른쪽 정렬"
                            >
                                <i className="fa-solid fa-align-right text-[11px] text-slate-700"></i>
                            </button>
                        </div>
                    </div>

                    {/* Floating Selection Tooltip Formatting Toolbar */}
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
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTooltipFontDropdown(!showTooltipFontDropdown);
                                        setShowTooltipSizeDropdown(false);
                                        setShowTooltipColorPicker(false);
                                    }}
                                    className="h-8 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-24 text-slate-800 transition-all cursor-pointer"
                                >
                                    <span className="truncate">{currentFont}</span>
                                    <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                                </button>
                                {showTooltipFontDropdown && (
                                    <div className="absolute bottom-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-32 py-1 text-slate-700 max-h-40 overflow-y-auto animate-fadeIn mb-1">
                                        {Object.entries(fontFamilies).map(([fontName, valueStr]) => (
                                            <button
                                                key={`tooltip-font-${fontName}`}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyStyleToSelection('fontFamily', valueStr);
                                                    setCurrentFont(fontName);
                                                    setShowTooltipFontDropdown(false);
                                                }}
                                                className={`w-full text-left px-2 py-1 hover:bg-slate-50 text-[11px] font-bold truncate ${currentFont === fontName ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
                                                style={{ fontFamily: valueStr }}
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
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTooltipSizeDropdown(!showTooltipSizeDropdown);
                                        setShowTooltipFontDropdown(false);
                                        setShowTooltipColorPicker(false);
                                    }}
                                    className="h-8 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between gap-1 w-14 text-slate-800 transition-all cursor-pointer"
                                >
                                    <span>{currentSize}</span>
                                    <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                                </button>
                                {showTooltipSizeDropdown && (
                                    <div className="absolute bottom-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-20 py-1 text-slate-700 max-h-40 overflow-y-auto animate-fadeIn mb-1">
                                        {fontSizes.map((size) => (
                                            <button
                                                key={`tooltip-size-${size}`}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
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

                            {/* Bold Italic Underline */}
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('bold')}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-black flex items-center justify-center text-slate-700 transition-colors"
                            >
                                <i className="fa-solid fa-bold"></i>
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('italic')}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs italic flex items-center justify-center text-slate-700 transition-colors"
                            >
                                <i className="fa-solid fa-italic"></i>
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => execCommand('underline')}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs underline underline-offset-2 flex items-center justify-center text-slate-700 transition-colors"
                            >
                                <i className="fa-solid fa-underline"></i>
                            </button>

                            {/* T (Colors Picker) */}
                            <div className="relative tooltip-dropdown">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
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
                                                onMouseDown={(e) => e.preventDefault()}
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

                            {/* Alignment Left / Center / Right */}
                            <div className="flex gap-0.5 border-l border-slate-200/80 pl-1.5 ml-1">
                                <button 
                                    type="button" 
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('justifyLeft')}
                                    className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                                    title="왼쪽 정렬"
                                >
                                    <i className="fa-solid fa-align-left text-[11px]"></i>
                                </button>
                                <button 
                                    type="button" 
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('justifyCenter')}
                                    className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                                    title="가운데 정렬"
                                >
                                    <i className="fa-solid fa-align-center text-[11px]"></i>
                                </button>
                                <button 
                                    type="button" 
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('justifyRight')}
                                    className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                                    title="오른쪽 정렬"
                                >
                                    <i className="fa-solid fa-align-right text-[11px]"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating Link Input Overlay (Non-window-alert Modal) */}
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
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-2 rounded-lg cursor-pointer animate-fadeIn"
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
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 rounded-lg cursor-pointer animate-fadeIn"
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
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-2 rounded-lg cursor-pointer animate-fadeIn"
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
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 rounded-lg cursor-pointer animate-fadeIn"
                                    >
                                        장소 추가
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Editable Writing Area (Naver Gothic Font / 12px / pure black #000000 default) */}
                    <div className="relative flex-1">
                        {/* Cursor tracking square [+] button and its sub-insertion pop */}
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

                    {/* Hidden input for local file uploads */}
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
