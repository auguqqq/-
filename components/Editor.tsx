
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Lock, Sparkles, MessageSquare, Send, ChevronDown, ChevronUp, BrainCircuit, RotateCcw, User, Bot, Loader2, PartyPopper, Trophy, FileText, Target, Zap, CheckCircle2, FileOutput, Eraser, Settings2, RefreshCw, X, Move, GripHorizontal, Lightbulb, AlertTriangle, FileUp, AlertCircle, Save, ShieldCheck, Wand2, PenTool, LayoutDashboard, Scissors, Bug, CheckCheck, Hammer, Tag, Crown, FileType, Pencil, Grid, FileSearch, Quote, CornerDownLeft, Anchor, Search, StickyNote, ArrowLeft, Check } from 'lucide-react';
import { AppSettings, BlackHouseConfig, Chapter, Book, AIConfig, ChatMessage, ProofreadItem, DeepCritiqueItem } from '../types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getProofreadSystemPrompt, getEditorSystemPrompt, getDeepCritiqueSystemPrompt } from '../utils/ai-prompts';
import { withRetry, fetchOpenAICompatible, getFriendlyErrorMessage } from '../utils/api';
import { countActualChars } from '../utils/helpers';
import OnboardingTour, { TourStep } from './OnboardingTour';

interface EditorProps {
  chapter: Chapter;
  book: Book;
  setChapterTitle: (val: string) => void;
  setChapterContent: (val: string, isComposing?: boolean) => void;
  setChapterSynopsis: (val: string) => void;
  setNextChapterSynopsis: (val: string) => void;
  onFinishBook: () => void;
  onAddNextChapter: (synopsis: string) => void;
  onExport: (format: 'txt' | 'epub' | 'pdf') => void;
  focusMode: boolean;
  settings: AppSettings;
  blackHouse?: BlackHouseConfig;
  isDirty?: boolean;
  chatLogs: ChatMessage[];
  onUpdateChatLogs: (logs: ChatMessage[]) => void;
  isPro?: boolean;
  onProAction?: (callback: () => void) => void;
  onUpdateBook?: (field: keyof Book, value: any) => void;
  onUpdateChapter: (id: string, data: Partial<Chapter>) => void;
  jumpTarget?: number | null; 
}

type AIMode = 'critic' | 'partner' | 'polisher';

const BTN_SIZE = 48;   
const BTN_MARGIN = 24; 
const EDITOR_TOUR_KEY = 'inkflow_editor_tour_v8_detailed'; 

const EDITOR_STEPS: TourStep[] = [
    {
        target: '#editor-area',
        title: '✒️ 沉浸创作区',
        content: '这是您的主战场。支持段首自动缩进，内容实时保存。\n\n💡 小技巧：用鼠标选中正文任意段落，会自动浮现【✨ 润色】按钮。',
        placement: 'center'
    },
    {
        target: '#btn-proofread',
        title: '🐞 智能捉虫',
        content: '写完一段后，点击这里一键扫描。AI 会帮您找出错别字、语病和标点错误，并提供修正建议。',
        placement: 'bottom'
    },
    {
        target: '#btn-critique',
        title: '🔍 深度精修',
        content: '这是您的私人主编。它会分析剧情节奏、人设逻辑和“黄金三章”结构，给出专业的修改批注。',
        placement: 'bottom'
    },
    {
        target: '#btn-marker-fab',
        title: '⚓ 创作锚点',
        content: '创作中随时点击这里插入“待修/待查/备注”锚点。右侧滚动条会生成对应的小圆点，方便快速回跳。',
        placement: 'left'
    },
    {
        target: '#ai-assistant-toggle',
        title: '🤖 灵感助手',
        content: '点击展开侧边栏。它是您的专属搭档，可以陪您聊脑洞、查资料、梳理大纲，甚至进行角色扮演。',
        placement: 'left'
    }
];

const UNIFIED_GENRES = [
    { id: 'xuanhuan', name: '玄幻/仙侠' },
    { id: 'urban', name: '都市/异能' },
    { id: 'ancient_romance', name: '古言/宫斗' },
    { id: 'modern_romance', name: '现言/豪门' },
    { id: 'history', name: '历史/年代' },
    { id: 'scifi', name: '科幻/赛博' },
    { id: 'suspense', name: '悬疑/刑侦' },
    { id: 'rules', name: '规则怪谈' },
    { id: 'apocalypse', name: '末世/囤货' },
    { id: 'system', name: '系统/无限' },
    { id: 'quick_trans', name: '快穿/攻略' },
    { id: 'groveling', name: '火葬场/虐' },
    { id: 'danmei', name: '纯爱/双男' },
    { id: 'farming', name: '种田/经营' },
    { id: 'entertainment', name: '娱乐/文抄' },
    { id: 'brainhole', name: '脑洞/反转' },
    { id: 'other', name: '通用/其他' }
];

const getAvailableModels = (settings: AppSettings) => {
  const ai: AIConfig = settings.ai || { 
      provider: 'gemini', 
      apiKey: '',
      baseUrl: '',
      model: 'gemini-2.0-flash',
      availableModels: []
  };
  if (ai.availableModels && ai.availableModels.length > 0) {
      const list = ai.availableModels.map(m => ({ id: m, name: m }));
      if (ai.model && !ai.availableModels.includes(ai.model)) {
          list.unshift({ id: ai.model, name: `${ai.model} (当前)` });
      }
      return list;
  }
  switch (ai.provider) {
    case 'gemini': return [{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }];
    case 'deepseek': return [{ id: 'deepseek-chat', name: 'DeepSeek V3' }];
    case 'openai': return [{ id: 'gpt-4o', name: 'GPT-4o' }];
    default: return [];
  }
};

const intelligentSplit = (text: string): string[] => {
    const paragraphs = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).filter(p => p.trim());
    const bubbles: string[] = [];
    let currentBuffer: string[] = [];
    const isHeader = (str: string) => /^(#{1,6}\s+|(\d+[\.、])\s+|[-*]\s+|第[0-9零一二三四五六七八九十]+[章回节]|【|\[|Step\s*\d+|\*\*.*\*\*$)/.test(str.trim());

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i].trim();
        if (!p) continue;
        if (isHeader(p) && currentBuffer.length > 0) {
            bubbles.push(currentBuffer.join('\n\n'));
            currentBuffer = [];
        }
        currentBuffer.push(p);
        const currentTextLen = currentBuffer.join('\n\n').length;
        if (p.length > 800) {
             bubbles.push(currentBuffer.join('\n\n'));
             currentBuffer = [];
             continue;
        }
        if (currentTextLen > 600) {
             bubbles.push(currentBuffer.join('\n\n'));
             currentBuffer = [];
        }
    }
    if (currentBuffer.length > 0) bubbles.push(currentBuffer.join('\n\n'));
    return bubbles;
};

// --- MiniMap Dot Component with macOS Dock Effect ---
interface MiniMapDotProps {
    marker: { index: number; type: string };
    totalLength: number;
    onClick: (index: number) => void;
    hoverY: number | null;
    containerHeight: number;
}

const MiniMapDot: React.FC<MiniMapDotProps> = ({ marker, totalLength, onClick, hoverY, containerHeight }) => {
    // 1. Calculate Base Position (0-100%)
    const topPercent = (marker.index / totalLength) * 100;
    
    // 2. Calculate Scale Factor based on Hover Distance (Fisheye / Dock Effect)
    // We assume the dot's vertical center is roughly at `topPercent`.
    // Converting percentage back to pixels relative to container height for distance calc.
    const myY = (marker.index / totalLength) * containerHeight;
    
    let scale = 1;
    let opacity = 0.7;
    let zIndex = 10;

    if (hoverY !== null) {
        // Calculate distance between mouse Y (relative to container) and dot Y
        const dist = Math.abs(hoverY - myY);
        // Use Gaussian for smoother, more organic falloff
        const sigma = 24; 
        const range = sigma * 3; 
        
        if (dist < range) {
            const boost = Math.exp(- (dist * dist) / (2 * sigma * sigma));
            scale = 1 + (boost * 3.5); // Max scale 4.5x
            opacity = 0.6 + (boost * 0.4);
            zIndex = 100 + Math.floor(boost * 100); // Ensure closest is on top
        }
    }

    // 3. Color Logic - Semantic Coloring
    let bgClass = '';
    if (marker.type === 'fix') {
        bgClass = 'bg-red-500 border-red-600 shadow-red-500/50';
    } else if (marker.type === 'research') {
        bgClass = 'bg-blue-500 border-blue-600 shadow-blue-500/50';
    } else {
        bgClass = 'bg-amber-500 border-amber-600 shadow-amber-500/50';
    }

    // 4. Shape: Horizontal Teardrop / Pin
    // 'rounded-full rounded-tr-none -rotate-45' creates a teardrop pointing top-left (before rotation).
    // To point LEFT (towards text), we rotate -45deg + scale adjustment.
    
    return (
        <div 
            onClick={(e) => { e.stopPropagation(); onClick(marker.index); }}
            className={`
                absolute right-2 w-3 h-3 cursor-pointer 
                border shadow-sm
                rounded-full rounded-tr-none
                ${bgClass}
            `}
            style={{ 
                top: `${topPercent}%`,
                // Rotation 45deg makes the sharp corner (tr) point Right.
                transform: `translateY(-50%) rotate(45deg) scale(${scale})`, 
                opacity,
                zIndex
            }}
            title={`点击跳转`}
        />
    );
};

interface MiniMapProps {
    markers: { index: number; type: string }[];
    totalLength: number;
    onScrollTo: (index: number) => void;
}

