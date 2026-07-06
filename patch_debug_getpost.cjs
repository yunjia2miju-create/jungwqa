const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'async function getPostById(id: string): Promise<any> {',
  'async function getPostById(id: string): Promise<any> {\n  fs.appendFileSync("getpost_debug.log", "CALLED WITH: " + id + "\\n");'
);
fs.writeFileSync('server.ts', content, 'utf8');
