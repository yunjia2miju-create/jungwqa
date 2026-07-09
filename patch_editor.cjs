const fs = require('fs');

let content = fs.readFileSync('public/smarteditor-final.html', 'utf8');

// Change processImage definition
content = content.replace(
    'function processImage(file, callback) {',
    'function processImage(file, type, callback) {\n            if (type === "pano" || type === "vrThumbnail") {\n                callback(file, file.name);\n                return;\n            }'
);

// Change processImage invocation
content = content.replace(
    'processImage(file, (dataUrl, fileName) => {',
    'processImage(file, type, (dataUrl, fileName) => {'
);

// We need to replace the Promise.all logic with sequential loop
const oldUpload = `            const uploadPromises = Array.from(files).map((file, i) => {
                return new Promise((resolve) => {
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
            });
            const uploadedUrls = await Promise.all(uploadPromises);`;

const newUpload = `            const uploadedUrls = [];
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

if (content.includes(oldUpload)) {
    content = content.replace(oldUpload, newUpload);
    fs.writeFileSync('public/smarteditor-final.html', content, 'utf8');
    console.log("Patch successful");
} else {
    console.log("oldUpload not found in content");
    // let's try a regex or just replace the Promise.all
}
