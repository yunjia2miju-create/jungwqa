const fs = require('fs');
let content = fs.readFileSync('public/smarteditor-final.html', 'utf8');

// 1. Update processImage signature to accept 'type'
content = content.replace(
    /function processImage\(file, callback\) \{/g,
    'function processImage(file, type, callback) {\n            if (type === "pano" || type === "vrThumbnail") {\n                callback(file, file.name);\n                return;\n            }'
);

// 2. Find uploadPromises mapping and Promise.all, replace with a for loop.
const startMarker = 'const uploadPromises = Array.from(files).map((file, i) => {';
const endMarker = 'const uploadedUrls = await Promise.all(uploadPromises);';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const sectionToReplace = content.substring(startIndex, endIndex + endMarker.length);
    
    const newSection = `            const uploadedUrls = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                queueToast.innerText = \`사진 \${files.length}장 중 \${i+1}번째 업로드 중...\`;
                const url = await new Promise((resolve) => {
                    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + i;
                    processImage(file, type, (dataUrl, fileName) => {
                        if (window.self !== window.top) {
                            window.parent.postMessage({
                                type: 'UPLOAD_FILE',
                                payload: {
                                    fileData: dataUrl,
                                    fileName: fileName,
                                    uploadType: type,
                                    fileId: fileId
                                }
                            }, '*');
                            
                            const handler = (msgEvent) => {
                                if (!msgEvent.data) return;
                                if (msgEvent.data.type === 'UPLOAD_SUCCESS' && msgEvent.data.payload.uploadType === type && msgEvent.data.payload.fileId === fileId) {
                                    resolve(msgEvent.data.payload.url);
                                    window.removeEventListener('message', handler);
                                } else if (msgEvent.data.type === 'UPLOAD_ERROR' && msgEvent.data.payload.uploadType === type && msgEvent.data.payload.fileId === fileId) {
                                    resolve(null);
                                    window.removeEventListener('message', handler);
                                }
                            };
                            window.addEventListener('message', handler);
                        } else {
                            resolve(URL.createObjectURL(file));
                        }
                    });
                });
                uploadedUrls.push(url);
            }`;
            
    content = content.replace(sectionToReplace, newSection);
    fs.writeFileSync('public/smarteditor-final.html', content, 'utf8');
    console.log("Patch 2 successful");
} else {
    console.log("Markers not found");
}
