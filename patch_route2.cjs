const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'if (itemId && typeof itemId === \'string\') {',
  'fs.appendFileSync("route_debug.log", "ITEMID: " + itemId + " TYPE: " + typeof itemId + " EXISTS: " + fs.existsSync(path.join(projectRoot, \'index.html\')) + "\\n");\n      if (itemId && typeof itemId === \'string\') {'
);
fs.writeFileSync('server.ts', content, 'utf8');
