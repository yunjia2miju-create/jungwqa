const html = '<meta id="ogImage" property="og:image" content="https://www.xn--h49a2pelq49bcrfloji4br3e56y.com/assets/fixed-master-vr-banner.png">';
const newImage = 'https://firebasestorage.googleapis.com/...';
let result = html;
if (html.includes('property="og:image"')) {
  result = html.replace(/<meta[^>]*property="og:image"(?!:width|:height)[^>]*>/gi, `<meta id="ogImage" property="og:image" content="${newImage}" />`);
}
console.log(result);
