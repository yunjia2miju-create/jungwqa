import React, { useState } from 'react';
import { Layers, X, Smile, Heart, Home, Sparkles } from 'lucide-react';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

export interface StickerAsset {
    name: string;
    path: string;
    url: string;
    displayName: string;
}

export const STICKER_ASSETS: StickerAsset[] = [
    // === 1. [강아지] (총 10종) ===
    {
        name: "original_1.gif",
        path: "강아지/original_1.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczNmYjZ4OGI0ZXZ4MWh4Z3p5YW8yd2I3czF6bW02ZWl5cWF2ZWdpeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1VXD3bEoZBAUPcfVw/giphy.gif",
        displayName: "[안녕 인사]"
    },
    {
        name: "original_2.gif",
        path: "강아지/original_2.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTNjOWVzMXhyeTkybml0djFud3gyY2UwdzEzbWVydXBzeHN0bm42byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/YmMLWYr9lM1shv8IZS/giphy.gif",
        displayName: "[최고 따봉]"
    },
    {
        name: "original_3.gif",
        path: "강아지/original_3.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3U2cjRvdWwzdng5dngyam5na2Nzd3UxbW5hbzd0dW1sbDBubW9uZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/t3pXRb93P2fWjD2Vea/giphy.gif",
        displayName: "[볶음밥 먹방]"
    },
    {
        name: "original_4.gif",
        path: "강아지/original_4.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3pnb210dWZpYW0xeXpxZWgyZXVobnY0YWVpaXBtZnd3N2s1cGgzeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Lp9b8D7pGIU7FmEgVv/giphy.gif",
        displayName: "[의지 불타오름]"
    },
    {
        name: "original_5.gif",
        path: "강아지/original_5.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZhdThhdnlybHhzZHJqNHA1cGU3djMxbmsxaXN3NGNidjR3MDR2OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/7k9MbeuPLaN7nka0n4/giphy.gif",
        displayName: "[오늘의 생활정보]"
    },
    {
        name: "original_6.gif",
        path: "강아지/original_6.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm5nOWp0aDU2dms4MWxsNWJpdm1naXB0MHpqeTZ3aDMxZ3YycHJidCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/j5bTMy6H70Y7Z5L2Qe/giphy.gif",
        displayName: "[왜곡 없는 리얼 사진]"
    },
    {
        name: "original_7.gif",
        path: "강아지/original_7.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXdyZjY1bm9yZWZwd2gyN3UwbHR2ZXZiZW52dnA5djM0d2lrcml5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/v8YmIsOfcZkLgRSpf2/giphy.gif",
        displayName: "[하트 눈 뿅뿅]"
    },
    {
        name: "original_8.gif",
        path: "강아지/original_8.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmNleWF2eTBvODQ3NDBzcmwxaXQ2dDN1ajdwdWNxYmxoMjdzMnZ3byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/R6gVNv59V9htKzSu4R/giphy.gif",
        displayName: "[주먹 불끈]"
    },
    {
        name: "original_9.gif",
        path: "강아지/original_9.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNVlqNnM1NnU0OG93djB1NGc3dngxeXU0cmEwbDZ4ZjN0ZGl3bTM1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XFm66N3oXw2yF9tS9g/giphy.gif",
        displayName: "[기분 최고]"
    },
    {
        name: "original_10.gif",
        path: "강아지/original_10.gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVtcXZ5Njg1N3g2NGE5OTNtbGRod29kNG93cTltODkzbHppZHZsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/EZAX8gbyzVAnK/giphy.gif",
        displayName: "[행복 댕댕이]"
    },

    // === 2. [생줘] (총 14종) ===
    {
        name: "mouse (1).gif",
        path: "생줘/mouse (1).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZ5dzVpcWNhdGF0OGptMDBzdmM2cWswcWhxYzN0eTZpNDJpcnF6ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/8g6G6O8pXNTheBwW71/giphy.gif",
        displayName: "[심쿵 두근]"
    },
    {
        name: "mouse (2).gif",
        path: "생줘/mouse (2).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGoyOTFrNHh6NHo0NWMxbWF2cHh5dWl0MmoyOHYxbXFidTNmZHNvaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xUPGcyi6Y8sK_78676/giphy.gif",
        displayName: "[러브 러브]"
    },
    {
        name: "mouse (3).gif",
        path: "생줘/mouse (3).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR6NG95NnU4NmIyamZncmswZWdzbmtnbmpzdDBpODN6OG0wanRxZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/eNhZ1gZf5Ym7mYgE4D/giphy.gif",
        displayName: "[반갑 안녕]"
    },
    {
        name: "mouse (4).gif",
        path: "생줘/mouse (4).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXdyZjY1bm9yZWZwd2gyN3UwbHR2ZXZiZW52dnA5djM0d2lrcml5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/v8YmIsOfcZkLgRSpf2/giphy.gif",
        displayName: "[은하수 별빛]"
    },
    {
        name: "mouse (5).gif",
        path: "생줘/mouse (5).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmF0MXF3a2M5Mm55bm8wdWd4bjF3azg1dnd5NWwyczRnbXl6bnU3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SDeO6gL98gAsPZ10fB/giphy.gif",
        displayName: "[수줍 발그레]"
    },
    {
        name: "mouse (6).gif",
        path: "생줘/mouse (6).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZsd3Zldm5iNHVvMXg5NHgyb3d4Zmg3dm1nbmF2Nnl3YTBzZWJvYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/LpsYVv9yS7jLpY2pG1/giphy.gif",
        displayName: "[배꼽 탈출]"
    },
    {
        name: "mouse (7).gif",
        path: "생줘/mouse (7).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWM5eTNrMDFtd3NseWlraXp2cmU5dW9uMmh3NDAwMGx0ZjRlcm90dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Q7YFxgjPv9L8P5wB9p/giphy.gif",
        displayName: "[사랑의 총알]"
    },
    {
        name: "mouse (8).gif",
        path: "생줘/mouse (8).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjEyZDNndW55OGZ5bjNpZnpicnBnOGpjenoyZmZpOHpyZjU3dTh3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0G18bMuxT9Je1fDG/giphy.gif",
        displayName: "[간절 기도]"
    },
    {
        name: "mouse (9).gif",
        path: "생줘/mouse (9).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjBrdGowZWg4OXpybHoxZXExNnFlZHl2MThnd3ZnbHh0bWltNnIydyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/2Qs2h97WaoBiM/giphy.gif",
        displayName: "[폭풍 감동]"
    },
    {
        name: "mouse (10).gif",
        path: "생줘/mouse (10).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmJvNzl2b3Iyam56Zm4xamxzbWlyM29nd29tdWthdTc3dDRqMGluaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/mlvseq9yvZhba/giphy.gif",
        displayName: "[하트 눈빛]"
    },
    {
        name: "mouse (11).gif",
        path: "생줘/mouse (11).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczNmYjZ4OGI0ZXZ4MWh4Z3p5YW8yd2I3czF6bW02ZWl5cWF2ZWdpeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1VXD3bEoZBAUPcfVw/giphy.gif",
        displayName: "[달콤 윙크]"
    },
    {
        name: "mouse (12).gif",
        path: "생줘/mouse (12).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZhdThhdnlybHhzZHJqNHA1cGU3djMxbmsxaXN3NGNidjR3MDR2OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/7k9MbeuPLaN7nka0n4/giphy.gif",
        displayName: "[네온 하트]"
    },
    {
        name: "mouse (13).gif",
        path: "생줘/mouse (13).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjU5bm1tNHhrdjMyYnl4bWNqMnlrczZsczByNGI2ZnNpNjJodjRxNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bYv1840JclX666Vq1D/giphy.gif",
        displayName: "[볼빵빵 냠냠]"
    },
    {
        name: "mouse (14).gif",
        path: "생줘/mouse (14).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzh0cHlzYjBzdDBoOWptbXlzM2Z1cWR3bmlkaTJ5Nnp1ZHFicmhveSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/H887b8X9Y7vSpT4qE7/giphy.gif",
        displayName: "[축하 파티]"
    },

    // === 3. [가격] (총 25종) ===
    {
        name: "price (1).gif",
        path: "가격/price (1).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWFqdmtoczhxdWFxMHBqZXpxYXM1YmV0Ymdod28ybncyMnY3NDVwdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L37FfWog394W4oT2v7/giphy.gif",
        displayName: "[공원 숲세권]"
    },
    {
        name: "price (2).gif",
        path: "가격/price (2).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExSubmFoYWg2ajZidWVzb3ZnaXNxOHlndmlhdzZpcHpwMTVubCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/TAnRscyvOf3W7fL62W/giphy.gif",
        displayName: "[역세권 프리미엄]"
    },
    {
        name: "price (3).gif",
        path: "가격/price (3).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNVlqNnM1NnU0OG93djB1NGc3dngxeXU0cmEwbDZ4ZjN0ZGl3bTM1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XFm66N3oXw2yF9tS9g/giphy.gif",
        displayName: "[시세 차익 최고]"
    },
    {
        name: "price (4).gif",
        path: "가격/price (4).gif",
        url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[대박 투자처]"
    },
    {
        name: "price (5).gif",
        path: "가격/price (5).gif",
        url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[즉시 입주 가능]"
    },
    {
        name: "price (6).gif",
        path: "가격/price (6).gif",
        url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[개발 호재 풍부]"
    },
    {
        name: "price (7).gif",
        path: "가격/price (7).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm53bzdqYjM3dmhicmRsa3E2dDNpa3BrMXF4NDlzaWxlYnVwbmsxbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0Ex6Ut3wAHcnGCkg/giphy.gif",
        displayName: "[전세 대출 지원]"
    },
    {
        name: "price (8).gif",
        path: "가격/price (8).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGoyOTFrNHh6NHo0NWMxbWF2cHh5dWl0MmoyOHYxbXFidTNmZHNvaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xUPGcyi6Y8sK_78676/giphy.gif",
        displayName: "[대단지 랜드마크]"
    },
    {
        name: "price (9).gif",
        path: "가격/price (9).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmF0MXF3a2M5Mm55bm8wdWd4bjF3azg1dnd5NWwyczRnbXl6bnU3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SDeO6gL98gAsPZ10fB/giphy.gif",
        displayName: "[최저 실입주금]"
    },
    {
        name: "price (10).gif",
        path: "가격/price (10).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3pnb210dWZpYW0xeXpxZWgyZXVobnY0YWVpaXBtZnd3N2s1cGgzeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Lp9b8D7pGIU7FmEgVv/giphy.gif",
        displayName: "[마감 임박 서둘]"
    },
    {
        name: "price (11).gif",
        path: "가격/price (11).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczNmYjZ4OGI0ZXZ4MWh4Z3p5YW8yd2I3czF6bW02ZWl5cWF2ZWdpeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1VXD3bEoZBAUPcfVw/giphy.gif",
        displayName: "[단독 주택 매매]"
    },
    {
        name: "price (12).gif",
        path: "가격/price (12).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZhdThhdnlybHhzZHJqNHA1cGU3djMxbmsxaXN3NGNidjR3MDR2OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/7k9MbeuPLaN7nka0n4/giphy.gif",
        displayName: "[상가 임대 문의]"
    },
    {
        name: "price (13).gif",
        path: "가격/price (13).gif",
        url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[계약 도장 콕]"
    },
    {
        name: "price (14).gif",
        path: "가격/price (14).gif",
        url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[오늘의 생활정보]"
    },
    {
        name: "price (15).gif",
        path: "가격/price (15).gif",
        url: "https://images.unsplash.com/photo-1448630360428-6547118933fa?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[왜곡 없는 리얼 사진]"
    },
    {
        name: "price (16).gif",
        path: "가격/price (16).gif",
        url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[한강 평생 조망]"
    },
    {
        name: "price (17).gif",
        path: "가격/price (17).gif",
        url: "https://images.unsplash.com/photo-1598228723793-52759bba245c?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[풀옵션 신축 빌라]"
    },
    {
        name: "price (18).gif",
        path: "가격/price (18).gif",
        url: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[학군 대장 아파트]"
    },
    {
        name: "price (19).gif",
        path: "가격/price (19).gif",
        url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[분양가 특별 할인]"
    },
    {
        name: "price (20).gif",
        path: "가격/price (20).gif",
        url: "https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[소장님 강력 추천]"
    },
    {
        name: "price (21).gif",
        path: "가격/price (21).gif",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[내집 마련 성공]"
    },
    {
        name: "price (22).gif",
        path: "가격/price (22).gif",
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[상담 예약 환영]"
    },
    {
        name: "price (23).gif",
        path: "가격/price (23).gif",
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[신축 아파트 첫입주]"
    },
    {
        name: "price (24).gif",
        path: "가격/price (24).gif",
        url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=150&h=150&q=80",
        displayName: "[재개발 프리미엄]"
    },
    {
        name: "price (25).gif",
        path: "가격/price (25).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjU5bm1tNHhrdjMyYnl4bWNqMnlrczZsczByNGI2ZnNpNjJodjRxNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bYv1840JclX666Vq1D/giphy.gif",
        displayName: "[명품 학세권 단지]"
    },

    // === 4. [파스인형] (총 24종) ===
    {
        name: "pastel (1).gif",
        path: "파스인형/pastel (1).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXdyZjY1bm9yZWZwd2gyN3UwbHR2ZXZiZW52dnA5djM0d2lrcml5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/v8YmIsOfcZkLgRSpf2/giphy.gif",
        displayName: "[하트 눈 뿅뿅]"
    },
    {
        name: "pastel (2).gif",
        path: "파스인형/pastel (2).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWZnaWx0OXN5NjZwdXpxMWVsbGswMXFwbzFmdmlxbzY2ODdzYThxeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bMyWfIDYLQqC4/giphy.gif",
        displayName: "[분노 불꽃]"
    },
    {
        name: "pastel (3).gif",
        path: "파스인형/pastel (3).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmNleWF2eTBvODQ3NDBzcmwxaXQ2dDN1ajdwdWNxYmxoMjdzMnZ3byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/R6gVNv59V9htKzSu4R/giphy.gif",
        displayName: "[쌍따봉 최고]"
    },
    {
        name: "pastel (4).gif",
        path: "파스인형/pastel (4).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmF0MXF3a2M5Mm55bm8wdWd4bjF3azg1dnd5NWwyczRnbXl6bnU3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/LpsYVv9yS7jLpY2pG1/giphy.gif",
        displayName: "[디저트 먹방]"
    },
    {
        name: "pastel (5).gif",
        path: "파스인형/pastel (5).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVtcXZ5Njg1N3g2NGE5OTNtbGRod29kNG93cTltODkzbHppZHZsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/EZAX8gbyzVAnK/giphy.gif",
        displayName: "[꿀잠 쿨쿨]"
    },
    {
        name: "pastel (6).gif",
        path: "파스인형/pastel (6).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczNmYjZ4OGI0ZXZ4MWh4Z3p5YW8yd2I3czF6bW02ZWl5cWF2ZWdpeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1VXD3bEoZBAUPcfVw/giphy.gif",
        displayName: "[주먹 불끈]"
    },
    {
        name: "pastel (7).gif",
        path: "파스인형/pastel (7).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjBrdGowZWg4OXpybHoxZXExNnFlZHl2MThnd3ZnbHh0bWltNnIydyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/2Qs2h97WaoBiM/giphy.gif",
        displayName: "[눈물 펑펑]"
    },
    {
        name: "pastel (8).gif",
        path: "파스인형/pastel (8).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmJvNzl2b3Iyam56Zm4xamxzbWlyM29nd29tdWthdTc3dDRqMGluaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/mlvseq9yvZhba/giphy.gif",
        displayName: "[허거걱 깜놀]"
    },
    {
        name: "pastel (9).gif",
        path: "파스인형/pastel (9).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTNjOWVzMXhyeTkybml0djFud3gyY2UwdzEzbWVydXBzeHN0bm42byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/YmMLWYr9lM1shv8IZS/giphy.gif",
        displayName: "[반갑 안녕]"
    },
    {
        name: "pastel (10).gif",
        path: "파스인형/pastel (10).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3pnb210dWZpYW0xeXpxZWgyZXVobnY0YWVpaXBtZnd3N2s1cGgzeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Lp9b8D7pGIU7FmEgVv/giphy.gif",
        displayName: "[폭풍 댄스]"
    },
    {
        name: "pastel (11).gif",
        path: "파스인형/pastel (11).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZ5dzVpcWNhdGF0OGptMDBzdmM2cWswcWhxYzN0eTZpNDJpcnF6ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/8g6G6O8pXNTheBwW71/giphy.gif",
        displayName: "[기절 직전]"
    },
    {
        name: "pastel (12).gif",
        path: "파스인형/pastel (12).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjEyZDNndW55OGZ5bjNpZnpicnBnOGpjenoyZmZpOHpyZjU3dTh3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0G18bMuxT9Je1fDG/giphy.gif",
        displayName: "[축하 축하]"
    },
    {
        name: "pastel (13).gif",
        path: "파스인형/pastel (13).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3U2cjRvdWwzdng5dngyam5na2Nzd3UxbW5hbzd0dW1sbDBubW9uZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/t3pXRb93P2fWjD2Vea/giphy.gif",
        displayName: "[배꼽 탈출]"
    },
    {
        name: "pastel (14).gif",
        path: "파스인형/pastel (14).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzh0cHlzYjBzdDBoOWptbXlzM2Z1cWR3bmlkaTJ5Nnp1ZHFicmhveSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/H887b8X9Y7vSpT4qE7/giphy.gif",
        displayName: "[수줍 발그레]"
    },
    {
        name: "pastel (15).gif",
        path: "파스인형/pastel (15).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWM5eTNrMDFtd3NseWlraXp2cmU5dW9uMmh3NDAwMGx0ZjRlcm90dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Q7YFxgjPv9L8P5wB9p/giphy.gif",
        displayName: "[달콤 윙크]"
    },
    {
        name: "pastel (16).gif",
        path: "파스인형/pastel (16).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTV2OWpqMG5nbzRhNDRxNjYxenBlcDZ3ZXJ4dHlnaG5pd2psaDZrYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7bu3XilJ5BOiSGic/giphy.gif",
        displayName: "[진지 고민]"
    },
    {
        name: "pastel (17).gif",
        path: "파스인형/pastel (17).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm53bzdqYjM3dmhicmRsa3E2dDNpa3BrMXF4NDlzaWxlYnVwbmsxbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0Ex6Ut3wAHcnGCkg/giphy.gif",
        displayName: "[돈벼락 가즈아]"
    },
    {
        name: "pastel (18).gif",
        path: "파스인형/pastel (18).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjZqNnM0MXoxcmZ5M3Q3bnd4b3F4amkzbWN5bnlhNzR2Y3M0dzVubCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/j77bDXz3sh6Xv9Dqfc/giphy.gif",
        displayName: "[충성 경례]"
    },
    {
        name: "pastel (19).gif",
        path: "파스인형/pastel (19).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR6NG95NnU4NmIyamZncmswZWdzbmtnbmpzdDBpODN6OG0wanRxZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/eNhZ1gZf5Ym7mYgE4D/giphy.gif",
        displayName: "[아주 잘해써]"
    },
    {
        name: "pastel (20).gif",
        path: "파스인형/pastel (20).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXlqNnM1NnU0OG93djB1NGc3dngxeXU0cmEwbDZ4ZjN0ZGl3bTM1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XFm66N3oXw2yF9tS9g/giphy.gif",
        displayName: "[호다닥 충돌]"
    },
    {
        name: "pastel (21).gif",
        path: "파스인형/pastel (21).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGoyOTFrNHh6NHo0NWMxbWF2cHh5dWl0MmoyOHYxbXFidTNmZHNvaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xUPGcyi6Y8sK_78676/giphy.gif",
        displayName: "[사랑의 화살]"
    },
    {
        name: "pastel (22).gif",
        path: "파스인형/pastel (22).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTVudTFzcmYxcnA2dDlxNjBia2EwbzRhb2E4aThjcnV1ZHZpeXN5MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/WfofOAg88MHeo/giphy.gif",
        displayName: "[아자 화이팅]"
    },
    {
        name: "pastel (23).gif",
        path: "파스인형/pastel (23).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDhneTJocTlncGtzMWpsNXpuZHJpYXJ6aGRiaDJiaXNuNW1sbnAwciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/D1O1Tj39fS4y7yS6S9/giphy.gif",
        displayName: "[커피 수금]"
    },
    {
        name: "pastel (24).gif",
        path: "파스인형/pastel (24).gif",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDN6bTgydDR3M3FicXBwZ251Z3JqYnF5ZXAzdHF1cHhtNzAzbTNzNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/9SqtqOdxfUafE_S77x/giphy.gif",
        displayName: "[간절 기도]"
    }
];

