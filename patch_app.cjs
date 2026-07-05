const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `                    // Parse query parameters for automatic redirection to post detail view (e.g. from Naver Blog VR links)
                    const params = new URLSearchParams(window.location.search);
                    const urlPostId = params.get('id') || params.get('postId');`,
  `                    // Parse path or query parameters for automatic redirection to post detail view
                    const path = window.location.pathname;
                    const pathParts = path.split('/');
                    const isRoomPath = pathParts.length >= 3 && pathParts[1] === 'rooms';
                    const params = new URLSearchParams(window.location.search);
                    const urlPostId = isRoomPath ? pathParts[2] : (params.get('id') || params.get('postId'));`
);

code = code.replace(
  `    // [인터넷 상세 주소창 제어 및 다이렉트 링크 기능] 실시간 동적 변환
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const currentId = params.get('id') || params.get('postId');
        if (selectedPostId) {
            if (currentId !== selectedPostId) {
                window.history.pushState({ postId: selectedPostId }, "", \`?id=\${selectedPostId}\`);
            }
        } else {
            // Only clear the query parameter if it is set and we are returning to the main page
            if (currentId && activeSection === 'main') {
                window.history.pushState(null, "", window.location.pathname);
            }
        }
    }, [selectedPostId, activeSection]);`,
  `    // [인터넷 상세 주소창 제어 및 다이렉트 링크 기능] 실시간 동적 변환
    useEffect(() => {
        const path = window.location.pathname;
        const pathParts = path.split('/');
        const isRoomPath = pathParts.length >= 3 && pathParts[1] === 'rooms';
        const currentId = isRoomPath ? pathParts[2] : null;

        if (activeSection === 'detail' && selectedPostId) {
            if (currentId !== selectedPostId) {
                window.history.pushState({ postId: selectedPostId }, "", \`/rooms/\${selectedPostId}\`);
            }
        } else if (activeSection === 'main') {
            if (isRoomPath) {
                window.history.pushState(null, "", "/");
            }
        }
    }, [selectedPostId, activeSection]);`
);

code = code.replace(
  `    // 브라우저 뒤로가기/앞으로가기 (onpopstate) 대응 선로 세팅
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id') || params.get('postId');
            if (id) {
                useAppStore.getState().setSelectedPostId(id);
                useAppStore.getState().setActiveSection('detail');
            } else {
                useAppStore.getState().setSelectedPostId(null);
                useAppStore.getState().setActiveSection('main');
            }
        };`,
  `    // 브라우저 뒤로가기/앞으로가기 (onpopstate) 대응 선로 세팅
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const path = window.location.pathname;
            const pathParts = path.split('/');
            const isRoomPath = pathParts.length >= 3 && pathParts[1] === 'rooms';
            
            // Allow fallback to query parameters for backward compatibility
            const params = new URLSearchParams(window.location.search);
            const id = isRoomPath ? pathParts[2] : (params.get('id') || params.get('postId'));
            
            if (id) {
                useAppStore.getState().setSelectedPostId(id);
                useAppStore.getState().setActiveSection('detail');
            } else {
                useAppStore.getState().setSelectedPostId(null);
                useAppStore.getState().setActiveSection('main');
            }
        };`
);

fs.writeFileSync('src/App.tsx', code);
