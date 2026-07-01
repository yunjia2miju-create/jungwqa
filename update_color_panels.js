const fs = require('fs');

let html = fs.readFileSync('public/smarteditor-final.html', 'utf8');

// 1. Extract panels
const textPanelRegex = /<div id="text-color-picker-panel".*?<\/div>[\s]*<\/div>[\s]*<\/div>/s;
// Actually, let's just find the start and end by manual inspection or regex if possible.
