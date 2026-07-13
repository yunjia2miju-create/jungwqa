const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

serverFile = serverFile.replace(
    /const imageUrl = post\.thumbnail[\s\S]*?;/,
    `const imageUrl = post.thumbnail;`
);

serverFile = serverFile.replace(
    /let base64Image = '';\s*try \{\s*const client = imageUrl\.startsWith[\s\S]*?base64Image = '';\s*\}/,
    `let base64Image = '';
    try {
      if (imageUrl) {
        const client = imageUrl.startsWith('https://') ? https : http;
        const imageBuffer = await new Promise((resolve, reject) => {
          client.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
            if (resp.statusCode && [301, 302, 303, 307, 308].includes(resp.statusCode) && resp.headers.location) {
              const redirectClient = resp.headers.location.startsWith('https://') ? https : http;
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
        base64Image = \`data:image/jpeg;base64,\${imageBuffer.toString('base64')}\`;
      } else {
        // Fallback logo
        const fallbackPath = path.join(process.cwd(), 'public', 'assets', 'fixed-master-vr-banner.png');
        if (fs.existsSync(fallbackPath)) {
            const fbBuffer = fs.readFileSync(fallbackPath);
            base64Image = \`data:image/png;base64,\${fbBuffer.toString('base64')}\`;
        }
      }
    } catch (e) {
      const fallbackPath = path.join(process.cwd(), 'public', 'assets', 'fixed-master-vr-banner.png');
      if (fs.existsSync(fallbackPath)) {
          const fbBuffer = fs.readFileSync(fallbackPath);
          base64Image = \`data:image/png;base64,\${fbBuffer.toString('base64')}\`;
      } else {
          base64Image = '';
      }
    }`
);

fs.writeFileSync('server.ts', serverFile);
console.log('done');
