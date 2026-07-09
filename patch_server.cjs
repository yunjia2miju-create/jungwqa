const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `    // Intercept development requests with id query parameters for hot meta-tag injection
    app.get('/', async (req, res, next) => {
      const itemId = req.query.id || req.query.postId;`,
  `    // Intercept development requests with id query parameters for hot meta-tag injection
    app.get(['/', '/rooms/:id'], async (req, res, next) => {
      const itemId = req.params.id || req.query.id || req.query.postId;`
);

code = code.replace(
  `    app.get('*', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');
          const itemId = req.query.id || req.query.postId;`,
  `    app.get('*', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');
          const pathParts = req.path.split('/');
          const isRoomPath = pathParts.length >= 3 && pathParts[1] === 'rooms';
          const itemId = isRoomPath ? pathParts[2] : (req.query.id || req.query.postId);`
);

fs.writeFileSync('server.ts', code);
