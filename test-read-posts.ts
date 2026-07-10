import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
admin.initializeApp({ projectId: config.projectId });
const db = config.firestoreDatabaseId ? getFirestore(admin.apps[0]!, config.firestoreDatabaseId) : getFirestore(admin.apps[0]!);

async function test() {
  try {
    const snap = await db.collection('posts').get();
    console.log(`Found ${snap.size} posts in Firestore.`);
    snap.docs.forEach(doc => {
      console.log("-", doc.id, doc.data().title);
    });
  } catch (err) {
    console.error("Read failed:", err);
  }
}
test();
