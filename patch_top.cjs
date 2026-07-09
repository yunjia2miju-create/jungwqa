const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const app = express();',
  'const app = express();\napp.use((req, res, next) => { fs.appendFileSync("top_req.log", "URL: " + req.url + " QUERY: " + JSON.stringify(req.query) + "\\n"); next(); });'
);
fs.writeFileSync('server.ts', content, 'utf8');
