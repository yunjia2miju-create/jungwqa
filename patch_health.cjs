const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "app.use(express.json({ limit: '50mb' }));",
  "app.use(express.json({ limit: '50mb' }));\n\n  // API routes go here FIRST\n  app.get('/api/health', (req, res) => {\n    res.json({ status: 'ok' });\n  });\n"
);

fs.writeFileSync('server.ts', code);
