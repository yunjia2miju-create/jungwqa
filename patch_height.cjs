const fs = require('fs');
let content = fs.readFileSync('src/components/DetailTab.tsx', 'utf8');

content = content.replace(
    'className="w-full max-w-[360px] h-[400px] sm:h-[480px] bg-white',
    'className="w-full max-w-[360px] h-auto bg-white'
);

fs.writeFileSync('src/components/DetailTab.tsx', content, 'utf8');
console.log("Height patched");
