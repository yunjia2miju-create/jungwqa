const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const ensureOgImageFn = `
  // Helper to ensure OG image exists in Firebase Storage
  async function ensureOgImageInStorage(postId, post) {
    if (!admin.apps.length) return null;
    try {
      const bucket = admin.storage().bucket();
      const destinationPath = \`gallery/\${postId}.jpg\`;
      const bucketName = bucket.name;
      const publicUrl = \`https://firebasestorage.googleapis.com/v0/b/\${bucketName}/o/gallery%2F\${postId}.jpg?alt=media\`;

      const file = bucket.file(destinationPath);
      const [exists] = await file.exists();
      if (exists) {
        return publicUrl;
      }

      const building = (post.building || '추천 매물').trim();
      const address = (post.address || post.dong || '구미시').trim();
      let imageUrl = post.thumbnail || post.spatial1Url;

      // 1. Try to fetch from panoramas/ first
      let base64Image = '';
      try {
        const sourcePath = \`panoramas/\${postId}.jpg\`;
        const sourceFile = bucket.file(sourcePath);
        const [sourceExists] = await sourceFile.exists();
        
        let imageBuffer;
        if (sourceExists) {
          const [data] = await sourceFile.download();
          imageBuffer = data;
        } else if (imageUrl) {
          const client = imageUrl.startsWith('https://') ? require('https') : require('http');
          imageBuffer = await new Promise((resolve, reject) => {
            client.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
              if (resp.statusCode && [301, 302, 303, 307, 308].includes(resp.statusCode) && resp.headers.location) {
                const redirectClient = resp.headers.location.startsWith('https://') ? require('https') : require('http');
                redirectClient.get(resp.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
                    const chunks = [];
                    r2.on('data', (c) => chunks.push(c));
                    r2.on('end', () => resolve(Buffer.concat(chunks)));
                }).on('error', reject);
                return;
              }
              if (resp.statusCode && resp.statusCode >= 400) {
                reject(new Error('Failed to load'));
              } else {
                const chunks = [];
                resp.on('data', (c) => chunks.push(c));
                resp.on('end', () => resolve(Buffer.concat(chunks)));
              }
            }).on('error', reject);
          });
        }
        
        if (imageBuffer) {
           base64Image = \`data:image/jpeg;base64,\${imageBuffer.toString('base64')}\`;
        }
      } catch(e) {
          console.warn("Failed to fetch image for sharp processing:", e);
      }

      if (!base64Image) {
        const fallbackPath = require('path').join(process.cwd(), 'public', 'assets', 'fixed-master-vr-banner.png');
        if (fs.existsSync(fallbackPath)) {
            const fbBuffer = fs.readFileSync(fallbackPath);
            base64Image = \`data:image/png;base64,\${fbBuffer.toString('base64')}\`;
        }
      }

      const escapeXml = (unsafe) => unsafe ? unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') : '';
      const safeBuilding = escapeXml(building);
      const safeAddress = escapeXml(address);

      const svg = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
        \${base64Image ? \`<image href="\${base64Image}" x="0" y="0" width="1200" height="675" preserveAspectRatio="xMidYMid slice" />\` : \`<rect width="1200" height="675" fill="#1e293b" />\`}
        <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#000000" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#000000" stop-opacity="0.8"/>
            </linearGradient>
        </defs>
        <rect x="0" y="0" width="1200" height="675" fill="url(#bgGrad)" />
        <g transform="translate(600, 270)">
          <rect x="-80" y="-80" width="160" height="160" rx="40" fill="#0B2545" stroke="#ffffff" stroke-width="4" stroke-opacity="0.2" />
          <polygon points="0,-45 -45,0 -35,0 -35,45 35,45 35,0 45,0" fill="none" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" />
          <rect x="-15" y="15" width="30" height="30" fill="#ffffff" rx="4" />
        </g>
        <g transform="translate(100, 480)">
          <rect x="0" y="0" width="1000" height="140" rx="30" fill="#0B2545" fill-opacity="0.95" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2" />
          <text x="500" y="70" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="46" fill="#ffffff" letter-spacing="-1">\${safeBuilding}</text>
          <text x="500" y="115" text-anchor="middle" font-family="sans-serif" font-weight="normal" font-size="24" fill="#94a3b8" letter-spacing="-0.5">\${safeAddress}</text>
        </g>
      </svg>\`;

      const { default: sharp } = await import('sharp');
      const jpegBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
      
      await file.save(jpegBuffer, {
         metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' }
      });
      console.log(\`Successfully saved OG image to \${destinationPath}\`);
      
      return publicUrl;
    } catch (e) {
      console.error("Error generating/uploading OG image:", e);
      return null;
    }
  }
`;

serverCode = serverCode.replace(
  /\/\/ Format OG description to remove emojis/,
  ensureOgImageFn + '\n\n  // Format OG description to remove emojis'
);

serverCode = serverCode.replace(/const newImage = \`https:\/\/www\.xn--h49a2pelq49bcrfloji4br3e56y\.com\/assets\/generated\/\$\{itemId\}\.jpg\`;/g, 'const newImage = await ensureOgImageInStorage(itemId, post) || `https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/generated/${itemId}.jpg`;');

fs.writeFileSync('server.ts', serverCode, 'utf8');
