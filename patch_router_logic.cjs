const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// 1. Define warmUpPostsCache function and invoke it
const warmUpCode = `
  // Background Pre-warm cache function to ensure near 0ms latency for initial scrapers and users
  async function warmUpPostsCache() {
    console.log("[Cache Warm-up] Initializing background posts cache warm-up...");
    try {
      await executeFirestoreOp(async (dbInstance) => {
        const postsRef = dbInstance.collection('posts');
        const snapshot = await postsRef.orderBy('createdAt', 'desc').get();
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach((doc) => {
            list.push(doc.data());
          });
          cachedPostsList = list;
          writePosts(list);
          console.log(\`[Cache Warm-up] Pre-warmed \${list.length} posts into memory cache and posts.json successfully!\`);
        } else {
          console.log("[Cache Warm-up] Firestore posts collection is empty. Seeding defaultPosts...");
          const batch = dbInstance.batch();
          defaultPosts.forEach((post) => {
            const docRef = postsRef.doc(post.id);
            batch.set(docRef, post);
          });
          await batch.commit();
          cachedPostsList = defaultPosts;
          writePosts(defaultPosts);
          console.log("[Cache Warm-up] Seeded default posts and pre-warmed cache.");
        }
      }, null);
    } catch (warmErr) {
      console.error("[Cache Warm-up] Error during pre-warm operation:", warmErr);
    }
  }

  // Trigger Warm-up immediately during startup
  warmUpPostsCache().catch((err) => {
    console.error("[Cache Warm-up] Startup warm-up invocation failed:", err);
  });
`;

