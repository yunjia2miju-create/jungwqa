const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'console.error("Error transforming dev index.html:", e);',
  'fs.appendFileSync("vite_error.log", "VITE ERROR: " + e.message + "\\n"); console.error("Error transforming dev index.html:", e);'
);
fs.writeFileSync('server.ts', content, 'utf8');
