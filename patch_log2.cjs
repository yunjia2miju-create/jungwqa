const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `console.log("[OG-INJECT] itemId:", itemId, "post.thumbnail:", post.thumbnail, "newImage:", newImage);`;
const replacement = `console.log("[OG-INJECT] itemId:", itemId, "post.thumbnail:", post.thumbnail, "newImage:", newImage);
fs.appendFileSync('og_debug.log', "[OG-INJECT] itemId: " + itemId + " post: " + (post ? "found" : "null") + " newImage: " + newImage + "\n");`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content, 'utf8');
