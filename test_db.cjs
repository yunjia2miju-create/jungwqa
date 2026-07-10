const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  projectId: config.projectId
});

const defaultDb = getFirestore(admin.apps[0]);
const customDb = getFirestore(admin.apps[0], config.firestoreDatabaseId);

async function check() {
  try {
    const defaultSnap = await defaultDb.collection('posts').get();
    console.log('Default DB posts:', defaultSnap.size);
  } catch (e) {
    console.log('Default DB error:', e.message);
  }
  
  try {
    const customSnap = await customDb.collection('posts').get();
    console.log('Custom DB posts:', customSnap.size);
  } catch (e) {
    console.log('Custom DB error:', e.message);
  }
}
check();
