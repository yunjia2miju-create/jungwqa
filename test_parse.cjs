const doc = require('./doc.json');
const list = [];
if (doc.thumbnail) {
    list.push(doc.thumbnail.trim());
}
const processField = (field) => {
    if (!field) return;
    if (Array.isArray(field)) {
        field.forEach(val => {
            if (val && typeof val === 'string') {
                list.push(val.trim());
            }
        });
    } else if (typeof field === 'string') {
        const str = field.trim();
        if (str) {
            if (str.includes('|')) {
                str.split('|').forEach(part => {
                    const trimmed = part.trim();
                    if (trimmed) list.push(trimmed);
                });
            } else if (str.includes(',') && (str.includes('http') || str.includes('/gallery/') || str.includes('/images/'))) {
                str.split(',').forEach(part => {
                    const trimmed = part.trim();
                    if (trimmed) list.push(trimmed);
                });
            } else {
                list.push(str);
            }
        }
    }
};

processField(doc.images);
processField(doc.imageUrls);
processField(doc.additionalImages);

const uniqueUrls = Array.from(new Set(list));
console.log("Found:", uniqueUrls.length);
