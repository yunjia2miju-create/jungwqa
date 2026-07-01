const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

// 1. Remove Tailwind CDN (render blocking)
indexHtml = indexHtml.replace('<link rel="preload" href="https://cdn.tailwindcss.com" as="script" />', '');
indexHtml = indexHtml.replace('<script src="https://cdn.tailwindcss.com"></script>', '');
indexHtml = indexHtml.replace('<!-- Tailwind CSS v4 via CDN -->', '');

// 2. Add Skeleton UI and style inside #root
const skeletonStyle = `
        <style>
            .skeleton-container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
            .skeleton-header { height: 70px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; }
            .skeleton-logo { width: 200px; height: 30px; background: #e2e8f0; border-radius: 8px; animation: pulse 1.5s infinite; }
            .skeleton-banner { width: 100%; height: 200px; background: #0B2545; border-radius: 20px; margin-bottom: 30px; opacity: 0.9; }
            .skeleton-search { width: 100%; height: 80px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 20px; animation: pulse 1.5s infinite; }
            .skeleton-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
            .skeleton-tab { width: 80px; height: 45px; background: #e2e8f0; border-radius: 12px; animation: pulse 1.5s infinite; }
            .skeleton-card { display: flex; gap: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
            .skeleton-img { width: 150px; height: 100px; background: #e2e8f0; border-radius: 12px; animation: pulse 1.5s infinite; }
            .skeleton-content { flex: 1; display: flex; flex-direction: column; gap: 10px; justify-content: center; }
            .skeleton-line { height: 15px; background: #e2e8f0; border-radius: 4px; animation: pulse 1.5s infinite; }
            @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            @media (max-width: 768px) {
                .skeleton-banner { height: 150px; }
                .skeleton-img { width: 100px; height: 80px; }
            }
        </style>
        <div class="skeleton-container">
            <div class="skeleton-header">
                <div class="skeleton-logo"></div>
                <div class="skeleton-logo" style="width: 50px;"></div>
            </div>
            <div class="skeleton-banner"></div>
            <div class="skeleton-search"></div>
            <div class="skeleton-tabs">
                <div class="skeleton-tab"></div><div class="skeleton-tab"></div><div class="skeleton-tab"></div><div class="skeleton-tab"></div><div class="skeleton-tab"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-content"><div class="skeleton-line" style="width: 80%;"></div><div class="skeleton-line" style="width: 60%;"></div><div class="skeleton-line" style="width: 40%;"></div></div>
            </div>
        </div>
`;

indexHtml = indexHtml.replace('<div id="root"></div>', `<div id="root">\n${skeletonStyle}\n    </div>`);

fs.writeFileSync('index.html', indexHtml, 'utf8');
