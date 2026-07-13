const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

// Replace the dev get route
serverFile = serverFile.replace(
    /app\.get\(\['\/', '\/rooms\/:id', '\/item\/view\/:id'\], async \(req, res, next\) => \{([\s\S]*?)next\(\);\n    \}\);/,
    `app.get(['/', '/rooms/:id', '/item/view/:postId'], async (req, res, next) => {
      let itemId = req.params.postId || req.params.id || req.query.id || req.query.postId;
      if (!itemId && req.path.startsWith('/item/view/')) {
        itemId = req.path.replace('/item/view/', '').split('/')[0];
      }
      if (itemId && typeof itemId === 'string') {
        const indexPath = path.join(projectRoot, 'index.html');
        if (fs.existsSync(indexPath)) {
          try {
            let html = fs.readFileSync(indexPath, 'utf-8');
            const post = await getPostById(itemId);
            if (post) {
              const dong = post.dong || '구미';
              const building = post.building || '추천 매물';
              const type = post.category || '매물';
              
              const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
              const newDesc = formatOgDescription(post.content || post.remarks || '');
              const newUrl = \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/item/view/\${itemId}\`;
              const newImage = \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/generated/\${itemId}.jpg\`;

              html = html.replace(/<meta[^>]*property="og:title"[^>]*>/gi, \`<meta id="ogTitle" property="og:title" content="\${newTitle}" />\`);
              html = html.replace(/<meta[^>]*property="og:description"[^>]*>/gi, \`<meta id="ogDesc" property="og:description" content="\${newDesc}" />\`);
              html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi, \`<meta id="ogUrl" property="og:url" content="\${newUrl}" />\`);
              html = html.replace(/<meta[^>]*name="description"[^>]*>/gi, \`<meta name="description" content="\${newDesc}" />\`);
              html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi, \`<link rel="canonical" id="canonicalUrl" href="\${newUrl}" />\`);
              
              if (html.includes('property="og:image"')) {
                html = html.replace(/<meta[^>]*property="og:image"(?!:width|:height)[^>]*>/gi, \`<meta id="ogImage" property="og:image" content="\${newImage}" />\`);
              } else {
                html = html.replace('</head>', \`<meta id="ogImage" property="og:image" content="\${newImage}" />\\n</head>\`);
              }
            }
            // Dynamic host replacement for development
            const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
            html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
            html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

            res.send(html);
            return;
          } catch (e) {
            console.error("Error transforming dev index.html:", e);
          }
        }
      }
      next();
    });`
);

// Add the dedicated route for production right before app.get('*'
serverFile = serverFile.replace(
    /app\.get\('\*', async \(req, res\) => \{/,
    `app.get('/item/view/:postId', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');
          const itemId = req.params.postId;
          const post = await getPostById(itemId);
          if (post) {
            const dong = post.dong || '구미';
            const building = post.building || '추천 매물';
            const type = post.category || '매물';
            
            const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
            const newDesc = formatOgDescription(post.content || post.remarks || '');
            const newUrl = \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/item/view/\${itemId}\`;
            const newImage = \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/generated/\${itemId}.jpg\`;

            html = html.replace(/<meta[^>]*property="og:title"[^>]*>/gi, \`<meta id="ogTitle" property="og:title" content="\${newTitle}" />\`);
            html = html.replace(/<meta[^>]*property="og:description"[^>]*>/gi, \`<meta id="ogDesc" property="og:description" content="\${newDesc}" />\`);
            html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi, \`<meta id="ogUrl" property="og:url" content="\${newUrl}" />\`);
            html = html.replace(/<meta[^>]*name="description"[^>]*>/gi, \`<meta name="description" content="\${newDesc}" />\`);
            html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi, \`<link rel="canonical" id="canonicalUrl" href="\${newUrl}" />\`);
            
            if (html.includes('property="og:image"')) {
              html = html.replace(/<meta[^>]*property="og:image"(?!:width|:height)[^>]*>/gi, \`<meta id="ogImage" property="og:image" content="\${newImage}" />\`);
            } else {
              html = html.replace('</head>', \`<meta id="ogImage" property="og:image" content="\${newImage}" />\\n</head>\`);
            }
          }
          // Dynamic host replacement for production client's active domain
          const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
          html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
          html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

          res.send(html);
        } catch (err) {
          console.error("Error inject dynamic OG tags:", err);
          res.sendFile(indexPath);
        }
      } else {
        res.status(500).send(\`📢 index.html을 찾을 수 없습니다.\`);
      }
    });

    app.get('*', async (req, res) => {`
);


fs.writeFileSync('server.ts', serverFile);
console.log('done');
