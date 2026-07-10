import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function test() {
  try {
    const dRef = doc(db, 'posts', 'non_existent_id');
    await deleteDoc(dRef);
    console.log("Delete succeeded (or silently ignored because it doesn't exist)");
  } catch (err) {
    console.error("Delete failed:", err);
  }
}
test();
