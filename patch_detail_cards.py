import re

with open("src/components/DetailTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# First replace matchingRecs slice
content = re.sub(r'matchingRecs\.slice\(0, 18\);', r'matchingRecs.slice(0, 6);', content)

# Next find the grid and replace the card markup
start_marker = '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">'
start_idx = content.find(start_marker)

end_marker = '                    </div>\n                </div>\n            )}'
end_idx = content.find(end_marker, start_idx)

new_code = """<div className="flex flex-wrap justify-center gap-6 sm:gap-8">
                        {matchingRecs.map(rec => {
                            const isVideoCategory = rec.category === '유튜브' || rec.category === '네이버TV';
                            const videoUrl = rec.video || rec.naverTv || rec.naverBlogUrl || rec.blogUrl || (String(rec.remarks || '').match(/(https?:\\/\\/[^\\s]+)/)?.[1]);
                            const customBlogUrl = rec.naverBlogUrl || rec.blogUrl;

                            return (
                                <div 
                                    key={rec.id} 
                                    onClick={() => {
                                        if (isVideoCategory && videoUrl) {
                                            useAppStore.getState().setVideoPopupUrl(videoUrl);
                                            return;
                                        }
                                        if (customBlogUrl) {
                                            const finalUrl = customBlogUrl.startsWith('http') ? customBlogUrl : `https://${customBlogUrl}`;
                                            window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                        } else {
                                            setSelectedPostId(rec.id);
                                        }
                                    }} 
                                    className="w-[300px] sm:w-[360px] h-[400px] sm:h-[480px] bg-white rounded-[28px] border border-slate-200/80 shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_rgba(100,223,223,0.12)] hover:-translate-y-1.5 overflow-hidden transition-all duration-500 cursor-pointer flex flex-col justify-between shrink-0 group text-left"
                                >
                                    <div className="relative aspect-[12/9] w-full bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100 watermark-container">
                                        <img src={rec.category === '360 VR사진' ? (rec.vrThumbnail || rec.thumbnail) : (rec.thumbnail || rec.vrThumbnail)} onError={(e) => {
                                             const target = e.target as HTMLImageElement;
                                            if (target && typeof target === 'object') {
                                                target.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=675&q=80';
                                            }
                                        }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" style={{ aspectRatio: '12/9' }} />
                                        
                                        {/* 카테고리 태그 (왼쪽 상단) */}
                                        <div className="absolute top-3 left-3 flex gap-1.5 z-20">
                                            <span className="bg-[#1c2541] text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-md uppercase">
                                                {rec.category}
                                            </span>
                                        </div>

                                        {isVideoCategory && videoUrl && (
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-all duration-300 z-10">
                                                {rec.category === '유튜브' ? (
                                                    <div className="w-16 h-11 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                                                        <svg className="w-full h-full text-[#FF0000] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" />
                                                            <polygon points="9.545 8.568 15.818 12 9.545 15.432" fill="white" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-14 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
                                                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                                            <defs>
                                                                <linearGradient id="naverTvLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                    <stop offset="0%" stopColor="#05D975" />
                                                                    <stop offset="100%" stopColor="#00CCD6" />
                                                                </linearGradient>
                                                            </defs>
                                                            <rect width="100" height="100" rx="28" fill="url(#naverTvLogoGrad)" />
                                                            <g transform="translate(4, 4)">
                                                                <path d="M 30 25 C 30 19.5 33.5 17 38 19.5 L 38 80.5 C 33.5 83 30 80.5 30 75 Z" fill="#FFFFFF" opacity="0.95" />
                                                                <path d="M 38 19.5 L 72.5 43.5 C 76.5 46.2 76.5 50.8 72.5 53.5 L 61 45.5 L 38 29.5 Z" fill="#FFFFFF" opacity="1" />
                                                                <path d="M 38 80.5 L 72.5 56.5 C 76.5 53.8 76.5 49.2 72.5 46.5 L 49.5 62.5 L 38 70.5 Z" fill="#FFFFFF" opacity="0.85" />
                                                                <path d="M 38 29.5 L 38 19.5 L 46 25 Z" fill="#EEEEEE" opacity="0.9" />
                                                                <path d="M 38 70.5 L 38 80.5 L 46 75 Z" fill="#DDDDDD" opacity="0.8" />
                                                            </g>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Exact center copyright watermark - House icon only, white with 15~20% opacity */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                                            <i
                                                className="fa-solid fa-house select-none pointer-events-none text-3xl sm:text-4xl"
                                                style={{
                                                    color: '#FFFFFF',
                                                    opacity: 0.18,
                                                }}
                                            ></i>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between text-left">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[190px] sm:max-w-[220px]">
                                                    {rec.address || rec.dong || '구미시'}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                                    {rec.floor && rec.totalFloor ? `${rec.floor}/${rec.totalFloor}층` : (rec.floor ? `${rec.floor}층` : (rec.totalFloor ? `${rec.totalFloor}층` : '지상층'))}
                                                </span>
                                            </div>
                                            <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-[#1c2541] line-clamp-1 leading-snug">
                                                {rec.building}
                                            </h4>
                                            <p className="text-[11px] font-semibold text-slate-500 line-clamp-1 leading-relaxed min-h-[1.25rem]">
                                                {typeof rec.remarks === 'string' ? rec.remarks.replace(/<[^>]*>/g, '') : stripHtml(rec.title)}
                                            </p>
                                            
                                            {customBlogUrl ? (
                                                <div className="bg-emerald-50/40 rounded-lg p-2 border border-emerald-100/50 flex items-center justify-between text-[11px] font-bold text-emerald-800 mt-2">
                                                    <span className="truncate max-w-[110px] sm:max-w-[140px] text-slate-400 font-normal">{customBlogUrl.replace(/^https?:\\/\\//, '')}</span>
                                                    <span className="text-emerald-700 hover:text-emerald-950 flex items-center gap-1 shrink-0 bg-white border border-emerald-200/50 px-2 py-0.5 rounded-md transition-colors shadow-sm text-[9px]">
                                                        <span>블로그 리뷰 연결</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5 items-center mt-2 min-h-[28px]">
                                                    <span className={`text-[10.5px] sm:text-[11px] font-black px-2 py-0.5 rounded-md border ${
                                                        rec.transactionType === '매매' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' :
                                                        rec.transactionType === '전세' ? 'bg-amber-50 text-amber-700 border-amber-200/85' :
                                                        'bg-[#0B2545]/10 text-[#0B2545] border-[#0B2545]/20'
                                                    }`}>
                                                        {rec.transactionType || '월세'}
                                                    </span>
                                                    {((rec.panoramas && rec.panoramas.trim()) || (rec.panoImage && rec.panoImage.trim())) && (
                                                        <span className="bg-[#0B2545]/10 text-[#0B2545] border border-[#0B2545]/20 text-[10.5px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse shrink-0">
                                                            <i className="fa-solid fa-house text-[10px]"></i>
                                                            <span>360°</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                                            <div className="text-sm sm:text-base font-black text-red-500 shrink-0">
                                                {formatDisplayPrice(rec.price, rec.transactionType || '월세')}
                                            </div>
                                            <div className="flex-grow flex items-center justify-end gap-1.5">
                                                <span className="text-[11px] text-[#0B2545] font-bold flex items-center gap-0.5">
                                                    <span>{customBlogUrl ? '블로그 리뷰' : '구경하기'}</span>
                                                    <i className="fa-solid fa-chevron-right text-[9px] group-hover:translate-x-0.5 transition-transform"></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
"""

content = content[:start_idx] + new_code + content[end_idx:]

with open("src/components/DetailTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

