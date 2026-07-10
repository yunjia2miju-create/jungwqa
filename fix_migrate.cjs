const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
const defaultDb = getFirestore(app);

async function migrate() {
  try {
    const defaultSnap = await getDocs(collection(defaultDb, 'posts'));
    console.log(`Found ${defaultSnap.size} posts in default DB`);
    
    let migrated = 0;
    for (const d of defaultSnap.docs) {
      const data = d.data();
      await setDoc(doc(db, 'posts', data.id), data, { merge: true });
      migrated++;
    }
    console.log(`Successfully migrated ${migrated} posts to custom DB`);
    
    // Also migrate inquiries
    const inqSnap = await getDocs(collection(defaultDb, 'inquiries'));
    console.log(`Found ${inqSnap.size} inquiries in default DB`);
    
    let inqMigrated = 0;
    for (const d of inqSnap.docs) {
      const data = d.data();
      await setDoc(doc(db, 'inquiries', data.id), data, { merge: true });
      inqMigrated++;
    }
    console.log(`Successfully migrated ${inqMigrated} inquiries to custom DB`);
    
    // Also migrate users
    const usersSnap = await getDocs(collection(defaultDb, 'registered_users'));
    console.log(`Found ${usersSnap.size} users in default DB`);
    
    let userMigrated = 0;
    for (const d of usersSnap.docs) {
      const data = d.data();
      await setDoc(doc(db, 'registered_users', data.email), data, { merge: true });
      userMigrated++;
    }
    console.log(`Successfully migrated ${userMigrated} users to custom DB`);
    
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrate();
