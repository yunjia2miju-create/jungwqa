const fs = require('fs');
let content = fs.readFileSync('src/components/DetailTab.tsx', 'utf8');

content = content.replace(
    '<div className="flex flex-wrap justify-center gap-6 sm:gap-8">', 
    '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center gap-6 sm:gap-8 w-full">'
);

content = content.replace(
    /className="w-\[300px\] sm:w-\[360px\] h-\[400px\] sm:h-\[480px\] bg-white/g,
    'className="w-full max-w-[360px] h-[400px] sm:h-[480px] bg-white'
);

fs.writeFileSync('src/components/DetailTab.tsx', content, 'utf8');
console.log("Grid patched");
