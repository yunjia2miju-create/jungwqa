const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
admin.initializeApp({ projectId: config.projectId });
const dbId = config.firestoreDatabaseId;
const appInstance = admin.apps[0];
let firestoreDb = dbId ? getFirestore(appInstance, dbId) : getFirestore(appInstance);

async function check() {
  try {
    await firestoreDb.collection('_test_probe_').limit(1).get();
    console.log("Custom DB probe succeeded");
  } catch (checkErr) {
    const errMsg = checkErr.message || "";
    console.log("Custom DB probe failed with:", errMsg);
    const isPermissionOrDbError = errMsg.includes('PERMISSION_DENIED') || 
                                   errMsg.includes('database') || 
                                   String(checkErr).includes('7') ||
                                   String(checkErr).includes('3');
    if (isPermissionOrDbError && dbId) {
      console.log("Falling back to defaultDb!");
      try {
        const defaultDb = getFirestore(appInstance);
        await defaultDb.collection('_test_probe_').limit(1).get();
        console.log("Default DB probe succeeded");
      } catch (e) {
        console.log("Default DB probe failed:", e.message);
      }
    } else {
      console.log("No fallback");
    }
  }
}
check();
