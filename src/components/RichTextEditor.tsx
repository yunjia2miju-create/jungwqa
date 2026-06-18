import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    id: string;
    uploadedImages?: { name: string; url: string }[];
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = '여기에 내용을 입력하세요...',
    minHeight = '250px',
    id,
    uploadedImages = []
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Selection Formatting Tooltip States (Image 1)
    const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
    const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
    const [showTooltipFontDropdown, setShowTooltipFontDropdown] = useState(false);
    const [showTooltipSizeDropdown, setShowTooltipSizeDropdown] = useState(false);

    // Naver Blog Quick Add Menu States (Image 2)
    const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
    const [quickAddCoords, setQuickAddCoords] = useState<{ top: number; left: number } | null>(null);
    const [quickAddMenuSub, setQuickAddMenuSub] = useState<'main' | 'sticker' | 'photo' | 'divider' | 'quote'>('main');

    // Circular Floating Plus Button States
    const [plusButtonY, setPlusButtonY] = useState<number | null>(null);
    const [showPlusButton, setShowPlusButton] = useState(false);

    // Dropdown States
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);

    // Current Style States
    const [currentFont, setCurrentFont] = useState('기본서체');
    const [currentSize, setCurrentSize] = useState('16px');

    // Font family configurations
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

    // Font size configurations
    const fontSizes = ['16px', '19px', '24px', '30px', '36px'];

    // Professional color palette matching Naver Blog palette & branding
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
        }
    }, [value, isMounted]);

    // Update innerHTML when external value changes completely
    useEffect(() => {
        if (editorRef.current && isMounted && value !== editorRef.current.innerHTML) {
            // Keep content synced but avoid cursor resetting if it's the active typing element
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

    // General commands
    const execCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    // Safe direct styling using Selection Range
    const applyStyleToSelection = (styleName: string, styleValue: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        if (selection.isCollapsed) {
            // If text is not selected, configure the execCommand or styling for next typed character
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
            
            // Re-select applied text for smooth workflow
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

    // Special Naver-blog quote elements
    const insertQuote = (type: 'border' | 'box' | 'bubble') => {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : '';
        const defaultText = selectedText || '중요한 문장이나 소견을 이곳에 입력하여 강조하세요.';
        
        let quoteHtml = '';
        if (type === 'border') {
            quoteHtml = `<blockquote style="border-left: 4px solid #10b981; padding-left: 16px; margin: 16px 0; color: #475569; font-style: italic; font-weight: 500;">
                "${defaultText}"
            </blockquote><p><br></p>`;
        } else if (type === 'box') {
            quoteHtml = `<blockquote style="background-color: #f8fafc; border: 1px border-solid #e2e8f0; padding: 20px; margin: 16px 0; color: #1e293b; border-radius: 12px; font-weight: 500; text-align: center; border-left: 5px solid #10b981;">
                "${defaultText}"
            </blockquote><p><br></p>`;
        } else {
            quoteHtml = `<blockquote style="background-color: #ecfdf5; border-radius: 16px; padding: 16px; margin: 16px 0; color: #065f46; position: relative; border: 1px solid #a7f3d0;">
                <div style="font-weight: 800; margin-bottom: 4px; font-size: 13px; color: #10b981;">💡 소장님 추천 한마디</div>
                <div>"${defaultText}"</div>
            </blockquote><p><br></p>`;
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

    // Horizontal dividers
    const insertDivider = (type: 'dashed' | 'solid' | 'double') => {
        let borderStyle = 'border-top: 2px dashed #cbd5e1;';
        if (type === 'solid') borderStyle = 'border-top: 2px solid #e2e8f0;';
        if (type === 'double') borderStyle = 'border-top: 4px double #cbd5e1;';

        const dividerHtml = `<div style="padding: 12px 0; margin: 8px 0;"><div style="${borderStyle} width: 100%;"></div></div><p><br></p>`;

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

    // Real Estate themed blog stickers
    const stickerTemplates = [
        { icon: '⭐', label: '최고강추', color: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
        { icon: '🏠', label: '실사완료', color: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
        { icon: '💎', label: '단독독점', color: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
        { icon: '📝', label: '계약유력', color: '#fff7ed', text: '#c2410c', border: '#ffedd5' },
        { icon: '🚗', label: '주차완벽', color: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
        { icon: '💡', label: '소장추천', color: '#fffde7', text: '#a16207', border: '#fef3c7' },
        { icon: '🌿', label: '친환경방', color: '#f0fdfa', text: '#0f766e', border: '#ccfbf1' },
        { icon: '💸', label: '월세전환', color: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
        { icon: '🐕', label: '반려가능', color: '#fafaf9', text: '#44403c', border: '#e7e5e4' }
    ];

    // High resolution aesthetic photo presets for real estate
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
            
            // Move cursor position after the element
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

    // Caret line position and Selection tracker (Naver Blog workflow)
    const updatePlusButtonAndSelection = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorRef.current) {
            setShowPlusButton(false);
            setShowSelectionToolbar(false);
            return;
        }

        const range = sel.getRangeAt(0);
        if (!editorRef.current.contains(range.commonAncestorContainer)) {
            setShowPlusButton(false);
            setShowSelectionToolbar(false);
            return;
        }

        // 1. Highlight Selections Formatting Tooltip (Image #1)
        if (!sel.isCollapsed && sel.toString().trim().length > 0) {
            const rect = range.getBoundingClientRect();
            const container = containerRef.current;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const leftOffset = rect.left - containerRect.left + (rect.width / 2);
                const topOffset = rect.top - containerRect.top - 78;

                const halfWidth = 290; // Adjusted for 1.5x enlargement (~580px total width) to ensure it stays fully inside the editor bounds
                let safeLeft = leftOffset;
                if (containerRect.width >= halfWidth * 2) {
                    safeLeft = Math.max(halfWidth, Math.min(containerRect.width - halfWidth, leftOffset));
                } else {
                    safeLeft = containerRect.width / 2;
                }

                setSelectionCoords({
                    top: Math.max(10, topOffset),
                    left: safeLeft
                });
                setShowSelectionToolbar(true);
            }
        } else {
            setShowSelectionToolbar(false);
        }

        // 2. Floating Circular Green Plus Button (Naver Blog Style)
        const rects = range.getClientRects();
        let caretRect = rects.length > 0 ? rects[0] : null;

        if (!caretRect) {
            caretRect = range.getBoundingClientRect();
        }

        const container = containerRef.current;
        if (caretRect && container && caretRect.top > 0) {
            const containerRect = container.getBoundingClientRect();
            const plusWidth = 24;
            const relativeY = caretRect.top - containerRect.top + (caretRect.height / 2) - (plusWidth / 2);
            
            // Keep inside typing frame vertical range
            if (relativeY > 40 && relativeY < containerRect.height - 40) {
                setPlusButtonY(relativeY);
                setShowPlusButton(true);
            } else {
                setShowPlusButton(false);
            }
        } else {
            setShowPlusButton(false);
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

    // Close options when clicking outside
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
            }
            if (!elem.closest('.rich-text-editor-relative-wrapper')) {
                setShowQuickAddMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [id]);

    return (
        <div 
            ref={containerRef}
            className="relative w-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all rich-text-editor-relative-wrapper"
        >
            
            {/* Nav style Editor Toolbar */}
            <div className={`relative z-30 p-1.5 sm:p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1 items-center text-slate-700 toolbar-dropdown-${id} select-none rounded-t-xl`}>
                
                {/* Font selector */}
                <div className="relative">
                    <button 
                        type="button" 
                        onClick={() => { setShowFontDropdown(!showFontDropdown); setShowSizeDropdown(false); }}
                        className="h-8 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-bold flex items-center justify-between gap-1 w-28 text-slate-800 transition-all cursor-pointer"
                        title="글꼴 변경"
                    >
                        <span className="truncate">{currentFont}</span>
                        <i className="fa-solid fa-chevron-down text-[9px] text-slate-400"></i>
                    </button>
                    {showFontDropdown && (
                        <div 
                            className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded shadow-xl w-36 py-1 text-slate-700 animate-fadeIn h-auto max-h-none overflow-visible"
                            style={{ height: 'auto', maxHeight: 'none', overflow: 'visible' }}
                        >
                            {Object.entries(fontFamilies).map(([fontName, value]) => (
                                <button
                                    key={fontName}
                                    type="button"
                                    onClick={() => {
                                        applyStyleToSelection('fontFamily', value);
                                        setCurrentFont(fontName);
                                        setShowFontDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold ${currentFont === fontName ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
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
                        className="h-8 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-bold flex items-center justify-between gap-1 w-16 text-slate-800 transition-all cursor-pointer"
                        title="글자 크기"
                    >
                        <span>{currentSize}</span>
                        <i className="fa-solid fa-chevron-down text-[9px] text-slate-400"></i>
                    </button>
                    {showSizeDropdown && (
                        <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded shadow-xl w-24 py-1 text-slate-700 max-h-48 overflow-y-auto animate-fadeIn">
                            {fontSizes.map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => {
                                        applyStyleToSelection('fontSize', size);
                                        setShowSizeDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold ${currentSize === size ? 'text-emerald-600 bg-emerald-50/20 font-black' : ''}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Divide Bar */}
                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                {/* Text Styles */}
                <div className="flex gap-0.5">
                    <button 
                        type="button"
                        onClick={() => execCommand('bold')}
                        className="w-8 h-8 rounded hover:bg-slate-200 font-extrabold text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                        title="굵게 (Ctrl+B)"
                    >
                        <i className="fa-solid fa-bold"></i>
                    </button>
                    <button 
                        type="button"
                        onClick={() => execCommand('italic')}
                        className="w-8 h-8 rounded hover:bg-slate-200 italic text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                        title="기울임꼴 (Ctrl+I)"
                    >
                        <i className="fa-solid fa-italic"></i>
                    </button>
                    <button 
                        type="button"
                        onClick={() => execCommand('underline')}
                        className="w-8 h-8 rounded hover:bg-slate-200 underline underline-offset-2 text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                        title="밑줄 (Ctrl+U)"
                    >
                        <i className="fa-solid fa-underline"></i>
                    </button>
                    <button 
                        type="button"
                        onClick={() => execCommand('strikeThrough')}
                        className="w-8 h-8 rounded hover:bg-slate-200 line-through text-xs text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                        title="취소선"
                    >
                        <i className="fa-solid fa-strikethrough"></i>
                    </button>
                </div>

                {/* Divide Bar */}
                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                {/* Color Pickers */}
                <div className="flex gap-1.5">
                    {/* ForeColor */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => { setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); }}
                            className="w-8 h-8 rounded hover:bg-slate-200 flex flex-col items-center justify-center relative cursor-pointer"
                            title="글자 색상"
                        >
                            <i className="fa-solid fa-font text-xs"></i>
                            <div className="h-1 w-4 bg-red-600 rounded-sm mt-0.5"></div>
                        </button>
                        {showColorPicker && (
                            <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2.5 w-44 grid grid-cols-6 gap-1 animate-fadeIn">
                                {colors.map(color => (
                                    <button 
                                        key={color}
                                        type="button"
                                        onClick={() => {
                                            applyStyleToSelection('color', color);
                                            setShowColorPicker(false);
                                        }}
                                        className="w-5 h-5 rounded-md border border-slate-200/50 cursor-pointer shadow-sm hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* HiliteColor / Background Color */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); }}
                            className="w-8 h-8 rounded hover:bg-slate-200 flex flex-col items-center justify-center relative cursor-pointer"
                            title="글자 배경 형광펜"
                        >
                            <i className="fa-solid fa-highlighter text-xs"></i>
                            <div className="h-1 w-4 bg-yellow-300 rounded-sm mt-0.5"></div>
                        </button>
                        {showBgColorPicker && (
                            <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2.5 w-44 grid grid-cols-6 gap-1 animate-fadeIn">
                                {highlights.map(color => (
                                    <button 
                                        key={color}
                                        type="button"
                                        onClick={() => {
                                            applyStyleToSelection('backgroundColor', color);
                                            setShowBgColorPicker(false);
                                        }}
                                        className="w-5 h-5 rounded-md border border-slate-200/50 cursor-pointer shadow-sm hover:scale-110 transition-transform relative flex items-center justify-center"
                                        style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                                        title={color === 'transparent' ? '지우기' : color}
                                    >
                                        {color === 'transparent' && <i className="fa-solid fa-slash text-[8px] text-red-500"></i>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Divide Bar */}
                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                {/* Alignment */}
                <div className="flex gap-0.5">
                    <button 
                        type="button"
                        onClick={() => execCommand('justifyLeft')}
                        className="w-8 h-8 rounded hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                        title="왼쪽 정렬"
                    >
                        <i className="fa-solid fa-align-left text-xs text-slate-700"></i>
                    </button>
                    <button 
                        type="button"
                        onClick={() => execCommand('justifyCenter')}
                        className="w-8 h-8 rounded hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                        title="가운데 정렬"
                    >
                        <i className="fa-solid fa-align-center text-xs text-slate-700"></i>
                    </button>
                    <button 
                        type="button"
                        onClick={() => execCommand('justifyRight')}
                        className="w-8 h-8 rounded hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                        title="오른쪽 정렬"
                    >
                        <i className="fa-solid fa-align-right text-xs text-slate-700"></i>
                    </button>
                </div>

                {/* Divide Bar */}
                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                {/* Insert Elements */}
                <div className="flex gap-1">
                    {/* Quotes Dropdown */}
                    <div className="flex items-center">
                        <button 
                            type="button"
                            onClick={() => insertQuote('border')}
                            className="h-8 px-1.5 gap-1 rounded hover:bg-slate-200 flex items-center justify-center text-[10px] sm:text-xs font-black text-slate-700 cursor-pointer border border-slate-200/40"
                            title="왼쪽 실선 인용구 삽입"
                        >
                            <i className="fa-solid fa-quote-left text-emerald-600 text-[10px]"></i>
                            <span>인용구</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => insertQuote('bubble')}
                            className="h-8 w-4 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 border border-l-0 border-slate-200/40 cursor-pointer"
                            title="다양한 인용구 추천 박스 삽입"
                        >
                            <i className="fa-solid fa-angle-right text-[8px]"></i>
                        </button>
                    </div>

                    {/* Dividers */}
                    <div className="flex items-center">
                        <button 
                            type="button"
                            onClick={() => insertDivider('dashed')}
                            className="h-8 px-1.5 gap-1 rounded hover:bg-slate-200 flex items-center justify-center text-[10px] sm:text-xs font-black text-slate-700 cursor-pointer border border-slate-200/40"
                            title="구분 점선 삽입"
                        >
                            <i className="fa-solid fa-minus text-slate-500 text-[10px]"></i>
                            <span>구분선</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => insertDivider('solid')}
                            className="h-8 w-4 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 border border-l-0 border-slate-200/40 cursor-pointer"
                            title="실선 구분선 삽입"
                        >
                            <i className="fa-solid fa-angle-right text-[8px]"></i>
                        </button>
                    </div>
                </div>

                {/* Quick Add Menu Shortcut in Toolbar */}
                <button
                    type="button"
                    onClick={() => {
                        const containerRect = containerRef.current?.getBoundingClientRect();
                        setQuickAddCoords({
                            top: 50,
                            left: (containerRect?.width || 300) - 200
                        });
                        setQuickAddMenuSub('main');
                        setShowQuickAddMenu(!showQuickAddMenu);
                    }}
                    className="h-8 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-extrabold text-[11px] sm:text-xs text-white flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all ml-1.5"
                    title="블로그 소스 추가 메뉴 (사이드 팝업)"
                >
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    <span className="hidden sm:inline">초고속 편집</span>
                </button>

                {/* Divide Bar */}
                <div className="h-4 w-px bg-slate-300 mx-1 hidden lg:block"></div>

                {/* Undo / Redo */}
                <div className="flex gap-0.5 ml-auto">
                    <button 
                        type="button"
                        onClick={() => execCommand('undo')}
                        className="w-8 h-8 rounded hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                        title="되돌리기 (Ctrl+Z)"
                    >
                        <i className="fa-solid fa-rotate-left text-xs"></i>
                    </button>
                    <button 
                        type="button"
                        onClick={() => execCommand('redo')}
                        className="w-8 h-8 rounded hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                        title="다시 실행 (Ctrl+Y)"
                    >
                        <i className="fa-solid fa-rotate-right text-xs"></i>
                    </button>
                </div>
            </div>

            {/* Circular Floating Plus Button (Naver / Medium style) */}
            {showPlusButton && plusButtonY !== null && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Open quick-add menu right next to the plus button
                        setQuickAddCoords({
                            top: plusButtonY - 10,
                            left: 36 // positioned nicely next to left margin helper
                        });
                        setQuickAddMenuSub('main');
                        setShowQuickAddMenu(!showQuickAddMenu);
                    }}
                    style={{ top: `${plusButtonY}px` }}
                    className="absolute left-2.5 z-40 w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center cursor-pointer shadow-md transition-all text-[11px] border border-emerald-400"
                    title="초고속 편집 메뉴 열기 (+)"
                >
                    <i className={`fa-solid ${showQuickAddMenu ? 'fa-times' : 'fa-plus'} transition-transform duration-200`}></i>
                </button>
            )}

            {/* Floating Selection Tooltip Formatting Toolbar (Image 1) - 1.5x Enlarged */}
            {showSelectionToolbar && selectionCoords && (
                <div 
                    style={{ 
                        top: `${selectionCoords.top}px`, 
                        left: `${selectionCoords.left}px`,
                        transform: 'translateX(-50%)'
                    }}
                    className="absolute z-50 bg-white text-slate-800 rounded-2xl shadow-xl p-2.5 flex items-center gap-2 border border-[#E2E8F0] animate-slideUpAndFade select-none"
                >
                    {/* Tooltip Font Selector */}
                    <div className="relative tooltip-dropdown">
                        <button 
                            type="button" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTooltipFontDropdown(!showTooltipFontDropdown);
                                setShowTooltipSizeDropdown(false);
                            }}
                            className="h-11 px-3 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-sm font-bold flex items-center justify-between gap-2 w-36 text-slate-800 hover:text-emerald-600 transition-all cursor-pointer"
                            title="글꼴 변경"
                        >
                            <span className="truncate">{currentFont}</span>
                            <i className="fa-solid fa-chevron-down text-xs text-slate-400"></i>
                        </button>
                        {showTooltipFontDropdown && (
                            <div 
                                className="absolute bottom-12 left-0 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl w-48 py-2 text-slate-800 animate-fadeIn mb-2 h-auto max-h-none overflow-visible"
                                style={{ height: 'auto', maxHeight: 'none', overflow: 'visible' }}
                            >
                                {Object.entries(fontFamilies).map(([fontName, value]) => (
                                    <button
                                        key={fontName}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            applyStyleToSelection('fontFamily', value);
                                            setCurrentFont(fontName);
                                            setShowTooltipFontDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-emerald-700 text-sm font-semibold transition-colors ${currentFont === fontName ? 'text-emerald-600 font-extrabold bg-emerald-50/40' : 'text-slate-700 text-[#333333]'}`}
                                        style={{ fontFamily: value }}
                                    >
                                        {fontName}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tooltip Font Size Selector */}
                    <div className="relative tooltip-dropdown font-mono">
                        <button 
                            type="button" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTooltipSizeDropdown(!showTooltipSizeDropdown);
                                setShowTooltipFontDropdown(false);
                            }}
                            className="h-11 px-2.5 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-sm font-bold flex items-center justify-between gap-2 w-21 text-slate-800 hover:text-emerald-600 transition-all cursor-pointer"
                            title="글자 크기"
                        >
                            <span>{currentSize}</span>
                            <i className="fa-solid fa-chevron-down text-xs text-slate-400"></i>
                        </button>
                        {showTooltipSizeDropdown && (
                            <div className="absolute bottom-12 left-0 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl w-28 py-2 text-slate-800 max-h-48 overflow-y-auto animate-fadeIn mb-2">
                                {fontSizes.map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            applyStyleToSelection('fontSize', size);
                                            setCurrentSize(size);
                                            setShowTooltipSizeDropdown(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2 hover:bg-emerald-50 hover:text-emerald-700 text-sm font-semibold transition-colors ${currentSize === size ? 'text-emerald-600 font-extrabold bg-emerald-50/40' : 'text-slate-700 text-[#333333]'}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>

                    <button
                        type="button"
                        onClick={() => execCommand('bold')}
                        className="w-10 h-10 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-[15px] font-extrabold flex items-center justify-center text-slate-700 transition-colors"
                        title="굵게"
                    >
                        <i className="fa-solid fa-bold"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('italic')}
                        className="w-10 h-10 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-[15px] italic flex items-center justify-center text-slate-700 transition-colors"
                        title="기울임"
                    >
                        <i className="fa-solid fa-italic"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('underline')}
                        className="w-10 h-10 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-[15px] underline underline-offset-2 flex items-center justify-center text-slate-700 transition-colors"
                        title="밑줄"
                    >
                        <i className="fa-solid fa-underline"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('strikeThrough')}
                        className="w-10 h-10 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-[15px] line-through flex items-center justify-center text-slate-700 transition-colors"
                        title="취소선"
                    >
                        <i className="fa-solid fa-strikethrough"></i>
                    </button>

                    <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>

                    {/* Pre-styled color selectors for high-speed selection formatting */}
                    <button
                        type="button"
                        onClick={() => applyStyleToSelection('color', '#dc2626')}
                        className="w-6 h-6 rounded-full bg-red-600 hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-[#E2E8F0]"
                        title="빨간색 적용"
                    />
                    <button
                        type="button"
                        onClick={() => applyStyleToSelection('color', '#16a34a')}
                        className="w-6 h-6 rounded-full bg-emerald-600 hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-[#E2E8F0]"
                        title="녹색 적용"
                    />
                    <button
                        type="button"
                        onClick={() => applyStyleToSelection('color', '#2563eb')}
                        className="w-6 h-6 rounded-full bg-blue-600 hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-[#E2E8F0]"
                        title="파란색 적용"
                    />

                    <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>

                    <button
                        type="button"
                        onClick={() => applyStyleToSelection('backgroundColor', '#fef08a')}
                        className="w-6 h-6 rounded-md bg-yellow-300 hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-[#E2E8F0]"
                        title="노란 형광펜"
                    />
                    <button
                        type="button"
                        onClick={() => applyStyleToSelection('backgroundColor', '#bbf7d0')}
                        className="w-6 h-6 rounded-md bg-green-200 hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-[#E2E8F0]"
                        title="녹색 형광펜"
                    />
                </div>
            )}

            {/* Naver Blog Style Quick Insert Menu (Image 2) */}
            {showQuickAddMenu && quickAddCoords && (
                <div 
                    style={{ 
                        top: `${quickAddCoords.top}px`, 
                        left: `${quickAddCoords.left}px` 
                    }}
                    className="absolute z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-80 sm:w-[380px] md:w-[410px] overflow-hidden animate-fadeIn border-t-4 border-t-emerald-500"
                >
                    {/* Header with Title and Close 'X' button */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/70 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <i className="fa-solid fa-cube text-emerald-500 animate-pulse text-[14px]"></i>
                            블로그 소스 추가
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowQuickAddMenu(false)}
                            className="w-7 h-7 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
                        >
                            <i className="fa-solid fa-times text-[12px]"></i>
                        </button>
                    </div>

                    {/* Sub-menu rendering */}
                    {quickAddMenuSub === 'main' && (
                        <div className="p-3.5 flex flex-col gap-2.5 bg-white">
                            <button
                                type="button"
                                onClick={() => setQuickAddMenuSub('photo')}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-between cursor-pointer border border-transparent transition-all shadow-sm bg-slate-50/50 text-slate-700"
                            >
                                <span className="flex items-center gap-3">
                                    <i className="fa-solid fa-image text-blue-500 text-base w-5 text-center"></i>
                                    사진 추가 (실사 위주)
                                </span>
                                <i className="fa-solid fa-angle-right text-[12px] text-slate-400"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickAddMenuSub('sticker')}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-between cursor-pointer border border-transparent transition-all shadow-sm bg-slate-50/50 text-slate-700"
                            >
                                <span className="flex items-center gap-3">
                                    <i className="fa-solid fa-face-smile text-amber-500 text-base w-5 text-center"></i>
                                    감성 스티커 삽입
                                </span>
                                <i className="fa-solid fa-angle-right text-[12px] text-slate-400"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickAddMenuSub('divider')}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-between cursor-pointer border border-transparent transition-all shadow-sm bg-slate-50/50 text-slate-700"
                            >
                                <span className="flex items-center gap-3">
                                    <i className="fa-solid fa-minus text-emerald-500 text-base w-5 text-center"></i>
                                    구분선 삽입 (경계 구분)
                                </span>
                                <i className="fa-solid fa-angle-right text-[12px] text-slate-400"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickAddMenuSub('quote')}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-between cursor-pointer border border-transparent transition-all shadow-sm bg-slate-50/50 text-slate-700"
                            >
                                <span className="flex items-center gap-3">
                                    <i className="fa-solid fa-quote-left text-indigo-500 text-base w-5 text-center"></i>
                                    인용구 삽입 (강조 문구)
                                </span>
                                <i className="fa-solid fa-angle-right text-[12px] text-slate-400"></i>
                            </button>
                        </div>
                    )}

                    {/* Photo selection submenu */}
                    {quickAddMenuSub === 'photo' && (
                        <div className="p-3.5 sm:p-4 space-y-3 bg-white">
                            <button 
                                type="button"
                                onClick={() => setQuickAddMenuSub('main')}
                                className="text-xs font-bold text-slate-450 hover:text-emerald-600 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-caret-left"></i> 이전으로
                            </button>
                            <div className="grid grid-cols-1 gap-3 max-h-[440px] overflow-y-auto pr-1">
                                {(uploadedImages.length > 0 ? uploadedImages : photoPresets).map((photo, photoIndex) => (
                                    <button
                                        key={photoIndex + '-' + photo.name}
                                        type="button"
                                        onClick={() => {
                                            const photoHtml = `
                                                <div contenteditable="false" style="margin: 20px auto; text-align: center; max-width: 100%;">
                                                    <img src="${photo.url}" referrerPolicy="no-referrer" style="border-radius:12px; max-width:100%; height:auto; border: 1px solid #e2e8f0; display: block; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.06);" />
                                                    <p style="font-size: 11px; color:#64748b; font-weight:700; margin-top: 6px; text-align: center;">📸 실사 촬영 이미지 - ${photo.name}</p>
                                                </div>
                                                <p contenteditable="true"><br></p>
                                            `;
                                            insertHtml(photoHtml);
                                            setShowQuickAddMenu(false);
                                        }}
                                        className="bg-slate-50 hover:bg-emerald-50 text-left p-2.5 sm:p-3 rounded-xl border border-slate-200/60 flex items-center gap-3 sm:gap-4 transition-all cursor-pointer shadow-sm hover:border-emerald-300 group"
                                    >
                                        <div className="w-24 h-16 sm:w-28 sm:h-20 md:w-32 md:h-22 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 bg-slate-100">
                                            <img src={photo.url} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1 py-1">
                                            <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{photo.name}</span>
                                            <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-1 leading-snug">클릭 시 본문에 선명한 고품질 사진 삽입</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sticker selection submenu */}
                    {quickAddMenuSub === 'sticker' && (
                        <div className="p-3.5 sm:p-4 space-y-3 bg-white">
                            <button 
                                type="button"
                                onClick={() => setQuickAddMenuSub('main')}
                                className="text-xs font-bold text-slate-450 hover:text-emerald-600 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-caret-left"></i> 이전으로
                            </button>
                            <div className="grid grid-cols-3 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                                {stickerTemplates.map((sticker) => (
                                    <button
                                        key={sticker.label}
                                        type="button"
                                        onClick={() => {
                                            const stickerHtml = `
                                                <span contenteditable="false" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 9999px; background-color: ${sticker.color}; color: ${sticker.text}; border: 1px solid ${sticker.border}; font-weight: bold; font-size: 11px; margin: 2px; vertical-align: middle; user-select: none;">
                                                    <span>${sticker.icon}</span>
                                                    <span>${sticker.label}</span>
                                                </span>&nbsp;
                                            `;
                                            insertHtml(stickerHtml);
                                            setShowQuickAddMenu(false);
                                        }}
                                        className="text-center p-2.5 bg-slate-50/50 hover:bg-emerald-50 rounded-xl border border-slate-200/60 hover:border-emerald-300 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm group"
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform">{sticker.icon}</span>
                                        <span className="text-[10px] sm:text-xs font-bold text-slate-600 truncate mt-1.5 group-hover:text-emerald-700">{sticker.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Divider selection submenu */}
                    {quickAddMenuSub === 'divider' && (
                        <div className="p-3.5 sm:p-4 bg-white flex flex-col gap-2 bg-white">
                            <button 
                                type="button"
                                onClick={() => setQuickAddMenuSub('main')}
                                className="text-xs font-bold text-slate-450 hover:text-emerald-600 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-caret-left"></i> 이전으로
                            </button>
                            <button
                                type="button"
                                onClick={() => { insertDivider('dashed'); setShowQuickAddMenu(false); }}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold text-slate-700 border border-transparent transition-all shadow-sm bg-slate-50/50 cursor-pointer flex items-center gap-2"
                            >
                                <span className="text-emerald-500">---</span> 점선 구분선
                            </button>
                            <button
                                type="button"
                                onClick={() => { insertDivider('solid'); setShowQuickAddMenu(false); }}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold text-slate-700 border border-transparent transition-all shadow-sm bg-slate-50/50 cursor-pointer flex items-center gap-2"
                            >
                                <span className="text-emerald-500">───</span> 실선 구분선
                            </button>
                            <button
                                type="button"
                                onClick={() => { insertDivider('double'); setShowQuickAddMenu(false); }}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold text-slate-700 border border-transparent transition-all shadow-sm bg-slate-50/50 cursor-pointer flex items-center gap-2"
                            >
                                <span className="text-emerald-500">═══</span> 이중 구분선
                            </button>
                        </div>
                    )}

                    {/* Quote selection submenu */}
                    {quickAddMenuSub === 'quote' && (
                        <div className="p-3.5 sm:p-4 bg-white flex flex-col gap-2 bg-white">
                            <button 
                                type="button"
                                onClick={() => setQuickAddMenuSub('main')}
                                className="text-xs font-bold text-slate-450 hover:text-emerald-600 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-caret-left"></i> 이전으로
                            </button>
                            <button
                                type="button"
                                onClick={() => { insertQuote('border'); setShowQuickAddMenu(false); }}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold text-slate-700 border border-transparent transition-all shadow-sm bg-slate-50/50 cursor-pointer flex items-center gap-3"
                            >
                                <span className="text-indigo-500 font-bold text-base">▍</span> 왼쪽 실선형 인용구
                            </button>
                            <button
                                type="button"
                                onClick={() => { insertQuote('box'); setShowQuickAddMenu(false); }}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold text-slate-700 border border-transparent transition-all shadow-sm bg-slate-50/50 cursor-pointer flex items-center gap-3"
                            >
                                <span className="text-indigo-500 text-base">🗳️</span> 박스 강조형 인용구
                            </button>
                            <button
                                type="button"
                                onClick={() => { insertQuote('bubble'); setShowQuickAddMenu(false); }}
                                className="w-full text-left px-4 py-3.5 hover:bg-emerald-50 hover:border-emerald-250 rounded-xl text-xs sm:text-sm font-extrabold text-slate-700 border border-transparent transition-all shadow-sm bg-slate-50/50 cursor-pointer flex items-center gap-3"
                            >
                                <span className="text-indigo-500 text-base">💡</span> 말풍선 추천형 인용구
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Editable Content Frame */}
            <div 
                id={id}
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="pt-4 pb-4 pr-4 pl-12 sm:pt-5 sm:pb-5 sm:pr-5 sm:pl-14 text-slate-800 text-sm sm:text-base outline-none min-h-[300px] overflow-y-auto w-full max-w-full prose prose-slate select-text break-all rounded-b-xl"
                style={{ 
                    minHeight, 
                    fontFamily: fontFamilies[currentFont as keyof typeof fontFamilies] || '"NanumSquare", "Inter", sans-serif'
                }}
                data-placeholder={placeholder}
            />
        </div>
    );
}

export default RichTextEditor;

