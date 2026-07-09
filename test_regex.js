const html = '<meta id="ogImage" property="og:image" content="https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/fixed-master-vr-banner.png">';
const newImage = 'https://firebasestorage.googleapis.com/...';
const regex = /<meta[^>]*property="og:image"(?!:width|:height)[^>]*>/gi;
console.log(html.replace(regex, `<meta id="ogImage" property="og:image" content="${newImage}" />`));
