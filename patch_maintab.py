import re

with open("src/components/MainTab.tsx", "r") as f:
    content = f.read()

# 1. Import ViewAllModal
if "import { ViewAllModal }" not in content:
    content = content.replace("import { Naver360Icon } from './Naver360Icon';", "import { Naver360Icon } from './Naver360Icon';\nimport { ViewAllModal } from './ViewAllModal';")

# 2. Add state
state_code = """
    // 전체보기 모달 상태
    const [viewAllCategory, setViewAllCategory] = useState<string | null>(null);
    const [viewAllItems, setViewAllItems] = useState<any[]>([]);

    const handleViewAll = (categoryTitle: string, items: any[]) => {
        setViewAllCategory(categoryTitle);
        setViewAllItems(items);
    };

    // 대문용 고화질 디폴트 360 VR 파노라마 이미지 슬라이더 전용 데이터
"""
content = content.replace("    // 대문용 고화질 디폴트 360 VR 파노라마 이미지 슬라이더 전용 데이터", state_code)


# 3. Replace buttons with onClick handler
replacements = [
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">360° 현장 VR 투어</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'360° 현장 VR 투어\', vrData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">360° 현장 VR 투어</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">원룸추천매물</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'원룸추천매물\', oneRoomRecommendData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">원룸추천매물</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">미투추천매물</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'미투추천매물\', miRoomRecommendData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">미투추천매물</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">투룸/쓰리룸 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'투룸/쓰리룸 특선\', specialData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">투룸/쓰리룸 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">오피스텔 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'오피스텔 특선\', officetelData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">오피스텔 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">아파트 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'아파트 특선\', apartmentData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">아파트 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">빌라 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'빌라 특선\', villaData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">빌라 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">상가\(사무실\) 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'상가(사무실) 특선\', commercialData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">상가(사무실) 특선</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">원룸매매 추천</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'원룸매매 추천\', oneRoomSaleData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">원룸매매 추천</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">유튜브</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'유튜브\', youtubeData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">유튜브</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    ),
    (
        r'<button className="bg-\\[#0B2545\\] hover:bg-\\[#1a385f\\] text-white font-bold py-3\.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\s*지금 즉시 <span className="font-black text-\\[#64dfdf\\]">네이버TV</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-\\[#64dfdf\\]" />\s*</button>',
        '<button onClick={() => handleViewAll(\'네이버TV\', naverTvData)} className="bg-[#0B2545] hover:bg-[#1a385f] text-white font-bold py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-sm sm:text-base flex items-center gap-2">\n                                지금 즉시 <span className="font-black text-[#64dfdf]">네이버TV</span> 전체보기 <ArrowUpRight className="w-5 h-5 text-[#64dfdf]" />\n                            </button>'
    )
]

for pattern, repl in replacements:
    content = re.sub(pattern, repl, content)

# 4. Insert modal component at the end of MainTab
modal_code = """
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
    );
};
"""
content = content.replace("        </div>\n    );\n};", modal_code)

with open("src/components/MainTab.tsx", "w") as f:
    f.write(content)
