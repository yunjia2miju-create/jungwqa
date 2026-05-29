import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    id: string;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = '여기에 내용을 입력하세요...',
    minHeight = '250px',
    id
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Dropdown States
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);

    // Current Style States
    const [currentFont, setCurrentFont] = useState('나눔스퀘어');
    const [currentSize, setCurrentSize] = useState('16px');

    // Font family configurations
    const fontFamilies = {
        '나눔스퀘어': '"NanumSquare", "Inter", sans-serif',
        '나눔고딕': '"Nanum Gothic", sans-serif',
        '마루부리 (세리프)': '"MaruBuri", "Playfair Display", serif',
        '기본고딕': 'ui-sans-serif, system-ui, sans-serif',
        '코딩용 고딕': 'ui-monospace, SFMono-Regular, "JetBrains Mono", monospace'
    };

    // Font size configurations
    const fontSizes = ['11px', '13px', '15px', '16px', '19px', '24px', '30px', '36px'];

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

    // Close options when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest(`.toolbar-dropdown-${id}`)) {
                setShowFontDropdown(false);
                setShowSizeDropdown(false);
                setShowColorPicker(false);
                setShowBgColorPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [id]);

    return (
        <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
            
            {/* Nav style Editor Toolbar */}
            <div className={`p-1.5 sm:p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1 items-center text-slate-700 toolbar-dropdown-${id} select-none`}>
                
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
                        <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded shadow-xl w-36 py-1 text-slate-700 animate-fadeIn">
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

            {/* Editable Content Frame */}
            <div 
                id={id}
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-4 sm:p-5 text-slate-800 text-sm sm:text-base outline-none min-h-[300px] overflow-y-auto w-full max-w-full prose prose-slate select-text break-all"
                style={{ 
                    minHeight, 
                    fontFamily: '"NanumSquare", "Inter", sans-serif'
                }}
                data-placeholder={placeholder}
            />
        </div>
    );
}
