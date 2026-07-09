import re

with open("src/components/MainTab.tsx", "r") as f:
    content = f.read()

# 1. Remove ViewAllModal from the bottom of Carousel3D
content = re.sub(
    r'<ViewAllModal\s*isOpen=\{viewAllCategory !== null\}\s*onClose=\{\(\) => setViewAllCategory\(null\)\}\s*categoryTitle=\{viewAllCategory \|\| \'\'\}\s*items=\{viewAllItems\}\s*openPhoneSelectModal=\{openPhoneSelectModal\}\s*setSelectedPostId=\{setSelectedPostId\}\s*setActiveSection=\{setActiveSection\}\s*getBlogUrl=\{getBlogUrl\}\s*isAdminLoggedIn=\{isAdminLoggedIn\}\s*/>',
    '',
    content
)

# 2. Add ViewAllModal at the end of MainTab
maintab_end_pattern = r'</section>\s*\);\s*};\s*// 아임웹\(imweb\) 갤러리 감성의 2D 플랫 무한 루프 슬라이더'
maintab_end_replacement = """
                <ViewAllModal 
                    isOpen={viewAllCategory !== null}
                    onClose={() => setViewAllCategory(null)}
                    categoryTitle={viewAllCategory || ''}
                    items={viewAllItems}
                    openPhoneSelectModal={openPhoneSelectModal}
                    setSelectedPostId={setSelectedPostId}
                    setActiveSection={setActiveSection}
                    getBlogUrl={getBlogUrl}
                    isAdminLoggedIn={isAdminLoggedIn}
                />
            </div>
        </section>
    );
};

// 아임웹(imweb) 갤러리 감성의 2D 플랫 무한 루프 슬라이더"""

content = re.sub(maintab_end_pattern, maintab_end_replacement, content)

with open("src/components/MainTab.tsx", "w") as f:
    f.write(content)

