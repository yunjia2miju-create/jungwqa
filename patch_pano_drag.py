import re

with open('public/smarteditor-final.html', 'r', encoding='utf-8') as f:
    content = f.read()

pano_drag_old = """                        <div class="border-2 border-dashed border-slate-250 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 transition-all aspect-[21/9] w-full cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/10" id="pano-drag-zone" onclick="document.getElementById('multiple-panos-input').click()">
                            <input type="file" id="multiple-panos-input" multiple accept="image/*" class="hidden" onchange="handleMobilePhotoUpload(event, true)">
                            <i class="fa-solid fa-globe text-emerald-500 text-6xl mb-4 animate-pulse"></i>
                            <span class="text-2xl font-black text-slate-800">인스타360 / 캐논 VR 파노라마 사진 등록</span>
                            <span class="text-lg text-slate-400 mt-2">상하좌우 360도 공간 실감 사진을 첨부하십시오</span>
                        </div>"""

pano_drag_new = """                        <div class="border-2 border-dashed border-slate-250 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 transition-all aspect-[21/9] w-full cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/10 relative overflow-hidden" id="pano-drag-zone">
                            <input type="file" id="multiple-panos-input" multiple accept="image/*" class="hidden" onchange="handleMobilePhotoUpload(event, true)">
                            
                            <div id="pano-drag-placeholder" class="flex flex-col items-center justify-center w-full h-full" onclick="document.getElementById('multiple-panos-input').click()">
                                <i class="fa-solid fa-globe text-emerald-500 text-6xl mb-4 animate-pulse"></i>
                                <span class="text-2xl font-black text-slate-800">인스타360 / 캐논 VR 파노라마 사진 등록</span>
                                <span class="text-lg text-slate-400 mt-2">상하좌우 360도 공간 실감 사진을 첨부하십시오</span>
                            </div>
                            
                            <div id="pano-drag-preview-container" class="hidden absolute inset-0 w-full h-full relative">
                                <img id="pano-drag-preview-img" src="" class="w-full h-full object-cover rounded-xl" />
                                <div class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-all rounded-xl" onclick="document.getElementById('multiple-panos-input').click()">
                                    <span class="text-white text-2xl font-black bg-slate-900/80 px-6 py-3 rounded-2xl"><i class="fa-solid fa-rotate mr-2"></i>VR 사진 추가 등록</span>
                                </div>
                            </div>
                        </div>"""

content = content.replace(pano_drag_old, pano_drag_new)

with open('public/smarteditor-final.html', 'w', encoding='utf-8') as f:
    f.write(content)
