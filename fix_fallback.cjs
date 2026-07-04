const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replaceAll('https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/fixed-master-vr-banner.png', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&h=630&q=80');
fs.writeFileSync('index.html', indexHtml);

let serverTs = fs.readFileSync('server.ts', 'utf8');
serverTs = serverTs.replaceAll('https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/fixed-master-vr-banner.png', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&h=630&q=80');
fs.writeFileSync('server.ts', serverTs);
