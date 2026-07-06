const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const url = `https://firestore.googleapis.com/v1/projects/${firebaseAdminConfig.projectId}/databases/${dbId}/documents/posts/${id}?key=${firebaseAdminConfig.apiKey}`;',
  'const url = `https://firestore.googleapis.com/v1/projects/${firebaseAdminConfig.projectId}/databases/${dbId}/documents/posts/${id}?key=${firebaseAdminConfig.apiKey}`;\nconsole.log("REST URL:", url);'
);
content = content.replace(
  'if (doc && doc.fields) {',
  'console.log("REST DOC:", JSON.stringify(doc));\n          if (doc && doc.fields) {'
);
content = content.replace(
  'const newImage = post.thumbnail || `${req.protocol}://${req.get(\'host\')}/assets/fixed-master-vr-banner.png`;',
  'const newImage = post.thumbnail || `${req.protocol}://${req.get(\'host\')}/assets/fixed-master-vr-banner.png`;\nconsole.log("FINAL POST:", JSON.stringify(post));\nconsole.log("FINAL NEW_IMAGE:", newImage);'
);
fs.writeFileSync('server.ts', content, 'utf8');
