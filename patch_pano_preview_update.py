import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to successful upload
upload_success_old = """                            representativeVrThumbnailUrl = msgEvent.data.payload.url;
                            window.removeEventListener('message', handler);
                            hideLoader();
                            alert(`[⭐ VR 대표사진 지정 완료]\\n${roomName} 캡처 이미지가 연동되었습니다.`);"""
upload_success_new = """                            representativeVrThumbnailUrl = msgEvent.data.payload.url;
                            window.removeEventListener('message', handler);
                            updateVRRepresentativePreview();
                            hideLoader();
                            alert(`[⭐ VR 대표사진 지정 완료]\\n${roomName} 캡처 이미지가 연동되었습니다.`);"""

content = content.replace(upload_success_old, upload_success_new)

# Add to snapshot URL assignment
snapshot_old = """                    representativeVrThumbnailUrl = snapshotUrl;
                    let ogImage = document.querySelector('meta[property="og:image"]');"""
snapshot_new = """                    representativeVrThumbnailUrl = snapshotUrl;
                    updateVRRepresentativePreview();
                    let ogImage = document.querySelector('meta[property="og:image"]');"""

content = content.replace(snapshot_old, snapshot_new)

# Also update when data is loaded
load_old = """                if (data.vrThumbnail) representativeVrThumbnailUrl = data.vrThumbnail;

                updateCharacterCounts();"""
load_new = """                if (data.vrThumbnail) representativeVrThumbnailUrl = data.vrThumbnail;
                updateVRRepresentativePreview();

                updateCharacterCounts();"""
content = content.replace(load_old, load_new)

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
