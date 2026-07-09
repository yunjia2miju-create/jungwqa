const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `              const newImage = post.thumbnail || \`\${req.protocol}://\${req.get('host')}/assets/fixed-master-vr-banner.png\`;`;
const replacement = `              const newImage = post.thumbnail || \`\${req.protocol}://\${req.get('host')}/assets/fixed-master-vr-banner.png\`;
              console.log("[OG-INJECT] itemId:", itemId, "post.thumbnail:", post.thumbnail, "newImage:", newImage);`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content, 'utf8');
