import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
admin.initializeApp({
  projectId: config.projectId
});
const db = config.firestoreDatabaseId ? getFirestore(admin.apps[0]!, config.firestoreDatabaseId) : getFirestore(admin.apps[0]!);

async function test() {
  try {
    const dRef = db.collection('posts').doc('non_existent_id');
    await dRef.delete();
    console.log("Admin delete succeeded");
  } catch (err) {
    console.error("Admin delete failed:", err);
  }
}
test();
