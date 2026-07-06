const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'app.get([\'/\', \'/rooms/:id\'], async (req, res, next) => {',
  'app.get([\'/\', \'/rooms/:id\'], async (req, res, next) => {\n      fs.appendFileSync("route_debug.log", "ROUTE HIT! url: " + req.url + "\\n");'
);
fs.writeFileSync('server.ts', content, 'utf8');
