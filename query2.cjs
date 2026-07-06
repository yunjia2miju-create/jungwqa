const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const docRef = doc(db, 'posts', 'local-1782970859637');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    fs.writeFileSync('doc.json', JSON.stringify(docSnap.data(), null, 2));
    console.log("Wrote doc.json");
  } else {
    console.log("No such document!");
  }
}

run().catch(console.error);
