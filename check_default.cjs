const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const defaultDb = getFirestore(app);

async function check() {
  try {
    const snap = await getDocs(collection(defaultDb, 'posts'));
    console.log(`Found ${snap.size} posts in default DB`);
  } catch(e) {
    console.error(e.message);
  }
}
check();