const MiniMap: React.FC<MiniMapProps> = ({ markers, totalLength, onScrollTo }) => {
    const [hoverY, setHoverY] = useState<number | null>(null);
    const [height, setHeight] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateHeight = () => {
            if (ref.current) {
                setHeight(ref.current.clientHeight);
            }
        };
        // Delay slightly to wait for layout
        setTimeout(updateHeight, 100);
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setHoverY(e.clientY - rect.top);
        }
    };

    const handleMouseLeave = () => {
        setHoverY(null);
    };

    return (
        <div 
            ref={ref}
            className="absolute right-1 top-0 bottom-0 w-8 z-40 pointer-events-auto"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="relative w-full h-full">
                {markers.map((m, i) => (
                    <MiniMapDot 
                        key={i} 
                        marker={m} 
                        totalLength={totalLength} 
                        onClick={onScrollTo} 
                        hoverY={hoverY}
                        containerHeight={height}
                    />
                ))}
            </div>
        </div>
    );
};

const Editor: React.FC<EditorProps> = ({ 
  chapter, 
  book,
  setChapterTitle, 
  setChapterContent, 
  setChapterSynopsis, 
  setNextChapterSynopsis,
  onFinishBook, 
  onAddNextChapter,
  onExport,
  focusMode, 
  settings, 
  blackHouse, 
  isDirty,
  chatLogs,
  onUpdateChatLogs,
  isPro,
  onProAction,
  onUpdateBook,
  onUpdateChapter,
  jumpTarget
}) => {
  const [timeProgress, setTimeProgress] = useState(0);
  const isComposing = useRef(false);
  const isAnthology = book.type === 'anthology';
  
  const [selectedText, setSelectedText] = useState('');
  const [showShortTextToast, setShowShortTextToast] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showExportTip, setShowExportTip] = useState(false);
  const [activeModel, setActiveModel] = useState(settings.ai?.model || 'gemini-2.0-flash');
  const [activeSubGenre, setActiveSubGenre] = useState(book.subGenre || 'other');
  const [showGenreSelector, setShowGenreSelector] = useState(false);

  // Marker Menu State
  const [showMarkerMenu, setShowMarkerMenu] = useState(false);

  // Proofreading State
  const [showProofreadPanel, setShowProofreadPanel] = useState(false);
  const [proofreadLoading, setProofreadLoading] = useState(false);
  const [proofreadResults, setProofreadResults] = useState<ProofreadItem[]>([]);
  const [proofreadStats, setProofreadStats] = useState({ fixed: 0, ignored: 0 });

  // Deep Critique State
  const [showCritiquePanel, setShowCritiquePanel] = useState(false);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [critiqueResults, setCritiqueResults] = useState<DeepCritiqueItem[]>([]);
  const [highlightRange, setHighlightRange] = useState<{start: number, end: number} | null>(null);
  const [polishBtnPos, setPolishBtnPos] = useState<{x: number, y: number} | null>(null);

  // Refs
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  // Restore cursor logic
  const cursorRestoreRef = useRef<number | null>(null);
  
  // MiniMap Refs
  // const minimapRef = useRef<HTMLDivElement>(null);
  // const [minimapHoverY, setMinimapHoverY] = useState<number | null>(null);
  // const [minimapHeight, setMinimapHeight] = useState(0);

  const effectiveTheme = settings.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'white') : settings.theme;
  const isGreen = effectiveTheme === 'green';
  const isDark = effectiveTheme === 'dark';
  const isCream = effectiveTheme === 'cream';

  // Parse Markers for MiniMap
  const markers = useMemo(() => {
      const list: { index: number; type: 'fix' | 'research' | 'note' }[] = [];
      const regex = /【⚓(修|查|注)(?:[:：](.*?))?】/g;
      let match;
      while ((match = regex.exec(chapter.content)) !== null) {
          const typeChar = match[1];
          let type: 'fix' | 'research' | 'note' = 'note';
          if (typeChar === '修') type = 'fix';
          if (typeChar === '查') type = 'research';
          list.push({ index: match.index, type });
      }
      return list;
  }, [chapter.content]);

  // Handle Jump to Marker (Scrolls line to center)
  const handleScrollTo = (index: number) => {
      if (typeof index === 'number' && textareaRef.current && mainScrollRef.current) {
          scrollToTextPosition(index);
      }
  };

  // MiniMap Mouse Handlers - MOVED TO COMPONENT
  // const handleMinimapMouseMove...

  // FIX: Restore Cursor AFTER Render using useLayoutEffect
  useLayoutEffect(() => {
      if (cursorRestoreRef.current !== null && textareaRef.current) {
          const pos = cursorRestoreRef.current;
          textareaRef.current.setSelectionRange(pos, pos);
          // Removed blur/focus cycle which interrupts input
          textareaRef.current.focus();
          cursorRestoreRef.current = null;
      }
  }, [chapter.content]); // Trigger whenever content updates

  // FIX: Insertion Logic ensuring cursor stays put
  const insertMarker = (type: 'fix' | 'research' | 'note') => {
      if (!textareaRef.current) return;
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const currentVal = ta.value;
      
      let markerText = '';
      let cursorOffset = 0;

      switch(type) {
          case 'fix': 
            markerText = '【⚓修】'; 
            cursorOffset = markerText.length - 1; 
            break;
          case 'research': 
            markerText = '【⚓查: 】'; 
            cursorOffset = markerText.length - 1; // Before '】'
            break;
          case 'note': 
            markerText = '【⚓注: 】'; 
            cursorOffset = markerText.length - 1; // Before '】'
            break;
      }
      
      const newVal = currentVal.substring(0, start) + markerText + currentVal.substring(end);
      
      // Store intended position for LayoutEffect to pick up
      const newCursorPos = start + cursorOffset;
      cursorRestoreRef.current = newCursorPos;

      // Update Content (Triggers Re-render)
      setLocalContent(newVal);
      setChapterContent(newVal, false);
      setShowMarkerMenu(false);
  };

  // ... (Effects and other handlers same as previous) ...
  useEffect(() => { if (settings.ai?.model) setActiveModel(settings.ai.model); }, [settings.ai?.model]);
  useEffect(() => { if (book.subGenre) setActiveSubGenre(book.subGenre); }, [book.id, book.subGenre]);
  useEffect(() => { setProofreadResults(chapter.proofreadData || []); setCritiqueResults(chapter.critiqueData || []); }, [chapter.id]);
  
  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const chatLogsRef = useRef(chatLogs);
  useEffect(() => { chatLogsRef.current = chatLogs; }, [chatLogs]);

  const activeProgress = useMemo(() => {
    if (!blackHouse || !focusMode) return 0;
    if (blackHouse.type === 'word') {
      return Math.min(100, (blackHouse.currentProgress / blackHouse.target) * 100);
    }
    return timeProgress;
  }, [blackHouse, focusMode, timeProgress]);

  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('思考中...');
  const [userInput, setUserInput] = useState('');
  const [isEditingModel, setIsEditingModel] = useState(false); 
  const [newTurnStartIndex, setNewTurnStartIndex] = useState<number | null>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [panelRect, setPanelRect] = useState({ x: window.innerWidth - 380 - 20, y: 80, w: 360, h: 600 });
  const isDraggingPanel = useRef(false);
  const isResizingPanel = useRef(false);
  const panelDragOffset = useRef({ x: 0, y: 0 });
  const [btnPos, setBtnPos] = useState(() => {
      if (typeof window === 'undefined') return { x: 0, y: 0 };
      const defaultX = window.innerWidth - BTN_SIZE - BTN_MARGIN;
      const defaultY = window.innerHeight - BTN_SIZE - BTN_MARGIN;
      try {
          const saved = sessionStorage.getItem('inkflow_ai_btn_pos');
          if (saved) {
              const parsed = JSON.parse(saved);
              if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
                  if (parsed.x < 100 && parsed.y < 100) return { x: defaultX, y: defaultY };
                  return parsed;
              }
          }
      } catch (e) {}
      return { x: defaultX, y: defaultY };
  });
  const isDraggingBtn = useRef(false);
  const btnDragStart = useRef({ x: 0, y: 0 });
  const hasBtnMoved = useRef(false);
  const [showIdleTip, setShowIdleTip] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const idleTimerRef = useRef<any>(null);

  useEffect(() => {
      if (isAiPanelOpen && chatLogs.length === 0) {
          const warningMsg: ChatMessage = {
              role: 'assistant',
              content: `👋 您好！我是您的智能责编。\n\n🛡️ **数据安全说明**：\n您的创作数据仅保存在本地。建议定期点击右上角导出备份。\n\n⚠️ **免责声明**：AI 建议仅供参考，您才是作品的主人。\n\n**如何使用：**\n1. 点击顶部 **“主编深度审阅”** 进行全篇复盘。\n2. 选中正文任意段落，点击浮现的 **“✨ 润色”** 按钮优化文笔。\n3. 在下方输入框直接对话，召唤 **“灵感搭档”**。`
          };
          onUpdateChatLogs([warningMsg]);
      }
  }, [isAiPanelOpen, chatLogs.length]);

  useEffect(() => {
     const handleResize = () => {
         setBtnPos((prev: {x: number, y: number}) => {
             const maxX = window.innerWidth - BTN_SIZE - BTN_MARGIN;
             const maxY = window.innerHeight - BTN_SIZE - BTN_MARGIN;
             let newX = Math.min(Math.max(BTN_MARGIN, prev.x), maxX);
             let newY = Math.min(Math.max(BTN_MARGIN, prev.y), maxY);
             if (newX < 100 && newY < 100) return { x: maxX, y: maxY };
             return { x: newX, y: newY };
         });
         if (window.innerWidth > 768) {
             setPanelRect((prev: any) => ({ x: window.innerWidth - 380 - 40, y: 100, w: 360, h: window.innerHeight - 200 }));
         } else {
             setPanelRect((prev: any) => ({ x: 0, y: 60, w: window.innerWidth, h: window.innerHeight - 60 }));
         }
     };
     handleResize();
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { sessionStorage.setItem('inkflow_ai_btn_pos', JSON.stringify(btnPos)); }, [btnPos]);
  
  const [synopsisExpanded, setSynopsisExpanded] = useState(true);
  const [showFinishedEffect, setShowFinishedEffect] = useState(false);
  const [finishStats, setFinishStats] = useState({ words: 0, chapters: 0, time: 0 });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatTopRef = useRef<HTMLDivElement>(null);

  const themeStyles = { cream: 'bg-[#f8f5f0]', white: 'bg-white', dark: 'bg-[#1a1a1a]', green: 'bg-[#e8f5e9]' };
  const textColors = { cream: 'text-gray-800', white: 'text-gray-800', dark: 'text-gray-100', green: 'text-[#1b5e20]' };
  const selectionColors = {
      cream: 'selection:bg-amber-100 selection:text-amber-900',
      white: 'selection:bg-gray-100 selection:text-gray-900',
      dark: 'selection:bg-amber-900/40 selection:text-amber-100',
      green: 'selection:bg-[#c8e6c9] selection:text-[#1b5e20]'
  };
  const focusBgClass = focusMode 
    ? (isDark ? 'bg-black' : (isGreen ? 'bg-[#e8f5e9]' : 'bg-[#fefdfb]')) 
    : themeStyles[effectiveTheme as keyof typeof themeStyles];
  const synopsisClass = isGreen 
    ? 'bg-white/50 border-[#a5d6a7] text-[#1b5e20] placeholder:text-[#1b5e20]/40 focus:bg-white focus:border-[#43a047]' 
    : isCream
        ? 'bg-white/50 border-amber-200 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-amber-300'
        : (isDark 
            ? 'bg-amber-50/10 border-amber-200/20 text-gray-500 focus:border-amber-400 focus:bg-amber-50/20' 
            : 'bg-amber-50/10 border-amber-200/20 text-gray-500 focus:border-amber-400 focus:bg-amber-50/20');
  const iconBtnClass = isGreen ? 'text-[#2e7d32]/70 hover:text-[#1b5e20] hover:bg-[#c8e6c9]/50' : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50';
  const caretClass = isGreen ? 'caret-[#2e7d32]' : (isDark ? 'caret-amber-600' : 'caret-amber-600');

  // --- Theme Sync for Panels ---
  const panelBgClass = isDark ? 'bg-[#1c1c1e]' : (isGreen ? 'bg-[#e8f5e9]' : (isCream ? 'bg-[#f8f5f0]' : 'bg-white'));
  const panelBorderClass = isDark ? 'border-white/10' : (isGreen ? 'border-green-200' : (isCream ? 'border-amber-200' : 'border-gray-200'));
  const panelItemBgClass = isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100';
  const panelTextClass = isDark ? 'text-gray-300' : (isGreen ? 'text-[#1b5e20]' : 'text-gray-800');

  const resetIdleTimer = () => {
    if (showIdleTip) setShowIdleTip(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (chapter.content.length > 50 && !focusMode) {
        idleTimerRef.current = setTimeout(() => {
            const TIPS = ["写累了吗？记得点击右上角导出备份。", "想知道现在的手速？点击右侧【统计】查看实时码字速率。", "写完一段了？点击顶部的 🐞 捉虫按钮，一键扫描错别字。", "试试选中一段文字，唤起 AI 进行深度润色。", "卡文了吗？点击右下角 AI 助手寻找灵感。"];
            const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];
            setCurrentTip(randomTip);
            setShowIdleTip(true);
        }, 3 * 60 * 1000);
    }
  };
  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleTimerRef.current); }, [chapter.content]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingPanel.current) {
            setPanelRect(prev => ({ ...prev, x: e.clientX - panelDragOffset.current.x, y: e.clientY - panelDragOffset.current.y }));
        } else if (isResizingPanel.current) {
            setPanelRect(prev => ({ ...prev, w: Math.max(300, e.clientX - prev.x), h: Math.max(400, e.clientY - prev.y) }));
        } else if (isDraggingBtn.current) {
            const dx = e.clientX - btnDragStart.current.x;
            const dy = e.clientY - btnDragStart.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasBtnMoved.current = true;
            let newX = e.clientX - (BTN_SIZE / 2);
            let newY = e.clientY - (BTN_SIZE / 2);
            newX = Math.max(BTN_MARGIN, Math.min(window.innerWidth - BTN_SIZE - BTN_MARGIN, newX));
            newY = Math.max(BTN_MARGIN, Math.min(window.innerHeight - BTN_SIZE - BTN_MARGIN, newY));
            setBtnPos({ x: newX, y: newY });
        }
    };
    const handleMouseUp = () => { isDraggingPanel.current = false; isResizingPanel.current = false; if (isDraggingBtn.current) isDraggingBtn.current = false; document.body.style.userSelect = 'auto'; };
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  const handleMouseDownHeader = (e: React.MouseEvent) => { if ((e.target as HTMLElement).closest('button')) return; isDraggingPanel.current = true; panelDragOffset.current = { x: e.clientX - panelRect.x, y: e.clientY - panelRect.y }; document.body.style.userSelect = 'none'; };
  const handleMouseDownResize = (e: React.MouseEvent) => { e.stopPropagation(); isResizingPanel.current = true; document.body.style.userSelect = 'none'; };
  const handleMouseDownBtn = (e: React.MouseEvent) => { isDraggingBtn.current = true; hasBtnMoved.current = false; btnDragStart.current = { x: e.clientX, y: e.clientY }; };
  const handleBtnClick = (e: React.MouseEvent) => { e.stopPropagation(); if (!hasBtnMoved.current) setIsAiPanelOpen(true); };

  useEffect(() => { if (aiLoading) { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); } else if (newTurnStartIndex !== null) { setTimeout(() => { const el = messageRefs.current[newTurnStartIndex]; if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } setNewTurnStartIndex(null); }, 300); } }, [aiLoading, newTurnStartIndex, chatLogs.length]);

  const handleTriggerFinish = () => {
     const totalWords = book.chapters.reduce((sum, ch) => sum + countActualChars(ch.content), 0);
     const totalChapters = book.chapters.length;
     setFinishStats({ words: totalWords, chapters: totalChapters, time: 0 });
     onFinishBook(); setShowFinishedEffect(true); setShowExportMenu(false); 
  };

  const addChatLog = (newMsg: ChatMessage) => { const currentLogs = chatLogsRef.current; const updated = [...currentLogs, newMsg]; onUpdateChatLogs(updated.length > 80 ? updated.slice(updated.length - 80) : updated); };

  // ... (AI Logic: Proofread, Critique, Chat - mostly unchanged from previous step but included for context in full file) ...
  const generateResponse = async (userPrompt: string, systemPrompt?: string) => {
    const aiConfig = settings.ai || { provider: 'gemini', apiKey: '', baseUrl: '', model: 'gemini-3-flash-preview' };
    const targetModel = activeModel || aiConfig.model || 'gemini-3-flash-preview';
    if (aiConfig.provider === 'gemini') {
      const key = aiConfig.apiKey || process.env.API_KEY;
      if (!key) throw new Error("未配置 Gemini API Key");
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await withRetry(async () => { return await ai.models.generateContent({ model: targetModel, contents: userPrompt, config: systemPrompt ? { systemInstruction: systemPrompt } : undefined }); });
      return response.text?.trim() || "未能生成评估。";
    } else { return await withRetry(() => fetchOpenAICompatible(aiConfig, [{ role: 'user', content: userPrompt }], systemPrompt, targetModel)); }
  };

  const handleProofread = async (forceRefresh = false) => {
      if (chapter.content.length < 10) return alert("内容太少，请多写一点再捉虫吧。");
      if (proofreadLoading) return;
      setShowProofreadPanel(true); setShowCritiquePanel(false);
      if (!forceRefresh && chapter.proofreadData && chapter.proofreadData.length > 0) { setProofreadResults(chapter.proofreadData); setProofreadStats({ fixed: 0, ignored: 0 }); return; }
      setProofreadLoading(true); setProofreadResults([]); setProofreadStats({ fixed: 0, ignored: 0 });
      try {
          const ignoreWords = book.styleProfile?.ignoreWords || [];
          const systemPrompt = getProofreadSystemPrompt(ignoreWords);
          const userPrompt = `请校对以下文本：\n\n${chapter.content.slice(0, 10000)}`; 
          const aiText = await generateResponse(userPrompt, systemPrompt);
          let parsed: ProofreadItem[] = [];
          try { const jsonMatch = aiText.match(/\[\s*\{.*\}\s*\]/s); if (jsonMatch) { parsed = JSON.parse(jsonMatch[0]); } else { if (aiText.trim().startsWith('[') && aiText.trim().endsWith(']')) { parsed = JSON.parse(aiText); } } } catch (e) { if (!aiText.includes("error") && aiText.length < 50) { parsed = []; } }
          const filteredResults = parsed.filter(item => { const original = item.original.trim(); const suggestion = item.suggestion.trim(); if (original === suggestion) return false; if (ignoreWords.some(w => original.includes(w))) return false; const stripPunct = (s: string) => s.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''); if (stripPunct(original) === stripPunct(suggestion)) { if (!item.reason.includes('引号') && !item.reason.includes('闭合')) { return false; } } return true; });
          const resultsWithIds = filteredResults.map((item, i) => ({ ...item, id: `err-${Date.now()}-${i}` }));
          setProofreadResults(resultsWithIds); onUpdateChapter(chapter.id, { proofreadData: resultsWithIds });
      } catch (e: any) { alert(`捉虫失败: ${getFriendlyErrorMessage(e)}`); setShowProofreadPanel(false); } finally { setProofreadLoading(false); }
  };

  const handleDeepCritique = async (forceRefresh = false) => {
      if (chapter.content.length < 100) return alert("内容太少，建议写满 100 字后再进行深度精修。");
      if (critiqueLoading) return;
      setShowCritiquePanel(true); setShowProofreadPanel(false); 
      if (!forceRefresh && chapter.critiqueData && chapter.critiqueData.length > 0) { setCritiqueResults(chapter.critiqueData); return; }
      setCritiqueLoading(true); setCritiqueResults([]);
      try {
          const ignoredTags = book.styleProfile?.ignoredCritiqueTags || [];
          const systemPrompt = getDeepCritiqueSystemPrompt(book.subGenre || 'other', ignoredTags);
          const userPrompt = `请对以下章节进行深度批注：\n\n${chapter.content.slice(0, 10000)}`;
          const aiText = await generateResponse(userPrompt, systemPrompt);
          let parsed: DeepCritiqueItem[] = [];
          
          try {
              // 1. Try to find JSON array directly
              const jsonMatch = aiText.match(/\[\s*\{.*\}\s*\]/s);
              if (jsonMatch) {
                  parsed = JSON.parse(jsonMatch[0]);
              } else {
                  // 2. Try to strip markdown code blocks if present
                  const cleanText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
                  // 3. Try to find array start/end
                  const start = cleanText.indexOf('[');
                  const end = cleanText.lastIndexOf(']');
                  if (start !== -1 && end !== -1) {
                      parsed = JSON.parse(cleanText.substring(start, end + 1));
                  }
              }
          } catch (e) {
              console.warn("JSON Parse Error", e);
          }
          
          // Fallback: If parsing failed or result is empty, but we have AI text, wrap it
          if (!Array.isArray(parsed) || parsed.length === 0) {
              if (aiText && aiText.trim().length > 0) {
                  console.log("Using fallback for non-JSON response");
                  parsed = [{
                      id: `crit-fallback-${Date.now()}`,
                      tag: '深度分析',
                      quote: '（AI 未返回结构化数据，显示原始分析）',
                      advice: aiText,
                      suggestion: aiText // Compatible with different interfaces
                  } as any];
              } else {
                  parsed = [];
              }
          }
          
          // Normalize the parsed items to ensure consistent keys
          parsed = parsed.map((item: any) => ({
              id: item.id || `crit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              tag: item.tag || item.批注位置 || item.标签 || '深度批注',
              quote: item.quote || item.批注内容 || item.原文引用 || '',
              advice: item.advice || item.修改建议 || item.批注建议 || item.suggestion || item.content || '',
              suggestion: item.suggestion || item.修改建议 || ''
          }));

          const resultsWithIds = parsed.map((item, i) => ({ ...item, id: item.id || `crit-${Date.now()}-${i}` }));
          setCritiqueResults(resultsWithIds); onUpdateChapter(chapter.id, { critiqueData: resultsWithIds });
      } catch (e: any) { alert(`分析失败: ${getFriendlyErrorMessage(e)}`); setShowCritiquePanel(false); } finally { setCritiqueLoading(false); }
  };

  const ignoreCritique = (e: React.MouseEvent, id: string, tag: string) => {
      e.stopPropagation();
      const newResults = critiqueResults.filter(c => c.id !== id);
      setCritiqueResults(newResults);
      onUpdateChapter(chapter.id, { critiqueData: newResults });
      
      if (tag && onUpdateBook) {
          const currentProfile = book.styleProfile || { ignoreWords: [], ignoredCritiqueTags: [] };
          const currentTags = currentProfile.ignoredCritiqueTags || [];
          if (!currentTags.includes(tag)) {
              const newProfile = { ...currentProfile, ignoredCritiqueTags: [...currentTags, tag] };
              onUpdateBook('styleProfile', newProfile);
          }
      }
  };

  const applyCorrection = (e: React.MouseEvent, item: ProofreadItem) => {
      e.stopPropagation(); let currentContent = localContent; let target = item.original;
      if (!currentContent.includes(target)) { target = item.original.trim(); if (!currentContent.includes(target)) { alert("无法在当前文档中定位该片段。"); const newResults = proofreadResults.filter(p => p.id !== item.id); setProofreadResults(newResults); onUpdateChapter(chapter.id, { proofreadData: newResults }); return; } }
      const newContent = currentContent.replace(target, item.suggestion); 
      setLocalContent(newContent);
      setChapterContent(newContent, false);
      const newResults = proofreadResults.filter(p => p.id !== item.id); setProofreadResults(newResults); setProofreadStats(prev => ({ ...prev, fixed: prev.fixed + 1 })); onUpdateChapter(chapter.id, { proofreadData: newResults });
  };

  const ignoreCorrection = (e: React.MouseEvent, id: string, original: string) => {
      e.stopPropagation(); const newResults = proofreadResults.filter(p => p.id !== id); setProofreadResults(newResults); setProofreadStats(prev => ({ ...prev, ignored: prev.ignored + 1 })); onUpdateChapter(chapter.id, { proofreadData: newResults });
      if (onUpdateBook && original && original.length < 10) { const currentProfile = book.styleProfile || { ignoreWords: [] }; const currentList = currentProfile.ignoreWords || []; if (!currentList.includes(original)) { const newList = [...currentList, original]; onUpdateBook('styleProfile', { ...currentProfile, ignoreWords: newList }); } }
  };

  const locateCorrection = (item: ProofreadItem | DeepCritiqueItem) => {
      if (!textareaRef.current) return; 
      const content = textareaRef.current.value; 
      const searchText = 'original' in item ? item.original : item.quote;
      
      // 1. Exact match
      let index = content.indexOf(searchText);
      
      // 2. Trimmed match
      if (index === -1) { 
          index = content.indexOf(searchText.trim()); 
      }
      
      // 3. Normalized whitespace match
      if (index === -1) {
          const normalize = (s: string) => s.replace(/\s+/g, '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
          const simpleSearch = normalize(searchText);
          const simpleContent = normalize(content);
          const simpleIndex = simpleContent.indexOf(simpleSearch);
          
          if (simpleIndex !== -1) {
              // Try to map back to original index (approximate)
              // This is complex, so we fallback to a simpler prefix search if exact fail
              // But let's try a smarter prefix search first
              const prefix = searchText.substring(0, Math.min(10, searchText.length)).trim();
              index = content.indexOf(prefix);
          }
      }

      // 4. Fuzzy match (Relaxed)
      if (index === -1 && searchText.length > 5) { 
          // Try first 6 chars
          const prefix = searchText.substring(0, 6).trim(); 
          const firstIndex = content.indexOf(prefix);
          if (firstIndex !== -1) {
              // Verify if it's a plausible match (e.g. check a few chars after)
              index = firstIndex;
          } else {
             // Try middle chunk
             const mid = Math.floor(searchText.length / 2);
             const midChunk = searchText.substring(mid, mid + 6).trim();
             if (midChunk.length > 3) {
                 index = content.indexOf(midChunk);
                 if (index !== -1) {
                     // Adjust index backwards
                     index = Math.max(0, index - mid);
                 }
             }
          }
      }

      if (index === -1) { 
          alert("原文可能已变动，无法精准定位该片段。"); 
          return; 
      }
      
      // Highlight the text
      setHighlightRange({ start: index, end: index + searchText.length });
      
      // Scroll handled by useEffect on highlightRange change
  };

  // Robust scrolling to highlight target
  useEffect(() => {
      if (highlightRange && mainScrollRef.current) {
          // Use requestAnimationFrame to ensure DOM has updated with the highlight span
          requestAnimationFrame(() => {
              const target = document.getElementById('highlight-target');
              if (target && mainScrollRef.current) {
                  const container = mainScrollRef.current;
                  const targetRect = target.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();
                  
                  // Calculate relative top position in the scrollable container
                  const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
                  
                  // Target to center the element (1/3 down the screen for better visibility)
                  const targetScrollTop = relativeTop - (container.clientHeight / 3);
                  
                  container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'auto' });
                  
                  // Set cursor to start of highlight
                  if (textareaRef.current) {
                      textareaRef.current.focus({ preventScroll: true });
                      textareaRef.current.setSelectionRange(highlightRange.start, highlightRange.start);
                  }
              }
          });
      }
  }, [highlightRange]);

  const clearChatHistory = () => {
      if (window.confirm("确定要清空所有对话历史吗？")) {
          onUpdateChatLogs([]);
          setNewTurnStartIndex(null);
      }
  };

  const getCoordinates = (textarea: HTMLTextAreaElement, index: number) => {
      const mirror = document.createElement('div');
      const computedStyle = window.getComputedStyle(textarea);
      const stylesToCopy = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'word-spacing', 'text-indent', 'white-space', 'word-break', 'overflow-wrap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-width', 'box-sizing'];
      stylesToCopy.forEach(prop => mirror.style.setProperty(prop, computedStyle.getPropertyValue(prop)));
      
      // Explicitly set width to pixel value to handle wrapping correctly
      const rect = textarea.getBoundingClientRect();
      mirror.style.width = `${rect.width}px`;
      
      mirror.style.position = 'absolute'; 
      mirror.style.visibility = 'hidden'; 
      mirror.style.top = '0px'; 
      mirror.style.left = '0px'; 
      mirror.style.height = 'auto'; 
      mirror.style.overflow = 'hidden';
      
      const textBefore = textarea.value.substring(0, index);
      const spanBefore = document.createElement('span'); 
      spanBefore.textContent = textBefore;
      const spanMarker = document.createElement('span'); 
      spanMarker.textContent = '|';
      
      mirror.appendChild(spanBefore); 
      mirror.appendChild(spanMarker); 
      document.body.appendChild(mirror);
      
      const offsetTop = spanMarker.offsetTop;
      const offsetLeft = spanMarker.offsetLeft;
      
      document.body.removeChild(mirror);
      
      return {
          top: rect.top + offsetTop - textarea.scrollTop,
          left: rect.left + offsetLeft - textarea.scrollLeft
      };
  };

  const handleSelectionChange = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const { selectionStart, selectionEnd } = textarea;
      
      if (selectionStart !== selectionEnd) {
          const text = textarea.value.substring(selectionStart, selectionEnd);
          setSelectedText(text);
          
          // Calculate position for floating button
          const coords = getCoordinates(textarea, selectionEnd);
          // Position it slightly above the end of selection, clamped to viewport
          const btnX = Math.min(window.innerWidth - 100, Math.max(10, coords.left));
          const btnY = Math.max(10, coords.top - 40);
          
          setPolishBtnPos({ x: btnX, y: btnY });
      } else {
          setSelectedText('');
          setPolishBtnPos(null);
      }
  };

  const scrollToTextPosition = (index: number) => {
      if (!textareaRef.current || !mainScrollRef.current) return;
      const textarea = textareaRef.current;
      const container = mainScrollRef.current;
      
      // Use preventScroll to avoid browser jump conflict
      textarea.focus({ preventScroll: true }); 
      textarea.setSelectionRange(index, index);
      
      const coords = getCoordinates(textarea, index);
      const containerRect = container.getBoundingClientRect();
      const relativeTop = coords.top - containerRect.top + container.scrollTop;
      
      const targetScrollTop = relativeTop - (container.clientHeight / 3);
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'auto' });
  };

  // Focus on mount
  useEffect(() => {
      if (textareaRef.current) {
          textareaRef.current.focus();
      }
  }, []);

  const handleCriticReview = async () => { 
      if (chapter.content.length < 50) return alert("写多一点再来让主编评估吧！"); if (aiLoading) return;
      const startIdx = chatLogsRef.current.length + 1; setNewTurnStartIndex(startIdx); setAiLoading(true); setIsAiPanelOpen(true); addChatLog({ role: 'assistant', content: '--- 正在进行全篇深度审阅 ---' });
      try {
        const systemPrompt = getEditorSystemPrompt('critic', book.type || 'novel', activeModel, activeSubGenre); const userPrompt = `【标题】：${chapter.title}\n【正文】：\n${chapter.content}`; const aiText = await generateResponse(userPrompt, systemPrompt);
        const loglineMatch = aiText.match(/\/\/\/LOGLINE:\s*(.*?)\/\/\//s); let remainingText = aiText;
        if (loglineMatch && loglineMatch[1]) { const logline = loglineMatch[1].trim(); await new Promise(resolve => setTimeout(resolve, 300)); addChatLog({ role: 'assistant', content: `///LOGLINE_BUBBLE:${logline}` }); remainingText = aiText.replace(/\/\/\/LOGLINE:.*?\/\/\//s, '').trim(); }
        const parts = intelligentSplit(remainingText); for (let i = 0; i < parts.length; i++) { await new Promise(resolve => setTimeout(resolve, i === 0 ? 500 : 800)); if(parts[i].trim()) { addChatLog({ role: 'assistant', content: parts[i] }); } }
      } catch (e: any) { addChatLog({ role: 'assistant', content: `❌ 分析中断: ${getFriendlyErrorMessage(e)}` }); } finally { setAiLoading(false); }
  };

  const handlePartnerChat = async (msg: string) => { 
    if (!msg.trim()) return; const startIdx = chatLogsRef.current.length + 1; setNewTurnStartIndex(startIdx); setAiLoading(true); addChatLog({ role: 'user', content: msg }); setUserInput(''); 
    try {
      const systemPrompt = getEditorSystemPrompt('partner', book.type || 'novel', activeModel, activeSubGenre); const contextSnippet = chapter.content.slice(-3000); const contextPrefix = `[Context: ...${contextSnippet}]\n\n[User Request]: ${msg}`; const aiText = await generateResponse(contextPrefix, systemPrompt);
      const parts = intelligentSplit(aiText); for (const part of parts) { await new Promise(resolve => setTimeout(resolve, 800)); addChatLog({ role: 'assistant', content: part }); }
    } catch (e: any) { addChatLog({ role: 'assistant', content: `❌ 错误: ${getFriendlyErrorMessage(e)}` }); } finally { setAiLoading(false); }
  };

  const handlePolishSelection = async () => { 
      if (!selectedText) return; if (selectedText.length < 5) { setShowShortTextToast(true); setTimeout(() => setShowShortTextToast(false), 3000); return; }
      setIsAiPanelOpen(true); const promptTemplate = `请润色以下段落（可在此补充风格要求，如更简练/更华丽）：\n\n${selectedText}`; setUserInput(promptTemplate);
      setTimeout(() => { if (chatInputRef.current) { chatInputRef.current.focus(); chatInputRef.current.setSelectionRange(0, 0); } }, 300);
  };


  const updateSynopsis = (text: string) => { let clean = text; clean = clean.replace('///LOGLINE_BUBBLE:', '').trim(); setChapterSynopsis(clean.slice(0, 200)); const btn = document.activeElement as HTMLElement; if(btn) { const originalText = btn.innerText; btn.innerText = "已更新!"; setTimeout(() => btn.innerText = originalText, 2000); } };
  const [localContent, setLocalContent] = useState(chapter.content);
  
  // Sync local content when chapter changes or external updates occur
  useEffect(() => {
    if (chapter.content !== localContent && !isComposing.current) {
        setLocalContent(chapter.content);
    }
  }, [chapter.content, chapter.id]);

  const handleCompositionStart = () => { isComposing.current = true; };
  
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => { 
      isComposing.current = false; 
      // Ensure we sync the final composed text
      const val = e.currentTarget.value;
      setLocalContent(val);
      setChapterContent(val, false); 
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { 
      const val = e.target.value;
      
      // Preserve scroll position if we are about to clear highlight
      // This prevents the "jump to bottom" bug when the highlight span is removed
      if (highlightRange && mainScrollRef.current) {
          const currentScrollTop = mainScrollRef.current.scrollTop;
          requestAnimationFrame(() => {
              if (mainScrollRef.current) {
                  mainScrollRef.current.scrollTop = currentScrollTop;
              }
          });
      }

      setLocalContent(val);
      setHighlightRange(null); // Clear highlight on edit
      
      // Only propagate to parent if not composing (for CJK input safety)
      if (!isComposing.current) {
          setChapterContent(val, false); 
      }
      resetIdleTimer(); 
  };
  const availableModels = getAvailableModels(settings);
  const commonTextStyle: React.CSSProperties = { fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight, fontFamily: settings.fontFamily === 'serif' ? '"Noto Serif SC", serif' : '"Noto Sans SC", sans-serif', padding: 0, border: 0, width: '100%', resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', outline: 'none', background: 'transparent' };
  const currentTagName = UNIFIED_GENRES.find(t => t.id === activeSubGenre)?.name.split('/')[0] || '通用';

  // --- Universal Export Handler ---
  const handleExport = async (format: 'txt' | 'epub' | 'pdf' = 'txt') => {
      const exportTitle = `${book.title}_${chapter.title}`;

      const doExport = async () => {
          if (format === 'txt') {
              const fullText = `【${chapter.title}】\n\n${chapter.content}`;
              const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${exportTitle}.txt`;
              link.click();
              URL.revokeObjectURL(url);
          } else if (format === 'pdf') {
              // Real PDF Export using html2canvas + jsPDF
             const element = document.createElement('div');
             element.style.position = 'absolute';
             element.style.left = '-9999px';
             element.style.top = '0';
             element.style.width = '210mm'; // A4 width
             element.innerHTML = `
                <div style="font-family: 'Noto Serif SC', serif; padding: 40px; color: #333; background: white;">
                  <h1 style="text-align: center; font-size: 24px; margin-bottom: 40px;">${chapter.title}</h1>
                  ${chapter.content.split('\n').filter(line => line.trim()).map(p => `<p style="line-height: 1.8; text-indent: 2em; margin-bottom: 1em; font-size: 18px; text-align: justify;">${p}</p>`).join('')}
                </div>
             `;
             document.body.appendChild(element);

             try {
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                
                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 0) {
                    position -= pageHeight; // Move image up
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                pdf.save(`${exportTitle}.pdf`);
             } finally {
                document.body.removeChild(element);
             }

          } else if (format === 'epub') {
              // Real EPUB Export using JSZip (Single Chapter)
              const zip = new JSZip();
              zip.file("mimetype", "application/epub+zip");
              
              zip.folder("META-INF")?.file("container.xml", `<?xml version="1.0"?>
                <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                    <rootfiles>
                        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                    </rootfiles>
                </container>`);

              const oebps = zip.folder("OEBPS");
              
              // Single Chapter HTML
              const filename = `chapter_1.html`;
              const content = `<?xml version="1.0" encoding="utf-8"?>
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head><title>${chapter.title}</title></head>
                <body>
                    <h2>${chapter.title}</h2>
                    ${chapter.content.split('\n').filter(l => l.trim()).map(p => `<p>${p}</p>`).join('')}
                </body>
                </html>`;
              oebps?.file(filename, content);

              // Content.opf
              const opfContent = `<?xml version="1.0" encoding="utf-8"?>
                <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
                    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
                        <dc:title>${exportTitle}</dc:title>
                        <dc:language>zh-CN</dc:language>
                    </metadata>
                    <manifest>
                        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
                        <item id="ch1" href="${filename}" media-type="application/xhtml+xml"/>
                    </manifest>
                    <spine toc="ncx">
                        <itemref idref="ch1"/>
                    </spine>
                </package>`;
              oebps?.file("content.opf", opfContent);

              // TOC.ncx
              const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
                <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
                    <head><meta name="dtb:uid" content="urn:uuid:12345"/></head>
                    <docTitle><text>${exportTitle}</text></docTitle>
                    <navMap>
                        <navPoint id="navPoint-1" playOrder="1">
                            <navLabel><text>${chapter.title}</text></navLabel>
                            <content src="chapter_1.html"/>
                        </navPoint>
                    </navMap>
                </ncx>`;
              oebps?.file("toc.ncx", ncxContent);

              const zipContent = await zip.generateAsync({ type: "blob" });
              const url = URL.createObjectURL(zipContent);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${exportTitle}.epub`;
              link.click();
              URL.revokeObjectURL(url);
          }
      };

      // Pro Gate
      if (format !== 'txt' && onProAction) {
          onProAction(doExport);
      } else {
          doExport();
      }
  };

  return (
    <div className={`h-full w-full flex flex-col items-center transition-all duration-500 relative overflow-hidden ${focusBgClass}`}>
      {/* ... Effects ... */}
      {showFinishedEffect && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-500 p-6">
           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] border border-white/20 text-center max-w-lg w-full relative overflow-hidden animate-in zoom-in-95">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200" />
              <div className="mb-6 mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center shadow-inner">
                <Trophy size={48} className="text-amber-500 drop-shadow-sm" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-800 serif mb-4 tracking-[0.2em]">{isAnthology ? '文 集 归 档' : '全 书 完 结'}</h2>
              <p className="text-gray-500 text-sm mb-8 font-medium">所有的伟大，都始于落笔的第一字。</p>
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">作品总字数</span><span className="text-xl font-black text-amber-600 font-mono">{finishStats.words.toLocaleString()}</span></div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{isAnthology ? '总篇目数' : '总创作章节'}</span><span className="text-xl font-black text-gray-700 font-mono">{finishStats.chapters}</span></div>
              </div>
              <button onClick={() => setShowFinishedEffect(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg flex items-center justify-center space-x-2"><CheckCircle2 size={18} /><span>归 档 并 返 回</span></button>
           </div>
        </div>
      )}

      {showShortTextToast && (
          <div className="fixed bottom-32 right-10 z-[200] bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl animate-in slide-in-from-bottom-2 fade-in">
              {selectedText.length > 0 ? "文本太短，无法捕捉文风，建议多写两句试试？" : "已生成打印版 HTML，请打开后按 Ctrl+P 另存为 PDF"}
          </div>
      )}

      {showIdleTip && !focusMode && !isAiPanelOpen && (
        <div className="absolute bottom-6 left-6 z-40 animate-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white/90 backdrop-blur-md border border-amber-200 shadow-lg p-3 rounded-2xl max-w-xs flex items-start space-x-3">
                <div className="bg-amber-100 p-1.5 rounded-full mt-0.5 shrink-0"><Lightbulb size={14} className="text-amber-600" /></div>
                <div className="flex-grow"><p className="text-xs text-gray-700 leading-relaxed font-medium">{currentTip}</p></div>
                <button onClick={() => setShowIdleTip(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={14} /></button>
            </div>
        </div>
      )}

      {focusMode && (
        <div className="absolute top-0 left-0 right-0 h-1 z-50 bg-gray-100"><div className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-1000" style={{ width: `${activeProgress}%` }} /></div>
      )}

      <div className={`w-full shrink-0 border-b transition-all duration-300 z-40 backdrop-blur-xl ${focusMode ? (isDark ? 'bg-black border-white/5' : (isGreen ? 'bg-[#e8f5e9] border-[#a5d6a7]/30' : 'bg-white border-gray-100')) : (isDark ? 'bg-[#1a1a1a]/95 border-white/5' : (isGreen ? 'bg-[#e8f5e9]/95 border-[#a5d6a7]' : (isCream ? 'bg-[#f8f5f0]/95 border-amber-200' : 'bg-[#f8f5f0]/95 border-amber-500/10'))) }`}>
          <div className="max-w-6xl mx-auto px-4 md:px-10 pt-4 pb-2 md:pt-6 md:pb-4">
            <div className="flex items-center space-x-2 md:space-x-4 mb-2 md:mb-4">
                <div className="flex-grow flex items-center">
                  <input value={chapter.title} onChange={(e) => setChapterTitle(e.target.value)} placeholder={isAnthology ? "请输入篇目标题" : "请输入章节标题"} className={`w-full bg-transparent border-none focus:outline-none text-xl md:text-2xl font-black serif tracking-tight ${textColors[effectiveTheme as keyof typeof textColors]} placeholder:text-gray-300 ${caretClass}`} />
                </div>
                <div className="flex items-center space-x-1 shrink-0 relative" ref={exportMenuRef}>
                  {showExportTip && !showExportMenu && <div className="absolute top-full right-0 mt-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg z-50 animate-bounce whitespace-nowrap after:content-[''] after:absolute after:bottom-full after:right-3 after:border-[6px] after:border-transparent after:border-b-red-500">建议写完定期备份</div>}
                  
                  {/* Proofread Button */}
                  <button id="btn-proofread" onClick={() => handleProofread(false)} disabled={proofreadLoading} className={`p-2 transition-colors rounded-lg relative group ${isGreen ? 'text-[#2e7d32]/70 hover:bg-[#c8e6c9] hover:text-[#1b5e20]' : 'text-gray-300 hover:text-emerald-600 hover:bg-emerald-50'}`} title="智能捉虫">
                      <Bug size={18} className={proofreadLoading ? "animate-pulse text-emerald-500" : ""} />
                  </button>

                  {/* Deep Critique Button */}
                  <button id="btn-critique" onClick={() => handleDeepCritique(false)} disabled={critiqueLoading} className={`p-2 transition-colors rounded-lg relative group ${isGreen ? 'text-[#2e7d32]/70 hover:bg-[#c8e6c9] hover:text-[#1b5e20]' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'}`} title="深度精修">
                      <FileSearch size={18} className={critiqueLoading ? "animate-pulse text-blue-500" : ""} />
                  </button>

                  <button id="btn-export-menu" onClick={() => setShowExportMenu(!showExportMenu)} className={`p-2 transition-colors rounded-lg relative ${iconBtnClass}`} title="导出与完结"><FileOutput size={18} />{showExportTip && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}</button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <button onClick={() => {handleExport('txt'); setShowExportMenu(false);}} className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center"><FileText size={14} className="mr-2"/> 导出 TXT <span className="ml-auto text-[9px] text-gray-300">免费</span></button>
                        <button onClick={() => {handleExport('epub'); setShowExportMenu(false);}} className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center"><FileUp size={14} className="mr-2"/> 导出 EPUB {!isPro && <Crown size={12} className="ml-auto text-amber-500" fill="currentColor" />}</button>
                        <button onClick={() => {handleExport('pdf'); setShowExportMenu(false);}} className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center"><FileType size={14} className="mr-2"/> 导出 PDF {!isPro && <Crown size={12} className="ml-auto text-amber-500" fill="currentColor" />}</button>
                        <div className="h-px bg-gray-100 my-1 mx-2" />
                        <button onClick={handleTriggerFinish} className="w-full text-left px-3 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center group/finish">
                            <Trophy size={14} className="mr-2 group-hover/finish:scale-110 transition-transform"/> 完结作品
                        </button>
                    </div>
                  )}
                  <button onClick={() => setSynopsisExpanded(!synopsisExpanded)} className={`p-2 transition-colors rounded-lg ${iconBtnClass}`}>{synopsisExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
                </div>
            </div>
            {synopsisExpanded && (
                <div className="relative group">
                    <textarea 
                      value={chapter.synopsis} 
                      onChange={(e) => setChapterSynopsis(e.target.value)} 
                      placeholder={isAnthology ? "本篇导语（50-100 字）" : "本章梗概（50 字左右）"} 
                      className={`w-full h-14 rounded-xl p-3 text-xs border resize-none focus:outline-none transition-all custom-scrollbar leading-relaxed pr-8 ${synopsisClass}`} 
                    />
                </div>
            )}
          </div>
      </div>

      <div className="flex-grow w-full relative h-full flex flex-row overflow-hidden">
        {/* Scrollable Editor Area */}
        <div ref={mainScrollRef} className="flex-grow h-full overflow-y-auto custom-scrollbar">
            <div id="editor-area" className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10 min-h-full flex flex-col relative">
            <div className="grid text-base" style={{ minHeight: '50vh' }}>
                <div aria-hidden="true" style={{ ...commonTextStyle, visibility: 'visible', gridArea: '1 / 1 / 2 / 2', pointerEvents: 'none', color: 'transparent', zIndex: 0 }}>
                    {localContent.substring(0, highlightRange?.start || 0)}
                    {highlightRange && (
                        <span id="highlight-target" className="bg-yellow-200/50">
                            {localContent.substring(highlightRange.start, highlightRange.end)}
                        </span>
                    )}
                    {localContent.substring(highlightRange?.end || 0)}
                </div>
                <textarea
                    ref={textareaRef}
                    value={localContent}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    onChange={handleChange}
                    onSelect={handleSelectionChange}
                    onMouseUp={handleSelectionChange} 
                    onKeyUp={handleSelectionChange}
                    placeholder="笔耕不辍，字字千金..."
                    style={{ ...commonTextStyle, gridArea: '1 / 1 / 2 / 2', zIndex: 10 }}
                    className={`${textColors[effectiveTheme as keyof typeof textColors]} ${selectionColors[effectiveTheme as keyof typeof textColors]} placeholder:text-gray-200 ${caretClass}`}
                    spellCheck={false}
                />
            </div>
            <div className="h-[20vh] pointer-events-none" />
            
            {polishBtnPos && !showProofreadPanel && !showCritiquePanel && (
                <div 
                    className="fixed z-[9999] pointer-events-auto animate-in zoom-in duration-200" 
                    style={{ left: polishBtnPos.x, top: polishBtnPos.y }}
                >
                    <button 
                        onMouseDown={(e) => {
                            e.preventDefault(); 
                            handlePolishSelection();
                        }}
                        className="flex items-center space-x-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all text-[10px] font-bold border border-white/10"
                    >
                        <Sparkles size={12} className="text-amber-400" />
                        <span>AI 润色</span>
                    </button>
                </div>
            )}

            {!focusMode && (
                <>
                <div className="flex justify-center pb-8">
                    <button onClick={() => onAddNextChapter('')} className={`px-6 py-3 bg-gray-50 text-gray-400 rounded-full border border-dashed border-gray-200 transition-all text-xs font-bold flex items-center space-x-2 ${isGreen ? 'hover:bg-[#c8e6c9]/30 hover:text-[#1b5e20] hover:border-[#a5d6a7]' : 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300'}`}>
                    {isAnthology ? <><Sparkles size={14} /><span>开启新一篇创作</span></> : <><ChevronDown size={14} /><span>创建下一章</span></>}
                    </button>
                </div>
                <div className="text-center pb-20 text-[10px] text-gray-300 select-none font-medium tracking-widest opacity-60">
                    AI 责编的建议仅供参考，你才是自己文字的主人
                </div>
                </>
            )}
            </div>
        </div>

        {/* MiniMap (Fixed Overlay, not scrolling with content) */}
        {!focusMode && markers.length > 0 && (
            <MiniMap 
                markers={markers} 
                totalLength={chapter.content.length || 1} 
                onScrollTo={handleScrollTo} 
            />
        )}
      </div>

      {/* Floating Marker Button (Fab) */}
      {!focusMode && !showMarkerMenu && (
          <button 
            id="btn-marker-fab"
            onClick={() => setShowMarkerMenu(true)}
            className={`fixed z-50 p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 ${
                isGreen 
                ? 'bg-[#43a047] text-white shadow-[#43a047]/30' 
                : (isDark ? 'bg-[#333] text-gray-300 border border-white/10' : 'bg-white text-gray-500 border border-gray-200 hover:text-amber-600')
            }`}
            style={{ bottom: '100px', right: '2rem' }}
            title="插入创作锚点"
          >
              <Anchor size={20} />
          </button>
      )}

      {/* Marker Menu Overlay */}
      {showMarkerMenu && (
          <div className="fixed z-50 flex flex-col items-end space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-200" style={{ bottom: '100px', right: '2rem' }}>
              <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 space-y-1 w-32 backdrop-blur-sm">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-2 mb-1">插入锚点</p>
                  <button onClick={() => insertMarker('fix')} className="w-full flex items-center px-2 py-2 text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                      <PenTool size={14} className="mr-2 text-red-500" /> 待重写
                  </button>
                  <button onClick={() => insertMarker('research')} className="w-full flex items-center px-2 py-2 text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-500 rounded-lg transition-colors">
                      <Search size={14} className="mr-2 text-blue-500" /> 需查阅
                  </button>
                  <button onClick={() => insertMarker('note')} className="w-full flex items-center px-2 py-2 text-xs font-bold text-gray-600 hover:bg-amber-50 hover:text-amber-500 rounded-lg transition-colors">
                      <StickyNote size={14} className="mr-2 text-amber-500" /> 灵感备注
                  </button>
              </div>
              <button 
                onClick={() => setShowMarkerMenu(false)}
                className="p-3 bg-gray-900 text-white rounded-full shadow-xl hover:bg-black transition-transform active:scale-95"
              >
                  <X size={20} />
              </button>
          </div>
      )}

      {/* ... (AI Panels omitted for brevity, kept exactly as previous) ... */}
      {/* ... (AI Assistant Toggle and Panel code identical to previous version) ... */}
      
      {/* --- AI PANEL START (Collapsed for brevity, using same logic as previous) --- */}
      {/* AI Assistant Toggle Button */}
      {!focusMode && !isAiPanelOpen && selectedText.length === 0 && (
          <button 
            id="ai-assistant-toggle"
            onMouseDown={handleMouseDownBtn}
            onClick={handleBtnClick}
            style={{ position: 'fixed', left: btnPos.x, top: btnPos.y, zIndex: 100 }}
            className="w-12 h-12 bg-gray-900 text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-transform flex items-center justify-center border-2 border-white/10 group overflow-hidden hover:w-32 cursor-grab active:cursor-grabbing"
          >
            <BrainCircuit size={20} className="shrink-0" />
            <span className="w-0 overflow-hidden group-hover:w-auto group-hover:ml-2 text-xs font-bold whitespace-nowrap transition-all duration-300 pointer-events-none">责编助手</span>
          </button>
      )}

      {/* Proofread Panel */}
      {showProofreadPanel && (
        <div className={`fixed top-24 right-10 w-72 shadow-2xl rounded-2xl border z-[120] animate-in slide-in-from-right-10 fade-in duration-300 flex flex-col max-h-[600px] ${panelBgClass} ${isGreen ? 'border-green-200' : (isDark ? 'border-emerald-900/30' : 'border-emerald-100')}`}>
            <div className={`p-3 border-b flex justify-between items-center rounded-t-2xl ${isDark ? 'bg-emerald-900/20 border-emerald-900/30' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center space-x-2 font-bold text-emerald-600 text-xs"><Bug size={14}/><span>智能捉虫</span></div>
                <div className="flex space-x-1">
                    <button onClick={() => handleProofread(true)} className="p-1 hover:bg-emerald-100/50 rounded-lg text-emerald-600 transition-colors" title="重新扫描"><RefreshCw size={12} className={proofreadLoading ? "animate-spin" : ""} /></button>
                    <button onClick={() => setShowProofreadPanel(false)} className="p-1 hover:bg-emerald-100/50 rounded-lg text-emerald-600 transition-colors"><X size={12} /></button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-3 custom-scrollbar">
                {proofreadLoading ? (
                    <div className="text-center py-10 text-gray-400 flex flex-col items-center text-xs"><Loader2 size={16} className="animate-spin mb-2"/>正在扫描全文...</div>
                ) : proofreadResults.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs">🎉 太棒了！未发现明显错误。</div>
                ) : (
                    <div className="space-y-2">
                        {proofreadResults.map(item => (
                            <div key={item.id} className={`p-2.5 rounded-xl border shadow-sm group hover:border-emerald-200 transition-colors ${panelItemBgClass}`}>
                                <div className="flex items-start justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/50 px-1.5 py-0.5 rounded-md">{item.reason}</span>
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => locateCorrection(item)} className="p-1 hover:bg-gray-100/50 rounded text-gray-400 hover:text-gray-600" title="定位"><Target size={12}/></button>
                                        <button onClick={(e) => ignoreCorrection(e, item.id, item.original)} className="p-1 hover:bg-gray-100/50 rounded text-gray-400 hover:text-gray-600" title="忽略"><X size={12}/></button>
                                        <button onClick={(e) => applyCorrection(e, item)} className="p-1 hover:bg-emerald-100/50 rounded text-emerald-500 hover:text-emerald-700" title="采纳"><Check size={12}/></button>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 line-through mb-1 truncate">{item.original}</div>
                                <div className={`text-xs font-bold ${panelTextClass}`}>{item.suggestion}</div>
                            </div>
                        ))}
                        <div className="pt-4 pb-2 px-2 text-[10px] text-gray-400 text-center leading-relaxed border-t border-gray-50/10 mt-2">
                           ⚠️ AI 建议仅供参考，您才是作品的主人。<br/>
                           请根据语境判断是否采纳。
                        </div>
                    </div>
                )}
            </div>

        </div>
      )}

      {/* Deep Critique Panel */}
      {showCritiquePanel && (
        <div className={`fixed top-24 right-10 w-80 shadow-2xl rounded-2xl border z-[120] animate-in slide-in-from-right-10 fade-in duration-300 flex flex-col max-h-[600px] ${panelBgClass} ${isGreen ? 'border-green-200' : (isDark ? 'border-blue-900/30' : 'border-blue-100')}`}>
            <div className={`p-3 border-b flex justify-between items-center rounded-t-2xl ${isDark ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-center space-x-2 font-bold text-blue-600 text-xs"><FileSearch size={14}/><span>深度精修</span></div>
                <div className="flex space-x-1">
                    <button onClick={() => handleDeepCritique(true)} className="p-1 hover:bg-blue-100/50 rounded-lg text-blue-600 transition-colors" title="重新分析"><RefreshCw size={12} className={critiqueLoading ? "animate-spin" : ""} /></button>
                    <button onClick={() => setShowCritiquePanel(false)} className="p-1 hover:bg-blue-100/50 rounded-lg text-blue-600 transition-colors"><X size={12} /></button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-3 custom-scrollbar">
                {critiqueLoading ? (
                     <div className="text-center py-10 text-gray-400 flex flex-col items-center text-xs"><Loader2 size={16} className="animate-spin mb-2"/>主编正在深度审阅...</div>
                ) : critiqueResults.length === 0 ? (
                     <div className="text-center py-10 text-gray-400 text-xs">暂无分析结果。</div>
                ) : (
                     <div className="space-y-2">
                        {critiqueResults.map(item => (
                            <div key={item.id} className={`p-3 rounded-xl border shadow-sm hover:border-blue-200 transition-colors ${panelItemBgClass}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                                        <span className={`text-xs font-bold ${panelTextClass}`}>{item.tag || '深度批注'}</span>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => locateCorrection(item)} className="p-1 hover:bg-gray-100/50 rounded text-gray-400 hover:text-gray-600" title="定位"><Target size={12}/></button>
                                        <button onClick={(e) => ignoreCritique(e, item.id, item.tag)} className="p-1 hover:bg-gray-100/50 rounded text-gray-400 hover:text-gray-600" title="忽略/不改"><X size={12}/></button>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 italic mb-2 border-l-2 border-gray-200 pl-2 line-clamp-2">"{item.quote}"</div>
                                <div className={`text-xs leading-relaxed ${panelTextClass}`}><ReactMarkdown>{item.advice || item.content || item.suggestion}</ReactMarkdown></div>
                            </div>
                        ))}
                        <div className="pt-4 pb-2 px-2 text-[10px] text-gray-400 text-center leading-relaxed border-t border-gray-50/10 mt-2">
                           ⚠️ AI 建议仅供参考，您才是作品的主人。<br/>
                           请根据语境判断是否采纳。
                        </div>
                     </div>
                )}
            </div>
        </div>
      )}
      {isAiPanelOpen && (
        <div 
            style={{ top: panelRect.y, left: panelRect.x, width: panelRect.w, height: panelRect.h, position: 'fixed' }}
            className={`z-[110] overflow-hidden flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.2)] rounded-2xl border animate-in fade-in zoom-in-95 duration-200 ${panelBgClass} ${panelBorderClass}`}
        >
            <div onMouseDown={handleMouseDownHeader} className={`px-5 py-3 flex justify-between items-center shrink-0 cursor-move select-none ${isDark ? 'bg-black/40 border-b border-white/5 text-gray-200' : 'bg-gray-900 text-white'}`}>
                <div className="flex items-center space-x-2 pointer-events-none"><Bot size={18} className="text-amber-400" /> <span className="text-xs font-black uppercase tracking-widest">智能责编中心</span></div>
                <div className="flex items-center space-x-1" onMouseDown={(e) => e.stopPropagation()}><button onClick={() => setIsAiPanelOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors pointer-events-auto"><X size={18} /></button></div>
            </div>


                <div className={`border-b p-4 shrink-0 space-y-3 relative ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                   <div className="flex items-center space-x-2">
                       <div className={`flex items-center space-x-1 border rounded-lg px-2 py-1.5 shadow-sm flex-grow relative group/model ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                          {isEditingModel ? (
                              <div className="flex items-center w-full">
                                  <Bot size={12} className="text-gray-400 shrink-0 mr-1" />
                                  <input 
                                    autoFocus
                                    value={activeModel}
                                    onChange={(e) => setActiveModel(e.target.value)}
                                    onBlur={() => { if(!activeModel.trim()) setActiveModel(settings.ai?.model || 'gemini-2.0-flash'); setIsEditingModel(false); }}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingModel(false)}
                                    className={`bg-transparent text-[10px] font-bold focus:outline-none w-full ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                                    placeholder="输入模型ID..."
                                  />
                              </div>
                          ) : (
                              <>
                                  <Bot size={12} className="text-gray-400 shrink-0" />
                                  <select 
                                    value={activeModel} 
                                    onChange={(e) => { if(e.target.value === 'custom_entry') { setIsEditingModel(true); } else { setActiveModel(e.target.value); } }} 
                                    className={`bg-transparent text-[10px] font-bold focus:outline-none w-full truncate appearance-none ${isDark ? 'text-gray-300' : 'text-gray-600'} [&>option]:text-gray-800`}
                                  >
                                      {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                      <option value="custom_entry">+ 手动输入模型ID</option>
                                  </select>
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown size={10} className="text-gray-400" /></div>
                              </>
                          )}
                       </div>
                       <button onClick={() => setShowGenreSelector(!showGenreSelector)} className={`flex items-center space-x-1 border rounded-lg px-2 py-1.5 shadow-sm hover:border-amber-400 hover:text-amber-700 transition-colors ${isDark ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-white border-gray-200'}`}><Tag size={12} className="text-gray-400 shrink-0" /><span className="text-[10px] font-bold truncate max-w-[60px]">{currentTagName}</span><ChevronDown size={10} className="text-gray-400" /></button>
                   </div>
                   {showGenreSelector && (
                       <div className={`absolute top-14 left-2 right-2 rounded-xl shadow-xl border p-2 z-20 animate-in fade-in zoom-in-95 grid grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#2c2c2e] border-white/10' : 'bg-white border-gray-100'}`}>
                            <div className="col-span-3 text-[9px] font-bold text-gray-400 px-1 uppercase tracking-widest mb-1">切换当前流派 Prompt</div>
                            {UNIFIED_GENRES.map(tag => ( <button key={tag.id} onClick={() => { setActiveSubGenre(tag.id); setShowGenreSelector(false); }} className={`px-1 py-2 rounded-lg text-[10px] font-bold border transition-all truncate ${activeSubGenre === tag.id ? 'bg-amber-500/20 border-amber-500/50 text-amber-600' : (isDark ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100')}`}>{tag.name.split('/')[0]}</button> ))}
                       </div>
                   )}
                   <button onClick={() => handleCriticReview()} disabled={aiLoading} className={`relative w-full py-3 border rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-70 disabled:grayscale flex items-center justify-center space-x-2 group ${isDark ? 'bg-amber-900/20 border-amber-900/30 text-amber-500' : 'bg-white border-amber-200 text-amber-900'}`}>
                      {aiLoading ? <Loader2 size={16} className="animate-spin text-amber-600" /> : <LayoutDashboard size={16} className="text-amber-600 group-hover:scale-110 transition-transform" />}
                      <span>{aiLoading ? '主编正在审阅...' : (isAnthology ? '本篇导语与点评' : '本章梗概与点评')}</span>
                   </button>
                </div>
                
                <div className={`flex-grow overflow-y-auto p-5 space-y-5 custom-scrollbar relative ${panelBgClass}`} onClick={() => setShowGenreSelector(false)}>
                    <div ref={chatTopRef} />
                    {chatLogs.length === 0 && <div className="text-center py-10 text-gray-300"><Move size={32} className="mx-auto mb-3 opacity-20" /><p className="text-xs font-medium">拖拽标题栏可移动窗口</p></div>}
                    {chatLogs.map((msg, i) => { const isLogline = msg.content.startsWith('///LOGLINE_BUBBLE:'); const bubbleContent = isLogline ? msg.content.replace('///LOGLINE_BUBBLE:', '') : msg.content; return ( <div key={i} ref={el => { messageRefs.current[i] = el; }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}> <div className={`flex items-start space-x-2 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}> {msg.role !== 'user' && (<div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-1 ${isLogline ? 'bg-amber-100 text-amber-600' : (msg.content.includes('数据安全') ? 'bg-blue-100 text-blue-500' : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'))}`}>{isLogline ? <Sparkles size={14} /> : (msg.content.includes('数据安全') ? <ShieldCheck size={14} /> : <Bot size={14} />)}</div>)} <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-amber-50 text-amber-900 border border-amber-100' : isLogline ? 'bg-amber-50/50 border border-amber-200 shadow-sm' : msg.content.includes('数据安全') ? 'bg-blue-50 border border-blue-100 text-gray-700' : (isDark ? 'bg-white/5 border border-white/5 text-gray-300' : 'bg-white border border-gray-100 text-gray-700 shadow-sm')}`}> {isLogline ? (<div className="space-y-3"><div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center"><Sparkles size={10} className="mr-1" />{isAnthology ? '推荐导语' : '本章梗概'}</div><div className="text-gray-800 font-medium font-serif leading-relaxed italic border-l-2 border-amber-300 pl-2">"{bubbleContent.trim()}"</div><button onClick={() => updateSynopsis(bubbleContent)} className="w-full text-[10px] py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 transition-colors flex items-center justify-center space-x-1"><Pencil size={10} /> <span>{isAnthology ? '一键填充到导语栏' : '一键填充到梗概栏'}</span></button></div>) : (<ReactMarkdown components={{ strong: ({node, ...props}) => <span className="font-black text-amber-900 drop-shadow-[0_0_1px_rgba(245,158,11,0.2)]" {...props} />, p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />, ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 pl-2" {...props} />, ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 pl-2" {...props} />, li: ({node, ...props}) => <li className="mb-1" {...props} />, h1: ({node, ...props}) => <h3 className="text-base font-black mt-4 mb-2" {...props} />, h2: ({node, ...props}) => <h4 className="text-sm font-bold mt-3 mb-2" {...props} />, h3: ({node, ...props}) => <h5 className="text-xs font-bold mt-2 mb-1" {...props} /> }}>{bubbleContent}</ReactMarkdown>)} </div> </div> </div> )})}
                    {aiLoading && <div className="flex justify-start pl-9 animate-in fade-in slide-in-from-bottom-2"><div className={`px-4 py-3 rounded-2xl border flex items-center space-x-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}><div className="flex space-x-1"><div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[100px]">{loadingMsg}</span></div></div>}
                    <div ref={chatEndRef} />
                </div>
                <div className={`p-4 border-t shrink-0 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`} onClick={() => setShowGenreSelector(false)}>
                  <div className={`flex items-center space-x-2 p-2 rounded-2xl border focus-within:border-amber-400 transition-colors ${isDark ? 'bg-black/20 border-white/10 focus-within:bg-black/40' : 'bg-gray-50 border-gray-200 focus-within:bg-white'}`}>
                    <textarea ref={chatInputRef} value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handlePartnerChat(userInput); } }} placeholder="Enter 换行，Ctrl + Enter 发送" className={`flex-grow bg-transparent text-xs p-2 focus:outline-none resize-none h-12 custom-scrollbar placeholder:text-gray-400 ${isDark ? 'text-gray-300' : 'text-gray-800'}`} />
                    <button onClick={() => handlePartnerChat(userInput)} disabled={!userInput.trim() || aiLoading} className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 flex flex-col items-center justify-center h-full min-w-[40px]" title="发送 (Ctrl+Enter)">
                        <Send size={14} /><span className="text-[8px] font-bold mt-0.5 opacity-60">SEND</span>
                    </button>
                  </div>
                </div>

            <div onMouseDown={handleMouseDownResize} className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-0.5 text-gray-300 hover:text-amber-500"><div className="w-2 h-2 bg-current rounded-full opacity-50" /></div>
        </div>
      )}
      
      {!focusMode && <OnboardingTour steps={EDITOR_STEPS} storageKey={EDITOR_TOUR_KEY} />}
    </div>
  );
};

export default Editor;
