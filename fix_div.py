import re

with open("src/components/MainTab.tsx", "r") as f:
    content = f.read()

content = content.replace("                />\n            </div>\n        </section>\n    );\n};", "                />\n        </section>\n    );\n};")

with open("src/components/MainTab.tsx", "w") as f:
    f.write(content)