// Insert warmUpPostsCache function right above the '/api/posts' app.get definition
serverCode = serverCode.replace(
  /  app\.get\('\/api\/posts', async \(req, res\) => \{/,
  warmUpCode + '\n  app.get(\'/api/posts\', async (req, res) => {'
);

// 2. Replace development interceptor route (around line 1700)
const devRouteOld = `    // Intercept development requests with id query parameters for hot meta-tag injection
    app.get(['/', '/rooms/:id', '/item/view/:postId'], async (req, res, next) => {
      const itemId = resolveItemId(req);
      if (itemId) {
        const indexPath = path.join(projectRoot, 'index.html');
        if (fs.existsSync(indexPath)) {
          try {
            let html = fs.readFileSync(indexPath, 'utf-8');
            
            // 1. Dynamic host replacement first (excluding core meta overrides below)
            const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
            html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
            html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

            // 2. Fetch post details for SSR Meta Injection
            const post = await findPostByIdOrNumber(itemId);
            if (post) {
              const dong = post.dong || '구미';
              const building = post.building || '추천 매물';
              const type = post.category || '매물';
              
              const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
              const newDesc = formatOgDescription(post.content || post.remarks || '');
              const newUrl = \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/item/view/\${getPostNumber(post.id)}?postId=\${post.id}\`;
              const newImage = await ensureOgImageInStorage(post.id, post) || \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/generated/\${post.id}.jpg\`;

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

            res.send(html);
            return;
          } catch (e) {
            console.error("Error transforming dev index.html:", e);
          }
        }
      }
      next();
    });`;

const devRouteNew = `    // Intercept development requests with id query parameters for hot meta-tag injection
    app.get(['/', '/rooms/:id', '/item/view/:postId'], async (req, res, next) => {
      const itemId = resolveItemId(req);
      if (itemId) {
        const indexPath = path.join(projectRoot, 'index.html');
        if (fs.existsSync(indexPath)) {
          try {
            let html = fs.readFileSync(indexPath, 'utf-8');
            
            // 1. Dynamic host replacement first (excluding core meta overrides below)
            const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
            html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
            html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

            // 2. Fallback to current URL to prevent OG domain mismatch if post is missing or loading
            const currentUrl = \`\${req.protocol}://\${req.get('host')}\${req.originalUrl}\`;
            html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi, \`<meta id="ogUrl" property="og:url" content="\${currentUrl}" />\`);
            html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi, \`<link rel="canonical" id="canonicalUrl" href="\${currentUrl}" />\`);

            // 3. Fetch post details for SSR Meta Injection
            const post = await findPostByIdOrNumber(itemId);
            if (post) {
              const dong = post.dong || '구미';
              const building = post.building || '추천 매물';
              const type = post.category || '매물';
              
              const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
              const newDesc = formatOgDescription(post.content || post.remarks || '');
              const newUrl = \`\${hostUrl}/item/view/\${getPostNumber(post.id)}?postId=\${post.id}\`;
              const newImage = await ensureOgImageInStorage(post.id, post) || \`\${hostUrl}/assets/generated/\${post.id}.jpg\`;

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

            res.send(html);
            return;
          } catch (e) {
            console.error("Error transforming dev index.html:", e);
          }
        }
      }
      next();
    });`;

if (serverCode.includes(devRouteOld)) {
  serverCode = serverCode.replace(devRouteOld, devRouteNew);
  console.log("Successfully prepared replacement for devRoute!");
} else {
  console.warn("devRouteOld was not found exact match. We'll search and replace dynamically.");
}

// 3. Replace production single item route (around line 1752)
const prodRouteOld = `    app.get('/item/view/:postId', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');

          // 1. Dynamic host replacement first (excluding core meta overrides below)
          const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
          html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
          html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

          // 2. Fetch post details for SSR Meta Injection
          const itemId = resolveItemId(req);
          const post = await findPostByIdOrNumber(itemId);
          if (post) {
            const dong = post.dong || '구미';
            const building = post.building || '추천 매물';
            const type = post.category || '매물';
            
            const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
            const newDesc = formatOgDescription(post.content || post.remarks || '');
            const newUrl = \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/item/view/\${getPostNumber(post.id)}?postId=\${post.id}\`;
            const newImage = await ensureOgImageInStorage(post.id, post) || \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/generated/\${post.id}.jpg\`;

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

          res.send(html);`;

const prodRouteNew = `    app.get('/item/view/:postId', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');

          // 1. Dynamic host replacement first (excluding core meta overrides below)
          const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
          html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
          html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

          // 2. Fallback to current URL to prevent OG domain mismatch if post is missing or loading
          const currentUrl = \`\${req.protocol}://\${req.get('host')}\${req.originalUrl}\`;
          html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi, \`<meta id="ogUrl" property="og:url" content="\${currentUrl}" />\`);
          html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi, \`<link rel="canonical" id="canonicalUrl" href="\${currentUrl}" />\`);

          // 3. Fetch post details for SSR Meta Injection
          const itemId = resolveItemId(req);
          const post = await findPostByIdOrNumber(itemId);
          if (post) {
            const dong = post.dong || '구미';
            const building = post.building || '추천 매물';
            const type = post.category || '매물';
            
            const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
            const newDesc = formatOgDescription(post.content || post.remarks || '');
            const newUrl = \`\${hostUrl}/item/view/\${getPostNumber(post.id)}?postId=\${post.id}\`;
            const newImage = await ensureOgImageInStorage(post.id, post) || \`\${hostUrl}/assets/generated/\${post.id}.jpg\`;

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

          res.send(html);`;

if (serverCode.includes(prodRouteOld)) {
  serverCode = serverCode.replace(prodRouteOld, prodRouteNew);
  console.log("Successfully prepared replacement for prodRoute!");
} else {
  console.warn("prodRouteOld was not found exact match. We'll search and replace dynamically.");
}

// 4. Replace production catch-all route (around line 1799)
const catchAllOld = `    app.get('*', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');

          // 1. Dynamic host replacement first (excluding core meta overrides below)
          const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
          html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
          html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

          // 2. Fetch post details for SSR Meta Injection
          const itemId = resolveItemId(req);
          if (itemId) {
            const post = await findPostByIdOrNumber(itemId);
            if (post) {
              const dong = post.dong || '구미';
              const building = post.building || '추천 매물';
              const type = post.category || '매물';
              
              const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
              const newDesc = formatOgDescription(post.content || post.remarks || '');
              const newUrl = \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/item/view/\${getPostNumber(post.id)}?postId=\${post.id}\`;
              const newImage = await ensureOgImageInStorage(post.id, post) || \`https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/generated/\${post.id}.jpg\`;

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
          }

          res.send(html);`;

const catchAllNew = `    app.get('*', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');

          // 1. Dynamic host replacement first (excluding core meta overrides below)
          const hostUrl = \`\${req.protocol}://\${req.get('host')}\`;
          html = html.replace(/https:\\/\\/www\\.xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);
          html = html.replace(/https:\\/\\/xn--h49a2pelq49bcrfloji4br3e56y\\.com/gi, hostUrl);

          // 2. Fallback to current URL to prevent OG domain mismatch if post is missing or loading
          const currentUrl = \`\${req.protocol}://\${req.get('host')}\${req.originalUrl}\`;
          html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi, \`<meta id="ogUrl" property="og:url" content="\${currentUrl}" />\`);
          html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi, \`<link rel="canonical" id="canonicalUrl" href="\${currentUrl}" />\`);

          // 3. Fetch post details for SSR Meta Injection
          const itemId = resolveItemId(req);
          if (itemId) {
            const post = await findPostByIdOrNumber(itemId);
            if (post) {
              const dong = post.dong || '구미';
              const building = post.building || '추천 매물';
              const type = post.category || '매물';
              
              const newTitle = \`태왕공인중개사사무소 - [\${dong} \${building} \${type}]\`;
              const newDesc = formatOgDescription(post.content || post.remarks || '');
              const newUrl = \`\${hostUrl}/item/view/\${getPostNumber(post.id)}?postId=\${post.id}\`;
              const newImage = await ensureOgImageInStorage(post.id, post) || \`\${hostUrl}/assets/generated/\${post.id}.jpg\`;

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
          }

          res.send(html);`;

if (serverCode.includes(catchAllOld)) {
  serverCode = serverCode.replace(catchAllOld, catchAllNew);
  console.log("Successfully prepared replacement for catchAll!");
} else {
  console.warn("catchAllOld was not found exact match. We'll search and replace dynamically.");
}

// Write the modified code back to server.ts
fs.writeFileSync('server.ts', serverCode, 'utf8');
console.log("Successfully completed the ultimate Kakao SSR alignment patch in server.ts!");
