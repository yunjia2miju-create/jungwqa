const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
const defaultDb = getFirestore(app);

async function check() {
  try {
    const defaultSnap = await getDocs(collection(defaultDb, 'posts'));
    console.log('Default DB posts (client):', defaultSnap.size);
  } catch (e) {
    console.log('Default DB error (client):', e.message);
  }
  
  if (config.firestoreDatabaseId) {
    try {
      const customSnap = await getDocs(collection(db, 'posts'));
      console.log('Custom DB posts (client):', customSnap.size);
    } catch (e) {
      console.log('Custom DB error (client):', e.message);
    }
  }
}
check();
