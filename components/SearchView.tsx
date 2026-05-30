
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Search, Loader2, ExternalLink, Sparkles, AlertCircle, Bot, Globe, History, Clock } from 'lucide-react';
import { AppSettings, AIConfig, SearchState, Book } from '../types';
import { getSearchSystemPrompt } from '../utils/ai-prompts';
import ReactMarkdown from 'react-markdown';

interface SearchViewProps {
  settings?: AppSettings;
  searchState?: SearchState;
  onUpdateSearchState: (state: SearchState) => void;
  searchHistory?: string[];
  onUpdateBook?: (field: keyof Book, value: any) => void;
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

// Helper for OpenAI compatible API calls
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
      const errorText = await response.text();
      if (response.status === 429) throw { status: 429, message: errorText };
      throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

const getFriendlyErrorMessage = (error: any): string => {
  if (error?.status === 429 || error?.code === 429 || error?.error?.code === 429) {
      return 'API 配额已耗尽 (429)。请稍后再试。';
  }

  let msg = '';
  if (error instanceof Error) {
    msg = error.message;
  } else if (typeof error === 'object' && error !== null) {
    msg = error.error?.message || error.message || JSON.stringify(error);
  } else {
    msg = String(error);
  }

  if (typeof msg === 'string' && (msg.trim().startsWith('{') || msg.includes('{"error"'))) {
     try {
       const jsonMatch = msg.match(/(\{.*"error".*\})/s) || msg.match(/(\{.*\})/s);
       const jsonStr = jsonMatch ? jsonMatch[0] : msg;
       const parsed = JSON.parse(jsonStr);
       if (parsed.error?.code === 429 || parsed.status === "RESOURCE_EXHAUSTED") {
           return 'API 配额已耗尽 (429)。请稍后再试。';
       }
       if (parsed.error?.message) msg = parsed.error.message;
       else if (parsed.message) msg = parsed.message;
     } catch (e) {}
  }

  if (msg.includes('404') || msg.includes('NOT_FOUND')) {
      return "模型未找到 (404)。请在“设置”中检查您的模型名称是否正确。";
  }
  
  if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return 'API 配额已耗尽 (429)。请稍后再试。';
  }

  if (msg.includes('Rpc failed') || msg.includes('xhr error') || msg.includes('Failed to fetch')) {
      return "网络连接失败。请检查网络。";
  }
  
  return msg;
};

