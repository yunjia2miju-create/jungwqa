import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

gen_html_old = """                    <!-- Hover Overlay Action Buttons -->"""
gen_html_new = """                    <!-- Drag Handle Icon -->
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center pointer-events-none z-10">
                        <i class="fa-solid fa-arrows-up-down-left-right text-xl"></i>
                    </div>
                    <!-- Hover Overlay Action Buttons -->"""
                    
content = content.replace(gen_html_old, gen_html_new)

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
