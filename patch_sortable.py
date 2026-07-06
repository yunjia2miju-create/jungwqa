import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add global variable
content = content.replace("function initSortablePhotos() {", "let isDraggingSortable = false;\n        function initSortablePhotos() {")

# 2. Update general photos Sortable
gen_sort_old = """                        onEnd: function(evt) {"""
gen_sort_new = """                        onStart: function() { isDraggingSortable = true; },
                        onEnd: function(evt) {
                            setTimeout(() => { isDraggingSortable = false; }, 50);"""
content = content.replace(gen_sort_old, gen_sort_new)

# 3. Update panorama photos Sortable
pano_sort_old = """                        onEnd: function(evt) {"""
pano_sort_new = """                        onStart: function() { isDraggingSortable = true; },
                        onEnd: function(evt) {
                            setTimeout(() => { isDraggingSortable = false; }, 50);"""
content = content.replace(pano_sort_old, pano_sort_new)

# 4. Prevent click if dragging
pano_click_old = """                item.onclick = (e) => {
                    if (e.target.closest('button')) return;
                    if (e.target.closest('.rep-overlay-layer')) return;
                    loadPanoramaInViewer(url);
                };"""
pano_click_new = """                item.onclick = (e) => {
                    if (isDraggingSortable) return;
                    if (e.target.closest('button')) return;
                    if (e.target.closest('.rep-overlay-layer')) return;
                    loadPanoramaInViewer(url);
                };"""
content = content.replace(pano_click_old, pano_click_new)

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
