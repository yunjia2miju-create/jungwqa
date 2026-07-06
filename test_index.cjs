const path = require('path');
const fs = require('fs');
const _filename = typeof __filename !== 'undefined'
  ? __filename
  : (typeof process !== 'undefined' ? process.cwd() : '');
const _dirname = _filename.endsWith(".ts") || _filename.endsWith(".cjs") ? path.dirname(_filename) : _filename;
const projectRoot = typeof process !== "undefined" ? process.cwd() : _dirname;
console.log("Root:", projectRoot);
console.log("Index exists?", fs.existsSync(path.join(projectRoot, 'index.html')));
