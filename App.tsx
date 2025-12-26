
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Feather
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
import { ViewMode, WritingStats, Book, Chapter, Inspiration, BlackHouseConfig, ChapterVersion, AppSettings } from './types';

const STORAGE_KEY = 'inkflow_studio_v7';

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
  activeColor = 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
}: { icon: any, label: string, isActive?: boolean, onClick: () => void, disabled?: boolean, activeColor?: string }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300
      ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}
      ${isActive 
        ? activeColor 
        : 'text-gray-400 hover:bg-white/10 hover:text-white'
      }
    `}
  >
    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
    
    {/* Tooltip */}
    <span className="absolute left-14 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none tracking-wider shadow-xl border border-white/10 translate-x-[-10px] group-hover:translate-x-0 duration-200">
      {label}
    </span>
  </button>
);

const App: React.FC = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure ai config exists for migrated data
      if (!parsed.ai) {
        parsed.ai = {
          provider: 'gemini',
          apiKey: '',
          baseUrl: '',
          model: 'gemini-2.0-flash'
        };
      }
      return parsed;
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
      }
    };
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_books`);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'default-book',
        title: '我的第一部小说',
        coverColor: 'bg-amber-700',
        currentChapterId: 'chapter-1',
        chapters: [
          { id: 'chapter-1', title: '第 1 章', content: '', synopsis: '在这里输入本章梗概...', lastModified: Date.now(), versions: [] }
        ],
        isFinished: false,
        createdAt: Date.now()
      }
    ];
  });

  const [currentBookId, setCurrentBookId] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_currentBookId`) || 'default-book';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Editor);
  const [rightSidebarMode, setRightSidebarMode] = useState<ViewMode>(ViewMode.Outline);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isSettingUpBlackHouse, setIsSettingUpBlackHouse] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
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
    currentBook.chapters.find(c => c.id === currentBook.currentChapterId) || currentBook.chapters[0]
  , [currentBook]);

  const currentChapterChars = useMemo(() => countActualChars(currentChapter.content), [currentChapter.content]);
  const totalBookChars = useMemo(() => {
    return currentBook.chapters.reduce((sum, ch) => sum + countActualChars(ch.content), 0);
  }, [currentBook]);

  const [isSystemDark, setIsSystemDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effectiveTheme = useMemo(() => {
    if (appSettings.theme === 'system') return isSystemDark ? 'dark' : 'white';
    return appSettings.theme;
  }, [appSettings.theme, isSystemDark]);

  const createSnapshot = useCallback(() => {
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
              const versions = [version, ...(c.versions || [])].slice(0, 200);
              return { ...c, versions };
            }
            return c;
          })
        };
      }
      return b;
    }));
  }, [currentBookId, currentChapter]);

  useEffect(() => {
    const saveToDisk = () => {
      if (!isDirty) return;
      createSnapshot();
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
  }, [books, currentBookId, inspirations, appSettings, stats, isDirty, createSnapshot]);

  const lastCharCountRef = useRef(currentChapterChars);
  useEffect(() => {
    lastCharCountRef.current = currentChapterChars;
  }, [currentBook.currentChapterId]);

  const setChapterContent = (text: string) => {
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
    setIsDirty(true);
    
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

    setBooks(prev => prev.map(b => b.id === currentBookId ? {
      ...b,
      chapters: b.chapters.map(c => c.id === b.currentChapterId ? { ...c, content: text, lastModified: Date.now() } : c)
    } : b));
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
      const newChapter: Chapter = {
        id: newId,
        title: `第 ${nextNum} 章`,
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

  const handleExportCurrentChapter = () => {
    const text = `${currentChapter.title}\n\n${currentChapter.content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentChapter.title}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startBlackHouse = (config: Partial<BlackHouseConfig>) => {
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
    // If we are not in editor mode (e.g. Bookshelf or Settings), switch to Editor first
    if (viewMode !== ViewMode.Editor) {
      setViewMode(ViewMode.Editor);
      setRightSidebarMode(mode);
      setSidebarOpen(true);
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

  return (
    <div className={`flex h-screen w-screen transition-colors duration-1000 overflow-hidden font-sans ${themeClasses[effectiveTheme]}`}>
      {/* Optimized Sidebar */}
      <nav className={`w-20 flex flex-col items-center py-8 space-y-4 z-50 shrink-0 transition-all duration-500 ease-in-out border-r border-white/5 ${blackHouse.active ? 'bg-black/95' : 'bg-[#1e293b]'}`}>
        
        {/* Brand / Home Group */}
        <div className="flex flex-col items-center space-y-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-2 cursor-pointer" onClick={() => setViewMode(ViewMode.Bookshelf)}>
               <Feather className="text-white" size={20} />
            </div>
            <NavButton 
              icon={Library} 
              label="作品书架" 
              isActive={viewMode === ViewMode.Bookshelf} 
              onClick={() => !blackHouse.active && setViewMode(ViewMode.Bookshelf)} 
              disabled={blackHouse.active}
            />
        </div>

        <div className="w-8 h-px bg-white/10 my-2" />

        {/* Writing Tools Group */}
        <div className="flex flex-col items-center space-y-3">
          <NavButton 
              icon={Type} 
              label="码字模式" 
              isActive={viewMode === ViewMode.Editor && !sidebarOpen} 
              onClick={() => { setViewMode(ViewMode.Editor); setSidebarOpen(false); }} 
          />
          <NavButton 
              icon={Layout} 
              label="章节大纲" 
              isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Outline} 
              onClick={() => toggleRightSidebar(ViewMode.Outline)} 
          />
          <NavButton 
              icon={HistoryIcon} 
              label="历史版本" 
              isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.History} 
              onClick={() => toggleRightSidebar(ViewMode.History)} 
          />
          <NavButton 
              icon={Lightbulb} 
              label="灵感便签" 
              isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Inspiration} 
              onClick={() => toggleRightSidebar(ViewMode.Inspiration)} 
          />
          <NavButton 
              icon={Search} 
              label="资料检索" 
              isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Search} 
              onClick={() => toggleRightSidebar(ViewMode.Search)} 
          />
          <NavButton 
              icon={BarChart2} 
              label="数据统计" 
              isActive={viewMode === ViewMode.Editor && sidebarOpen && rightSidebarMode === ViewMode.Statistics} 
              onClick={() => toggleRightSidebar(ViewMode.Statistics)} 
          />
        </div>

        <div className="flex-grow" />

        {/* System Group */}
        <div className="flex flex-col items-center space-y-3 pb-2">
           <NavButton 
              icon={effectiveTheme === 'dark' ? Sun : Moon} 
              label="切换主题" 
              onClick={() => setAppSettings(p => ({ ...p, theme: effectiveTheme === 'dark' ? 'cream' : 'dark' }))} 
              activeColor="text-white bg-white/20"
           />
           <NavButton 
              icon={blackHouse.active ? Lock : Unlock} 
              label={blackHouse.active ? "专注进行中" : "进入小黑屋"} 
              isActive={blackHouse.active} 
              onClick={() => blackHouse.active ? null : setIsSettingUpBlackHouse(true)}
              activeColor="bg-red-500 text-white shadow-lg shadow-red-500/30"
           />
           <NavButton 
              icon={SettingsIcon} 
              label="系统设置" 
              isActive={viewMode === ViewMode.Settings} 
              onClick={() => !blackHouse.active && setViewMode(ViewMode.Settings)} 
              disabled={blackHouse.active}
           />
        </div>
      </nav>

      <main className="flex-grow flex flex-col relative overflow-hidden">
        <header className={`h-14 border-b transition-all duration-500 ease-in-out flex items-center justify-between px-6 shrink-0 z-10 backdrop-blur-md ${headerClasses[effectiveTheme]}`}>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <h1 className="font-bold text-lg tracking-tight">{currentBook.title}</h1>
              {currentBook.isFinished && <CheckCircle2 size={16} className="text-emerald-500 ml-2" />}
            </div>
            <span className="text-sm opacity-20">|</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">本章: <span className="font-mono">{currentChapterChars}</span> 字</span>
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">全书: <span className="font-mono">{totalBookChars}</span> 字</span>
            </div>
            {blackHouse.active && (
              <div className="flex items-center ml-4 bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-amber-500/20 animate-pulse uppercase">
                <Lock size={12} className="mr-1.5" /> 专注模式
              </div>
            )}
          </div>
          <div className="flex items-center space-x-5">
             <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                <Save size={12} className="mr-1.5" />
                <span>自动保存: {new Date(lastSaved).toLocaleTimeString([], { hour12: false })}</span>
                {isDirty && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full ml-2 animate-pulse" title="有未保存的更改" />}
             </div>
             
             <div className="h-4 w-px bg-gray-300/50" />

             <button onClick={handleFormat} className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all shadow-sm active:scale-95">智能排版</button>
          </div>
        </header>

        <div className="flex-grow flex overflow-hidden">
          <div className={`flex-grow transition-all duration-500 ease-in-out overflow-hidden ${sidebarOpen ? 'w-[calc(100%-22rem)]' : 'w-full'}`}>
            {viewMode === ViewMode.Bookshelf ? (
              <Bookshelf books={sortedBooks} setBooks={setBooks} onSelectBook={(id) => { setCurrentBookId(id); setViewMode(ViewMode.Editor); }} />
            ) : viewMode === ViewMode.Settings ? (
              <SettingsView settings={appSettings} setSettings={setAppSettings} />
            ) : (
              <Editor 
                chapter={currentChapter}
                book={currentBook}
                setChapterTitle={setChapterTitle}
                setChapterContent={setChapterContent} 
                setChapterSynopsis={setChapterSynopsis}
                setNextChapterSynopsis={setNextChapterSynopsis}
                onFinishBook={handleFinishBook}
                onAddNextChapter={addNextChapterAndNavigate}
                onExport={handleExportCurrentChapter}
                focusMode={blackHouse.active}
                settings={appSettings}
                blackHouse={blackHouse}
                isDirty={isDirty}
              />
            )}
          </div>
          <aside className={`border-l flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${sidebarOpen ? 'w-[22rem] translate-x-0' : 'w-0 translate-x-full'} ${effectiveTheme === 'dark' ? 'bg-[#111] border-white/5 text-gray-400' : 'bg-white border-gray-200 text-gray-800 shadow-2xl'}`}>
            <div className={`p-4 border-b flex justify-between items-center shrink-0 ${effectiveTheme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
              <h2 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400">
                  {rightSidebarMode === ViewMode.Outline && '章节目录'}
                  {rightSidebarMode === ViewMode.Statistics && '创作统计'}
                  {rightSidebarMode === ViewMode.Inspiration && '灵感仓库'}
                  {rightSidebarMode === ViewMode.Search && '参考资料'}
                  {rightSidebarMode === ViewMode.History && '版本回溯'}
              </h2>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-300 hover:text-gray-600 transition-colors p-1"><ChevronRight size={18} /></button>
            </div>
            <div className="flex-grow overflow-y-auto min-w-[22rem] custom-scrollbar">
              {rightSidebarMode === ViewMode.Outline && <Outline chapters={currentBook.chapters} currentChapterId={currentBook.currentChapterId} onSelectChapter={navigateToChapter} setBooks={setBooks} bookId={currentBookId} />}
              {rightSidebarMode === ViewMode.History && <VersionHistory versions={currentChapter.versions || []} onRevert={(v) => { createSnapshot(); setBooks(prev => prev.map(b => b.id === currentBookId ? { ...b, chapters: b.chapters.map(c => c.id === b.currentChapterId ? { ...c, content: v.content, title: v.title } : c) } : b)); }} />}
              {rightSidebarMode === ViewMode.Statistics && <Statistics stats={{...stats, dailyCount: stats.writingHistory[getTodayKey()] || 0}} />}
              {rightSidebarMode === ViewMode.Inspiration && <InspirationView items={inspirations} setItems={setInspirations} />}
              {rightSidebarMode === ViewMode.Search && <SearchView settings={appSettings} />}
            </div>
          </aside>
          {!sidebarOpen && viewMode === ViewMode.Editor && (
             <button onClick={() => setSidebarOpen(true)} className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-l-2xl shadow-xl z-10 border transition-all ${effectiveTheme === 'dark' ? 'bg-[#1a1a1a] border-white/10 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}><ChevronLeft size={20} /></button>
          )}
        </div>
      </main>
      {(isSettingUpBlackHouse || blackHouse.active) && <BlackHouseOverlay config={blackHouse} onExit={exitBlackHouse} onStart={startBlackHouse} onCancel={() => setIsSettingUpBlackHouse(false)} isSettingUp={isSettingUpBlackHouse} />}
    </div>
  );
};

export default App;
