
import React, { useMemo, useState, useEffect } from 'react';
import { WritingStats, Book, AppSettings } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { BrainCircuit, Loader2, AlertTriangle, X, RefreshCw, Library, Layers, Feather, Sparkles, BarChart3, PieChart, Zap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { getAnalysisSystemPrompt } from '../utils/ai-prompts';

interface StatisticsProps {
  stats: WritingStats;
  book?: Book;
  settings?: AppSettings;
  onUpdateBook?: (field: keyof Book, value: any) => void;
}

// ... (Interfaces AnalysisData remains the same)
interface AnalysisData {
  keywords?: { word: string; count: number }[];
  rhythm?: { chapter: number; tension: number; label: string }[];
  characters?: { name: string; role: string; prominence: number }[];
  storyAnalysis?: { 
    sentimentArc?: { segment: string; score: number }[]; 
    rating: {
       plot: number;
       style: number;
       depth: number;
       character: number;
       pacing: number;
    };
    oneLineReview: string;
    coreThemes: string[];
  };
  stories?: { 
    title: string; 
    theme: string; 
    pacing: number; 
    rating: number; 
    summary: string;
  }[];
}

// Retry Helper (Duplicated for component isolation)
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

const Statistics: React.FC<StatisticsProps> = ({ stats, book, settings, onUpdateBook }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(book?.analysisReport?.data || null);
  const [reportText, setReportText] = useState<string>(book?.analysisReport?.text || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Real-time recalculation trigger
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
      const timer = setInterval(() => setNow(Date.now()), 60000); // Update every minute
      return () => clearInterval(timer);
  }, []);

  const isAnthology = book?.type === 'anthology';

  const currentChapter = useMemo(() => {
    return book?.chapters.find(c => c.id === book.currentChapterId);
  }, [book]);

  const currentChapterWordCount = useMemo(() => {
      if (!currentChapter) return 0;
      return (currentChapter.content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length;
  }, [currentChapter]);

  // Calculate Speed
  const typingSpeed = useMemo(() => {
      if (stats.dailyCount <= 0) return 0;
      // Use stats.startTime which is reset on page load
      const hours = (now - stats.startTime) / (1000 * 60 * 60);
      if (hours < 0.01) return stats.dailyCount * 10; // Avoid infinity, rough guess
      return Math.round(stats.dailyCount / hours);
  }, [stats.dailyCount, stats.startTime, now]);

  useEffect(() => {
      if (book?.analysisReport) {
          setAnalysisData(book.analysisReport.data || null);
          setReportText(book.analysisReport.text || '');
      } else {
          setAnalysisData(null);
          setReportText('');
      }
  }, [book?.id, book?.analysisReport]);

  const chartData = useMemo(() => {
    const data = [];
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      data.push({
        name: days[d.getDay()],
        count: stats.writingHistory[key] || 0,
        key
      });
    }
    return data;
  }, [stats.writingHistory]);

  const chapterLengthData = useMemo(() => {
    if (!book || isAnthology) return [];
    return book.chapters.map((c, i) => ({
        name: `${i + 1}`,
        title: c.title,
        count: (c.content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length
    }));
  }, [book, isAnthology]);

  const streak = useMemo(() => {
    let count = 0;
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    let currentKey = todayKey;
    let d = new Date(now);

    if (stats.writingHistory[todayKey]) {
      count = 1;
    } else {
      d.setDate(d.getDate() - 1);
      currentKey = d.toISOString().split('T')[0];
      if (!stats.writingHistory[currentKey]) return 0;
      count = 0;
    }

    while (stats.writingHistory[currentKey] > 0) {
      if (currentKey !== todayKey) count++;
      d.setDate(d.getDate() - 1);
      currentKey = d.toISOString().split('T')[0];
    }
    return count;
  }, [stats.writingHistory]);

  const radarData = useMemo(() => {
      if (!isAnthology || !analysisData?.storyAnalysis?.rating) return [];
      const r = analysisData.storyAnalysis.rating;
      return [
          { subject: '剧情', A: r.plot, fullMark: 100 },
          { subject: '文笔', A: r.style, fullMark: 100 },
          { subject: '深度', A: r.depth, fullMark: 100 },
          { subject: '人物', A: r.character, fullMark: 100 },
          { subject: '节奏', A: r.pacing, fullMark: 100 }
      ];
  }, [analysisData, isAnthology]);

  const sentimentData = useMemo(() => {
      if (!analysisData?.storyAnalysis?.sentimentArc) return [];
      
      const translationMap: Record<string, string> = {
          'Start': '开篇',
          'Opening': '开篇',
          'Inciting': '起因',
          'Inciting Incident': '起因',
          'Rising': '发展',
          'Rising Action': '发展',
          'Midpoint': '转折',
          'Climax': '高潮',
          'Falling': '回落',
          'Falling Action': '回落',
          'Resolution': '结局',
          'End': '结局'
      };

      return analysisData.storyAnalysis.sentimentArc.map(item => ({
          ...item,
          segment: translationMap[item.segment] || item.segment
      }));
  }, [analysisData]);

  const generateReport = async () => {
    if (!settings?.ai?.apiKey || !book) {
        setErrorMsg("请先在设置中配置 API Key");
        return;
    }
    
    setIsAnalyzing(true);
    setErrorMsg(null);
    setReportText("");
    setAnalysisData(null);

    try {
        const key = settings.ai.apiKey;
        const ai = new GoogleGenAI({ apiKey: key });
        const modelName = settings.ai.model || 'gemini-3-flash-preview';
        
        // Use Centralized Prompt
        const systemPrompt = getAnalysisSystemPrompt(book.type || 'novel');
        
        let contentToAnalyze = '';
        if (isAnthology) {
            if (!currentChapter || currentChapter.content.length < 50) {
                 throw new Error("当前篇章内容过少，无法进行有效分析 (至少50字)");
            }
            contentToAnalyze = currentChapter.content.slice(0, 50000); 
        } else {
            const chapters = book.chapters || [];
            contentToAnalyze = chapters.map(c => `【${c.title}】\n${c.content}`).join('\n\n');
            if (contentToAnalyze.length > 500000) {
                contentToAnalyze = contentToAnalyze.slice(0, 500000) + "\n...(后文截断)...";
            }
        }

        // Apply retry wrapper
        const response = await withRetry(async () => {
            return await ai.models.generateContent({
                model: modelName,
                contents: contentToAnalyze,
                config: {
                    systemInstruction: systemPrompt
                }
            });
        });

        if (response.text) {
            let fullText = response.text;
            let jsonPart = null;
            let mdPart = fullText;

            const jsonMatch = fullText.match(/```json([\s\S]*?)```/);
            if (jsonMatch) {
                try {
                    jsonPart = JSON.parse(jsonMatch[1]);
                    mdPart = fullText.replace(jsonMatch[0], '').trim();
                } catch (e) {
                    console.warn("JSON Parse Error", e);
                }
            }
            
            mdPart = mdPart.replace(/第一部分[:：].*?(\n|$)/gi, '').trim();
            mdPart = mdPart.replace(/第二部分[:：].*?(\n|$)/gi, '').trim();
            mdPart = mdPart.replace(/PART \d+[:：].*?(\n|$)/gi, '').trim();

            setReportText(mdPart);
            setAnalysisData(jsonPart);

            if (onUpdateBook) {
                onUpdateBook('analysisReport', {
                    text: mdPart,
                    data: jsonPart,
                    timestamp: Date.now()
                });
            }
            
            if (!isAnthology) {
                setShowReportModal(true);
            }

        } else {
            throw new Error("API 未返回有效文本");
        }
    } catch (e: any) {
        let msg = e.message || "Unknown Error";
        if (msg.includes('404')) msg = "模型未找到 (404) - 请检查设置";
        else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) msg = "API 配额耗尽 (429)，请稍后重试";
        setErrorMsg(msg);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleOpenReport = () => {
      setShowReportModal(true);
      if (!reportText && !analysisData && !isAnalyzing) {
          generateReport();
      }
  };

  // ... (JSX)
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 flex flex-col">
      {/* 1. Basic Stats Grid */}
      <div className="grid grid-cols-2 gap-4 shrink-0 mb-6">
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">今日产出</p>
          <p className="text-3xl font-bold text-amber-900">{stats.dailyCount}</p>
          <p className="text-xs text-amber-500 mt-1">字</p>
        </div>
        
        {isAnthology ? (
             <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">本篇字数</p>
                <p className="text-3xl font-bold text-indigo-900">{currentChapterWordCount}</p>
                <p className="text-xs text-indigo-500 mt-1 truncate">{currentChapter?.title || '未命名'}</p>
            </div>
        ) : (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">连续创作</p>
                <p className="text-3xl font-bold text-blue-900">{streak}</p>
                <p className="text-xs text-blue-500 mt-1">天</p>
            </div>
        )}

        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 col-span-2 flex items-center justify-between">
            <div>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center">
                    <Zap size={12} className="mr-1" /> 实时时速
                </p>
                <div className="flex items-baseline">
                    <p className="text-2xl font-black text-emerald-900 font-mono">{typingSpeed.toLocaleString()}</p>
                    <span className="text-xs text-emerald-500 ml-1 font-bold">字/小时</span>
                </div>
            </div>
            <div className="text-right opacity-60">
                <p className="text-[10px] text-emerald-700 font-bold">Session Time</p>
                <p className="text-xs font-mono text-emerald-800">
                    {Math.floor((now - stats.startTime) / 60000)} min
                </p>
            </div>
        </div>
      </div>

      <div className="shrink-0 mb-6">
        <h3 className="text-sm font-bold text-gray-500 mb-4 px-1 flex items-center justify-between">
            <span>本周产量趋势</span>
        </h3>
        <div className="h-40 w-full min-h-[150px]"> 
          <ResponsiveContainer width="100%" height="100%">
             <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                    cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', padding: '12px' }}
                    labelStyle={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}
                    itemStyle={{ color: '#d97706', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value} 字`, '产量']}
                    labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                            return `${payload[0].payload.key} · ${label}`;
                        }
                        return label;
                    }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 6 ? '#d97706' : '#d1d5db'} />
                    ))}
                </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!isAnthology && (
          <div className="shrink-0 mb-6">
              <h3 className="text-sm font-bold text-gray-500 mb-4 px-1 flex items-center justify-between">
                  <span>全书篇幅分布 (字数/章)</span>
              </h3>
              <div className="h-40 w-full min-h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chapterLengthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#9ca3af' }} interval={0} />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#9ca3af' }} />
                          <Tooltip 
                            cursor={{ fill: 'transparent' }} 
                            contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }}
                            formatter={(value: number, name: string, props: any) => [`${value} 字`, props.payload.title]}
                          />
                          <Bar dataKey="count" radius={[2, 2, 0, 0]} activeBar={{ fill: '#f59e0b' }}>
                             {chapterLengthData.map((_, index) => (
                                 <Cell key={`cell-${index}`} fill="#e5e7eb" />
                             ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {isAnthology && (
          <div className="shrink-0 space-y-6 mb-6">
              <div className="flex items-center justify-between px-1">
                   <h3 className="text-sm font-bold text-gray-500">本篇深度分析</h3>
                   {book?.analysisReport?.timestamp && (
                       <span className="text-[10px] text-gray-300">
                           更新于 {new Date(book.analysisReport.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                       </span>
                   )}
              </div>
              
              {analysisData?.storyAnalysis ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      {/* One Line Review */}
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                          <p className="text-xs font-serif italic text-amber-900 leading-relaxed">
                              "{analysisData.storyAnalysis.oneLineReview}"
                          </p>
                      </div>

                      {/* Radar Chart Section */}
                      <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100 relative">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
                               五维评分
                           </h4>
                           
                           {/* Chart */}
                           <div className="h-56 w-full relative z-10">
                               <ResponsiveContainer width="100%" height="100%">
                                   <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                       <PolarGrid stroke="#e0e7ff" />
                                       <PolarAngleAxis dataKey="subject" tick={{ fill: '#6366f1', fontSize: 11, fontWeight: 'bold' }} />
                                       <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                       <Radar name="得分" dataKey="A" stroke="#818cf8" strokeWidth={2} fill="#818cf8" fillOpacity={0.4} />
                                       <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                                       />
                                   </RadarChart>
                               </ResponsiveContainer>
                           </div>

                           {/* Detailed Breakdown Grid */}
                           <div className="grid grid-cols-5 gap-1 mt-2 pt-4 border-t border-indigo-100/50">
                               {radarData.map((item) => (
                                   <div key={item.subject} className="flex flex-col items-center">
                                       <span className="text-[10px] text-gray-400 mb-0.5">{item.subject}</span>
                                       <span className={`text-sm font-black ${
                                           item.A >= 80 ? 'text-indigo-600' : 
                                           item.A >= 60 ? 'text-indigo-400' : 'text-gray-400'
                                       }`}>
                                           {item.A}
                                       </span>
                                   </div>
                               ))}
                           </div>
                      </div>

                      {/* Sentiment Arc Chart */}
                      {sentimentData && sentimentData.length > 0 && (
                           <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                               <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                                   情绪曲线 (Sentiment Arc)
                               </h4>
                               <div className="h-36 w-full">
                                   <ResponsiveContainer width="100%" height="100%">
                                       <LineChart data={sentimentData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                           <XAxis dataKey="segment" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#9ca3af' }} />
                                           <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                           />
                                           <Line 
                                                type="monotone" 
                                                dataKey="score" 
                                                stroke="#6366f1" 
                                                strokeWidth={2} 
                                                dot={{r: 3, fill: '#6366f1', strokeWidth: 0}} 
                                                activeDot={{r: 5, strokeWidth: 0}}
                                                animationDuration={1500}
                                           />
                                       </LineChart>
                                   </ResponsiveContainer>
                               </div>
                           </div>
                      )}

                      {/* Keywords Cloud (Anthology Specific Inline Display) */}
                      {analysisData.keywords && analysisData.keywords.length > 0 && (
                          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                  核心意象 (Core Imagery)
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                  {analysisData.keywords.map((kw, i) => (
                                      <span 
                                          key={i} 
                                          className="px-3 py-1.5 rounded-lg font-bold text-white shadow-sm text-xs bg-indigo-500/80"
                                          style={{ opacity: 1 - (i * 0.05) }}
                                      >
                                          {kw.word}
                                      </span>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="bg-indigo-50/50 rounded-xl p-8 text-center border border-dashed border-indigo-200">
                      <Feather size={32} className="mx-auto text-indigo-200 mb-3" />
                      <p className="text-xs text-indigo-800 font-bold mb-1">暂无分析数据</p>
                      <p className="text-[10px] text-indigo-400">点击下方按钮，AI 将为您解析本篇故事结构</p>
                  </div>
              )}
          </div>
      )}

      {errorMsg && !showReportModal && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start text-red-600 text-xs animate-in fade-in slide-in-from-bottom-2">
              <AlertTriangle size={14} className="mt-0.5 mr-2 shrink-0" />
              <div className="flex-grow font-bold">{errorMsg}</div>
              <button onClick={() => setErrorMsg(null)} className="ml-2 hover:bg-red-100 rounded p-0.5"><X size={14} /></button>
          </div>
      )}

      {/* 3. Deep Analysis Button */}
      <div className="pt-6 border-t border-gray-100 shrink-0">
         <button 
            onClick={isAnthology ? generateReport : handleOpenReport}
            disabled={isAnalyzing}
            className={`w-full py-3 rounded-xl transition-all border flex items-center justify-center space-x-2 group ${
                isAnthology 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200' 
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-100 hover:border-purple-200'
            }`}
         >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : (
                isAnthology ? <Feather size={18} className="group-hover:scale-110 transition-transform" /> : <BrainCircuit size={18} className="group-hover:scale-110 transition-transform" />
            )}
            <span className="font-bold text-sm">
                {isAnalyzing ? '正在分析...' : (isAnthology ? (analysisData ? '重新分析本篇' : '开始本篇深度评估') : '生成全书深度报告')}
            </span>
         </button>
         
         {isAnthology && analysisData && (
             <button 
                onClick={() => setShowReportModal(true)}
                className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
             >
                 查看详细文字报告
             </button>
         )}
      </div>

      {/* 4. Report Modal (Common for Text Details) */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${isAnthology ? 'bg-indigo-50' : 'bg-purple-50'}`}>
                    <div className={`flex items-center space-x-2 ${isAnthology ? 'text-indigo-800' : 'text-purple-800'}`}>
                        {isAnthology ? <Feather size={20} /> : <BrainCircuit size={20} />}
                        <h3 className="font-bold text-base">
                            {isAnthology ? `《${currentChapter?.title}》深度评析` : '长篇剧情分析报告'}
                        </h3>
                    </div>
                    <button onClick={() => setShowReportModal(false)} className="p-1.5 hover:bg-white/50 rounded-full text-gray-500 hover:text-gray-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-grow p-6 overflow-y-auto custom-scrollbar bg-white">
                    {isAnalyzing ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <Loader2 size={40} className={`animate-spin ${isAnthology ? 'text-indigo-500' : 'text-purple-500'}`} />
                            <p className="font-medium text-gray-600">AI 正在{isAnthology ? '精读这篇故事' : '进行全书采样与宏观分析'}...</p>
                        </div>
                    ) : errorMsg ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                            <AlertTriangle size={32} className="text-red-500 mb-4" />
                            <p className="text-sm text-gray-500 mb-4">{errorMsg}</p>
                            <button onClick={generateReport} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold">重试</button>
                        </div>
                    ) : (reportText || analysisData) ? (
                        <div className="space-y-8 pb-10">
                            {/* Visualization Section - NOVEL ONLY inside Modal (Anthology is inline) */}
                            {!isAnthology && analysisData && (
                                <div className="space-y-6">
                                    {/* === NOVEL SPECIFIC VISUALS === */}
                                    {analysisData.rhythm && (
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-4">章节节奏热力图</h4>
                                            <div className="h-48 w-full">
                                                <ResponsiveContainer>
                                                    <LineChart data={analysisData.rhythm}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                        <XAxis dataKey="chapter" hide />
                                                        <Tooltip labelFormatter={(v) => `第 ${v} 章`} />
                                                        <Line type="monotone" dataKey="tension" stroke="#8b5cf6" strokeWidth={3} dot={{r: 3}} activeDot={{r: 5}} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Common: Word Cloud */}
                                    {analysisData.keywords && (
                                        <div>
                                            <div className="flex items-center space-x-2 text-gray-300 py-4">
                                                <div className="h-px bg-gray-200 flex-grow" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                                    全书高频词
                                                </span>
                                                <div className="h-px bg-gray-200 flex-grow" />
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {analysisData.keywords.map((kw, i) => (
                                                    <span 
                                                        key={i} 
                                                        className="px-3 py-1.5 rounded-lg font-bold text-white shadow-sm text-xs bg-purple-500/80"
                                                        style={{ opacity: 1 - (i * 0.05) }}
                                                    >
                                                        {kw.word}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Text Report */}
                            {reportText && (
                                <div className="prose prose-sm max-w-none text-gray-700 border-t border-gray-100 pt-6 mt-6">
                                    <ReactMarkdown 
                                        components={{
                                            h1: ({node, ...props}) => <h2 className="text-xl font-black mt-6 mb-3 text-gray-800 border-b pb-2" {...props} />,
                                            h2: ({node, ...props}) => <h3 className="text-lg font-bold mt-5 mb-2 text-gray-800" {...props} />,
                                            h3: ({node, ...props}) => <h4 className="text-base font-bold mt-4 mb-2 text-gray-700" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-xs md:text-sm text-gray-600" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-4 space-y-1 text-xs md:text-sm" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-4 space-y-1 text-xs md:text-sm" {...props} />,
                                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                            strong: ({node, ...props}) => <span className="font-black text-gray-900 bg-gray-100 px-1 rounded mx-0.5" {...props} />,
                                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-200 pl-4 italic text-gray-500 my-4 bg-indigo-50/30 py-2 pr-2 rounded-r-lg" {...props} />
                                        }}
                                    >
                                        {reportText}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            {isAnthology ? <Feather size={48} className="mb-4 opacity-20" /> : <Sparkles size={40} className="mb-4 opacity-20" />}
                            <p className="text-sm font-bold">
                                {isAnthology ? '请在主界面点击“开始本篇深度评估”' : '点击下方按钮，生成全书分析报告'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer - Only for Novel mode here, Anthology button is outside */}
                {!isAnthology && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                        <button 
                            onClick={generateReport}
                            disabled={isAnalyzing}
                            className="flex items-center space-x-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors hover:text-purple-600 hover:bg-purple-50"
                        >
                            <RefreshCw size={14} className={isAnalyzing ? "animate-spin" : ""} />
                            <span>{reportText ? '重新分析' : '开始分析'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
