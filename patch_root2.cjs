const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const projectRoot = _dirname;',
  'const projectRoot = typeof process !== "undefined" ? process.cwd() : _dirname;'
);
fs.writeFileSync('server.ts', content, 'utf8');
