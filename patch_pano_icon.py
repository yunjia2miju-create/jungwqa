import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

pano_html_old = """                    <!-- Diet/Minimal VR Label Badge (70% Compact Scale) -->
                    <div class="absolute top-1 left-1 bg-emerald-600/90 text-white font-bold rounded shadow-xs select-none" style="font-size: 8px !important; padding: 1px 3px !important; line-height: 1 !important; border: 1px solid rgba(16, 185, 129, 0.2);">VR 360 파노라마 실사</div>
                    <!-- Representative Photo Button -->"""
                    
pano_html_new = """                    <!-- Drag Handle Icon -->
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center pointer-events-none z-10">
                        <i class="fa-solid fa-arrows-up-down-left-right text-xl"></i>
                    </div>
                    <!-- Diet/Minimal VR Label Badge (70% Compact Scale) -->
                    <div class="absolute top-1 left-1 bg-emerald-600/90 text-white font-bold rounded shadow-xs select-none" style="font-size: 8px !important; padding: 1px 3px !important; line-height: 1 !important; border: 1px solid rgba(16, 185, 129, 0.2);">VR 360 파노라마 실사</div>
                    <!-- Representative Photo Button -->"""
                    
content = content.replace(pano_html_old, pano_html_new)

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
