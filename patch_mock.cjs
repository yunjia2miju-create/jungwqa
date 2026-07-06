const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const post = await getPostById(itemId);',
  'const post = { dong: "MOCK", building: "MOCK", category: "MOCK", thumbnail: "https://mock.com/image.jpg" };'
);
fs.writeFileSync('server.ts', content, 'utf8');
