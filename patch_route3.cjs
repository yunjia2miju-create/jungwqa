const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'fs.appendFileSync("route_debug.log", "ITEMID: " + itemId + " TYPE: " + typeof itemId + " EXISTS: " + fs.existsSync(path.join(projectRoot, \'index.html\')) + "\\n");',
  'fs.appendFileSync("route_debug.log", "ROOT: " + projectRoot + "\\n");'
);
fs.writeFileSync('server.ts', content, 'utf8');
