const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const dbId = firebaseAdminConfig.firestoreDatabaseId || \'(default)\';',
  'const dbId = firebaseAdminConfig.firestoreDatabaseId || \'(default)\';\nfs.appendFileSync("rest_debug.log", "FETCHING: " + url + "\\n");'
);
content = content.replace(
  'if (res.ok) {',
  'fs.appendFileSync("rest_debug.log", "RES OK: " + res.status + "\\n");\n        if (res.ok) {'
);
content = content.replace(
  'console.warn("[getPostById] REST API fetch failed:", e);',
  'fs.appendFileSync("rest_debug.log", "ERROR: " + e.message + "\\n");\n        console.warn("[getPostById] REST API fetch failed:", e);'
);
fs.writeFileSync('server.ts', content, 'utf8');
