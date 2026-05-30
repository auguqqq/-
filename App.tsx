
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import JSZip from 'jszip';
import { 
  BookOpen, 
  BarChart2, 
  Lightbulb, 
  Search, 
  Layout, 
  Lock, 
  Unlock, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Type,
  Library,
  Save,
  History as HistoryIcon,
  Download,
  Upload,
  Sun,
  Moon,
  CheckCircle2,
  Sparkles,
  FileOutput,
  Feather,
  PenTool,
  Headphones,
  Crown,
  Menu,
  X,
} from 'lucide-react';
import Editor from './components/Editor';
import Bookshelf from './components/Bookshelf';
import Statistics from './components/Statistics';
import Outline from './components/Outline';
import InspirationView from './components/InspirationView';
import SearchView from './components/SearchView';
import BlackHouseOverlay from './components/BlackHouseOverlay';
import VersionHistory from './components/VersionHistory';
import SettingsView from './components/SettingsView';
import AmbienceView from './components/AmbienceView';
import PaymentModal from './components/PaymentModal';
import OnboardingTour, { TourStep } from './components/OnboardingTour';
import WelcomeScreen from './components/WelcomeScreen'; 
import { ViewMode, WritingStats, Book, Chapter, Inspiration, BlackHouseConfig, ChapterVersion, AppSettings, ChatMessage, SearchState } from './types';

const STORAGE_KEY = 'inkflow_studio_v7';
const GLOBAL_TOUR_KEY = 'inkflow_tour_global_v11_soul'; 
const WELCOME_SEEN_KEY = 'inkflow_welcome_seen_v10'; 

// Simplified Global Steps (Removed generic welcome, focused on UI)
const GLOBAL_STEPS: TourStep[] = [
  {
    target: '#nav-bookshelf',
    title: '📚 书架管理',
    content: '您的创作大本营。支持长篇连载与短篇文集管理，所有数据本地加密存储。',
    placement: 'right'
  },
  {
    target: '#nav-settings',
    title: '⚙️ AI 配置',
    content: '关键一步：请先在此配置 AI 模型 (Gemini/DeepSeek) 并调整您喜欢的主题配色。',
    placement: 'right'
  },
  {
    target: '#btn-create-empty',
    title: '🚀 开始创作',
    content: '一切就绪。点击这里，选择长篇或短篇结构，开启您的第一部作品。',
    placement: 'bottom'
  }
];

const countActualChars = (text: string): number => {
  if (!text) return 0;
  const matches = text.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g);
  return matches ? matches.length : 0;
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

