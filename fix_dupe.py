import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("onStart: function() { isDraggingSortable = true; },\n                        onStart: function() { isDraggingSortable = true; },", "onStart: function() { isDraggingSortable = true; },")
content = content.replace("setTimeout(() => { isDraggingSortable = false; }, 50);\n                            setTimeout(() => { isDraggingSortable = false; }, 50);", "setTimeout(() => { isDraggingSortable = false; }, 50);")

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
