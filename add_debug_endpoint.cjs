const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'app.get(\'/api/posts\', async (req, res) => {',
  'app.get(\'/api/debug-getpost/:id\', async (req, res) => {\n    res.json(await getPostById(req.params.id));\n  });\n\n  app.get(\'/api/posts\', async (req, res) => {'
);
fs.writeFileSync('server.ts', content, 'utf8');