const NavButton = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick, 
  disabled = false,
  isDanger = false,
  isPro = false,
  compact = false,
  id
}: { icon: any, label: string, isActive?: boolean, onClick: () => void, disabled?: boolean, isDanger?: boolean, isPro?: boolean, compact?: boolean, id?: string }) => (
  <button
    id={id}
    onClick={onClick}
    disabled={disabled}
    className={`
      relative group flex items-center justify-center rounded-2xl transition-all duration-300 ease-out
      ${compact ? 'w-10 h-10' : 'w-12 h-12'}
      ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
      ${isActive 
        ? (isDanger 
            ? 'bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(248,113,113,0.1)] ring-1 ring-red-500/20' 
            : 'bg-[#2c2c2e] text-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.2)] ring-1 ring-white/5')
        : 'text-[#8e8e93] hover:text-white hover:bg-[#2c2c2e]'
      }
    `}
  >
    <Icon size={compact ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300" />
    
    {isPro && (
      <div className="absolute top-0 right-0 -mr-1 -mt-1 bg-amber-500 text-white rounded-full p-0.5 border border-[#1c1c1e]">
        <Crown size={8} fill="currentColor" />
      </div>
    )}

    {/* Minimalist Tooltip (Desktop Only) */}
    <span className="hidden md:block absolute left-16 bg-[#2c2c2e] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-8px] group-hover:translate-x-0 pointer-events-none z-50 whitespace-nowrap shadow-xl">
      {label}
    </span>
    
    {isActive && !isDanger && (
      <span className="absolute inset-0 rounded-2xl bg-amber-500/5 pointer-events-none" />
    )}
  </button>
);

const migrateBooks = (books: any[]): Book[] => {
  if (!Array.isArray(books)) return [];
  return books.map(book => ({
    ...book,
    type: book.type || 'novel',
    subGenre: book.subGenre || 'other',
    coverColor: book.coverColor || 'default',
    chapters: Array.isArray(book.chapters) ? book.chapters : [],
    aiChatLogs: Array.isArray(book.aiChatLogs) ? book.aiChatLogs : [],
    searchHistory: Array.isArray(book.searchHistory) ? book.searchHistory : [],
  }));
};

const App: React.FC = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.ai) {
        parsed.ai = {
          provider: 'gemini',
          apiKey: '',
          baseUrl: '',
          model: 'gemini-2.0-flash'
        };
      }
      return { ...parsed, isPro: parsed.isPro || false, proTrialStartedAt: parsed.proTrialStartedAt };
    }
    return {
      fontSize: 20,
      lineHeight: 1.8,
      theme: 'cream',
      fontFamily: 'serif',
      autoSaveInterval: 10,
      autoFormatOnSave: false,
      ai: {
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        model: 'gemini-2.0-flash'
      },
      isPro: false
    };
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_books`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return migrateBooks(parsed);
      } catch (e) {
        console.error("Failed to parse books from local storage", e);
        return [];
      }
    }
    return [];
  });

  const [currentBookId, setCurrentBookId] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_currentBookId`) || '';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedBooksStr = localStorage.getItem(`${STORAGE_KEY}_books`);
    const hasBooks = savedBooksStr ? JSON.parse(savedBooksStr).length > 0 : false;
    return hasBooks ? ViewMode.Editor : ViewMode.Bookshelf;
  });

  const [rightSidebarMode, setRightSidebarMode] = useState<ViewMode>(ViewMode.Outline);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedBooksStr = localStorage.getItem(`${STORAGE_KEY}_books`);
    const hasBooks = savedBooksStr ? JSON.parse(savedBooksStr).length > 0 : false;
    return hasBooks;
  });
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isSettingUpBlackHouse, setIsSettingUpBlackHouse] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [trialStatus, setTrialStatus] = useState<'available' | 'active' | 'expired'>('available');
  
  // FIX: Initialize state synchronously from LocalStorage to prevent flash
  // Direct logic: If KEY not present -> show welcome.
  const [showWelcome, setShowWelcome] = useState(() => {
      const seen = localStorage.getItem(WELCOME_SEEN_KEY);
      return !seen;
  });
  
  // Tour logic: Disabled as per user request (redundant flashing card)
  const [startGlobalTour, setStartGlobalTour] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeTimerRef = useRef<any>(null);

  // New State for Marker Navigation
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);

  // If view mode changes to bookshelf and we haven't seen tour, maybe trigger it
  useEffect(() => {
      if (!showWelcome && viewMode === ViewMode.Bookshelf) {
          // Check if tour already seen to avoid unnecessary render
          const hasSeen = localStorage.getItem(GLOBAL_TOUR_KEY);
          if (!hasSeen) {
              setStartGlobalTour(true);
          }
      }
  }, [viewMode, showWelcome]);

  const handleWelcomeDismiss = () => {
      localStorage.setItem(WELCOME_SEEN_KEY, 'true');
      setShowWelcome(false);
  };

  const [inspirations, setInspirations] = useState<Inspiration[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_inspirations`);
    return saved ? JSON.parse(saved) : [];
  });

  const [blackHouse, setBlackHouse] = useState<BlackHouseConfig>({
    active: false,
    type: 'word',
    target: 1000,
    currentProgress: 0,
    lastTotalCount: 0
  });
  
  const [stats, setStats] = useState<WritingStats>(() => {
    const defaultStats = {
      dailyCount: 0,
      weeklyCount: [0, 0, 0, 0, 0, 0, 0],
      speed: 0,
      startTime: Date.now(),
      writingHistory: {}
    };
    const saved = localStorage.getItem(`${STORAGE_KEY}_stats`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultStats, ...parsed, writingHistory: parsed.writingHistory || {} };
      } catch (e) {
        return defaultStats;
      }
    }
    return defaultStats;
  });

  const currentBook = useMemo(() => books.find(b => b.id === currentBookId) || books[0], [books, currentBookId]);
  
  const currentChapter = useMemo(() => 
    currentBook?.chapters.find(c => c.id === currentBook.currentChapterId) || currentBook?.chapters[0]
  , [currentBook]);

  const currentChapterChars = useMemo(() => currentChapter ? countActualChars(currentChapter.content) : 0, [currentChapter]);
  const totalBookChars = useMemo(() => {
    return currentBook ? currentBook.chapters.reduce((sum, ch) => sum + countActualChars(ch.content), 0) : 0;
  }, [currentBook]);

  const [isSystemDark, setIsSystemDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (books.length === 0 && viewMode !== ViewMode.Bookshelf) {
        setViewMode(ViewMode.Bookshelf);
    }
  }, [books.length, viewMode]);

  useEffect(() => {
    if (appSettings.isPro) {
        setTrialStatus('active');
        return;
    }
    if (!appSettings.proTrialStartedAt) {
        setTrialStatus('available');
    } else {
        const elapsed = Date.now() - appSettings.proTrialStartedAt;
        const limit = 15 * 60 * 1000;
        if (elapsed < limit) {
            setTrialStatus('active');
        } else {
            setTrialStatus('expired');
        }
    }
  }, [appSettings.isPro, appSettings.proTrialStartedAt]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // FIX: Robust Pro Action Logic
  const handleProAction = (callback: () => void) => {
    const isPro = appSettings.isPro;
    // Check trial logic inside function to get latest state
    const elapsed = Date.now() - (appSettings.proTrialStartedAt || 0);
    const isTrialActive = appSettings.proTrialStartedAt && elapsed < 15 * 60 * 1000;

    if (isPro || isTrialActive) {
        callback();
    } else {
        // Only set to expired if they actually started it and it ran out
        if (appSettings.proTrialStartedAt) {
             setTrialStatus('expired');
        }
        setShowPaymentModal(true);
    }
  };

  const startTrial = () => {
    setAppSettings(prev => ({ ...prev, proTrialStartedAt: Date.now() }));
    setShowPaymentModal(false);
    setRightSidebarMode(ViewMode.Ambience);
    setSidebarOpen(true);
  };

  const effectiveTheme = useMemo(() => {
    if (appSettings.theme === 'system') return isSystemDark ? 'dark' : 'white';
    return appSettings.theme;
  }, [appSettings.theme, isSystemDark]);

  const createSnapshot = useCallback(() => {
    if (!currentBook || !currentChapter) return;

    const version: ChapterVersion = {
      id: `ver-${Date.now()}`,
      timestamp: Date.now(),
      content: currentChapter.content,
      title: currentChapter.title,
      wordCount: countActualChars(currentChapter.content)
    };

    setBooks(prev => prev.map(b => {
      if (b.id === currentBookId) {
        return {
          ...b,
          chapters: b.chapters.map(c => {
            if (c.id === b.currentChapterId) {
              const versions = [version, ...(c.versions || [])].slice(200);
              return { ...c, versions };
            }
            return c;
          })
        };
      }
      return b;
    }));
  }, [currentBookId, currentBook, currentChapter]);

  const prevBooksLen = useRef(books.length);
  useEffect(() => {
    if (books.length !== prevBooksLen.current) {
        localStorage.setItem(`${STORAGE_KEY}_books`, JSON.stringify(books));
        prevBooksLen.current = books.length;
        setLastSaved(Date.now());
    }
  }, [books]);

  useEffect(() => {
    const saveToDisk = () => {
      if (!isDirty) return;
      if (currentBook) createSnapshot();
      localStorage.setItem(`${STORAGE_KEY}_books`, JSON.stringify(books));
      localStorage.setItem(`${STORAGE_KEY}_currentBookId`, currentBookId);
      localStorage.setItem(`${STORAGE_KEY}_inspirations`, JSON.stringify(inspirations));
      localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(appSettings));
      localStorage.setItem(`${STORAGE_KEY}_stats`, JSON.stringify(stats));
      setLastSaved(Date.now());
      setIsDirty(false);
    };
    const timer = setInterval(saveToDisk, appSettings.autoSaveInterval * 1000);
    return () => clearInterval(timer);
  }, [books, currentBookId, inspirations, appSettings, stats, isDirty, createSnapshot, currentBook]);

  
  const lastCharCountRef = useRef(currentChapterChars);
  useEffect(() => {
    lastCharCountRef.current = currentChapterChars;
  }, [currentBook?.currentChapterId]);

  const setChapterContent = (text: string, isComposing: boolean = false) => {
    setBooks(prev => prev.map(b => b.id === currentBookId ? {
      ...b,
      chapters: b.chapters.map(c => c.id === b.currentChapterId ? { ...c, content: text, lastModified: Date.now() } : c)
    } : b));
    
    setIsDirty(true);

    if (!isComposing) {
      const newCount = countActualChars(text);
      const diff = newCount - lastCharCountRef.current;
      
      if (diff > 0) {
        const today = getTodayKey();
        setStats(prev => ({
          ...prev,
          writingHistory: {
            ...prev.writingHistory,
            [today]: (prev.writingHistory?.[today] || 0) + diff
          }
        }));
      }
      
      lastCharCountRef.current = newCount;
      
      if (blackHouse.active && blackHouse.type === 'word') {
        const bhDiff = newCount - blackHouse.lastTotalCount;
        if (bhDiff > 0) {
          setBlackHouse(prev => ({
            ...prev,
            currentProgress: prev.currentProgress + bhDiff,
            lastTotalCount: newCount
          }));
        } else {
          setBlackHouse(prev => ({ ...prev, lastTotalCount: newCount }));
        }
      }
    }
  };

  const updateChapter = (chapterId: string, data: Partial<Chapter>) => {
    setBooks(prev => prev.map(b => {
      if (b.id === currentBookId) {
        return {
          ...b,
          chapters: b.chapters.map(c => c.id === chapterId ? { ...c, ...data } : c)
        };
      }
      return b;
    }));
    setIsDirty(true);
  };

  const setChapterTitle = (title: string) => {
    setIsDirty(true);
    setBooks(prev => prev.map(b => b.id === currentBookId ? {
      ...b,
      chapters: b.chapters.map(c => c.id === b.currentChapterId ? { ...c, title } : c)
    } : b));
  };

  const setChapterSynopsis = (synopsis: string) => {
    setIsDirty(true);
    setBooks(prev => prev.map(b => b.id === currentBookId ? {
      ...b,
      chapters: b.chapters.map(c => c.id === b.currentChapterId ? { ...c, synopsis } : c)
    } : b));
  };

  const setNextChapterSynopsis = (synopsis: string) => {
    setIsDirty(true);
    setBooks(prev => prev.map(b => {
      if (b.id === currentBookId) {
        const idx = b.chapters.findIndex(c => c.id === b.currentChapterId);
        if (idx !== -1 && idx < b.chapters.length - 1) {
          const nextChapters = [...b.chapters];
          nextChapters[idx + 1] = { ...nextChapters[idx + 1], synopsis };
          return { ...b, chapters: nextChapters };
        }
      }
      return b;
    }));
  };

  const updateCurrentBookField = (field: keyof Book, value: any) => {
      setBooks(prev => prev.map(b => b.id === currentBookId ? { ...b, [field]: value } : b));
      setIsDirty(true); 
  };

  const handleFinishBook = () => {
    setBooks(prev => prev.map(b => b.id === currentBookId ? { ...b, isFinished: true } : b));
    setIsDirty(true);
  };

  const addNextChapterAndNavigate = (synopsis: string) => {
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;
    
    const currentIndex = book.chapters.findIndex(c => c.id === book.currentChapterId);
    const hasNext = currentIndex !== -1 && currentIndex < book.chapters.length - 1;

    if (hasNext) {
      const nextId = book.chapters[currentIndex + 1].id;
      setNextChapterSynopsis(synopsis);
      setBooks(prev => prev.map(b => b.id === currentBookId ? { ...b, currentChapterId: nextId } : b));
    } else {
      const newId = `chapter-${Date.now()}`;
      const nextNum = book.chapters.length + 1;
      const isAnthology = book.type === 'anthology';
      const newTitle = isAnthology ? '新篇章' : `第 ${nextNum} 章`;

      const newChapter: Chapter = {
        id: newId,
        title: newTitle,
        content: '',
        synopsis: synopsis,
        lastModified: Date.now(),
        versions: []
      };
      setBooks(prev => prev.map(b => b.id === currentBookId ? { 
        ...b, 
        chapters: [...b.chapters, newChapter], 
        currentChapterId: newId 
      } : b));
    }
    setIsDirty(true);
  };

  // --- Universal Export Handler ---
  const handleExport = async (format: 'txt' | 'epub' | 'pdf' = 'txt') => {
      if (!currentBook) return;
      
      const doExport = async () => {
          if (format === 'txt') {
              const fullText = currentBook.chapters.map(c => `【${c.title}】\n\n${c.content}\n\n`).join('--- 分章线 ---\n\n');
              const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${currentBook.title}_全本.txt`;
              link.click();
              URL.revokeObjectURL(url);
          } else if (format === 'pdf') {
              // Generate Printer-Friendly HTML for PDF
              const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <title>${currentBook.title}</title>
                  <style>
                    body { font-family: "Noto Serif SC", serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
                    h1 { text-align: center; font-size: 32px; margin-bottom: 60px; page-break-before: always; }
                    .chapter { page-break-before: always; }
                    .chapter-title { font-size: 24px; font-weight: bold; margin-top: 50px; margin-bottom: 30px; text-align: center; }
                    p { line-height: 1.8; text-indent: 2em; margin-bottom: 1em; font-size: 18px; text-align: justify; }
                    @media print {
                        body { max-width: 100%; padding: 0; }
                    }
                  </style>
                </head>
                <body>
                  <h1>${currentBook.title}</h1>
                  ${currentBook.chapters.map(c => `
                    <div class="chapter">
                        <div class="chapter-title">${c.title}</div>
                        ${c.content.split('\n').filter(line => line.trim()).map(p => `<p>${p}</p>`).join('')}
                    </div>
                  `).join('')}
                  <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
                </body>
                </html>
              `;
              const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${currentBook.title}_打印版.html`;
              link.click();
              URL.revokeObjectURL(url);
          } else if (format === 'epub') {
              // Real EPUB Export using JSZip
              const zip = new JSZip();
              zip.file("mimetype", "application/epub+zip");
              
              zip.folder("META-INF")?.file("container.xml", `<?xml version="1.0"?>
                <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                    <rootfiles>
                        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                    </rootfiles>
                </container>`);

              const oebps = zip.folder("OEBPS");
              let manifestItems = '';
              let spineRefs = '';
              
              currentBook.chapters.forEach((c, i) => {
                  const filename = `chapter_${i + 1}.html`;
                  const content = `<?xml version="1.0" encoding="utf-8"?>
                    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
                    <html xmlns="http://www.w3.org/1999/xhtml">
                    <head><title>${c.title}</title></head>
                    <body>
                        <h2>${c.title}</h2>
                        ${c.content.split('\n').filter(l => l.trim()).map(p => `<p>${p}</p>`).join('')}
                    </body>
                    </html>`;
                  oebps?.file(filename, content);
                  manifestItems += `<item id="ch${i+1}" href="${filename}" media-type="application/xhtml+xml"/>\n`;
                  spineRefs += `<itemref idref="ch${i+1}"/>\n`;
              });

              const opfContent = `<?xml version="1.0" encoding="utf-8"?>
                <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
                    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
                        <dc:title>${currentBook.title}</dc:title>
                        <dc:language>zh-CN</dc:language>
                    </metadata>
                    <manifest>
                        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
                        ${manifestItems}
                    </manifest>
                    <spine toc="ncx">
                        ${spineRefs}
                    </spine>
                </package>`;
              oebps?.file("content.opf", opfContent);

              const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
                <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
                    <head><meta name="dtb:uid" content="urn:uuid:12345"/></head>
                    <docTitle><text>${currentBook.title}</text></docTitle>
                    <navMap>
                        ${currentBook.chapters.map((c, i) => `
                        <navPoint id="navPoint-${i+1}" playOrder="${i+1}">
                            <navLabel><text>${c.title}</text></navLabel>
                            <content src="chapter_${i+1}.html"/>
                        </navPoint>`).join('')}
                    </navMap>
                </ncx>`;
              oebps?.file("toc.ncx", ncxContent);

              const content = await zip.generateAsync({ type: "blob" });
              const url = URL.createObjectURL(content);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${currentBook.title}.epub`;
              link.click();
              URL.revokeObjectURL(url);
          }
      };

      // Pro Gate
      if (format !== 'txt') {
          handleProAction(doExport);
      } else {
          doExport();
      }
  };

  const sortedBooks = useMemo(() => {
    const unfinished = books.filter(b => !b.isFinished).sort((a, b) => b.createdAt - a.createdAt);
    const finished = books.filter(b => b.isFinished).sort((a, b) => b.createdAt - a.createdAt);
    return [...unfinished, ...finished];
  }, [books]);

  const handleFormat = useCallback(() => {
    setIsDirty(true);
    setBooks(prev => prev.map(b => b.id === currentBookId ? {
      ...b,
      chapters: b.chapters.map(c => {
        if (c.id === b.currentChapterId) {
          const formatted = c.content.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => '　　' + p)
            .join('\n\n');
          return { ...c, content: formatted, lastModified: Date.now() };
        }
        return c;
      })
    } : b));
  }, [currentBookId]);

  const startBlackHouse = (config: Partial<BlackHouseConfig>) => {
    if (!currentChapter) return;
    const currentTotal = countActualChars(currentChapter.content);
    setBlackHouse({
      active: true,
      type: config.type || 'word',
      target: config.target || 1000,
      currentProgress: 0,
      lastTotalCount: currentTotal,
      startTime: Date.now()
    });
    setIsSettingUpBlackHouse(false);
  };

  const exitBlackHouse = () => setBlackHouse(prev => ({ ...prev, active: false }));

  const navigateToChapter = (chapterId: string) => {
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;
    const targetChapter = book.chapters.find(c => c.id === chapterId);
    if (!targetChapter) return;

    if (blackHouse.active) {
      setBlackHouse(prev => ({
        ...prev,
        lastTotalCount: countActualChars(targetChapter.content)
      }));
    }

    setBooks(prev => prev.map(b => b.id === currentBookId ? { ...b, currentChapterId: chapterId } : b));
    setViewMode(ViewMode.Editor);
  };

  const toggleRightSidebar = (mode: ViewMode) => {
    if (viewMode !== ViewMode.Editor) {
      setViewMode(ViewMode.Editor);
      setRightSidebarMode(mode);
      setSidebarOpen(true);
      return;
    }

    if (mode === ViewMode.Ambience) {
        handleProAction(() => {
            if (!sidebarOpen) {
              setRightSidebarMode(mode);
              setSidebarOpen(true);
            } else if (rightSidebarMode === mode) {
              setSidebarOpen(false);
            } else {
              setRightSidebarMode(mode);
            }
        });
        return;
    }

    if (!sidebarOpen) {
      setRightSidebarMode(mode);
      setSidebarOpen(true);
    } else if (rightSidebarMode === mode) {
      setSidebarOpen(false);
    } else {
      setRightSidebarMode(mode);
    }
  };

  const themeClasses = { cream: 'bg-[#f8f5f0]', white: 'bg-white', dark: 'bg-[#1a1a1a]', green: 'bg-[#e8f5e9]' };
  const headerClasses = { cream: 'bg-white/80 border-gray-200 text-gray-800', white: 'bg-white/80 border-gray-200 text-gray-800', dark: 'bg-[#111] border-white/5 text-gray-200', green: 'bg-[#e8f5e9]/90 border-green-100 text-[#1b5e20]' };
  const sidebarClasses = effectiveTheme === 'dark' 
    ? 'bg-[#1c1c1e] md:border-white/5 text-gray-400' 
    : effectiveTheme === 'green' 
        ? 'bg-[#e8f5e9] border-green-100 text-emerald-800' 
        : 'bg-white border-gray-200 text-gray-800';

  const isInitialLoad = books.length === 0;

  return (
    <div className={`flex flex-col md:flex-row h-screen w-full transition-colors duration-1000 overflow-hidden font-sans ${themeClasses[effectiveTheme]}`}>
      
      {/* 1. Welcome Screen (First Impression) */}
      {showWelcome && <WelcomeScreen onDismiss={handleWelcomeDismiss} />}

      {/* Sidebar */}
      <nav className="hidden md:flex w-[88px] h-full flex-col items-center py-8 gap-y-4 z-50 shrink-0 transition-all duration-500 ease-in-out bg-[#1c1c1e] shadow-[4px_0_24px_rgba(0,0,0,0.15)] border-r border-white/5 overflow-visible">
        <div className="flex flex-col items-center mb-4 shrink-0">
            <div 
              className="w-10 h-10 text-white/90 flex items-center justify-center hover:text-white hover:scale-110 transition-all cursor-pointer active:scale-95 duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" 
              onClick={() => { setViewMode(ViewMode.Bookshelf); setSidebarOpen(false); }}
              title="笔纪"
            >
               <Feather size={28} strokeWidth={2.5} />
            </div>
        </div>
        <div className="flex flex-col items-center gap-y-3 w-full shrink-0">
          <NavButton id="nav-bookshelf" icon={Library} label="书架" isActive={viewMode === ViewMode.Bookshelf} onClick={() => { if(!blackHouse.active) { setViewMode(ViewMode.Bookshelf); setSidebarOpen(false); } }} disabled={blackHouse.active} />
          <NavButton id="nav-editor" icon={PenTool} label="创作" isActive={viewMode === ViewMode.Editor && !sidebarOpen} onClick={() => { if(currentBook) { setViewMode(ViewMode.Editor); setSidebarOpen(false); }}} disabled={!currentBook} />
          
          {viewMode === ViewMode.Editor && (
            <>
              <NavButton id="nav-outline" icon={Layout} label="大纲" isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Outline} onClick={() => currentBook && toggleRightSidebar(ViewMode.Outline)} disabled={!currentBook} />
              
              <NavButton icon={HistoryIcon} label="版本" isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.History} onClick={() => currentBook && toggleRightSidebar(ViewMode.History)} disabled={!currentBook} />
              
              <div className="h-px w-8 bg-white/10 my-1 shrink-0" />

              <NavButton icon={Lightbulb} label="灵感" isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Inspiration} onClick={() => currentBook && toggleRightSidebar(ViewMode.Inspiration)} disabled={!currentBook} />
              <NavButton icon={Search} label="检索" isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Search} onClick={() => currentBook && toggleRightSidebar(ViewMode.Search)} disabled={!currentBook} />
              <NavButton icon={BarChart2} label="统计" isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Statistics} onClick={() => currentBook && toggleRightSidebar(ViewMode.Statistics)} disabled={!currentBook} />
            </>
          )}
        </div>
        
        <div className="flex-grow min-h-[20px]" />
        
        <div className="flex flex-col items-center gap-y-3 pb-4 shrink-0">
           <NavButton icon={Headphones} label="白噪音" isPro={true} isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Ambience} onClick={() => currentBook && toggleRightSidebar(ViewMode.Ambience)} disabled={!currentBook} />
           
           <div 
              className="relative group/theme flex items-center justify-center"
              onMouseEnter={() => {
                  if (themeTimerRef.current) clearTimeout(themeTimerRef.current);
                  setShowThemeMenu(true);
              }}
              onMouseLeave={() => {
                  themeTimerRef.current = setTimeout(() => setShowThemeMenu(false), 300);
              }}
           >
              <NavButton 
                  icon={effectiveTheme === 'dark' ? Sun : Moon} 
                  label="主题" 
                  onClick={() => {
                      setAppSettings(prev => {
                          if (prev.theme === 'dark') {
                              return { ...prev, theme: prev.previousTheme || 'cream' };
                          } else {
                              return { ...prev, theme: 'dark', previousTheme: prev.theme };
                          }
                      });
                  }} 
              />
              
              {/* Theme Menu Popup */}
              <div className={`
                  absolute left-14 top-1/2 -translate-y-1/2 bg-white dark:bg-[#2c2c2e] p-2 rounded-2xl shadow-xl 
                  flex gap-2 z-[100] transition-all duration-200 border border-gray-200 dark:border-white/10
                  before:absolute before:top-0 before:-left-4 before:w-4 before:h-full before:bg-transparent
                  ${showThemeMenu ? 'opacity-100 translate-x-0 pointer-events-auto scale-100' : 'opacity-0 -translate-x-4 pointer-events-none scale-95'}
              `}>
                  <button 
                      onClick={() => setAppSettings(p => ({ ...p, theme: 'white', previousTheme: 'white' }))} 
                      className={`w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm hover:scale-110 transition-transform ${appSettings.theme === 'white' ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-[#2c2c2e]' : ''}`} 
                      title="纯白"
                  />
                  <button 
                      onClick={() => setAppSettings(p => ({ ...p, theme: 'cream', previousTheme: 'cream' }))} 
                      className={`w-8 h-8 rounded-full bg-[#f8f5f0] border border-gray-200 shadow-sm hover:scale-110 transition-transform ${appSettings.theme === 'cream' ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-[#2c2c2e]' : ''}`} 
                      title="护眼"
                  />
                  <button 
                      onClick={() => setAppSettings(p => ({ ...p, theme: 'green', previousTheme: 'green' }))} 
                      className={`w-8 h-8 rounded-full bg-[#e8f5e9] border border-green-200 shadow-sm hover:scale-110 transition-transform ${appSettings.theme === 'green' ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-[#2c2c2e]' : ''}`} 
                      title="绿意"
                  />
                  <button 
                      onClick={() => setAppSettings(p => ({ ...p, theme: 'dark', previousTheme: p.theme !== 'dark' ? p.theme : p.previousTheme }))} 
                      className={`w-8 h-8 rounded-full bg-[#1a1a1a] border border-gray-600 shadow-sm hover:scale-110 transition-transform ${appSettings.theme === 'dark' ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-[#2c2c2e]' : ''}`} 
                      title="深色"
                  />
              </div>
           </div>

           <NavButton id="nav-focus" icon={blackHouse.active ? Lock : Unlock} label={blackHouse.active ? "锁定中" : "小黑屋"} isActive={blackHouse.active} isDanger={blackHouse.active} onClick={() => blackHouse.active ? null : setIsSettingUpBlackHouse(true)} disabled={!currentBook} />
           <NavButton id="nav-settings" icon={SettingsIcon} label="设置" isActive={viewMode === ViewMode.Settings} onClick={() => { if(!blackHouse.active) { setViewMode(ViewMode.Settings); setSidebarOpen(false); } }} disabled={blackHouse.active} />
        </div>
      </nav>

      <main className="flex-grow flex flex-col relative overflow-hidden pb-16 md:pb-0">
        <header className={`h-14 border-b transition-all duration-500 ease-in-out flex items-center justify-between px-4 md:px-6 shrink-0 z-10 backdrop-blur-md ${headerClasses[effectiveTheme]}`}>
          <div className="flex items-center space-x-2 md:space-x-4 max-w-[60%] md:max-w-none">
            <div className="flex items-center truncate">
              <h1 className="font-bold font-serif text-base md:text-lg tracking-tight truncate">
                  {viewMode === ViewMode.Editor ? (currentBook?.title || '笔纪 Inkflow Studio') : '笔纪 Inkflow Studio'}
              </h1>
              {viewMode === ViewMode.Editor && currentBook?.isFinished && <CheckCircle2 size={16} className="text-emerald-500 ml-2 shrink-0" />}
              {viewMode === ViewMode.Editor && currentBook?.type === 'anthology' && (
                  <span className="hidden md:inline-block ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[9px] font-bold rounded-md uppercase tracking-wide">
                      短篇集
                  </span>
              )}
            </div>
            {viewMode === ViewMode.Editor && currentBook && (
                <>
                <span className="text-sm opacity-20 hidden md:block">|</span>
                <div className="hidden md:flex flex-col">
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                      {currentBook.type === 'anthology' ? '本篇' : '本章'}: <span className="font-mono">{currentChapterChars}</span> 字
                  </span>
                  <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                      {currentBook.type === 'anthology' ? '文集' : '全书'}: <span className="font-mono">{totalBookChars}</span> 字
                  </span>
                </div>
                </>
            )}
            {blackHouse.active && (
              <div className="flex items-center ml-2 md:ml-4 bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full text-[10px] font-black tracking-widest border border-amber-500/20 animate-pulse uppercase shrink-0">
                <Lock size={12} className="mr-1.5" /> 
                <span className="hidden md:inline">专注模式</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3 md:space-x-5">
             {currentBook && (
             <div className="hidden md:flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                <Save size={12} className="mr-1.5" />
                <span>自动保存: {new Date(lastSaved).toLocaleTimeString([], { hour12: false })}</span>
                {isDirty && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full ml-2 animate-pulse" title="有未保存的更改" />}
             </div>
             )}
             
             {viewMode === ViewMode.Editor && (
                 <button onClick={handleFormat} className="px-3 py-1.5 md:px-4 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all shadow-sm active:scale-95 whitespace-nowrap">排版</button>
             )}
             
             <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
             >
                <Menu size={20} />
             </button>
          </div>
        </header>

        <div className="flex-grow flex overflow-hidden relative">
          <div className={`flex-grow transition-all duration-500 ease-in-out overflow-hidden w-full`}>
            {(viewMode === ViewMode.Bookshelf || isInitialLoad) ? (
              <Bookshelf 
                books={sortedBooks} 
                setBooks={setBooks} 
                onSelectBook={(id) => { setCurrentBookId(id); setViewMode(ViewMode.Editor); }} 
                isPro={appSettings.isPro}
                onProAction={handleProAction}
                theme={effectiveTheme}
              />
            ) : viewMode === ViewMode.Settings ? (
              <SettingsView 
                settings={appSettings} 
                setSettings={setAppSettings} 
                onProAction={() => setShowPaymentModal(true)} 
                trialStatus={trialStatus}
                onStartTrial={startTrial}
              />
            ) : currentBook && currentChapter ? (
              <Editor 
                chapter={currentChapter}
                book={currentBook}
                setChapterTitle={setChapterTitle}
                setChapterContent={setChapterContent} 
                setChapterSynopsis={setChapterSynopsis}
                setNextChapterSynopsis={setNextChapterSynopsis}
                onFinishBook={handleFinishBook}
                onAddNextChapter={addNextChapterAndNavigate}
                onExport={handleExport}
                focusMode={blackHouse.active}
                settings={appSettings}
                blackHouse={blackHouse}
                isDirty={isDirty}
                chatLogs={currentBook.aiChatLogs || []}
                onUpdateChatLogs={(logs) => updateCurrentBookField('aiChatLogs', logs)}
                isPro={appSettings.isPro}
                onProAction={handleProAction}
                onUpdateBook={updateCurrentBookField}
                onUpdateChapter={updateChapter}
                jumpTarget={jumpTarget} 
              />
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                    请先在书架选择一本书
                </div>
            )}
          </div>
          
          {/* MOBILE OVERLAY */}
          {sidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/40 z-[55] backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* RIGHT SIDEBAR */}
          <aside className={`
            fixed md:static top-0 right-0 h-full z-[60] md:z-auto
            flex flex-col overflow-hidden transition-transform duration-300 ease-in-out
            w-[70%] max-w-[300px] md:w-0 md:border-l shadow-2xl md:shadow-none
            ${sidebarOpen ? 'translate-x-0 md:w-[22rem]' : 'translate-x-full md:translate-x-0'}
            ${sidebarClasses}
          `}>
             {currentBook ? (
                 <>
                <div className={`p-4 border-b flex justify-between items-center shrink-0 ${effectiveTheme === 'dark' ? 'bg-black/20 border-white/5' : (effectiveTheme === 'green' ? 'bg-[#e8f5e9] border-green-100' : 'bg-gray-50 border-gray-100')}`}>
                <h2 className={`font-bold text-[10px] uppercase tracking-[0.2em] ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
                    {rightSidebarMode === ViewMode.Outline && (currentBook.type === 'anthology' ? '文集目录' : '章节目录')}
                    {rightSidebarMode === ViewMode.Statistics && (currentBook.type === 'anthology' ? '单篇分析' : '创作统计')}
                    {rightSidebarMode === ViewMode.Inspiration && '灵感仓库'}
                    {rightSidebarMode === ViewMode.Search && '参考资料'}
                    {rightSidebarMode === ViewMode.History && '版本回溯'}
                    {rightSidebarMode === ViewMode.Ambience && '沉浸白噪音'}
                </h2>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-300 hover:text-gray-600 transition-colors p-1 bg-gray-100 rounded-full md:bg-transparent">
                    <X size={18} className="md:hidden" />
                    <ChevronRight size={18} className="hidden md:block" />
                </button>
                </div>
                
                <div className="md:hidden p-3 bg-gray-50/50 border-b shrink-0">
                <div className="grid grid-cols-2 gap-2">
                    {[
                    { m: ViewMode.Outline, i: Layout, l: currentBook.type === 'anthology' ? '文集目录' : '章节大纲', color: 'text-blue-500 bg-blue-50 border-blue-100' },
                    { m: ViewMode.Statistics, i: BarChart2, l: '创作统计', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
                    { m: ViewMode.Ambience, i: Headphones, l: '白噪音', color: 'text-purple-500 bg-purple-50 border-purple-100' },
                    { m: ViewMode.Search, i: Search, l: 'AI 检索', color: 'text-amber-500 bg-amber-50 border-amber-100' },
                    { m: ViewMode.Inspiration, i: Lightbulb, l: '灵感便签', color: 'text-pink-500 bg-pink-50 border-pink-100' },
                    { m: ViewMode.History, i: HistoryIcon, l: '历史版本', color: 'text-gray-500 bg-gray-100 border-gray-200' },
                    ].map(tool => (
                    <button 
                        key={tool.m}
                        onClick={() => toggleRightSidebar(tool.m)}
                        className={`flex items-center p-2 rounded-xl text-xs font-bold border transition-all ${
                        rightSidebarMode === tool.m 
                        ? `${tool.color} shadow-sm ring-1 ring-offset-1` 
                        : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <tool.i size={16} className="mr-2" />
                        <span>{tool.l}</span>
                    </button>
                    ))}
                </div>
                </div>

                <div className="flex-grow overflow-hidden w-full relative">
                {rightSidebarMode === ViewMode.Outline && 
                    <Outline 
                        chapters={currentBook.chapters} 
                        currentChapterId={currentBook.currentChapterId} 
                        onSelectChapter={navigateToChapter} 
                        setBooks={setBooks} 
                        bookId={currentBookId} 
                        settings={appSettings}
                        bookSummary={currentBook.bookSummary || ''}
                        onUpdateSummary={(s) => updateCurrentBookField('bookSummary', s)}
                        isAnthology={currentBook.type === 'anthology'}
                    />
                }
                {rightSidebarMode === ViewMode.History && currentChapter && <VersionHistory versions={currentChapter.versions || []} onRevert={(v) => { createSnapshot(); setBooks(prev => prev.map(b => b.id === currentBookId ? { ...b, chapters: b.chapters.map(c => c.id === b.currentChapterId ? { ...c, content: v.content, title: v.title } : c) } : b)); }} />}
                {rightSidebarMode === ViewMode.Statistics && 
                    <Statistics 
                    stats={{...stats, dailyCount: stats.writingHistory[getTodayKey()] || 0}} 
                    book={currentBook} 
                    settings={appSettings} 
                    onUpdateBook={updateCurrentBookField}
                    />
                }
                {rightSidebarMode === ViewMode.Inspiration && <InspirationView items={inspirations} setItems={setInspirations} settings={appSettings} />}
                {rightSidebarMode === ViewMode.Search && 
                    <SearchView 
                        settings={appSettings} 
                        searchState={currentBook.searchState} 
                        onUpdateSearchState={(s) => updateCurrentBookField('searchState', s)}
                        searchHistory={currentBook.searchHistory || []}
                        onUpdateBook={updateCurrentBookField}
                    />
                }
                {rightSidebarMode === ViewMode.Ambience && <AmbienceView isPro={appSettings.isPro || trialStatus === 'active'} />}
                </div>
                </>
             ) : (
                <div className="flex items-center justify-center h-full text-gray-400 p-8 text-center text-xs">
                    请先创建或选择作品
                </div>
             )}
          </aside>
          
          {!sidebarOpen && viewMode === ViewMode.Editor && (
             <button onClick={() => setSidebarOpen(true)} className={`hidden md:block absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-l-2xl shadow-xl z-10 border transition-all ${effectiveTheme === 'dark' ? 'bg-[#1a1a1a] border-white/10 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}><ChevronLeft size={20} /></button>
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 w-full h-16 bg-[#1c1c1e] z-50 flex items-center justify-around px-2 pb-safe border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
          <NavButton compact icon={Library} label="书架" isActive={viewMode === ViewMode.Bookshelf} onClick={() => { if(!blackHouse.active) { setViewMode(ViewMode.Bookshelf); setSidebarOpen(false); } }} disabled={blackHouse.active} />
          <NavButton compact icon={PenTool} label="创作" isActive={viewMode === ViewMode.Editor && !sidebarOpen} onClick={() => { if(currentBook) { setViewMode(ViewMode.Editor); setSidebarOpen(false); }}} disabled={!currentBook} />
          <NavButton compact icon={SettingsIcon} label="设置" isActive={viewMode === ViewMode.Settings} onClick={() => { if(!blackHouse.active) { setViewMode(ViewMode.Settings); setSidebarOpen(false); } }} disabled={blackHouse.active} />
      </nav>

      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => { setAppSettings(p => ({ ...p, isPro: true })); setShowPaymentModal(false); }}
        onStartTrial={startTrial}
        trialStatus={trialStatus}
      />
      
      {/* 2. Global Tour: Enabled */}
      {startGlobalTour && (
        <OnboardingTour 
            steps={GLOBAL_STEPS} 
            storageKey={GLOBAL_TOUR_KEY} 
            onComplete={() => setStartGlobalTour(false)} 
        />
      )}

      {(isSettingUpBlackHouse || blackHouse.active) && <BlackHouseOverlay config={blackHouse} onExit={exitBlackHouse} onStart={startBlackHouse} onCancel={() => setIsSettingUpBlackHouse(false)} isSettingUp={isSettingUpBlackHouse} />}
      <Analytics />
    </div>
  );
};

export default App;
