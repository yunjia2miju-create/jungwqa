const fs = require('fs');
let content = fs.readFileSync('src/components/DetailTab.tsx', 'utf8');

content = content.replace(
    'className="relative aspect-[12/9] w-full bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100 watermark-container"',
    'className="relative aspect-[16/9] w-full bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100 watermark-container"'
);

content = content.replace(
    "style={{ aspectRatio: '12/9' }} />",
    "style={{ aspectRatio: '16/9' }} />"
);

fs.writeFileSync('src/components/DetailTab.tsx', content, 'utf8');
console.log("Aspect patched");
