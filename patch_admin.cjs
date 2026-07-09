const fs = require('fs');
let content = fs.readFileSync('src/components/AdminWriteSection.tsx', 'utf8');

// 1. Change uploadResizedBlobToStorage signature and blob generation
content = content.replace(
    /const uploadResizedBlobToStorage = async \(base64Data: string, originalName: string, prefix = 'posts'\): Promise<string> => \{/,
    "const uploadResizedBlobToStorage = async (fileData: string | Blob | File, originalName: string, prefix = 'posts'): Promise<string> => {"
);

content = content.replace(
    /const blob = dataURLtoBlob\(base64Data\);/,
    "const blob = typeof fileData === 'string' ? dataURLtoBlob(fileData) : fileData;"
);

fs.writeFileSync('src/components/AdminWriteSection.tsx', content, 'utf8');
console.log("AdminWriteSection patched");
