import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { 
  Building2, 
  Compass, 
  GraduationCap, 
  MapPin, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Coins, 
  ShieldCheck, 
  Waves, 
  Car, 
  Trees, 
  Dog, 
  Maximize2,
  FileText,
  PhoneCall,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  X,
  RotateCcw,
  Lock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

// 고화질 선명도 유지하면서 저장 용량을 최적화하는 이미지 압축 유틸리티 (스마트폰 원본 고용량 방지)
const optimizeImageForStorage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 2200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // 고해상도 도면 텍스트도 또렷하게 읽히도록 JPEG 0.88 압축
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        resolve(compressed);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

// 브라우저 IndexedDB 영구 저장소 (용량 제한 없이 10장씩 영구 보존)
const IDB_NAME = 'HillstateBrochureDB';
const IDB_STORE = 'section_photos';

const openBrochureDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveSectionPhotosToDB = async (secNum: number, photos: string[]) => {
  try {
    const db = await openBrochureDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(photos, `section_${secNum}`);
  } catch (e) {
    console.warn('IDB save error', e);
  }
};

const loadSectionPhotosFromDB = async (secNum: number): Promise<string[] | null> => {
  try {
    const db = await openBrochureDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(`section_${secNum}`);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

// 84A, 84B, 114, 132, 162 세대별 평면도 사진 IDB 저장 유틸리티
const savePlanPhotosToDB = async (planType: string, photos: string[]) => {
  try {
    const db = await openBrochureDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(photos, `plan_${planType}`);
  } catch (e) {
    console.warn('IDB save error', e);
  }
};

const loadPlanPhotosFromDB = async (planType: string): Promise<string[] | null> => {
  try {
    const db = await openBrochureDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(`plan_${planType}`);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

interface HillstatePamphletSectionProps {
  isAdminLoggedIn?: boolean;
}

export const HillstatePamphletSection: React.FC<HillstatePamphletSectionProps> = ({ 
  isAdminLoggedIn: propIsAdminLoggedIn 
}) => {
  const storeIsAdminLoggedIn = useAppStore((state) => state.isAdminLoggedIn);
  const isAdminLoggedIn = propIsAdminLoggedIn ?? storeIsAdminLoggedIn;

  const [activeTab, setActiveTab] = useState<'all' | 'overview' | 'location' | 'plan' | 'community' | 'benefit'>('all');
  const [selectedPlan, setSelectedPlan] = useState<'84A' | '84B' | '114' | '132' | '162'>('84A');

  // 1 배치도-전경.png 원본 사진 상태 관리 (로컬스토리지 지속 저장 및 다중 경로 지원)
  const [masterplanImage, setMasterplanImage] = useState<string>(() => {
    return localStorage.getItem('taewang_hillstate_masterplan_image') || '/1 배치도-전경.png';
  });
  const [imageLoadFailed, setImageLoadFailed] = useState<boolean>(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File) => {
    if (!isAdminLoggedIn) return;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setMasterplanImage(dataUrl);
        setImageLoadFailed(false);
        try {
          localStorage.setItem('taewang_hillstate_masterplan_image', dataUrl);
        } catch (err) {
          console.warn('LocalStorage quota limit reached', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdminLoggedIn) return;
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isAdminLoggedIn) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleResetImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdminLoggedIn) return;
    localStorage.removeItem('taewang_hillstate_masterplan_image');
    setMasterplanImage('/1 배치도-전경.png');
    setImageLoadFailed(false);
  };

  // 카탈로그 1, 2, 3, 4, 5 섹션별 원본 사진 목록 상태 관리 (카테고리당 최대 10장, IndexedDB & 로컬스토리지 영구 보존)
  const [sectionPhotos, setSectionPhotos] = useState<{ [key: number]: string[] }>(() => {
    const loadList = (secNum: number) => {
      try {
        const stored = localStorage.getItem(`taewang_hillstate_section_imgs_${secNum}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed.slice(0, 10);
        }
        // 과거 단일 사진이 저장되어 있다면 자동 마이그레이션
        const oldSingle = localStorage.getItem(`taewang_hillstate_section_img_${secNum}`);
        if (oldSingle) return [oldSingle];
      } catch (e) {
        console.warn(e);
      }
      return [];
    };
    return {
      1: loadList(1),
      2: loadList(2),
      3: loadList(3),
      4: loadList(4),
      5: loadList(5),
    };
  });

  // 84A, 84B, 114, 132, 162 세대별 평면도 사진 관리 (타입당 최대 10장, IndexedDB & 로컬스토리지 영구 보존)
  const [planPhotos, setPlanPhotos] = useState<{ [key: string]: string[] }>(() => {
    const loadPlan = (pType: string) => {
      try {
        const stored = localStorage.getItem(`taewang_hillstate_plan_imgs_${pType}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed.slice(0, 10);
        }
        const single = localStorage.getItem(`taewang_hillstate_plan_img_${pType}`);
        if (single) return [single];
      } catch (e) {
        console.warn(e);
      }
      return [];
    };
    return {
      '84A': loadPlan('84A'),
      '84B': loadPlan('84B'),
      '114': loadPlan('114'),
      '132': loadPlan('132'),
      '162': loadPlan('162'),
    };
  });

  const [targetUploadSection, setTargetUploadSection] = useState<number | null>(null);
  const [targetUploadPlan, setTargetUploadPlan] = useState<string | null>(null);
  const [planActiveIndex, setPlanActiveIndex] = useState<{ [key: string]: number }>({});
  const sectionFileInputRef = useRef<HTMLInputElement>(null);
  const planFileInputRef = useRef<HTMLInputElement>(null);
  const [modalZoomData, setModalZoomData] = useState<{ images: string[]; currentIndex: number; title: string; sectionNum?: number } | null>(null);

  // 컴포넌트 마운트 시 IndexedDB에서 고용량 사진 목록 복원 (카탈로그 1~5 및 세대별 평면도)
  useEffect(() => {
    const loadAllFromDB = async () => {
      // 1. 카탈로그 1~5 섹션 복원
      for (const secNum of [1, 2, 3, 4, 5]) {
        const idbPhotos = await loadSectionPhotosFromDB(secNum);
        if (idbPhotos && Array.isArray(idbPhotos) && idbPhotos.length > 0) {
          setSectionPhotos((prev) => ({
            ...prev,
            [secNum]: idbPhotos.slice(0, 10),
          }));
        }
      }
      // 2. 평면도 84A, 84B, 114, 132, 162 복원
      for (const pType of ['84A', '84B', '114', '132', '162']) {
        const idbPlanPhotos = await loadPlanPhotosFromDB(pType);
        if (idbPlanPhotos && Array.isArray(idbPlanPhotos) && idbPlanPhotos.length > 0) {
          setPlanPhotos((prev) => ({
            ...prev,
            [pType]: idbPlanPhotos.slice(0, 10),
          }));
        }
      }
    };
    loadAllFromDB();
  }, []);

  // 전체화면 팝업 키보드 단축키 (Esc 닫기, 좌/우 화살표 사진 넘기기)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalZoomData) {
        if (e.key === 'Escape') {
          setModalZoomData(null);
        } else if (e.key === 'ArrowLeft') {
          setModalZoomData(prev => prev ? {
            ...prev,
            currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
          } : null);
        } else if (e.key === 'ArrowRight') {
          setModalZoomData(prev => prev ? {
            ...prev,
            currentIndex: (prev.currentIndex + 1) % prev.images.length
          } : null);
        }
      } else if (isZoomModalOpen) {
        if (e.key === 'Escape') {
          setIsZoomModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalZoomData, isZoomModalOpen]);

  const handleTriggerSectionUpload = (secNum: number) => {
    if (!isAdminLoggedIn) return;
    setTargetUploadSection(secNum);
    sectionFileInputRef.current?.click();
  };

  const handleSectionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdminLoggedIn || targetUploadSection === null) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const secNum = targetUploadSection;
    const currentList = sectionPhotos[secNum] || [];
    const remainingSlots = 10 - currentList.length;

    if (remainingSlots <= 0) {
      alert("이 카테고리에는 이미 최대 10장의 사진이 모두 등록되어 있습니다. 기존 사진을 삭제 후 추가해 주세요.");
      e.target.value = '';
      return;
    }

    const filesToRead = files.slice(0, remainingSlots);
    const optimizedUrls: string[] = [];

    for (const file of filesToRead) {
      const url = await optimizeImageForStorage(file);
      if (url) optimizedUrls.push(url);
    }

    if (optimizedUrls.length > 0) {
      setSectionPhotos((prev) => {
        const updated = [...(prev[secNum] || []), ...optimizedUrls].slice(0, 10);
        saveSectionPhotosToDB(secNum, updated);
        try {
          localStorage.setItem(`taewang_hillstate_section_imgs_${secNum}`, JSON.stringify(updated));
        } catch (err) {
          console.warn('LocalStorage quota limit, safely stored in IndexedDB', err);
        }
        return { ...prev, [secNum]: updated };
      });
    }

    e.target.value = '';
  };

  // 사진 삭제 핸들러
  const handleRemoveSectionPhoto = (secNum: number, indexToRemove: number) => {
    if (!isAdminLoggedIn) return;
    setSectionPhotos((prev) => {
      const updated = (prev[secNum] || []).filter((_, idx) => idx !== indexToRemove);
      saveSectionPhotosToDB(secNum, updated);
      try {
        localStorage.setItem(`taewang_hillstate_section_imgs_${secNum}`, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return { ...prev, [secNum]: updated };
    });
  };

  // 사진 순서 변경 핸들러 (좌/우 이동)
  const handleMovePhoto = (secNum: number, index: number, direction: 'left' | 'right') => {
    if (!isAdminLoggedIn) return;
    setSectionPhotos((prev) => {
      const list = [...(prev[secNum] || [])];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      saveSectionPhotosToDB(secNum, list);
      try {
        localStorage.setItem(`taewang_hillstate_section_imgs_${secNum}`, JSON.stringify(list));
      } catch (err) {
        console.warn(err);
      }
      return { ...prev, [secNum]: list };
    });
  };

  const handleClearSectionPhotos = (secNum: number) => {
    if (!isAdminLoggedIn) return;
    if (!window.confirm(`${secNum}번 카테고리의 모든 사진을 삭제하시겠습니까?`)) return;
    localStorage.removeItem(`taewang_hillstate_section_imgs_${secNum}`);
    localStorage.removeItem(`taewang_hillstate_section_img_${secNum}`);
    saveSectionPhotosToDB(secNum, []);
    setSectionPhotos((prev) => ({ ...prev, [secNum]: [] }));
  };

  // 섹션 드래그 앤 드롭 파일 첨부 처리
  const handleSectionDrop = async (e: React.DragEvent, secNum: number) => {
    e.preventDefault();
    if (!isAdminLoggedIn) return;
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const currentList = sectionPhotos[secNum] || [];
    const remainingSlots = 10 - currentList.length;
    if (remainingSlots <= 0) {
      alert("이 카테고리에는 이미 최대 10장의 사진이 모두 등록되어 있습니다.");
      return;
    }

    const filesToRead = files.slice(0, remainingSlots);
    const optimizedUrls: string[] = [];

    for (const file of filesToRead) {
      const url = await optimizeImageForStorage(file);
      if (url) optimizedUrls.push(url);
    }

    if (optimizedUrls.length > 0) {
      setSectionPhotos((prev) => {
        const updated = [...(prev[secNum] || []), ...optimizedUrls].slice(0, 10);
        saveSectionPhotosToDB(secNum, updated);
        try {
          localStorage.setItem(`taewang_hillstate_section_imgs_${secNum}`, JSON.stringify(updated));
        } catch (err) {
          console.warn(err);
        }
        return { ...prev, [secNum]: updated };
      });
    }
  };

  // 섹션별 다중 사진 갤러리 컴포넌트 (최대 10장)
  // 사용자가 3장을 넣으면 정확히 3장, 5장을 넣으면 5장만 표시
  const renderSectionPhotoGallery = (secNum: number, title: string) => {
    const photos = sectionPhotos[secNum] || [];
    if (photos.length === 0) {
      if (!isAdminLoggedIn) return null;
      return (
        <div 
          onClick={() => handleTriggerSectionUpload(secNum)}
          onDrop={(e) => handleSectionDrop(e, secNum)}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-white/20 hover:border-amber-400/60 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-200">
            📸 {secNum}. {title} 사진 첨부하기 (클릭 또는 드래그하여 최대 10장까지 선택/등록)
          </div>
          <div className="text-[11px] text-slate-400">
            소장님께서 소장 중이신 카탈로그 사진 파일을 한 장씩 또는 여러 장 한꺼번에 선택하여 등록하실 수 있습니다.
          </div>
        </div>
      );
    }

    return (
      <div 
        className="space-y-3"
        onDrop={(e) => handleSectionDrop(e, secNum)}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className={`grid gap-4 ${
          photos.length === 1 
            ? 'grid-cols-1' 
            : photos.length === 2 
              ? 'grid-cols-1 sm:grid-cols-2' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {photos.map((url, idx) => (
            <div 
              key={idx} 
              className="relative rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-black/60 group flex flex-col"
            >
              <div 
                className="relative cursor-pointer overflow-hidden aspect-[4/3] bg-slate-950 flex items-center justify-center"
                onClick={() => setModalZoomData({ images: photos, currentIndex: idx, title: `${secNum}. ${title}`, sectionNum: secNum })}
              >
                <img 
                  src={url} 
                  alt={`${secNum}. ${title} - 사진 ${idx + 1}`} 
                  className="w-full h-full object-contain mx-auto transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
                  <span className="text-[11px] text-white font-bold flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                    클릭 시 확대보기
                  </span>
                </div>
              </div>

              {/* Photo Info & Admin Order/Delete Controls */}
              <div className="p-3 bg-black/50 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>사진 {idx + 1} / {photos.length}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {/* 관리자 순서 이동 버튼 (좌/우) */}
                  {isAdminLoggedIn && photos.length > 1 && (
                    <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/10">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePhoto(secNum, idx, 'left');
                        }}
                        className={`p-1 rounded ${idx === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                        title="앞으로 이동"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === photos.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePhoto(secNum, idx, 'right');
                        }}
                        className={`p-1 rounded ${idx === photos.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                        title="뒤로 이동"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setModalZoomData({ images: photos, currentIndex: idx, title: `${secNum}. ${title}`, sectionNum: secNum })}
                    className="text-amber-300 hover:text-white text-[11px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    확대
                  </button>

                  {isAdminLoggedIn && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSectionPhoto(secNum, idx);
                      }}
                      className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-red-500/20 transition-colors"
                      title="이 사진 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Admin Add More Photos Card in Grid */}
          {isAdminLoggedIn && photos.length < 10 && (
            <div 
              onClick={() => handleTriggerSectionUpload(secNum)}
              className="border-2 border-dashed border-amber-400/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-[4/3] space-y-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center transition-transform group-hover:scale-110">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-xs font-black text-amber-300">
                + 사진 추가 등록
              </div>
              <div className="text-[11px] text-slate-400">
                현재 {photos.length}장 / 최대 10장 가능
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 평면도 사진 업로드 트리거 (84A, 84B, 114, 132, 162)
  const handleTriggerPlanUpload = (pType: string) => {
    if (!isAdminLoggedIn) return;
    setTargetUploadPlan(pType);
    planFileInputRef.current?.click();
  };

  const handlePlanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdminLoggedIn || targetUploadPlan === null) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const pType = targetUploadPlan;
    const currentList = planPhotos[pType] || [];
    const remainingSlots = 10 - currentList.length;

    if (remainingSlots <= 0) {
      alert(`${pType}형에는 이미 최대 10장의 평면도 사진이 모두 등록되어 있습니다. 기존 사진을 삭제 후 추가해 주세요.`);
      e.target.value = '';
      return;
    }

    const filesToRead = files.slice(0, remainingSlots);
    const optimizedUrls: string[] = [];

    for (const file of filesToRead) {
      const url = await optimizeImageForStorage(file);
      if (url) optimizedUrls.push(url);
    }

    if (optimizedUrls.length > 0) {
      setPlanPhotos((prev) => {
        const updated = [...(prev[pType] || []), ...optimizedUrls].slice(0, 10);
        savePlanPhotosToDB(pType, updated);
        try {
          localStorage.setItem(`taewang_hillstate_plan_imgs_${pType}`, JSON.stringify(updated));
        } catch (err) {
          console.warn('LocalStorage quota limit, safely stored in IndexedDB', err);
        }
        return { ...prev, [pType]: updated };
      });
      setPlanActiveIndex((prev) => ({ ...prev, [pType]: (planPhotos[pType]?.length || 0) }));
    }

    e.target.value = '';
  };

  const handleRemovePlanPhoto = (pType: string, indexToRemove: number) => {
    if (!isAdminLoggedIn) return;
    setPlanPhotos((prev) => {
      const updated = (prev[pType] || []).filter((_, idx) => idx !== indexToRemove);
      savePlanPhotosToDB(pType, updated);
      try {
        localStorage.setItem(`taewang_hillstate_plan_imgs_${pType}`, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return { ...prev, [pType]: updated };
    });
    setPlanActiveIndex((prev) => {
      const cur = prev[pType] || 0;
      if (cur >= indexToRemove && cur > 0) {
        return { ...prev, [pType]: cur - 1 };
      }
      return prev;
    });
  };

  const handleClearPlanPhotos = (pType: string) => {
    if (!isAdminLoggedIn) return;
    if (!window.confirm(`${pType}형의 모든 평면도 사진을 삭제하시겠습니까?`)) return;
    localStorage.removeItem(`taewang_hillstate_plan_imgs_${pType}`);
    savePlanPhotosToDB(pType, []);
    setPlanPhotos((prev) => ({ ...prev, [pType]: [] }));
    setPlanActiveIndex((prev) => ({ ...prev, [pType]: 0 }));
  };

  const handlePlanDrop = async (e: React.DragEvent, pType: string) => {
    e.preventDefault();
    if (!isAdminLoggedIn) return;
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const currentList = planPhotos[pType] || [];
    const remainingSlots = 10 - currentList.length;
    if (remainingSlots <= 0) {
      alert(`${pType}형에는 이미 최대 10장의 사진이 모두 등록되어 있습니다.`);
      return;
    }

    const filesToRead = files.slice(0, remainingSlots);
    const optimizedUrls: string[] = [];

    for (const file of filesToRead) {
      const url = await optimizeImageForStorage(file);
      if (url) optimizedUrls.push(url);
    }

    if (optimizedUrls.length > 0) {
      setPlanPhotos((prev) => {
        const updated = [...(prev[pType] || []), ...optimizedUrls].slice(0, 10);
        savePlanPhotosToDB(pType, updated);
        try {
          localStorage.setItem(`taewang_hillstate_plan_imgs_${pType}`, JSON.stringify(updated));
        } catch (err) {
          console.warn(err);
        }
        return { ...prev, [pType]: updated };
      });
      setPlanActiveIndex((prev) => ({ ...prev, [pType]: (planPhotos[pType]?.length || 0) }));
    }
  };

  // 84A, 84B, 114, 132, 162 세대별 평면도 전용 고화질 비주얼 박스 (사진 첨부 / 교체 / 확대)
  const renderUnitPlanVisualBox = (
    type: '84A' | '84B' | '114' | '132' | '162',
    diagramTitle: string,
    subtitle: string,
    desc: string,
    accentColor: string = 'text-amber-300'
  ) => {
    const photos = planPhotos[type] || [];
    const activeIdx = Math.min(planActiveIndex[type] || 0, Math.max(0, photos.length - 1));
    const currentPhoto = photos[activeIdx];

    return (
      <div 
        onDrop={(e) => handlePlanDrop(e, type)}
        onDragOver={(e) => e.preventDefault()}
        className="bg-slate-800/90 rounded-2xl p-4 sm:p-6 border border-white/10 space-y-4 backdrop-blur-md shadow-2xl flex flex-col justify-between"
      >
        {/* 상단 헤더: 다이어그램 타이틀 & 사진 첨부/확대 컨트롤 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black uppercase tracking-wider ${accentColor}`}>
              {diagramTitle}
            </span>
            {photos.length > 0 && (
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400/30">
                사진 {photos.length}장
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {photos.length > 0 && (
              <button
                type="button"
                onClick={() => setModalZoomData({ 
                  images: photos, 
                  currentIndex: activeIdx, 
                  title: `${type}형 세대 평면도 (Unit Plan)`, 
                  sectionNum: 4 
                })}
                className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-white/15 flex items-center gap-1 transition-all"
                title={`${type}형 평면도 크게보기`}
              >
                <Maximize2 className="w-3 h-3 text-amber-300" />
                <span>확대보기</span>
              </button>
            )}

            {/* 관리자 전용 평면도 사진 첨부/추가 버튼 */}
            {isAdminLoggedIn && (
              <button
                type="button"
                onClick={() => handleTriggerPlanUpload(type)}
                disabled={photos.length >= 10}
                className={`px-3 py-1 rounded-lg text-xs font-black shadow-md flex items-center gap-1 transition-all ${
                  photos.length >= 10
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:scale-105 active:scale-95'
                }`}
                title={`${type}형 평면도 사진 파일 첨부/추가 (소장님 전용)`}
              >
                <Upload className="w-3 h-3" />
                <span>{photos.length > 0 ? `+ 사진 추가 (${photos.length}/10)` : `${type} 사진 첨부`}</span>
              </button>
            )}

            {isAdminLoggedIn && photos.length > 0 && (
              <button
                type="button"
                onClick={() => handleClearPlanPhotos(type)}
                className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-white/10 transition-colors"
                title={`${type}형 사진 전체 비우기`}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 비주얼 영역: 첨부된 사진 노출 또는 관리자 업로드 박스 */}
        {photos.length > 0 && currentPhoto ? (
          <div className="space-y-3">
            <div 
              className="relative cursor-pointer overflow-hidden rounded-xl bg-slate-950 border border-white/15 aspect-[4/3] flex items-center justify-center group"
              onClick={() => setModalZoomData({ 
                images: photos, 
                currentIndex: activeIdx, 
                title: `${type}형 세대 평면도 (Unit Plan)`, 
                sectionNum: 4 
              })}
            >
              <img 
                src={currentPhoto} 
                alt={`${type}형 평면도 사진`} 
                className="w-full h-full object-contain p-2 mx-auto transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
                <span className="text-[11px] text-white font-bold flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                  클릭 시 고화질 전체화면 확대
                </span>
                <span className="text-[10px] text-slate-300 font-bold bg-black/60 px-2 py-0.5 rounded">
                  {activeIdx + 1} / {photos.length}
                </span>
              </div>
            </div>

            {/* 다중 사진 썸네일 스트립 (사진이 2장 이상일 때) */}
            {photos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {photos.map((url, pIdx) => (
                  <div key={pIdx} className="relative group shrink-0">
                    <button
                      type="button"
                      onClick={() => setPlanActiveIndex(prev => ({ ...prev, [type]: pIdx }))}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        activeIdx === pIdx 
                          ? 'border-amber-400 scale-105 shadow-md ring-2 ring-amber-400/40' 
                          : 'border-white/20 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`썸네일 ${pIdx + 1}`} className="w-full h-full object-cover" />
                    </button>
                    {isAdminLoggedIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePlanPhoto(type, pIdx);
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        title="이 사진 삭제"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
                {isAdminLoggedIn && photos.length < 10 && (
                  <button
                    type="button"
                    onClick={() => handleTriggerPlanUpload(type)}
                    className="w-12 h-12 rounded-lg border-2 border-dashed border-amber-400/40 hover:border-amber-400 text-amber-300 flex items-center justify-center shrink-0 hover:bg-amber-400/10 transition-colors"
                    title="추가 사진 등록"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 사진이 없을 때: 관리자에게는 매력적인 업로드 카드, 방문자에게는 멋진 다이어그램 */
          isAdminLoggedIn ? (
            <div 
              onClick={() => handleTriggerPlanUpload(type)}
              className="py-10 sm:py-12 border-2 border-dashed border-indigo-400/40 hover:border-amber-400 bg-indigo-500/5 hover:bg-amber-500/10 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-3 transition-all group text-center px-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center transition-transform group-hover:scale-110">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-black text-white group-hover:text-amber-300 transition-colors block">
                  📸 {type}형 평면도 사진 첨부하기
                </span>
                <span className="text-xs text-slate-400 block">
                  클릭하거나 컴퓨터의 {type}형 평면도 이미지 파일을 여기에 드래그하세요 (최대 10장)
                </span>
              </div>
              <span className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-4 py-2 rounded-lg shadow-md flex items-center gap-1.5 mt-1 transition-all">
                <ImageIcon className="w-3.5 h-3.5" />
                {type}형 평면도 파일 선택
              </span>
            </div>
          ) : (
            <div className="py-10 sm:py-12 border-2 border-dashed border-white/20 rounded-xl bg-slate-900/60 flex flex-col items-center justify-center gap-2 text-center px-4">
              <Maximize2 className="w-8 h-8 text-indigo-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-bold">{subtitle}</span>
              <span className="text-[11px] text-slate-500">{desc}</span>
            </div>
          )
        )}

        {/* 하단 정보 */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
          <span>{type}형 공식 설계 도면</span>
          <span>{photos.length > 0 ? `고화질 원본 등록됨 (${photos.length}장)` : '도면 등록 대기'}</span>
        </div>
      </div>
    );
  };

  return (
    <section id="hillstate-brochure-section" className="w-full bg-[#0a1128] text-slate-100 py-16 sm:py-24 border-y border-white/10 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#64dfdf]/10 via-[#0B2545]/30 to-transparent blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 relative z-10 space-y-16">
        
        {/* ========================================================= */}
        {/* 1. 메인 헤더 & 브랜드 타이틀 (Page 1) */}
        {/* ========================================================= */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#64dfdf]/10 border border-[#64dfdf]/30 px-5 py-2 rounded-full backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#64dfdf]" />
            <span className="text-[#64dfdf] text-xs sm:text-sm font-black tracking-widest uppercase">
              HILLSTATE GUMI THE FIRST • OFFICIAL BROCHURE
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-amber-300 font-extrabold text-base sm:text-xl tracking-tight">
              이름만으로도 특권이 될 구미의 퍼스트 클래스 라이프
            </p>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              힐스테이트 <span className="text-amber-400">구미더퍼스트</span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-lg font-medium max-w-3xl mx-auto pt-2 leading-relaxed">
              현대건설이 구미에서 처음 선보이는 독보적 프리미엄 아파트<br className="hidden sm:inline" />
              공식 모델하우스 분양 안내 팜플렛의 모든 핵심 정보를 실감나게 확인하세요.
            </p>
          </div>

          {/* [공식 조감도 / 배치도 전경 비주얼 배너 - 1 배치도-전경.png 실감 원본 사진 영역] */}
          <div 
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`relative w-full rounded-3xl overflow-hidden border transition-all duration-300 shadow-[0_24px_80px_rgba(0,0,0,0.8)] bg-gradient-to-br from-slate-900 via-[#0B2545] to-slate-950 ${
              isDragging ? 'border-[#64dfdf] ring-4 ring-[#64dfdf]/30' : 'border-white/20'
            }`}
          >
            {/* Hidden File Input for uploading 1 배치도-전경.png */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileInputChange} 
            />

            {/* Hidden File Input for Sections 1, 2, 3, 4, 5 photo uploads (multiple up to 10) */}
            <input 
              type="file" 
              ref={sectionFileInputRef} 
              accept="image/*" 
              multiple
              className="hidden" 
              onChange={handleSectionFileChange} 
            />

            {/* Hidden File Input for Unit Plan photo uploads (84A, 84B, 114, 132, 162) */}
            <input 
              type="file" 
              ref={planFileInputRef} 
              accept="image/*" 
              multiple
              className="hidden" 
              onChange={handlePlanFileChange} 
            />

            {/* Top Brand Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-black/70 border-b border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-800/90 text-white font-serif font-black flex items-center justify-center text-xl italic shadow-md border border-red-500/30">
                  H
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest text-[#64dfdf] uppercase">HILLSTATE GUMI THE FIRST</span>
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400/30">
                      1 배치도-전경.png
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-white">힐스테이트 구미더퍼스트 단지 전경 및 배치도 조감 (원본)</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoomModalOpen(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                  title="사진 크게보기"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">원본 확대보기</span>
                </button>

                {/* 사장님 요청: 로그인 시에만 사진 교체 버튼 노출, 비로그인 시 숨김 */}
                {isAdminLoggedIn && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                    title="내 컴퓨터의 '1 배치도-전경.png' 파일 등록/변경 (관리자 전용)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>사진 첨부 / 교체</span>
                  </button>
                )}

                {isAdminLoggedIn && localStorage.getItem('taewang_hillstate_masterplan_image') && (
                  <button
                    type="button"
                    onClick={handleResetImage}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    title="기본 사진 경로로 초기화 (관리자 전용)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Visual Display Area: 1 배치도-전경.png Real Photo Presentation */}
            <div className="relative p-4 sm:p-8 flex flex-col items-center justify-center bg-gradient-to-tr from-[#060d1f] via-[#0d1e3d] to-[#122b56] overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-[radial-gradient(#64dfdf_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
              <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -left-24 -top-24 w-96 h-96 bg-[#64dfdf]/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Real Image Container */}
              {!imageLoadFailed ? (
                <div className="relative z-10 w-full max-w-5xl group">
                  <div 
                    onClick={() => setIsZoomModalOpen(true)}
                    className="relative cursor-zoom-in rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/60 group-hover:border-amber-400/50 transition-all duration-300"
                  >
                    <img 
                      src={masterplanImage} 
                      alt="힐스테이트 구미더퍼스트 1 배치도-전경 원본 사진" 
                      className="w-full h-auto max-h-[680px] object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.01]"
                      onError={() => {
                        // If file isn't uploaded yet, try fallback SVG
                        if (!masterplanImage.startsWith('data:') && masterplanImage !== '/hillstate/masterplan-perspective.svg') {
                          setMasterplanImage('/hillstate/masterplan-perspective.svg');
                        } else {
                          setImageLoadFailed(true);
                        }
                      }}
                    />
                    
                    {/* Hover Hint Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 sm:p-6 pointer-events-none">
                      <div className="text-left space-y-0.5">
                        <span className="text-[#64dfdf] text-xs font-black">1 배치도-전경.png</span>
                        <p className="text-white text-sm font-bold">클릭하시면 전체화면으로 선명하게 확대됩니다.</p>
                      </div>
                      <div className="bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-lg">
                        <ZoomIn className="w-4 h-4" />
                        <span>확대보기</span>
                      </div>
                    </div>
                  </div>

                  {/* Under-Photo Quick Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 px-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-bold text-white">현대건설 힐스테이트 공식 배치도 조감도</span>
                      <span className="text-slate-400 hidden sm:inline">| 지하 2층 ~ 지상 29층 5개동 (총 491세대)</span>
                    </div>
                    {/* 관리자 로그인 시에만 하단 파일 교체 링크 노출 */}
                    {isAdminLoggedIn && (
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>컴퓨터의 '1 배치도-전경.png' 파일 직접 교체</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Fallback View: 관리자 로그인 시에는 파일 등록 드롭존 노출, 비로그인 시에는 안내 그래픽 노출 */
                isAdminLoggedIn ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative z-10 w-full max-w-4xl p-8 sm:p-12 rounded-2xl border-2 border-dashed border-amber-400/50 hover:border-amber-400 bg-black/60 hover:bg-black/80 cursor-pointer transition-all text-center space-y-4 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        📷 '1 배치도-전경.png' 사진 원본 첨부하기 (소장님 전용)
                      </h4>
                      <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                        이곳을 클릭하시거나 소장하고 계신 <strong className="text-amber-300">'1 배치도-전경.png'</strong> 파일을 끌어다 놓으시면, 메인창에 원본 고화질 그대로 즉시 표시됩니다.
                      </p>
                    </div>
                    <button 
                      type="button"
                      className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm px-6 py-3 rounded-xl shadow-xl inline-flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>내 컴퓨터에서 '1 배치도-전경.png' 파일 선택</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative z-10 w-full max-w-4xl p-6 sm:p-8 rounded-2xl border border-white/20 bg-black/50 text-center space-y-4">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-[460px] mx-auto">
                      <img 
                        src="/hillstate/masterplan-perspective.svg" 
                        alt="단지 전경 및 배치도 조감도" 
                        className="w-full h-auto object-contain mx-auto"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1 text-slate-300 text-xs sm:text-sm font-bold">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>현대건설 힐스테이트 구미더퍼스트 공식 단지 조감도 및 5개동 마스터플랜</span>
                    </div>
                  </div>
                )
              )}

              {/* 5개동 마스터플랜 미니 인포그래픽 바 */}
              <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 z-10">
                {[
                  { dong: '101동', desc: '정남향 • 금오산 조망', highlight: '84A / 84B' },
                  { dong: '102동', desc: '남동향 • 도봉초 인접', highlight: '84A / 114' },
                  { dong: '103동', desc: '남서향 • 공원 조망', highlight: '84A / 114' },
                  { dong: '104동', desc: '정남향 • 단지 중앙광장', highlight: '84A / 84B' },
                  { dong: '105동', desc: '남동향 • 최상층 펜트', highlight: '132P / 162P' },
                ].map((d, i) => (
                  <div key={i} className="bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl p-3.5 backdrop-blur-md transition-all text-center space-y-1">
                    <div className="text-sm font-black text-amber-300">{d.dong}</div>
                    <div className="text-[11px] font-bold text-white">{d.desc}</div>
                    <div className="text-[10px] text-[#64dfdf] font-black">{d.highlight}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 파격 혜택 하이라이트 띠배너 (Page 30 요약) */}
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-2">
                <span className="text-[11px] font-bold text-amber-200 block">혜택 01</span>
                <span className="text-base sm:text-lg font-black text-white">계약금 5%</span>
              </div>
              <div className="p-2 border-l border-amber-400/20">
                <span className="text-[11px] font-bold text-amber-200 block">혜택 02</span>
                <span className="text-base sm:text-lg font-black text-amber-300">중도금 60% 무이자</span>
              </div>
              <div className="p-2 border-l border-amber-400/20">
                <span className="text-[11px] font-bold text-amber-200 block">혜택 03</span>
                <span className="text-base sm:text-lg font-black text-white">추가부담 NO</span>
              </div>
              <div className="p-2 border-l border-amber-400/20">
                <span className="text-[11px] font-bold text-amber-200 block">혜택 04</span>
                <span className="text-base sm:text-lg font-black text-emerald-400">전매제한 없음</span>
              </div>
            </div>
          </div>

          {/* 카테고리 퀵 내비게이션 탭 */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {[
              { id: 'all', label: '전체 팜플렛 연속보기', count: 0 },
              { id: 'overview', label: '1. 사업개요 & 배치도', count: sectionPhotos[1]?.length || 0 },
              { id: 'location', label: '2. 입지 & 풍수지리 명당', count: sectionPhotos[2]?.length || 0 },
              { id: 'community', label: '3. 특화설계 & 커뮤니티', count: sectionPhotos[3]?.length || 0 },
              { id: 'plan', label: '4. 세대 평면도(84~162P)', count: sectionPhotos[4]?.length || 0 },
              { id: 'benefit', label: '5. 분양조건 & 일정', count: sectionPhotos[5]?.length || 0 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#64dfdf] text-[#0a1128] shadow-[0_0_20px_rgba(100,223,223,0.4)] scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === tab.id 
                      ? 'bg-[#0a1128] text-[#64dfdf]' 
                      : 'bg-amber-400 text-slate-950'
                  }`}>
                    {tab.count}장
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. 세로형 연속 스크롤 팜플렛 본문 */}
        {/* ========================================================= */}
        <div className="space-y-16">

          {/* ------------------------------------------------------- */}
          {/* [섹션 A] 사업개요 & 단지배치도 (Page 2 & Page 3) */}
          {/* ------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'overview') && (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">01</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">사업개요 & 단지배치 안내</h3>
                </div>
                
                {/* 상단 우측: 1에 사진첨부 / 추가 버튼 (최대 10장) & 원본 확대보기 */}
                <div className="flex flex-wrap items-center gap-2">
                  {sectionPhotos[1]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalZoomData({ images: sectionPhotos[1], currentIndex: 0, title: '1. 사업개요 & 단지배치도 원본 사진', sectionNum: 1 })}
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="1번 사진 크게보기"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">원본 확대보기</span>
                      <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">{sectionPhotos[1].length}장</span>
                    </button>
                  )}
                  {isAdminLoggedIn && (
                    <button
                      type="button"
                      onClick={() => handleTriggerSectionUpload(1)}
                      disabled={sectionPhotos[1]?.length >= 10}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                        sectionPhotos[1]?.length >= 10
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                      title="1. 사업개요 카탈로그 사진 등록/추가 (최대 10장, 소장님 전용)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {sectionPhotos[1]?.length > 0 
                          ? `1에 사진 추가 (${sectionPhotos[1].length}/10)` 
                          : '1에 사진 첨부 / 교체 (최대 10장)'}
                      </span>
                    </button>
                  )}
                  {isAdminLoggedIn && sectionPhotos[1]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearSectionPhotos(1)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="1번 사진 전체 비우기"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full hidden lg:inline">지하2층~지상29층 • 491세대</span>
                </div>
              </div>

              {/* 1번 카탈로그 사진 다중 갤러리 (최대 10장) */}
              {renderSectionPhotoGallery(1, '사업개요 & 단지배치도')}

              {/* 핵심 요약 포인트 배너 */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/20 to-transparent border-l-4 border-emerald-400 p-4 rounded-r-xl">
                <p className="text-emerald-300 text-sm sm:text-base font-black">
                  전용 84㎡ 77%, 84㎡ 초과 23% ⇒ 구미 봉곡 최선호 중대형 평형 위주의 명품 상품 구성
                </p>
                <p className="text-slate-300 text-xs sm:text-sm pt-1">
                  정남향 23%, 남동향 33%, 남서향 44% 등 전 세대 남향 위주 배치로 금오산 청정 조망권 극대화
                </p>
              </div>

              {/* 사업개요 테이블 */}
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-white/5 text-slate-300 font-black border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">항목</th>
                      <th className="py-3 px-4">내용</th>
                      <th className="py-3 px-4">항목</th>
                      <th className="py-3 px-4">내용</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-400 bg-white/[0.02]">위치</td>
                      <td className="py-3 px-4 font-bold text-white">경상북도 구미시 봉곡동 59-1번지 일원</td>
                      <td className="py-3 px-4 font-bold text-slate-400 bg-white/[0.02]">대지면적</td>
                      <td className="py-3 px-4">21,723.20㎡ (6,571.27평)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-400 bg-white/[0.02]">규모</td>
                      <td className="py-3 px-4 font-bold text-white">지하 2층 ~ 지상 29층 (5개동)</td>
                      <td className="py-3 px-4 font-bold text-slate-400 bg-white/[0.02]">연면적</td>
                      <td className="py-3 px-4">87,858.29㎡ (26,577.13평)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-400 bg-white/[0.02]">건폐율 / 용적률</td>
                      <td className="py-3 px-4">17.29% / 269.95%</td>
                      <td className="py-3 px-4 font-bold text-slate-400 bg-white/[0.02]">주차대수</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">총 713대 (세대당 1.45대, 넉넉한 광폭 주차)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 공급 세대수 상세 비율표 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {[
                  { type: '84A', units: '264세대', ratio: '53.8%', desc: '4Bay 맞통풍 판상형 (인기 최고)' },
                  { type: '84B', units: '112세대', ratio: '22.8%', desc: '40평형대 같은 와이드 거실' },
                  { type: '114', units: '108세대', ratio: '22.0%', desc: '대형 고급마감재 & 알파룸' },
                  { type: '132 (펜트)', units: '5세대', ratio: '1.0%', desc: '상위 1% 테라스 펜트하우스' },
                  { type: '162 (펜트)', units: '2세대', ratio: '0.4%', desc: '3개 테라스 하이엔드 펜트' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-amber-400 text-xs font-black block">{item.type}</span>
                    <p className="text-lg font-black text-white">{item.units}</p>
                    <span className="text-[11px] text-slate-400 block font-bold">비율: {item.ratio}</span>
                    <p className="text-[10px] text-slate-400 pt-1 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* [섹션 B] 명당 입지 & 풍수지리 감정서 (Page 4, 5, 6) */}
          {/* ------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'location') && (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center border border-amber-500/30">02</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">초·중·고 도보 학세권 & 검증된 풍수지리 명당</h3>
                </div>
                
                {/* 상단 우측: 2에 사진첨부 / 추가 버튼 (최대 10장) & 원본 확대보기 */}
                <div className="flex flex-wrap items-center gap-2">
                  {sectionPhotos[2]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalZoomData({ images: sectionPhotos[2], currentIndex: 0, title: '2. 입지 & 풍수지리 명당 원본 사진', sectionNum: 2 })}
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="2번 사진 크게보기"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">원본 확대보기</span>
                      <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">{sectionPhotos[2].length}장</span>
                    </button>
                  )}
                  {isAdminLoggedIn && (
                    <button
                      type="button"
                      onClick={() => handleTriggerSectionUpload(2)}
                      disabled={sectionPhotos[2]?.length >= 10}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                        sectionPhotos[2]?.length >= 10
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                      title="2. 입지/풍수지리 카탈로그 사진 등록/추가 (최대 10장, 소장님 전용)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {sectionPhotos[2]?.length > 0 
                          ? `2에 사진 추가 (${sectionPhotos[2].length}/10)` 
                          : '2에 사진 첨부 / 교체 (최대 10장)'}
                      </span>
                    </button>
                  )}
                  {isAdminLoggedIn && sectionPhotos[2]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearSectionPhotos(2)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="2번 사진 전체 비우기"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 hidden lg:inline">풍수 명당 감정 완료</span>
                </div>
              </div>

              {/* 2번 카탈로그 사진 다중 갤러리 (최대 10장) */}
              {renderSectionPhotoGallery(2, '초·중·고 도보 학세권 & 검증된 풍수지리 명당')}

              {/* 4대 생활 인프라 그리드 (Page 4) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
                  <GraduationCap className="w-7 h-7 text-[#64dfdf]" />
                  <h4 className="text-base font-black text-white">교육환경 우수 (학세권)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    반경 500m 내 초·중·고교 위치, 도봉초 도보 통학 약 5분, 봉곡동·도량동 학원가 밀집으로 안심 교육
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
                  <MapPin className="w-7 h-7 text-emerald-400" />
                  <h4 className="text-base font-black text-white">편의시설 접근성</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    G7스퀘어, 하나로마트, 도량동 상권 등 500m 내 풍부한 쇼핑·생활 편의시설 이용 용이
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
                  <Trees className="w-7 h-7 text-green-400" />
                  <h4 className="text-base font-black text-white">주거 쾌적성 (에코라이프)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    평성산 등산로 직통 이용 가능, 금오산 직접 조망권(일부세대)을 품은 힐링 자연 환경
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
                  <Car className="w-7 h-7 text-amber-400" />
                  <h4 className="text-base font-black text-white">교통망 우수</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    경부고속도로 북구미IC 진입 초근접, 야은로 및 송선로를 통한 구미 전역 사통팔달 쾌속 연결
                  </p>
                </div>
              </div>

              {/* 영화 '파묘' 풍수 자문위원 전항수 원장의 풍수지리 명당 감정서 (Page 5, 6) */}
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">GEOMANTIC CERTIFICATION</span>
                    <h4 className="text-xl sm:text-2xl font-black text-amber-200">
                      "이곳은 봉황이 찾아오는 귀한 터, 돈이 흘러들어오는 도심 속 명당입니다."
                    </h4>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <p className="font-extrabold text-white">한국풍수지리연구원장 전항수</p>
                    <p className="text-amber-400 text-[10px]">영화 '파묘' 풍수지리 자문위원 • 삼성물산 서초 사옥 컨설팅</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-1.5">
                    <span className="text-amber-300 font-bold block">1. 백두대간의 정기</span>
                    <p>수도산에서 금오지맥이 분맥되어 도달한 구미의 명산 금오산의 신성한 기운이 응집된 길지입니다.</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-1.5">
                    <span className="text-amber-300 font-bold block">2. 탐랑성의 귀한 기운</span>
                    <p>다재다능한 귀한 인재가 다출하는 성정으로, 문귀에 응하여 관록과 부귀가 대대손손 이어지는 터입니다.</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-1.5">
                    <span className="text-amber-300 font-bold block">3. 서류동거(西流東去) 풍수</span>
                    <p>물이 서쪽에서 동쪽으로 흐르는 청오경의 명당으로, 자연 부귀를 이루며 사업체 번창을 돕는 터입니다.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* [섹션 C] 현대건설 브랜드 파워 & H시리즈 특화설계 (Page 7, 8, 20, 21) */}
          {/* ------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'community') && (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#64dfdf]/20 text-[#64dfdf] font-black text-sm flex items-center justify-center border border-[#64dfdf]/30">03</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">현대건설 'H시리즈' 특화설계 & 하이엔드 커뮤니티</h3>
                </div>
                
                {/* 상단 우측: 3에 사진첨부 / 추가 버튼 (최대 10장) & 원본 확대보기 */}
                <div className="flex flex-wrap items-center gap-2">
                  {sectionPhotos[3]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalZoomData({ images: sectionPhotos[3], currentIndex: 0, title: "3. 현대건설 'H시리즈' 특화설계 & 하이엔드 커뮤니티 원본 사진", sectionNum: 3 })}
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="3번 사진 크게보기"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">원본 확대보기</span>
                      <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">{sectionPhotos[3].length}장</span>
                    </button>
                  )}
                  {isAdminLoggedIn && (
                    <button
                      type="button"
                      onClick={() => handleTriggerSectionUpload(3)}
                      disabled={sectionPhotos[3]?.length >= 10}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                        sectionPhotos[3]?.length >= 10
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                      title="3. 특화설계/커뮤니티 카탈로그 사진 등록/추가 (최대 10장, 소장님 전용)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {sectionPhotos[3]?.length > 0 
                          ? `3에 사진 추가 (${sectionPhotos[3].length}/10)` 
                          : '3에 사진 첨부 / 교체 (최대 10장)'}
                      </span>
                    </button>
                  )}
                  {isAdminLoggedIn && sectionPhotos[3]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearSectionPhotos(3)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="3번 사진 전체 비우기"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs font-bold text-[#64dfdf] bg-[#64dfdf]/10 px-3 py-1 rounded-full border border-[#64dfdf]/20 hidden lg:inline">구미 최초 특화</span>
                </div>
              </div>

              {/* 3번 카탈로그 사진 다중 갤러리 (최대 10장) */}
              {renderSectionPhotoGallery(3, "현대건설 'H시리즈' 특화설계 & 하이엔드 커뮤니티")}

              {/* 구미 최초 선보이는 H시리즈 4대 특화 (Page 21) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-b from-blue-900/40 to-slate-900 border border-blue-400/30 rounded-2xl p-5 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300">
                    <Waves className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-white">H 프라이빗 스위밍풀</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    근린생활시설 내 입주민 전용 혜택으로 프라이빗하게 온 가족이 여유롭게 즐기는 럭셔리 스위밍풀
                  </p>
                </div>

                <div className="bg-gradient-to-b from-emerald-900/40 to-slate-900 border border-emerald-400/30 rounded-2xl p-5 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                    <Car className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-white">H 오토존</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    날씨와 시간에 구애받지 않고 지하주차장에서 누리는 스마트홈 연동 입주민 전용 건식 세차 공간
                  </p>
                </div>

                <div className="bg-gradient-to-b from-teal-900/40 to-slate-900 border border-teal-400/30 rounded-2xl p-5 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300">
                    <Trees className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-white">H 아이숲</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    숲을 테마로 한 실내 놀이공간에 현대건설만의 공기청정 특화 기술을 더해 사계절 안심 청정 케어
                  </p>
                </div>

                <div className="bg-gradient-to-b from-amber-900/40 to-slate-900 border border-amber-400/30 rounded-2xl p-5 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
                    <Dog className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-white">H 위드펫</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    반려동물 맞춤 목욕 공간과 펫 드라이 시설을 완비하여 반려가족의 품격을 한 단계 높인 친화시설
                  </p>
                </div>
              </div>

              {/* 입주민 전용 럭셔리 커뮤니티 리스트 (Page 19, 20) */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  대단지 아파트에 버금가는 고품격 입주민 전용 커뮤니티
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">⛳ 스크린 골프연습장 & 퍼팅그린</div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">🏋️ 대형 피트니스 & GX룸</div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">🚿 남·녀 샤워실 & 사우나</div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">📚 개인독서실 & 스터디룸</div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">📖 작은도서관 (북카페)</div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">☕ 맘스스테이션 & 어린이집</div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">🧓 골든 라운지 (경로당)</div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">🚗 지상 주차 없는 공원형 단지</div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* [섹션 D] 타입별 세대 평면도 뷰어 (Page 22, 23, 24, 25, 26) */}
          {/* ------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'plan') && (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-500/30">04</span>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">세대별 평면 설계 (Unit Plan)</h3>
                    <p className="text-xs text-slate-400">원하시는 타입을 클릭하시면 평면 특징과 설계를 상세히 확인하실 수 있습니다.</p>
                  </div>
                </div>
                
                {/* 상단 우측: 4에 사진첨부 / 추가 버튼 (최대 10장) & 타입 선택 버튼바 */}
                <div className="flex flex-wrap items-center gap-2">
                  {sectionPhotos[4]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalZoomData({ images: sectionPhotos[4], currentIndex: 0, title: '4. 세대 평면도(84~162P) 카탈로그 원본 사진', sectionNum: 4 })}
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="4번 사진 크게보기"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">원본 확대보기</span>
                      <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">{sectionPhotos[4].length}장</span>
                    </button>
                  )}
                  {isAdminLoggedIn && (
                    <button
                      type="button"
                      onClick={() => handleTriggerSectionUpload(4)}
                      disabled={sectionPhotos[4]?.length >= 10}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                        sectionPhotos[4]?.length >= 10
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                      title="4. 세대 평면도 카탈로그 사진 등록/추가 (최대 10장, 소장님 전용)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {sectionPhotos[4]?.length > 0 
                          ? `4에 사진 추가 (${sectionPhotos[4].length}/10)` 
                          : '4에 사진 첨부 / 교체 (최대 10장)'}
                      </span>
                    </button>
                  )}
                  {isAdminLoggedIn && sectionPhotos[4]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearSectionPhotos(4)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="4번 사진 전체 비우기"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* 타입 선택 버튼바 (84A, 84B, 114, 132, 162 및 사진 등록 현황 배지) */}
                  {(['84A', '84B', '114', '132', '162'] as const).map(type => {
                    const count = planPhotos[type]?.length || 0;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedPlan(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                          selectedPlan === type 
                            ? 'bg-indigo-500 text-white shadow-md scale-105 ring-2 ring-indigo-400/50' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <span>{type}형 {type === '132' || type === '162' ? '(펜트)' : ''}</span>
                        {count > 0 && (
                          <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black" title={`${type}형 평면도 ${count}장 등록됨`}>
                            {count}장
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4번 카탈로그 사진 다중 갤러리 (최대 10장) */}
              {renderSectionPhotoGallery(4, '세대별 평면 설계 (Unit Plan)')}

              {/* 선택된 평면도 상세 설명 & 고화질 평면도 사진 첨부/뷰어 카드 */}
              {selectedPlan === '84A' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-black/30 p-6 sm:p-8 rounded-2xl border border-white/10">
                  <div className="space-y-4">
                    <div className="inline-block bg-amber-400/20 text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-400/30">
                      가장 인기 높은 대표 평면 • 총 264세대 (53.8%)
                    </div>
                    <h4 className="text-2xl sm:text-3xl font-black text-white">84A 타입 | 4Bay 맞통풍 판상형 구조</h4>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      주방 대형창호와 거실 맞통풍으로 극대화된 쾌적성! 
                      H 다이닝누크 특화설계, 룸인룸 등 라이프스타일에 맞춘 다양한 평면 선택 가능
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">전용면적</span>
                        <span className="text-sm font-black text-white">84.80㎡ (25.65평)</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">공급면적</span>
                        <span className="text-sm font-black text-white">109.07㎡ (33.00평)</span>
                      </div>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                      <li>✓ 침실3 룸인룸 (3연동 슬라이딩도어 + 붙박이장/입식파우더 특화)</li>
                      <li>✓ 현관 대형 펜트리 창고 및 드레스룸 풍부한 수납공간 확보</li>
                      <li>✓ 4Room or 알파룸 구조 선택 가능</li>
                    </ul>
                  </div>
                  
                  {/* 84A형 세대 평면도 사진 첨부 및 고화질 뷰어 */}
                  {renderUnitPlanVisualBox(
                    '84A',
                    '4BAY UNIT PLAN DIAGRAM',
                    '84A 4Bay 맞통풍 판상형 (3R, 2B + 알파룸)',
                    '채광과 통풍이 완벽히 조화된 베스트셀러 타입',
                    'text-amber-300'
                  )}
                </div>
              )}

              {selectedPlan === '84B' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-black/30 p-6 sm:p-8 rounded-2xl border border-white/10">
                  <div className="space-y-4">
                    <div className="inline-block bg-blue-400/20 text-blue-300 text-xs font-black px-3 py-1 rounded-full border border-blue-400/30">
                      40평형대 같은 공간감 • 총 112세대 (22.8%)
                    </div>
                    <h4 className="text-2xl sm:text-3xl font-black text-white">84B 타입 | 확장형 와이드 거실 & 정남향 배치</h4>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      지금까지 30평형대에서 느껴보지 못한 차원이 다른 개방감! 
                      알파룸 거실 확장 옵션으로 40평형대 수준의 압도적인 거실 크기 실현.
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">전용면적</span>
                        <span className="text-sm font-black text-white">84.98㎡ (25.71평)</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">공급면적</span>
                        <span className="text-sm font-black text-white">110.08㎡ (33.30평)</span>
                      </div>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                      <li>✓ 정남향 금오산 특급 조망권 설계</li>
                      <li>✓ 미세먼지 특화 에어샤워 시스템 연동</li>
                      <li>✓ 알파룸 독립 공간 또는 거실 통합 확장 자유 선택</li>
                    </ul>
                  </div>

                  {/* 84B형 세대 평면도 사진 첨부 및 고화질 뷰어 */}
                  {renderUnitPlanVisualBox(
                    '84B',
                    'WIDE LIVING ROOM PLAN',
                    '84B 탑상형 와이드 거실 구조 (3R, 2B + 알파룸)',
                    '정남향 채광과 광폭 거실이 주는 여유로운 휴식',
                    'text-blue-300'
                  )}
                </div>
              )}

              {selectedPlan === '114' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-black/30 p-6 sm:p-8 rounded-2xl border border-white/10">
                  <div className="space-y-4">
                    <div className="inline-block bg-purple-400/20 text-purple-300 text-xs font-black px-3 py-1 rounded-full border border-purple-400/30">
                      품격 높은 대형 평형 • 총 108세대 (22.0%)
                    </div>
                    <h4 className="text-2xl sm:text-3xl font-black text-white">114 타입 | 대형평형 프리미엄 마감재 & 주방 특화</h4>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      1군 브랜드 힐스테이트답게 명품 주거 시스템 완비! 
                      알파룸을 포함한 4Room 구조로 침실 공간의 여유와 수납 극대화.
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">전용면적</span>
                        <span className="text-sm font-black text-white">114.87㎡ (34.75평)</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">공급면적</span>
                        <span className="text-sm font-black text-white">146.93㎡ (44.45평)</span>
                      </div>
                    </div>
                  </div>

                  {/* 114형 세대 평면도 사진 첨부 및 고화질 뷰어 */}
                  {renderUnitPlanVisualBox(
                    '114',
                    'LUXURY 4BAY PLAN',
                    '114 대형 판상형 (4R, 2B + 알파룸)',
                    '주방 마감재 고급화 및 광폭 팬트리 수납',
                    'text-purple-300'
                  )}
                </div>
              )}

              {(selectedPlan === '132' || selectedPlan === '162') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-black/30 p-6 sm:p-8 rounded-2xl border border-white/10">
                  <div className="space-y-4">
                    <div className="inline-block bg-amber-400/20 text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-400/30">
                      상위 1%만을 위한 하이엔드 테라스 펜트하우스
                    </div>
                    <h4 className="text-2xl sm:text-3xl font-black text-white">
                      {selectedPlan} 펜트하우스 | 3개 이상 테라스 공간
                    </h4>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      현관 2개소, 독립 수납공간 多! 공간 활용도 극대화 및 최고층 파노라마 뷰를 단독으로 누리는 희소 가치.
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">공급 세대</span>
                        <span className="text-sm font-black text-amber-300">{selectedPlan === '132' ? '단 5세대' : '단 2세대'}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400 block font-bold">공급면적</span>
                        <span className="text-sm font-black text-white">{selectedPlan === '132' ? '52.56평' : '64.56평'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 132/162 펜트하우스 세대 평면도 사진 첨부 및 고화질 뷰어 */}
                  {renderUnitPlanVisualBox(
                    selectedPlan,
                    'PENTHOUSE TERRACE PLAN',
                    `${selectedPlan} 펜트하우스 테라스 특화 (H마스터룸 설계)`,
                    '구미 도심과 금오산 능선을 품은 최상층 독점 조망',
                    'text-amber-300'
                  )}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* [섹션 E] 분양조건 & 청약/계약 일정표 (Page 30, 31) */}
          {/* ------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'benefit') && (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 font-black text-sm flex items-center justify-center border border-red-500/30">05</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">파격 분양조건 & 계약 일정</h3>
                </div>
                
                {/* 상단 우측: 5에 사진첨부 / 추가 버튼 (최대 10장) & 원본 확대보기 */}
                <div className="flex flex-wrap items-center gap-2">
                  {sectionPhotos[5]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalZoomData({ images: sectionPhotos[5], currentIndex: 0, title: '5. 분양조건 & 일정 카탈로그 원본 사진', sectionNum: 5 })}
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="5번 사진 크게보기"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">원본 확대보기</span>
                      <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">{sectionPhotos[5].length}장</span>
                    </button>
                  )}
                  {isAdminLoggedIn && (
                    <button
                      type="button"
                      onClick={() => handleTriggerSectionUpload(5)}
                      disabled={sectionPhotos[5]?.length >= 10}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                        sectionPhotos[5]?.length >= 10
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                      title="5. 분양조건/일정 카탈로그 사진 등록/추가 (최대 10장, 소장님 전용)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {sectionPhotos[5]?.length > 0 
                          ? `5에 사진 추가 (${sectionPhotos[5].length}/10)` 
                          : '5에 사진 첨부 / 교체 (최대 10장)'}
                      </span>
                    </button>
                  )}
                  {isAdminLoggedIn && sectionPhotos[5]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearSectionPhotos(5)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="5번 사진 전체 비우기"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 hidden lg:inline">특별 혜택 진행 중</span>
                </div>
              </div>

              {/* 5번 카탈로그 사진 다중 갤러리 (최대 10장) */}
              {renderSectionPhotoGallery(5, '파격 분양조건 & 계약 일정')}

              {/* 4대 안심 분양 조건 (Page 30) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">01</div>
                  <h4 className="text-base font-black text-white">계약금 부담 NO!</h4>
                  <p className="text-xl font-black text-amber-300">계약금 5%</p>
                  <p className="text-[11px] text-slate-400">초기 자금 부담을 획기적으로 낮췄습니다.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">02</div>
                  <h4 className="text-base font-black text-white">중도금 이자 NO!</h4>
                  <p className="text-xl font-black text-emerald-300">60% 전액 무이자</p>
                  <p className="text-[11px] text-slate-400">금리 인상 걱정 없이 안심 계약 가능</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">03</div>
                  <h4 className="text-base font-black text-white">추가 부담 NO!</h4>
                  <p className="text-xl font-black text-blue-300">입주시까지 0원</p>
                  <p className="text-[11px] text-slate-400">입주시까지 추가 부담금이 전혀 없습니다.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">04</div>
                  <h4 className="text-base font-black text-white">제한 사항 NO!</h4>
                  <p className="text-xl font-black text-purple-300">전매제한 없음</p>
                  <p className="text-[11px] text-slate-400">재당첨제한 X, 무제한 전매 가능</p>
                </div>
              </div>

              {/* 공식 분양 일정표 (Page 31) */}
              <div className="bg-black/30 rounded-2xl p-6 border border-white/10 space-y-4">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  힐스테이트 구미더퍼스트 주요 분양 타임라인
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-amber-400 text-xs font-bold">특별공급</span>
                    <p className="text-sm sm:text-base font-black text-white">7월 22일(월)</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-orange-400 text-xs font-bold">1순위 청약</span>
                    <p className="text-sm sm:text-base font-black text-white">7월 23일(화)</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-emerald-400 text-xs font-bold">2순위 청약</span>
                    <p className="text-sm sm:text-base font-black text-white">7월 24일(수)</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-blue-400 text-xs font-bold">당첨자 발표</span>
                    <p className="text-sm sm:text-base font-black text-white">7월 31일(수)</p>
                  </div>
                  <div className="bg-amber-500/20 p-4 rounded-xl border border-amber-400/30 space-y-1">
                    <span className="text-amber-300 text-xs font-bold">정당계약</span>
                    <p className="text-sm sm:text-base font-black text-amber-200">8월 12일 ~ 14일</p>
                  </div>
                </div>
              </div>

              {/* 태왕공인중개사 특별 상담 문의 안내 */}
              <div className="bg-gradient-to-r from-[#0B2545] via-[#113866] to-[#0B2545] border border-white/15 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div className="space-y-1">
                  <span className="text-[#64dfdf] text-xs font-black uppercase tracking-widest">SPECIAL CONSULTING</span>
                  <h4 className="text-lg sm:text-2xl font-black text-white">
                    힐스테이트 구미더퍼스트 로얄동·호수 및 잔여세대 즉시 상담
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium">
                    태왕공인중개사사무소에서 소장님이 직접 최신 잔여세대 정보와 최적의 호실을 친절히 안내해 드립니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <a
                    href="tel:010-7590-0111"
                    className="bg-[#64dfdf] hover:bg-[#52c7c7] text-[#0a1128] font-black px-6 py-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>소장님 직통 010-7590-0111</span>
                  </a>
                  <a
                    href="#direct-consulting-section"
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-xl text-xs sm:text-sm border border-white/15 hover:scale-105 active:scale-95 transition-all"
                  >
                    1:1 상담신청 남기기
                  </a>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* [1 배치도-전경.png 전체화면 고화질 라이트박스 팝업] */}
      {isZoomModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 backdrop-blur-xl animate-in fade-in duration-200 select-none"
          onClick={() => setIsZoomModalOpen(false)}
        >
          {/* Modal Header */}
          <div className="w-full max-w-7xl flex items-center justify-between pb-3 px-2 border-b border-white/20 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
              <div>
                <h4 className="text-white font-black text-sm sm:text-lg">
                  힐스테이트 구미더퍼스트 • 1 배치도-전경 (고화질 원본)
                </h4>
                <p className="text-[11px] text-[#64dfdf]">
                  1 배치도-전경.png | 봉곡 59-1번지 현대건설 랜드마크 마스터플랜
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdminLoggedIn && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                  title="사진 변경 (관리자 전용)"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>사진 변경</span>
                </button>
              )}
              <button 
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="bg-white/10 hover:bg-white/25 text-white p-2 rounded-xl transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Image Body */}
          <div 
            className="w-full flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={masterplanImage} 
              alt="힐스테이트 구미더퍼스트 1 배치도-전경 원본 확대" 
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-white/10"
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="w-full max-w-7xl pt-2 px-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span>마우스 휠이나 제스처로 확대할 수 있으며, 바깥을 클릭하시면 닫힙니다.</span>
            <button 
              type="button"
              onClick={() => setIsZoomModalOpen(false)}
              className="text-white hover:text-amber-300 font-bold underline"
            >
              닫기
            </button>
          </div>
        </div>
      )}
      {/* [카탈로그 1~5 섹션 원본 사진 다중 뷰어 전체화면 고화질 라이트박스 팝업] */}
      {modalZoomData && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 backdrop-blur-xl animate-in fade-in duration-200 select-none"
          onClick={() => setModalZoomData(null)}
        >
          {/* Modal Header */}
          <div className="w-full max-w-7xl flex items-center justify-between pb-3 px-2 border-b border-white/20 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
              <div>
                <h4 className="text-white font-black text-sm sm:text-lg flex items-center gap-2">
                  <span>{modalZoomData.title}</span>
                  <span className="bg-amber-400/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    {modalZoomData.currentIndex + 1} / {modalZoomData.images.length}
                  </span>
                </h4>
                <p className="text-[11px] text-[#64dfdf]">
                  힐스테이트 구미더퍼스트 공식 카탈로그 안내장 (고화질 원본)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdminLoggedIn && modalZoomData.sectionNum && modalZoomData.images.length < 10 && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const sNum = modalZoomData.sectionNum!;
                    setModalZoomData(null);
                    handleTriggerSectionUpload(sNum);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                  title="사진 추가 등록 (관리자 전용)"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ 사진 추가</span>
                </button>
              )}
              <button 
                type="button"
                onClick={() => setModalZoomData(null)}
                className="bg-white/10 hover:bg-white/25 text-white p-2 rounded-xl transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Image Body with Prev / Next Navigation Arrows */}
          <div 
            className="relative w-full flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden max-h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Nav Arrow */}
            {modalZoomData.images.length > 1 && (
              <button
                type="button"
                onClick={() => setModalZoomData(prev => prev ? {
                  ...prev,
                  currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
                } : null)}
                className="absolute left-2 sm:left-6 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all hover:scale-110"
                title="이전 사진 (좌측 화살표)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Active Image */}
            <img 
              src={modalZoomData.images[modalZoomData.currentIndex]} 
              alt={`${modalZoomData.title} - ${modalZoomData.currentIndex + 1}`} 
              className="max-w-full max-h-[74vh] object-contain rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-white/10"
            />

            {/* Right Nav Arrow */}
            {modalZoomData.images.length > 1 && (
              <button
                type="button"
                onClick={() => setModalZoomData(prev => prev ? {
                  ...prev,
                  currentIndex: (prev.currentIndex + 1) % prev.images.length
                } : null)}
                className="absolute right-2 sm:right-6 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all hover:scale-110"
                title="다음 사진 (우측 화살표)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Modal Bottom Thumbnail Strip & Controls */}
          <div 
            className="w-full max-w-7xl pt-2 px-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Thumbnail Row */}
            {modalZoomData.images.length > 1 ? (
              <div className="flex items-center gap-2 overflow-x-auto max-w-2xl py-1">
                {modalZoomData.images.map((imgUrl, thumbIdx) => (
                  <button
                    key={thumbIdx}
                    type="button"
                    onClick={() => setModalZoomData(prev => prev ? { ...prev, currentIndex: thumbIdx } : null)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      modalZoomData.currentIndex === thumbIdx
                        ? 'border-amber-400 scale-105 shadow-md'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`썸네일 ${thumbIdx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <span>마우스 휠이나 제스처로 확대할 수 있으며, 바깥을 클릭하시면 닫힙니다.</span>
            )}

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-slate-300 font-bold">
                총 {modalZoomData.images.length}장 중 {modalZoomData.currentIndex + 1}번째 사진
              </span>
              <button 
                type="button"
                onClick={() => setModalZoomData(null)}
                className="text-white hover:text-amber-300 font-bold underline px-2 py-1"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
