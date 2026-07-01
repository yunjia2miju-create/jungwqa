const fs = require('fs');
const path = require('path');

const filesToProcess = [
    'src/components/MainTab.tsx',
    'src/components/DetailTab.tsx',
    'src/components/VrViewer.tsx',
    'src/App.tsx'
];

function replaceColors(content) {
    // We replace specific emerald/green tailwind classes with arbitrary values or style injections
    // Actually, maybe it's better to just replace the specific matches requested by the user.

    let newContent = content;

    // [1] MainTab.tsx VR banner button
    // The user wants 'Deep Kings Navy, #0D4C3C' !important
    newContent = newContent.replace(/style=\{\{ background: '#0D4C3C', backgroundColor: '#0D4C3C', borderColor: '#0D4C3C' \}\}/g, "style={{ background: '#0D4C3C !important', backgroundColor: '#0D4C3C !important', borderColor: '#0D4C3C !important' }}");

    // [2] Search box icon bg
    newContent = newContent.replace(/style=\{\{ background: '#0D4C3C !important', backgroundColor: '#0D4C3C !important' \} as React.CSSProperties\}/g, "style={{ background: '#0D4C3C !important', backgroundColor: '#0D4C3C !important', borderColor: '#0D4C3C !important' } as React.CSSProperties}");

    // DetailTab Fact sheet icon
    newContent = newContent.replace(/<i className="fa-solid fa-building-circle-check text-sm lg:text-base" style=\{\{ color: '#0D4C3C' \}\}/g, "<i className=\"fa-solid fa-building-circle-check text-sm lg:text-base\" style={{ color: '#0D4C3C !important' }}");

    // Fact sheet manage fee
    newContent = newContent.replace(/<span className="font-extrabold lg:text-base" style=\{\{ color: '#0D4C3C' \}\}/g, "<span className=\"font-extrabold lg:text-base\" style={{ color: '#0D4C3C !important' }}");

    // App.tsx header logo text
    newContent = newContent.replace(/style=\{\{ color: '#0D4C3C' \}\}/g, "style={{ color: '#0D4C3C !important' }}");
    newContent = newContent.replace(/style=\{\{ backgroundColor: '#0D4C3C' \}\}/g, "style={{ backgroundColor: '#0D4C3C !important' }}");

    // [2.1] 활성화된 '전체' 분류 버튼 잔상 
    // From: active bg-[#0D4C3C] text-white border-[#0D4C3C] scale-[1.03] shadow-[0_6px_20px_rgba(11,37,69,0.35)] ring-2 ring-[#0D4C3C]/20
    // To: Ensure #0D4C3C !important is used.
    newContent = newContent.replace(/active bg-\[#0D4C3C\] text-white border-\[#0D4C3C\] scale-\[1.03\] shadow-\[0_6px_20px_rgba\(11,37,69,0.35\)\] ring-2 ring-\[#0D4C3C\]\/20/g, 
        "active bg-[#0D4C3C] text-white border-[#0D4C3C] scale-[1.03] shadow-[0_6px_20px_rgba(11,37,69,0.35)] ring-2 ring-[#0D4C3C]/20");

    // replace emerald colors around search area
    newContent = newContent.replace(/text-emerald-400 font-black text-xl sm:text-2xl/g, "text-[#0D4C3C] font-black text-xl sm:text-2xl");
    newContent = newContent.replace(/text-emerald-300 text-\[10px\]/g, "text-[#0D4C3C] text-[10px]");
    newContent = newContent.replace(/text-emerald-400 animate-pulse/g, "text-[#0D4C3C] animate-pulse");
    
    // Naver360Icon replacement in MainTab & DetailTab
    // It says: "상세페이지 하단 파노라마 큰 창 내부... 초록색 원형 '집 모양 아이콘' SVG 구조 그대로 복제 이식"
    // The VR Viewer structure is:
    /*
        <div className="flex flex-col items-center justify-center gap-2 font-sans text-center">
            <Home className="text-white w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" strokeWidth={1.8} />
            <span className="text-white font-black text-xs sm:text-sm tracking-tight leading-none drop-shadow-[0_1px_2.5px_rgba(0,0,0,0.2)]">
                VR 360 투어
            </span>
        </div>
    */
    // We'll replace <Naver360Icon ... /> with a similar Home icon structure.
    newContent = newContent.replace(/<Naver360Icon size=\{144\} className="h-\[57px\] sm:h-\[90px\] w-auto shrink-0 select-none animate-vr-glow filter drop-shadow-\[0_4px_12px_rgba\(11,37,69,0.35\)\]" \/>/g, 
        `<div className="relative flex flex-col items-center justify-center w-[57px] h-[57px] sm:w-[90px] sm:h-[90px] rounded-full bg-[#0D4C3C] border-2 border-white/20 shadow-[0_4px_12px_rgba(11,37,69,0.35)] shrink-0 select-none animate-vr-glow">
            <Home className="text-white w-7 h-7 sm:w-12 sm:h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" strokeWidth={1.8} />
        </div>`);

    newContent = newContent.replace(/<Naver360Icon size=\{24\} className="text-emerald-600 animate-pulse shrink-0" \/>/g,
        `<Home size={24} className="text-[#0D4C3C] animate-pulse shrink-0" strokeWidth={1.8} />`);
    
    newContent = newContent.replace(/<Naver360Icon size=\{14\} className="text-white" \/>/g,
        `<Home size={14} className="text-white" strokeWidth={1.8} />`);

    newContent = newContent.replace(/<Naver360Icon size=\{12\} className="text-emerald-700" \/>/g,
        `<Home size={12} className="text-[#0D4C3C]" strokeWidth={1.8} />`);

    newContent = newContent.replace(/<Naver360Icon size=\{16\} className="text-white" \/>/g,
        `<Home size={16} className="text-white" strokeWidth={1.8} />`);

    newContent = newContent.replace(/<Naver360Icon size=\{18\} className="text-white" \/>/g,
        `<Home size={18} className="text-white" strokeWidth={1.8} />`);

    newContent = newContent.replace(/<Naver360Icon size=\{12\} className="text-\[#0D4C3C\]" \/>/g,
        `<Home size={12} className="text-[#0D4C3C]" strokeWidth={1.8} />`);

    newContent = newContent.replace(/<Naver360Icon size=\{32\} className="text-white animate-pulse" \/>/g,
        `<Home size={32} className="text-white animate-pulse" strokeWidth={1.8} />`);

    // In VrViewer.tsx, change green box to Deep Kings Navy
    newContent = newContent.replace(/bg-\[#00925c\]/g, "bg-[#0D4C3C]");
    newContent = newContent.replace(/rgba\(0,146,92,0\.35\)/g, "rgba(11,37,69,0.35)");
    newContent = newContent.replace(/hover:bg-\[#008151\]/g, "hover:bg-[#113866]");

    return newContent;
}

filesToProcess.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = replaceColors(content);
        fs.writeFileSync(fullPath, newContent);
    }
});

console.log("Done");
