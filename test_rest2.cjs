const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const dbId = config.firestoreDatabaseId || '(default)';
const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${dbId}/documents/posts/local-1782970859637?key=${config.apiKey}`;

fetch(url)
  .then(res => {
    if (res.ok) return res.json();
    throw new Error('Not ok');
  })
  .then(doc => {
    const thumbnail = doc.fields?.thumbnail?.stringValue || doc.fields?.thumbnail?.nullValue || '';
    console.log("thumbnail:", thumbnail);
  })
  .catch(console.error);
