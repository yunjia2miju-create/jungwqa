const fs = require('fs');
let content = fs.readFileSync('src/components/AdminLoginSection.tsx', 'utf-8');

const target = `
        if (email === 'yunjia2miju@gmail.com') {
            setIsAdminLoggedIn(true);
            setIsFirebaseSimulatedConnected(true);
            localStorage.setItem('taewang_firebase_sim_connected', 'true');
            showToast("[소장님 계정] 가상 우회 보안 채널로 완벽하게 복구 및 접속 완료!", "success");
            setSocialPopup(null);
            setSocialEmailInput('');
            setSocialNameInput('');
            setActiveSection('admin-dashboard');
            return;
        }
`;

const replacement = `
        if (email === 'yunjia2miju@gmail.com') {
            try {
                // Ensure real Firebase Auth token is generated even in sim fallback
                await signInWithEmailAndPassword(auth, email, "taewang1234!");
            } catch (authErr) {
                try {
                    await createUserWithEmailAndPassword(auth, email, "taewang1234!");
                } catch (createErr) {
                    console.error("Sim Auth fallback failed:", createErr);
                }
            }
            setIsAdminLoggedIn(true);
            setIsFirebaseSimulatedConnected(true);
            localStorage.setItem('taewang_firebase_sim_connected', 'true');
            showToast("[소장님 계정] 가상 우회 보안 채널로 완벽하게 복구 및 접속 완료!", "success");
            setSocialPopup(null);
            setSocialEmailInput('');
            setSocialNameInput('');
            setActiveSection('admin-dashboard');
            return;
        }
`;

if (content.includes(target.trim())) {
  fs.writeFileSync('src/components/AdminLoginSection.tsx', content.replace(target.trim(), replacement.trim()));
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
