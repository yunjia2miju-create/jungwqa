const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const _dirname = path.dirname(_filename);',
  'const _dirname = _filename.endsWith(".ts") || _filename.endsWith(".js") || _filename.endsWith(".cjs") || _filename.endsWith(".mjs") ? path.dirname(_filename) : _filename;'
);
fs.writeFileSync('server.ts', content, 'utf8');
