import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

# YouTube input replace
youtube_old = """                    <!-- 1. 유튜브 동영상 링크 입력란 -->
                    <div class="space-y-3">
                        <label class="block text-[22px] font-black text-slate-700 select-none">1. 유튜브 동영상 링크</label>
                        <input type="text" id="post-video" oninput="handleYoutubeInput()" placeholder="예: https://youtu.be/..." class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-7 py-5 text-[22px] font-bold focus:outline-none focus:border-emerald-500 transition-colors">
                        <!-- 유튜브 16:9 임베드 미리보기 영역 -->"""

youtube_new = """                    <!-- 1. 유튜브 동영상 링크 입력란 -->
                    <div class="space-y-3">
                        <label class="block text-[22px] font-black text-slate-700 select-none">1. 유튜브 동영상 링크</label>
                        <div class="flex gap-2">
                            <input type="text" id="post-video" oninput="handleYoutubeInput()" placeholder="예: https://youtu.be/..." class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-7 py-5 text-[22px] font-bold focus:outline-none focus:border-emerald-500 transition-colors">
                            <button type="button" id="btn-open-youtube" onclick="openYoutubeLink()" class="shrink-0 bg-emerald-600 text-white px-6 py-5 rounded-2xl font-bold text-[22px] hover:bg-emerald-500 transition-colors whitespace-nowrap shadow-sm">
                                <i class="fa-solid fa-arrow-up-right-from-square mr-2"></i>새창 열기
                            </button>
                        </div>
                        <!-- 유튜브 16:9 임베드 미리보기 영역 -->"""

content = content.replace(youtube_old, youtube_new)

# Naver TV button replace
navertv_old = """                            <button type="button" onclick="openNaverTvLink()" class="shrink-0 bg-emerald-600 text-white px-6 py-5 rounded-2xl font-bold text-[22px] hover:bg-emerald-500 transition-colors whitespace-nowrap shadow-sm">
                                <i class="fa-solid fa-arrow-up-right-from-square mr-2"></i>새창 열기
                            </button>"""

navertv_new = """                            <button type="button" id="btn-open-navertv" onclick="openNaverTvLink()" class="shrink-0 bg-emerald-600 text-white px-6 py-5 rounded-2xl font-bold text-[22px] hover:bg-emerald-500 transition-colors whitespace-nowrap shadow-sm">
                                <i class="fa-solid fa-arrow-up-right-from-square mr-2"></i>새창 열기
                            </button>"""

content = content.replace(navertv_old, navertv_new)

# Update openNaverTvLink function
func_old = """        function openNaverTvLink() {
            const url = document.getElementById('post-navertv').value.trim();
            if (url) {
                window.open(url, '_blank');
            } else {
                alert('네이버 TV 동영상 링크를 입력해주세요.');
            }
        }"""

func_new = """        function openNaverTvLink() {
            const url = document.getElementById('post-navertv').value.trim();
            if (url) {
                window.open(url, '_blank');
                const btn = document.getElementById('btn-open-navertv');
                btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
                btn.classList.add('bg-slate-500', 'hover:bg-slate-600');
                btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>새창 열림';
            } else {
                alert('네이버 TV 동영상 링크를 입력해주세요.');
            }
        }
        
        function openYoutubeLink() {
            const url = document.getElementById('post-video').value.trim();
            if (url) {
                window.open(url, '_blank');
                const btn = document.getElementById('btn-open-youtube');
                btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
                btn.classList.add('bg-slate-500', 'hover:bg-slate-600');
                btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>새창 열림';
            } else {
                alert('유튜브 동영상 링크를 입력해주세요.');
            }
        }"""

content = content.replace(func_old, func_new)

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
