const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const itemId = isRoomPath ? pathParts[2] : (req.query.id || req.query.postId);',
  'const itemId = isRoomPath ? pathParts[2] : (req.query.id || req.query.postId);\n  fs.appendFileSync("req_debug.log", "URL: " + req.originalUrl + " ID: " + itemId + "\\n");'
);
fs.writeFileSync('server.ts', content, 'utf8');
