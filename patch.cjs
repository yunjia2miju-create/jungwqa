const fs = require('fs');
const content = fs.readFileSync('src/components/AdminLoginSection.tsx', 'utf-8');

const target = `
        if (inputEmail === 'yunjia2miju@gmail.com') {
            const storedAdminPassword = localStorage.getItem('taewang_admin_password') || '1234';
            
            if (inputPassword === storedAdminPassword && inputPassword !== '1234') {
                setLoginStep('sms');
                showToast("소장님 1차 인증 성공. 2차 모바일 보안 토큰을 발송합니다.", "success");
                await handleSendVerificationCode();
                return;
            } else if (inputPassword === '1234' && storedAdminPassword === '1234') {
                setLoginStep('sms');
                showToast("임시 비밀번호(1234)로 확인 성공. 안전을 위해 관리자 센터에서 비밀번호를 꼭 변경하세요.", "success");
                await handleSendVerificationCode();
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, inputEmail, inputPassword);
                setLoginStep('sms');
                showToast("구글 통합 계정 비밀번호 검증 성공. 모바일 2차 인증을 진행합니다.", "success");
                await handleSendVerificationCode();
                return;
            } catch (authErr) {
                showToast("비밀번호가 올바르지 않습니다. 관리자 계정 정보를 확인해주세요.", "error");
                return;
            }
        }
`;

const replacement = `
        if (inputEmail === 'yunjia2miju@gmail.com') {
            try {
                await signInWithEmailAndPassword(auth, inputEmail, inputPassword);
            } catch (authErr: any) {
                if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                    try {
                        await createUserWithEmailAndPassword(auth, inputEmail, inputPassword);
                    } catch (createErr) {
                        showToast("서버 동기화를 위해 가급적 상단의 '구글 계정으로 시작' 버튼을 이용해주세요.", "error");
                        return;
                    }
                } else {
                    showToast("비밀번호가 일치하지 않습니다. 상단의 '구글 계정으로 시작' 버튼을 권장합니다.", "error");
                    return;
                }
            }
            
            setLoginStep('sms');
            showToast("소장님 1차 인증 성공. 안전한 파이어베이스 동기화가 활성화되었습니다.", "success");
            await handleSendVerificationCode();
            return;
        }
`;

if (content.includes(target.trim())) {
  fs.writeFileSync('src/components/AdminLoginSection.tsx', content.replace(target.trim(), replacement.trim()));
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
