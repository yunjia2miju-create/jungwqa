const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replaceAll(
  'const newUrl = `${req.protocol}://${req.get(\'host\')}${req.originalUrl}`;',
  'const newUrl = `https://www.xn--h49a2pelq49bcrfloji4br3e56y.com${req.originalUrl}`;'
);

code = code.replaceAll(
  'const newImage = panoUrl || post.thumbnail || (post.images ? post.images.split(\'|\')[0] : `${req.protocol}://${req.get(\'host\')}/assets/fixed-master-vr-banner.png`);',
  'let newImage = panoUrl || post.thumbnail || (post.images ? post.images.split(\'|\')[0] : `https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/fixed-master-vr-banner.png`);\n              if (newImage && newImage.startsWith(\'/\')) {\n                newImage = `https://www.xn--h49a2pelq49bcrfloji4br3e56y.com${newImage}`;\n              }'
);

fs.writeFileSync('server.ts', code);
