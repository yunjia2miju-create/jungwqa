const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const projectId = config.projectId;
const dbId = config.firestoreDatabaseId || '(default)';
const apiKey = config.apiKey;
const id = 'local-1782970859637';

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/posts/${id}?key=${apiKey}`;

fetch(url)
  .then(r => r.json())
  .then(d => {
    console.log(d);
  });
