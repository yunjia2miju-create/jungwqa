import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

render_func_old = """        function renderPanoramaPhotos() {
            const grid = document.getElementById('pano-photos-list');"""

render_func_new = """        function renderPanoramaPhotos() {
            updateVRRepresentativePreview();
            const grid = document.getElementById('pano-photos-list');"""

content = content.replace(render_func_old, render_func_new)


func_insert = """        function updateVRRepresentativePreview() {
            const placeholder = document.getElementById('pano-drag-placeholder');
            const previewContainer = document.getElementById('pano-drag-preview-container');
            const previewImg = document.getElementById('pano-drag-preview-img');
            
            if (representativeVrThumbnailUrl) {
                if (placeholder) placeholder.classList.add('hidden');
                if (previewContainer) previewContainer.classList.remove('hidden');
                if (previewImg) previewImg.src = representativeVrThumbnailUrl;
            } else if (panoramaPhotos && panoramaPhotos.length > 0) {
                // If there's a pano but no rep photo yet, maybe show the first one?
                if (placeholder) placeholder.classList.add('hidden');
                if (previewContainer) previewContainer.classList.remove('hidden');
                if (previewImg) previewImg.src = panoramaPhotos[0];
            } else {
                if (placeholder) placeholder.classList.remove('hidden');
                if (previewContainer) previewContainer.classList.add('hidden');
                if (previewImg) previewImg.src = '';
            }
        }
        """

# Let's insert `updateVRRepresentativePreview` somewhere
search_target = "function setRepresentativePhoto(type, idx) {"
content = content.replace(search_target, func_insert + "\n" + search_target)

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