const ExternalSearchButton: React.FC<{ name: string; urlTemplate: string; query: string; color: string }> = ({ name, urlTemplate, query, color }) => (
    <button 
        onClick={() => {
            if(!query) return;
            window.open(urlTemplate.replace('%s', encodeURIComponent(query)), '_blank');
        }}
        disabled={!query}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 ${color}`}
        title={`在 ${name} 中搜索`}
    >
        <Globe size={10} />
        <span>{name}</span>
    </button>
);

const SearchView: React.FC<SearchViewProps> = ({ settings, searchState, onUpdateSearchState, searchHistory = [], onUpdateBook }) => {
  const [query, setQuery] = useState(searchState?.query || '');
  
  // Handle migration from old 'resultHTML' to 'responseText'
  const [displayText, setDisplayText] = useState<string>('');

  useEffect(() => {
      if (searchState) {
          setQuery(searchState.query);
          // Legacy support: check for responseText, fallback to resultHTML
          setDisplayText(searchState.responseText || (searchState as any).resultHTML || '');
      }
  }, [searchState?.timestamp]);

  const handleSearch = async (overrideQuery?: string) => {
    const targetQuery = overrideQuery || query;
    if (!targetQuery.trim()) return;
    
    // Update local query if overridden (e.g. from history)
    if (overrideQuery) setQuery(targetQuery);

    const aiConfig: AIConfig = settings?.ai || { provider: 'gemini', apiKey: '', baseUrl: '', model: '' };
    const isGemini = aiConfig.provider === 'gemini';
    
    // Update History
    if (onUpdateBook) {
        const newHistory = [targetQuery, ...searchHistory.filter(q => q !== targetQuery)].slice(0, 10);
        onUpdateBook('searchHistory', newHistory);
    }

    onUpdateSearchState({
        query: targetQuery,
        responseText: '',
        sources: [],
        isSearching: true,
        timestamp: Date.now()
    });

    try {
      if (isGemini) {
        // --- Gemini (With Grounding) ---
        const key = aiConfig.apiKey || process.env.API_KEY;
        if (!key) throw new Error("未配置 Gemini API Key");

        const ai = new GoogleGenAI({ apiKey: key });
        const systemPrompt = getSearchSystemPrompt(true);
        
        // Apply retry wrapper
        const response = await withRetry(async () => {
            return await ai.models.generateContent({
                model: aiConfig.model || "gemini-3-flash-preview",
                contents: targetQuery,
                config: {
                    systemInstruction: systemPrompt,
                    tools: [{ googleSearch: {} }],
                },
            });
        });

        const text = response.text || "";
        const rawSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        // Deduplicate sources by URI
        const uniqueSources: any[] = [];
        const seenUrls = new Set<string>();
        
        for (const chunk of rawSources) {
            if (chunk.web?.uri) {
                if (!seenUrls.has(chunk.web.uri)) {
                    seenUrls.add(chunk.web.uri);
                    uniqueSources.push(chunk);
                }
            }
        }
        
        onUpdateSearchState({
            query: targetQuery,
            responseText: text,
            sources: uniqueSources,
            isSearching: false,
            timestamp: Date.now()
        });

      } else {
          // --- Non-Gemini (Standard Generation Fallback) ---
          if (!aiConfig.apiKey) throw new Error("未配置 API Key");

          const systemPrompt = getSearchSystemPrompt(false);

          const result = await withRetry(() => fetchOpenAICompatible(aiConfig, [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: targetQuery }
          ]));
          
          onUpdateSearchState({
              query: targetQuery,
              responseText: result + '\n\n> *注：当前使用的是非 Gemini 模型，无法进行实时联网检索，以上内容基于模型内部知识库生成，请注意甄别。*',
              sources: [],
              isSearching: false,
              timestamp: Date.now()
          });
      }
    } catch (err: any) {
      console.error("Search error:", err);
      const friendlyMsg = getFriendlyErrorMessage(err);
      onUpdateSearchState({
          query: targetQuery,
          responseText: `### 检索遇到困难\n\n${friendlyMsg}`,
          sources: [],
          isSearching: false,
          timestamp: Date.now()
      });
    }
  };

  const isGemini = settings?.ai?.provider === 'gemini';

  return (
    <div className="p-4 flex flex-col h-full bg-inherit">
      {/* Search Header */}
      <div className="mb-4 space-y-3 shrink-0">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
            {isGemini ? <Sparkles size={12} className="mr-2 text-amber-500" /> : <Bot size={12} className="mr-2 text-blue-500" />}
            {isGemini ? 'AI 联网资料库' : 'AI 知识库检索'}
        </h3>
        <div className="relative">
            <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={isGemini ? "输入历史背景、器物设定 (联网)..." : "询问 AI 内部知识 (无网)..."}
            className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
            </div>
            <button 
            onClick={() => handleSearch()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white rounded-xl transition-colors shadow-sm active:scale-95 ${isGemini ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
            {isGemini ? <Sparkles size={14} /> : <Bot size={14} />}
            </button>
        </div>
        
        {/* External Search Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
            <ExternalSearchButton name="百度" urlTemplate="https://www.baidu.com/s?wd=%s" query={query} color="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100" />
            <ExternalSearchButton name="Google" urlTemplate="https://www.google.com/search?q=%s" query={query} color="bg-red-50 text-red-600 border-red-100 hover:bg-red-100" />
            <ExternalSearchButton name="知乎" urlTemplate="https://www.zhihu.com/search?type=content&q=%s" query={query} color="bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100" />
            <ExternalSearchButton name="必应" urlTemplate="https://cn.bing.com/search?q=%s" query={query} color="bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100" />
        </div>

        {!isGemini && (
            <p className="text-[9px] text-gray-400 px-1">
                * 实时联网搜索仅支持 Gemini 模型。当前模式下 AI 将基于自身训练数据回答。
            </p>
        )}
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {searchState?.isSearching ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-in fade-in zoom-in duration-300">
            <div className="relative mb-6">
                <Loader2 className={`animate-spin ${isGemini ? 'text-amber-500' : 'text-blue-500'}`} size={40} />
                <Sparkles size={16} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse ${isGemini ? 'text-amber-300' : 'text-blue-300'}`} />
            </div>
            <p className="text-sm font-medium">AI 正在{isGemini ? '深度检索与分析资料' : '提取内部知识库'}...</p>
            <p className="text-xs text-gray-300 mt-2">您可以切换到其他页面，任务将在后台继续</p>
          </div>
        ) : displayText ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className={`p-5 rounded-2xl border shadow-sm ${displayText.includes('困难') ? 'bg-red-50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
              <h3 className={`text-xs font-black uppercase mb-4 flex items-center tracking-widest ${displayText.includes('困难') ? 'text-red-600' : 'text-amber-600'}`}>
                {displayText.includes('困难') ? <AlertCircle size={14} className="mr-2" /> : <Sparkles size={14} className="mr-2" />}
                {displayText.includes('困难') ? '检索受阻' : '智能分析报告'}
              </h3>
              
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-serif">
                  <ReactMarkdown
                    components={{
                        h1: ({node, ...props}) => <h2 className="text-sm font-bold text-amber-800 mt-4 mb-2 uppercase tracking-wide border-b border-amber-200 pb-1" {...props} />,
                        h2: ({node, ...props}) => <h3 className="text-sm font-bold text-amber-700 mt-4 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h4 className="text-xs font-bold text-gray-600 mt-3 mb-1" {...props} />,
                        strong: ({node, ...props}) => <span className="font-bold text-gray-900 bg-amber-100/50 px-0.5 rounded" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer" {...props} />,
                    }}
                  >
                      {displayText}
                  </ReactMarkdown>
              </div>
            </div>

            {searchState.sources && searchState.sources.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">溯源资料库 ({searchState.sources.length})</h4>
                <div className="grid gap-2">
                    {searchState.sources.map((src: any, i: number) => (
                    src.web && (
                        <a 
                        key={i} 
                        href={src.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group flex items-start p-3 bg-white border border-gray-100 rounded-xl hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.98]"
                        >
                        <div className="flex-grow mr-2 overflow-hidden">
                            <p className="text-xs font-bold text-gray-700 line-clamp-1 group-hover:text-amber-700 transition-colors">{src.web.title || "互联网文献资料"}</p>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic break-all">{src.web.uri}</p>
                        </div>
                        <ExternalLink size={12} className="text-gray-300 mt-1 shrink-0 group-hover:text-amber-500" />
                        </a>
                    )
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
              {/* Empty State / Intro */}
              {(!searchHistory || searchHistory.length === 0) ? (
                  <div className="text-center py-16 px-4 flex-grow flex flex-col items-center justify-center">
                    <div className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center mb-6 border-2 border-dashed border-gray-100 text-gray-200`}>
                      {isGemini ? <Sparkles size={32} /> : <Bot size={32} />}
                    </div>
                    <h4 className="text-sm font-bold text-gray-400 mb-2">
                        {isGemini ? '博采众长，文思泉涌' : '百科全书，触手可及'}
                    </h4>
                    <p className="text-xs text-gray-300 font-light italic leading-relaxed max-w-[200px] mx-auto">
                        {isGemini 
                            ? '输入小说中涉及的专业名词、历史背景或地理设定，AI 将为您联网检索并整理相关资料。'
                            : '无需联网，利用 AI 庞大的内部知识库快速查询成语典故、常识科普或创作设定。'
                        }
                    </p>
                  </div>
              ) : (
                  <div className="py-4">
                      {/* Search History */}
                      <div className="flex items-center space-x-2 text-gray-400 mb-3 px-1">
                          <History size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">最近搜索</span>
                      </div>
                      <div className="space-y-2">
                          {searchHistory.map((item, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => handleSearch(item)}
                                  className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:border-amber-200 hover:shadow-sm transition-all group"
                              >
                                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                                      <Clock size={12} className="text-gray-300 group-hover:text-amber-400" />
                                      <span className="font-medium truncate max-w-[180px]">{item}</span>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-500 font-bold flex items-center">
                                      搜索 <ExternalLink size={10} className="ml-1" />
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              )}
              
              {/* No Results Fallback (If logic allows query but no text) */}
              {!displayText && query && !searchState?.isSearching && searchState?.timestamp && (
                  <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center animate-in fade-in">
                      <p className="text-sm font-bold text-gray-500 mb-1">未找到相关结果</p>
                      <p className="text-xs text-gray-400">试试更换关键词，或者检查网络连接</p>
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
