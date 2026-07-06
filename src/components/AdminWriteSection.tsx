import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Post, gumiDongs } from '../data';
import { savePostService, getPostsService } from '../firebaseService';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { storage } from '../firebase';

interface AdminWriteSectionProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export function AdminWriteSection({ showToast }: AdminWriteSectionProps) {
    const { posts, setPosts, setActiveSection } = useAppStore();

    // Fetch editing ID safely from localStorage or store to keep routing robust
    const [editingPostId, setEditingPostId] = useState<string | null>(() => {
        return localStorage.getItem('taewang_editing_post_id') || null;
    });

    const currentEditPost = editingPostId ? posts.find(p => p.id === editingPostId) : null;

    // Form Initial State
    const [formData, setFormData] = useState<Partial<Post>>({
        category: '원룸', transactionType: '월세', dong: '송정동', building: '', room: '', floor: '', totalFloor: '', price: '', manageFee: '', phone: '010-7590-0111', ownerPhone: '',
        title: '', remarks: '', intro: '', body: '', address: '', video: '', blogUrl: '', thumbnail: '', images: '', panoramas: '', isRecommended: false, isShortTerm: false
    });

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');

    const dataURLtoBlob = (dataurl: string): Blob => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const uploadResizedBlobToStorage = async (base64Data: string, originalName: string, prefix = 'posts'): Promise<string> => {
        const blob = dataURLtoBlob(base64Data);
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const cleanName = originalName.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣_.-]/g, '_');
        const safeName = `${timestamp}_${randomStr}_${cleanName}`;
        
        const storageRef = ref(storage, `${prefix}/${safeName}`);
        await uploadBytes(storageRef, blob, { contentType: blob.type });
        return await getDownloadURL(storageRef);
    };

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeReady, setIframeReady] = useState<boolean>(false);
    const hasLoadedPostIdRef = useRef<string | null>(null);

    // Reset load tracking when editing post ID changes
    useEffect(() => {
        hasLoadedPostIdRef.current = null;
    }, [editingPostId]);

    useEffect(() => {
        const handleMessage = async (e: MessageEvent) => {
            if (!e.data) return;
            if (e.data.type === 'EDITOR_READY') {
                setIframeReady(true);
            } else if (e.data.type === 'SAVE_DATA') {
                setFormData(prev => ({
                    ...prev,
                    ...e.data.payload
                }));
            } else if (e.data.type === 'UPLOAD_FILE') {
                const { fileData, fileName, uploadType, fileId } = e.data.payload;
                try {
                    // Do not block UI for background uploads unless it's thumbnail
                    if (uploadType === 'thumbnail' || uploadType === 'vrThumbnail') {
                        setIsUploading(true);
                        setUploadProgress(`대표사진 캡처 및 파이어베이스 전송 중...`);
                    }
                    const prefix = uploadType === 'images' ? 'gallery' : uploadType === 'thumbnail' || uploadType === 'vrThumbnail' ? 'thumbnails' : 'panoramas';
                    const downloadURL = await uploadResizedBlobToStorage(fileData, fileName, prefix);
                    if (iframeRef.current && iframeRef.current.contentWindow) {
                        iframeRef.current.contentWindow.postMessage({
                            type: 'UPLOAD_SUCCESS',
                            payload: {
                                url: downloadURL,
                                uploadType,
                                fileId
                            }
                        }, '*');
                    }
                    if (uploadType === 'thumbnail' || uploadType === 'vrThumbnail') {
                        showToast("대표사진이 성공적으로 캡처 및 저장되었습니다.", "success");
                    }
                } catch (err: any) {
                    console.error("Iframe remote upload error:", err);
                    if (iframeRef.current && iframeRef.current.contentWindow) {
                        iframeRef.current.contentWindow.postMessage({
                            type: 'UPLOAD_ERROR',
                            payload: {
                                message: err.message || '업로드 실패',
                                uploadType,
                                fileId
                            }
                        }, '*');
                    }
                    showToast("스토리지 저장에 실패했습니다.", "error");
                } finally {
                    if (uploadType === 'thumbnail') {
                        setIsUploading(false);
                        setUploadProgress('');
                    }
                }
            } else if (e.data.type === 'SUBMIT_POST') {
                await handlePostSubmitDirect(e.data.payload);
            } else if (e.data.type === 'CANCEL_POST') {
                handleCancel();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [formData, editingPostId, currentEditPost]);

    useEffect(() => {
        if (iframeReady && iframeRef.current && iframeRef.current.contentWindow) {
            const currentPostId = editingPostId || 'new';
            if (hasLoadedPostIdRef.current !== currentPostId) {
                if (editingPostId && !currentEditPost) {
                    return; // Wait until firebase data is fully populated in currentEditPost
                }
                const payload = currentEditPost || {
                    category: '원룸', transactionType: '월세', dong: '송정동', building: '', room: '', floor: '', totalFloor: '', price: '', manageFee: '', phone: '010-7590-0111', ownerPhone: '',
                    title: '', remarks: '', intro: '', body: '', address: '', video: '', blogUrl: '', thumbnail: '', images: '', panoramas: '', isRecommended: false, isShortTerm: false
                };
                iframeRef.current.contentWindow.postMessage({
                    type: 'LOAD_DATA',
                    payload: payload
                }, '*');
                hasLoadedPostIdRef.current = currentPostId;
            }
        }
    }, [editingPostId, currentEditPost, iframeReady]);

    useEffect(() => {
        const fetchStickersFromStorage = async () => {
            const CACHE_KEY = 'taewang_stickers_cache';
            const CACHE_TIME_KEY = 'taewang_stickers_cache_time';
            
            // Check localStorage cache first
            const cached = localStorage.getItem(CACHE_KEY);
            const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
            const cacheAge = cachedTime ? Date.now() - parseInt(cachedTime, 10) : Infinity;
            
            // If cache exists and is younger than 12 hours, load it immediately
            if (cached && cacheAge < 12 * 60 * 60 * 1000) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.length > 0) {
                        if (iframeRef.current && iframeRef.current.contentWindow) {
                            iframeRef.current.contentWindow.postMessage({
                                type: 'STORAGE_STICKERS_LOADED',
                                payload: parsed
                            }, '*');
                        }
                        return;
                    }
                } catch (e) {
                    console.warn("Stickers cache parse failed, re-fetching:", e);
                }
            }

            try {
                const stickersRef = ref(storage, 'stickers');
                const result = await listAll(stickersRef);
                const fetchedStickers = await Promise.all(
                    result.items.map(async (item) => {
                        try {
                            const url = await getDownloadURL(item);
                            return {
                                name: item.name,
                                url: url
                            };
                        } catch (error) {
                            console.error(`Error getting download URL for ${item.name}:`, error);
                            return null;
                        }
                    })
                );
                const validStickers = fetchedStickers.filter(Boolean) as { name: string; url: string }[];
                
                // Save to localStorage
                localStorage.setItem(CACHE_KEY, JSON.stringify(validStickers));
                localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

                if (iframeRef.current && iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({
                        type: 'STORAGE_STICKERS_LOADED',
                        payload: validStickers
                    }, '*');
                }
            } catch (err) {
                console.error("Firebase Storage list stickers error:", err);
            }
        };

        if (iframeReady) {
            fetchStickersFromStorage();
        }
    }, [iframeReady]);

    useEffect(() => {
        if (currentEditPost) {
            setFormData(currentEditPost);
        } else {
            setFormData({
                category: '원룸', transactionType: '월세', dong: '송정동', building: '', room: '', floor: '', totalFloor: '', price: '', manageFee: '', phone: '010-7590-0111', ownerPhone: '',
                title: '', remarks: '', intro: '', body: '', address: '', video: '', blogUrl: '', thumbnail: '', images: '', panoramas: '', isRecommended: false, isShortTerm: false
            });
        }
    }, [editingPostId, currentEditPost]);

    const handlePostSubmitDirect = async (data: any) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const defaultImg = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=675&q=80";
        
        // Pick dynamic thumbnail from the images array or default fallback image
        const imgList = data.images ? data.images.split('|').filter(Boolean) : [];
        const finalThumbnail = data.thumbnail || (imgList.length > 0 ? imgList[0] : defaultImg);

        const newPost: Post = {
            id: editingPostId || ('local-' + Date.now()),
            createdAt: editingPostId && currentEditPost ? currentEditPost.createdAt : Date.now(),
            updatedAt: Date.now(),
            category: data.category || '원룸',
            transactionType: data.transactionType || '월세',
            dong: data.dong || '송정동',
            building: data.building || '',
            room: data.room || '',
            floor: data.floor || '',
            totalFloor: data.totalFloor || '',
            price: data.price || '',
            manageFee: (data.manageFee && /^\d+$/.test(data.manageFee.trim())) ? data.manageFee.trim() + '만' : (data.manageFee || ''),
            phone: data.phone || '',
            ownerPhone: data.ownerPhone || '',
            blogUrl: data.blogUrl || '',
            title: data.title || '',
            remarks: data.remarks || '',
            thumbnail: finalThumbnail,
            vrThumbnail: data.vrThumbnail || '',
            intro: data.intro || '',
            body: data.body || '',
            images: data.images || '',
            panoImage: '',
            panoramas: data.panoramas || '',
            video: data.video || '',
            address: data.address || '',
            isRecommended: data.isRecommended === true || String(data.isRecommended) === 'true',
            isShortTerm: data.isShortTerm === true || String(data.isShortTerm) === 'true',
            contractPeriod: data.contractPeriod ? parseInt(data.contractPeriod, 10) : undefined,
            fontFamily: data.fontFamily || '나눔고딕',
            fontSize: data.fontSize || '15px'
        };

        try {
            await savePostService(newPost);
            const updated = await getPostsService();
            setPosts(updated);
            showToast(editingPostId ? "매물 답사기가 최종 수정 저장되었습니다!" : "신규 매물 전고가 완벽 등록 발행되었습니다!", "success");
            
            // Notify iframe of successful save before redirecting
            if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                    type: 'SUBMIT_SUCCESS'
                }, '*');
            }

            // Go back to dashboard on complete
            localStorage.removeItem('taewang_editing_post_id');
            setActiveSection('admin-dashboard');
        } catch (err: any) {
            console.error(err);
            const errMsg = err?.message || String(err);
            showToast(`매물 저장 실패: ${errMsg.substring(0, 100)}`, "error");
            
            // Send error notification back to iframe to unlock buttons
            if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                    type: 'SUBMIT_ERROR',
                    payload: { message: errMsg }
                }, '*');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        localStorage.removeItem('taewang_editing_post_id');
        setActiveSection('admin-dashboard');
    };

    return (
        <div className="w-full h-[calc(100vh-4rem)] relative select-none animate-fadeIn overflow-hidden">
            {/* Upload Overlay Loader */}
            {isUploading && (
                <div id="upload-overlay" className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs text-white">
                    <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 text-center text-slate-800">
                        <i className="fa-solid fa-spinner fa-spin text-3xl text-emerald-500 mb-4 animate-spin"></i>
                        <h3 className="text-sm font-black mb-1">스토리지 업로드 중</h3>
                        <p className="text-xs font-bold text-slate-500">{uploadProgress}</p>
                    </div>
                </div>
            )}

            <iframe 
                ref={iframeRef}
                id="smart-editor-iframe"
                src="/smarteditor-final.html" 
                className="w-full h-full border-0"
                title="SmartEditor 2.0 Pure Master"
            />
        </div>
    );
}