interface EditorStickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSticker: (imgHtml: string) => void;
}

interface StickerCardProps {
    sticker: StickerAsset;
    activeCategory: string;
    onClick: (downloadUrl: string) => void;
    isStarred: boolean;
    onToggleStar: () => void;
    compact?: boolean;
}

// Stateful Sticker Card component to dynamically fetch and display from Firebase Storage securely on mount
export function StickerCard({ sticker, activeCategory, onClick, isStarred, onToggleStar, compact = false }: StickerCardProps) {
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    React.useEffect(() => {
        let isMounted = true;
        
        async function fetchUrl() {
            setLoading(true);
            try {
                // 1. Try flat path first (e.g. stickers/original_1.gif)
                const flatPath = `stickers/${sticker.name}`;
                const flatRef = ref(storage, flatPath);
                try {
                    const url = await getDownloadURL(flatRef);
                    if (isMounted) {
                        setDownloadUrl(url);
                        setLoading(false);
                    }
                    return;
                } catch (err) {
                    // Fail silently and try nested path
                }

                // 2. Try nested path (e.g. stickers/강아지/original_1.gif)
                const nestedPath = `stickers/${sticker.path}`;
                const nestedRef = ref(storage, nestedPath);
                const url = await getDownloadURL(nestedRef);
                if (isMounted) {
                    setDownloadUrl(url);
                    setLoading(false);
                }
            } catch (error) {
                console.error(`Firebase Storage download url fallback engaged for ${sticker.name}:`, error);
                // Fallback to direct URL to guarantee robustness and zero client-side breakage
                if (isMounted) {
                    setDownloadUrl(sticker.url);
                    setLoading(false);
                }
            }
        }

        fetchUrl();

        return () => {
            isMounted = false;
        };
    }, [sticker]);

    return (
        <div
            onClick={(e) => {
                if (!loading) {
                    onClick(downloadUrl || sticker.url);
                }
            }}
            className={`aspect-square bg-white hover:bg-emerald-50/50 hover:border-emerald-400 rounded-2xl border border-slate-200 flex flex-col items-center justify-between p-1.5 relative group transform hover:scale-115 transition-all duration-200 z-10 hover:shadow-md hover:shadow-emerald-950/5 select-none animate-fadeIn ${loading ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
            title={`클릭하여 에디터 커서에 즉시 주입: ${sticker.displayName}`}
            role="button"
            tabIndex={loading ? -1 : 0}
            onKeyDown={(e) => {
                if (!loading && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick(downloadUrl || sticker.url);
                }
            }}
        >
            {/* Star Icon Toggle */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onToggleStar();
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/95 shadow-xs border border-slate-100 flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-30 opacity-90"
                title={isStarred ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            >
                <i className={`fa-solid fa-star text-[9px] ${isStarred ? 'text-amber-500' : 'text-slate-300 hover:text-amber-450'}`}></i>
            </button>

            {/* Loading state indicator visual overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-20">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-250 border-t-emerald-600 animate-spin" />
                </div>
            )}

            {/* High-quality responsive viewport wrapper */}
            <div className={`w-full flex-1 flex items-center justify-center overflow-hidden p-1.5 ${compact ? 'min-h-[75px]' : 'min-h-[105px]'}`}>
                {downloadUrl ? (
                    <img 
                        src={downloadUrl} 
                        alt={sticker.displayName}
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
                    />
                ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-205 border-t-slate-500 animate-spin" />
                )}
            </div>
            
            {/* 직하단 직관적 한글 명찰 뱃지 */}
            <div className="mt-1.5 w-full text-center">
                <span className="inline-block text-[11px] font-black text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md shadow-3xs truncate max-w-full font-sans tracking-tight group-hover:text-emerald-700 group-hover:border-emerald-300 leading-none">
                    {sticker.displayName}
                </span>
            </div>
        </div>
    );
}

export function EditorStickerModal({ isOpen, onClose, onSelectSticker }: EditorStickerModalProps) {
    const categories = ['강아지', '생줘', '가격', '파스인형'];
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Initialize favorite stickers from localStorage safely
    const [favorites, setFavorites] = useState<StickerAsset[]>(() => {
        try {
            const saved = localStorage.getItem('taewang_user_favorite_stickers');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Handle adding/removing favorites instantly with persistent browser storage sync
    const toggleFavorite = (sticker: StickerAsset) => {
        setFavorites(prev => {
            const exists = prev.some(item => item.name === sticker.name);
            let updated;
            if (exists) {
                updated = prev.filter(item => item.name !== sticker.name);
            } else {
                updated = [...prev, sticker];
            }
            localStorage.setItem('taewang_user_favorite_stickers', JSON.stringify(updated));
            return updated;
        });
    };

    // Dynamically retrieve category name from sticker path
    const getCategoryFromPath = (path: string): string => {
        const parts = path.split('/');
        return parts.length > 1 ? parts[0] : '기타';
    };

    const filteredStickers = STICKER_ASSETS.filter(sticker => {
        return getCategoryFromPath(sticker.path) === selectedCategory;
    });

    const handleStickerSelect = (downloadUrl: string) => {
        // Embed the specific image tag requested with exact format parameters.
        // For the 가격 tab, the max-width is set to 140px; for all others, it's 130px.
        const cat = selectedCategory || '강아지';
        const maxWidth = cat === '가격' ? '140px' : '130px';
        const stickerHtml = `<img src="${downloadUrl}" class="blog-custom-sticker" style="max-width:${maxWidth}; display:inline-block; vertical-align:middle;" />`;
        onSelectSticker(stickerHtml);
    };

    const getCategoryIcon = (category: string, isActive: boolean) => {
        switch (category) {
            case '강아지':
                return <Smile className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-500'}`} />;
            case '생줘':
                return <Heart className={`w-4 h-4 ${isActive ? 'text-white' : 'text-rose-500'}`} />;
            case '가격':
                return <Home className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-500'}`} />;
            case '파스인형':
                return <Sparkles className={`w-4 h-4 ${isActive ? 'text-white' : 'text-pink-500'}`} />;
            default:
                return <Layers className="w-4 h-4" />;
        }
    };

    // Design slots for 51 empty placeholders (total of 55 items with 4 default ones)
    const futureSlots = Array.from({ length: 51 }, (_, i) => i + 5);

    if (!isOpen) return null;

    return (
        <div 
            id="editor-sticker-sidebar-container"
            className="w-full h-full flex flex-col bg-slate-50 border-r border-slate-200 select-none overflow-hidden relative !z-[9999]"
            style={{ zIndex: 9999 }}
        >
            {/* Header Area */}
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-200/60 shadow-3xs shrink-0">
                <span className="text-[13px] font-black text-slate-800 flex items-center gap-1.5 leading-none">
                    <i className="fa-solid fa-face-smile text-emerald-600"></i>
                    <span>감성 스티커 보관함</span>
                </span>
                <button 
                    onClick={onClose}
                    type="button"
                    className="w-6.5 h-6.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="사이드바 닫기"
                >
                    <i className="fa-solid fa-times text-xs"></i>
                </button>
            </div>

            {/* Scrollable Contents Panel */}
            <div 
                className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 scrollbar-thin"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
            >
                {/* 1. [⭐ 소장님 최애 즐겨찾기] Section - Always fixed on top */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-3xs space-y-2.5 animate-fadeIn">
                    <div className="flex justify-between items-center">
                        <span className="text-[12px] font-black text-amber-600 flex items-center gap-1 leading-none">
                            <i className="fa-solid fa-star"></i>
                            <span>⭐ 소장님 최애 즐겨찾기</span>
                        </span>
                        <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-black leading-none">
                            {favorites.length}개 등록
                        </span>
                    </div>
                    
                    {favorites.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {favorites.map((sticker, idx) => {
                                const stCat = getCategoryFromPath(sticker.path);
                                return (
                                    <StickerCard
                                        key={`fav-${sticker.name}-${idx}`}
                                        sticker={sticker}
                                        activeCategory={stCat}
                                        onClick={handleStickerSelect}
                                        isStarred={true}
                                        onToggleStar={() => toggleFavorite(sticker)}
                                        compact={true}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                            <p className="text-[10px] text-slate-400 font-extrabold leading-relaxed">
                                자주 쓰시는 스티커의 별(⭐)을<br />
                                누르시면 여기에 고정 보관됩니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* 2. Step-based Folder System */}
                {selectedCategory === null ? (
                    // 1단계 카테고리 선택 창
                    <div className="space-y-2.5 animate-fadeIn">
                        <div className="text-[10px] font-black text-slate-450 uppercase tracking-wider pl-1 leading-none">
                            📁 스티커 카테고리 ({categories.length}개 활성)
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {categories.map((category) => {
                                const count = STICKER_ASSETS.filter(s => getCategoryFromPath(s.path) === category).length;
                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => setSelectedCategory(category)}
                                        className="aspect-square bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all duration-150 shadow-3xs group cursor-pointer transform hover:scale-[1.03]"
                                    >
                                        <div className="mb-1.5 p-1.5 rounded-xl bg-slate-50 group-hover:bg-emerald-100/50 transition-colors">
                                            {getCategoryIcon(category, false)}
                                        </div>
                                        <span className="font-sans font-black text-slate-800 text-[10px] sm:text-[11px] group-hover:text-emerald-700 leading-tight">
                                            {category}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-750 px-1.5 py-0.5 rounded-md mt-1.5 leading-none shrink-0">
                                            {count}종
                                        </span>
                                    </button>
                                );
                            })}
                            
                            {/* 50+ empty slots for future categories expansion */}
                            {futureSlots.map((num) => (
                                <div
                                    key={`future-${num}`}
                                    className="aspect-square bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center p-2 text-center opacity-50 select-none cursor-not-allowed"
                                >
                                    <div className="mb-1.5 p-1.5 rounded-xl bg-slate-100/30">
                                        <i className="fa-solid fa-folder-closed text-slate-350 text-[13px] w-4 h-4 text-center flex items-center justify-center"></i>
                                    </div>
                                    <span className="font-sans font-extrabold text-slate-400 text-[9px] sm:text-[10px] leading-tight">
                                        대기 {String(num).padStart(2, '0')}
                                    </span>
                                    <span className="text-[8px] font-black text-slate-400 bg-slate-150 px-1 py-0.5 rounded-md mt-1.5 leading-none shrink-0">
                                        대기
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // 2단계 스티커 개방 및 원터치 주입
                    <div className="space-y-3 animate-fadeIn">
                        {/* Go Back to Category Selection Button */}
                        <button
                            type="button"
                            onClick={() => setSelectedCategory(null)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-[11px] font-black cursor-pointer transition-all border border-slate-300/40 shadow-3xs"
                        >
                            <i className="fa-solid fa-angle-left"></i>
                            <span>◀ 카테고리 선택으로 이동</span>
                        </button>
                        
                        <div className="flex justify-between items-center pl-1 leading-none text-[10px] font-black text-slate-500">
                            <span>📁 {selectedCategory} ({filteredStickers.length}종 수록)</span>
                            <span className="text-emerald-600 font-black">3열 돋보기</span>
                        </div>
                        
                        {/* 3-Column Stickers Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {filteredStickers.map((sticker, idx) => {
                                const isStarred = favorites.some(item => item.name === sticker.name);
                                return (
                                    <StickerCard
                                        key={`grid-${sticker.name}-${idx}`}
                                        sticker={sticker}
                                        activeCategory={selectedCategory!}
                                        onClick={handleStickerSelect}
                                        isStarred={isStarred}
                                        onToggleStar={() => toggleFavorite(sticker)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Guide */}
            <div className="p-3 bg-white border-t border-slate-200/60 text-center shrink-0">
                <p className="text-[9px] text-slate-400 font-extrabold leading-normal whitespace-pre-line">
                    원하시는 스티커를 누르시면 본문 커서에 즉시 주입됩니다.
                </p>
            </div>
        </div>
    );
}

export default EditorStickerModal;
