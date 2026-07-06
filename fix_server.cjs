const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `    if (firestoreDb && !firestorePermissionFailed) {
      try {
        const docRef = firestoreDb.collection('posts').doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          return docSnap.data();
        }
      } catch (err) {
        console.warn("[getPostById] Firestore fetch failed, falling back to JSON:", err);
      }
    }
    try {`;

const replacement = `    if (firestoreDb && !firestorePermissionFailed) {
      try {
        const docRef = firestoreDb.collection('posts').doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          return docSnap.data();
        }
      } catch (err) {
        console.warn("[getPostById] Firestore fetch failed, falling back to JSON:", err);
      }
    }
    
    // REST API fallback for dev environment where admin SDK fails due to missing Application Default Credentials
    if (firebaseAdminConfig && firebaseAdminConfig.projectId && firebaseAdminConfig.apiKey) {
      const dbId = firebaseAdminConfig.firestoreDatabaseId || '(default)';
      const url = \`https://firestore.googleapis.com/v1/projects/\${firebaseAdminConfig.projectId}/databases/\${dbId}/documents/posts/\${id}?key=\${firebaseAdminConfig.apiKey}\`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const doc = await res.json();
          if (doc && doc.fields) {
            return {
              id: id,
              thumbnail: doc.fields.thumbnail?.stringValue || doc.fields.thumbnail?.nullValue || '',
              dong: doc.fields.dong?.stringValue || '',
              building: doc.fields.building?.stringValue || '',
              category: doc.fields.category?.stringValue || ''
            };
          }
        }
      } catch (e) {
        console.warn("[getPostById] REST API fetch failed:", e);
      }
    }

    try {`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('server.ts', content, 'utf8');
    console.log("Patched server.ts successfully");
} else {
    console.log("Target string not found!");
}
