const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, query, limit } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function check() {
  try {
    const customSnap = await getDocs(query(collection(db, 'posts'), limit(100)));
    console.log(`Found ${customSnap.size} posts in custom DB`);
    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
}
check();
