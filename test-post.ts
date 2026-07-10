import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function test() {
  try {
    const dRef = doc(db, 'posts', 'test_post_id_123');
    await setDoc(dRef, {
      id: 'test_post_id_123',
      category: 'test',
      dong: 'test',
      building: 'test',
      room: 'test',
      price: '100',
      manageFee: '100',
      phone: 'test',
      title: 'test',
      address: 'test',
      transactionType: 'test',
      isRecommended: false,
      createdAt: Date.now()
    });
    console.log("Write succeeded");
  } catch (err) {
    console.error("Write failed:", err);
  }
}
test();
