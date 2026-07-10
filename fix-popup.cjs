const fs = require('fs');
const content = fs.readFileSync('src/components/AdminLoginSection.tsx', 'utf-8');

const updated = content.replace(
  "import { GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';",
  "import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';"
).replace(
  /const result = await signInWithPopup\(auth, provider\);/g,
  `const result = await signInWithPopup(auth, provider);`
);

fs.writeFileSync('src/components/AdminLoginSection.tsx', updated);
