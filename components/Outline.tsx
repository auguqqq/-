
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, GripVertical, Trash2, Download, FileText, Sparkles, Loader2, Info } from 'lucide-react';
import { Chapter, Book, AppSettings, AIConfig } from '../types';
import { GoogleGenAI } from "@google/genai";

interface OutlineProps {
  chapters: Chapter[];
  currentChapterId: string;
  onSelectChapter: (id: string) => void;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  bookId: string;
  settings: AppSettings;
  bookSummary: string;
  onUpdateSummary: (summary: string) => void;
  isAnthology?: boolean;
}

// Retry Helper
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = 
        error.status === 429 || 
        error.code === 429 || 
        (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));
    
    if (retries > 0 && isRateLimit) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const fetchOpenAICompatible = async (config: AIConfig, messages: any[]) => {
  let baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
  if (baseUrl.endsWith('/chat/completions')) {
    baseUrl = baseUrl.substring(0, baseUrl.length - '/chat/completions'.length);
  }

  const payload: any = {
    model: config.model || 'gpt-3.5-turbo',
    messages: messages
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
      if (response.status === 429) throw { status: 429 };
      throw new Error(`请求失败 (${response.status})`);
  }
  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

const Outline: React.FC<OutlineProps> = ({ chapters, currentChapterId, onSelectChapter, setBooks, bookId, settings, bookSummary, onUpdateSummary, isAnthology = false }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Theme Detection
  const [isSystemDark, setIsSystemDark] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsSystemDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }
  }, []);

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);
  const isGreen = settings.theme === 'green';

  // Hover Tooltip State
  const [hoveredSynopsis, setHoveredSynopsis] = useState<{ id: string, text: string, top: number, left: number } | null>(null);
  const synopsisRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addChapter = () => {
    const nextNum = chapters.length + 1;
    const newId = `chapter-${Date.now()}`;
    const newChapter: Chapter = {
      id: newId,
      title: isAnthology ? '新篇章' : `第 ${nextNum} 章`,
      content: '',
      synopsis: '',
      lastModified: Date.now()
    };
    
    setBooks(prev => prev.map(b => 
      b.id === bookId ? { ...b, chapters: [...b.chapters, newChapter], currentChapterId: newId } : b
    ));
    onSelectChapter(newId);
  };

  const removeChapter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (chapters.length <= 1) return;
    if (!confirm(isAnthology ? '确定删除这篇作品吗？' : '确定删除该章节吗？内容将无法恢复。')) return;

    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        const remaining = b.chapters.filter(c => c.id !== id);
        return { 
          ...b, 
          chapters: remaining,
          currentChapterId: id === b.currentChapterId ? remaining[0].id : b.currentChapterId
        };
      }
      return b;
    }));
  };

  const exportChapter = (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation();
    const text = `${chapter.title}\n\n${chapter.content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chapter.title}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateChapterField = (id: string, field: 'title' | 'synopsis', value: string) => {
    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        return {
          ...b,
          chapters: b.chapters.map(c => c.id === id ? { ...c, [field]: value } : c)
        };
      }
      return b;
    }));
  };

  const handleGenerateSummary = async () => {
      if (!settings.ai.apiKey) return alert("请先在设置中配置 API Key");
      
      setIsGeneratingSummary(true);
      setGenerationError(null);
      
      try {
          const sample = chapters.map(c => c.content).join('\n').slice(0, 15000);
          const prompt = isAnthology 
            ? `请阅读以下短篇小说集的内容片段，生成一段 100-300 字的精炼简介，概括这些故事的整体风格、主题共性或精彩之处。文本：${sample}`
            : `请阅读以下小说文本，生成一段 100-300 字的精炼故事简介，概括核心情节和人物关系。文本：${sample}`;
          
          let result = "";

          if (settings.ai.provider === 'gemini') {
              const ai = new GoogleGenAI({ apiKey: settings.ai.apiKey });
              // Apply retry wrapper
              const response = await withRetry(async () => {
                  return await ai.models.generateContent({
                    model: settings.ai.model || 'gemini-3-flash-preview',
                    contents: prompt,
                    config: { maxOutputTokens: 500 }
                  });
              });
              result = response.text || "";
          } else {
              // Apply retry wrapper
              result = await withRetry(() => fetchOpenAICompatible(settings.ai, [{ role: 'user', content: prompt }]));
          }

          if (result) {
              onUpdateSummary(result);
          } else {
              throw new Error("API 返回为空");
          }
      } catch (e: any) {
          console.error(e);
          let msg = "生成失败，请检查网络";
          const rawMsg = e.message || "";
          
          if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
              msg = "API 配额不足，请稍后再试";
          } else if (rawMsg.includes('404')) {
              msg = "模型未找到";
          } else if (rawMsg.includes('403')) {
              msg = "鉴权失败";
          }
          
          setGenerationError(msg);
          setTimeout(() => setGenerationError(null), 4000);
      } finally {
          setIsGeneratingSummary(false);
      }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        const newChapters = [...b.chapters];
        const [movedChapter] = newChapters.splice(draggedIndex, 1);
        newChapters.splice(targetIndex, 0, movedChapter);
        return { ...b, chapters: newChapters };
      }
      return b;
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSynopsisMouseEnter = (id: string, text: string) => {
      if (!text || text.length < 1) return; 
      
      const el = synopsisRefs.current[id];
      if (document.activeElement === el) return;

      if (el) {
          const isOverflowing = el.scrollWidth > el.clientWidth;
          if (isOverflowing || text.length > 8) {
             const rect = el.getBoundingClientRect();
             setHoveredSynopsis({ id, text, top: rect.bottom + 8, left: rect.left });
          }
      }
  };

  const containerClass = isGreen ? 'bg-[#e8f5e9]' : (isDark ? 'bg-[#111]' : 'bg-gray-50/50');
  const headerClass = isGreen ? 'bg-[#e8f5e9] border-green-100' : (isDark ? 'bg-[#1c1c1e] border-white/5' : 'border-gray-100 bg-white');
  const textClass = isGreen ? 'text-emerald-900' : (isDark ? 'text-gray-200' : 'text-gray-700');
  const mutedTextClass = isGreen ? 'text-emerald-700/60' : (isDark ? 'text-gray-500' : 'text-gray-400');

  return (
    <div className={`h-full flex flex-col relative transition-colors duration-300 ${containerClass}`}>
      <div className={`flex flex-col p-4 pb-2 border-b shrink-0 ${headerClass}`}>
        <div className="flex justify-between items-center mb-3">
            <span className={`text-xs font-black uppercase tracking-widest flex items-center ${mutedTextClass}`}>
                <FileText size={12} className="mr-1.5" /> {isAnthology ? '篇目列表' : '故事脉络'}
            </span>
            <button 
                onClick={addChapter}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 ${
                    isGreen 
                    ? 'bg-[#66bb6a] text-white hover:bg-[#43a047] shadow-[#a5d6a7]'
                    : (isDark ? 'bg-white text-black hover:bg-gray-200 shadow-white/5' : 'bg-gray-900 text-white hover:bg-black shadow-gray-200')
                }`}
            >
                <Plus size={14} />
                <span>{isAnthology ? '新篇' : '新章'}</span>
            </button>
        </div>
        
        {!isAnthology && (
            <div className={`rounded-xl p-3 border text-xs transition-colors ${
                isGreen
                ? 'bg-[#a5d6a7]/30 border-[#a5d6a7]/50 text-[#1b5e20]'
                : (isDark 
                    ? (generationError ? 'border-red-900/50 bg-red-900/10' : 'bg-amber-900/10 border-amber-700/20 text-amber-200/80')
                    : (generationError ? 'border-red-200 bg-red-50' : 'bg-amber-50 border-amber-100 text-amber-900/70')
                )
            }`}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`font-bold flex items-center ${
                        isGreen ? 'text-[#2e7d32]' : (isDark 
                        ? (generationError ? 'text-red-400' : 'text-amber-500') 
                        : (generationError ? 'text-red-700' : 'text-amber-800'))
                    }`}>
                        <Info size={12} className="mr-1"/> {generationError ? '生成错误' : '全书简介'}
                    </span>
                    <button 
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary}
                        className={`text-[10px] px-2 py-0.5 rounded-md transition-colors flex items-center disabled:opacity-50 ${
                            isGreen
                            ? 'bg-white/80 border-[#a5d6a7] text-[#2e7d32] hover:bg-[#c8e6c9]'
                            : (isDark 
                                ? 'bg-transparent border border-amber-500/30 text-amber-400 hover:bg-amber-900/30'
                                : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-100')
                        }`}
                    >
                        {isGeneratingSummary ? <Loader2 size={10} className="animate-spin mr-1"/> : <Sparkles size={10} className="mr-1"/>}
                        {bookSummary ? '重新生成' : 'AI生成'}
                    </button>
                </div>
                <p className={`leading-relaxed min-h-[40px] ${
                    isGreen ? 'text-[#2e7d32]/80' : (isDark ? (generationError ? 'text-red-400' : 'text-amber-100/60') : (generationError ? 'text-red-500' : 'text-amber-900/70'))
                }`}>
                    {generationError || bookSummary || "暂无简介，点击生成按钮让 AI 通读全书并总结..."}
                </p>
            </div>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-2 relative" onDragLeave={() => setDragOverIndex(null)}>
        {chapters.map((chapter, idx) => (
          <div 
            key={chapter.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelectChapter(chapter.id)}
            className={`group flex flex-col px-3 py-2.5 rounded-lg transition-all border relative overflow-visible ${
              currentChapterId === chapter.id 
              ? (isGreen
                  ? 'bg-[#a5d6a7] border-[#81c784] text-[#1b5e20] shadow-sm z-10' // Soft Sage Green Background, Dark Green Text
                  : (isDark 
                      ? 'bg-amber-900/20 border-amber-600/40 ring-1 ring-amber-500/10 shadow-sm z-10' 
                      : 'bg-white border-amber-400 ring-1 ring-amber-500/10 shadow-sm z-10')
                )
              : (isGreen
                  ? 'bg-transparent border-transparent hover:bg-[#a5d6a7]/30 hover:border-[#a5d6a7]/50' // Muted hover state
                  : (isDark
                      ? 'bg-[#1c1c1e] border-white/5 hover:border-amber-700/50 hover:shadow-sm'
                      : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-sm')
                )
            } ${draggedIndex === idx ? 'opacity-40 scale-95 grayscale' : ''} ${
              dragOverIndex === idx ? 'border-blue-400 bg-blue-50/30 -translate-y-2 z-20 shadow-xl' : ''
            }`}
          >
            <div className="flex items-center">
                <div className={`cursor-grab active:cursor-grabbing mr-2 transition-colors ${
                    currentChapterId === chapter.id 
                    ? (isGreen ? 'text-[#1b5e20]' : 'text-amber-400')
                    : (isGreen ? 'text-[#388e3c]/40 group-hover:text-[#2e7d32]' : (isDark ? 'text-gray-600 group-hover:text-amber-500' : 'text-gray-300 group-hover:text-amber-400'))
                }`}>
                    <GripVertical size={14} />
                </div>
                <span className={`text-[10px] font-mono font-bold mr-2 w-5 text-right shrink-0 select-none ${
                    currentChapterId === chapter.id 
                    ? (isGreen ? 'text-[#1b5e20]' : 'text-amber-500')
                    : (isGreen ? 'text-[#388e3c]/50' : (isDark ? 'text-gray-600' : 'text-gray-300'))
                }`}>
                    {String(idx + 1).padStart(2, '0')}
                </span>
                <input 
                    type="text"
                    value={chapter.title}
                    onChange={(e) => updateChapterField(chapter.id, 'title', e.target.value)}
                    onClick={(e) => e.stopPropagation()} 
                    className={`flex-grow bg-transparent text-sm font-bold focus:outline-none rounded px-1 transition-colors truncate ${
                        isGreen
                        ? (currentChapterId === chapter.id ? 'text-[#1b5e20] focus:bg-white/20' : 'text-[#2e7d32] focus:bg-[#a5d6a7]/20')
                        : (isDark 
                            ? (currentChapterId === chapter.id ? 'text-gray-100 focus:bg-white/10' : 'text-gray-400 focus:bg-white/10')
                            : (currentChapterId === chapter.id ? 'text-gray-900 focus:bg-amber-50' : 'text-gray-600 focus:bg-amber-50')
                        )
                    }`}
                />
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    <button onClick={(e) => exportChapter(e, chapter)} className={`p-1 rounded transition-all ${
                        isGreen
                        ? 'text-[#2e7d32]/60 hover:text-[#1b5e20] hover:bg-[#c8e6c9]/50'
                        : (isDark 
                            ? 'text-gray-500 hover:text-amber-400 hover:bg-amber-900/30' 
                            : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50')
                    }`}><Download size={12} /></button>
                    <button onClick={(e) => removeChapter(e, chapter.id)} className={`p-1 rounded transition-all ${
                        isGreen
                        ? 'text-[#2e7d32]/60 hover:text-red-600 hover:bg-red-50'
                        : (isDark
                            ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/30'
                            : 'text-gray-300 hover:text-red-500 hover:bg-red-50')
                    }`}><Trash2 size={12} /></button>
                </div>
            </div>
            
            <div className="pl-9 pr-1 mt-1">
                <div 
                    className="flex items-center space-x-2"
                >
                    <input
                        ref={el => { synopsisRefs.current[chapter.id] = el; }}
                        type="text" 
                        value={chapter.synopsis || ''}
                        onChange={(e) => updateChapterField(chapter.id, 'synopsis', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={() => setHoveredSynopsis(null)} 
                        onMouseEnter={() => handleSynopsisMouseEnter(chapter.id, chapter.synopsis || '')}
                        onMouseLeave={() => setHoveredSynopsis(null)}
                        placeholder={isAnthology ? "本篇导语（50-100 字）" : "本章梗概（50 字左右）"}
                        className={`w-full bg-transparent border-b border-dashed text-[10px] focus:outline-none transition-all rounded px-1 h-5 truncate ${
                            isGreen
                            ? 'border-[#a5d6a7] text-[#2e7d32]/70 focus:border-[#43a047] focus:bg-[#c8e6c9]/20 placeholder:text-[#388e3c]/30'
                            : (isDark 
                                ? 'border-white/10 text-gray-500 focus:border-amber-500 focus:bg-white/5 placeholder:text-gray-700'
                                : 'border-gray-100 text-gray-500 focus:border-amber-300 focus:bg-amber-50/30 placeholder:text-gray-300')
                        } placeholder:italic`}
                        spellCheck={false}
                    />
                </div>
            </div>
            {/* Removed active sidebar indicator for green mode to keep it soft */}
            {!isGreen && currentChapterId === chapter.id && <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500`} />}
          </div>
        ))}
      </div>

      {hoveredSynopsis && createPortal(
          <div 
            className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200 max-w-[280px]"
            style={{ 
                top: hoveredSynopsis.top, 
                left: Math.min(hoveredSynopsis.left, window.innerWidth - 300)
            }}
          >
              <div className={`backdrop-blur-md text-xs p-3 rounded-xl shadow-xl border leading-relaxed break-words relative ${
                  isGreen
                  ? 'bg-white/95 text-[#1b5e20] border-[#a5d6a7]'
                  : (isDark 
                      ? 'bg-[#1c1c1e]/95 text-gray-200 border-white/10' 
                      : 'bg-white/95 text-gray-700 border-amber-100 ring-1 ring-black/5')
              }`}>
                  <div className={`absolute -top-1 left-4 w-2 h-2 rotate-45 border-l border-t ${
                      isGreen ? 'bg-white border-[#a5d6a7]' : (isDark ? 'bg-[#1c1c1e] border-white/10' : 'bg-white border-amber-100')
                  }`} />
                  <p className="font-medium">{hoveredSynopsis.text}</p>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default Outline;
