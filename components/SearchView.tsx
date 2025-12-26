
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Search, Loader2, ExternalLink, Sparkles, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { AppSettings, AIConfig } from '../types';

type SearchEngine = 'ai' | 'google' | 'baidu' | 'bing';

interface SearchViewProps {
  settings?: AppSettings;
}

// Duplicating the robust error extractor for consistency in this component
const getFriendlyErrorMessage = (error: any): string => {
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
       if (parsed.error?.message) msg = parsed.error.message;
       else if (parsed.message) msg = parsed.message;
     } catch (e) {}
  }

  if (msg.includes('Insufficient Balance')) {
      return 'API 余额不足 (Insufficient Balance)。请检查您的 API Key 账户额度或充值。';
  }
  if (msg.includes('Rpc failed') || msg.includes('xhr error') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return "网络连接受阻 (XHR/RPC Error)。\n请检查：\n1. 网络是否能访问 AI 服务端点\n2. API Key 是否正确\n3. 浏览器插件是否拦截了请求";
  }
  
  return msg;
};

const fetchOpenAICompatible = async (config: AIConfig, messages: any[]) => {
  if (!config.apiKey) throw new Error("请在设置中配置 API Key");
  
  let baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
  if (baseUrl.endsWith('/chat/completions')) {
    baseUrl = baseUrl.substring(0, baseUrl.length - '/chat/completions'.length);
  }

  const payload: any = {
    model: config.model,
    messages: messages
  };

  try {
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
      // Throw raw text to be parsed by friendly error handler
      throw new Error(errorText || `请求失败 (${response.status})`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
       throw new Error("API 返回内容为空。");
    }
    return data.choices[0]?.message?.content || "未收到回复";
  } catch (e: any) {
    throw e;
  }
};

const SearchView: React.FC<SearchViewProps> = ({ settings }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<SearchEngine>('ai');
  const [result, setResult] = useState<{ text: string; sources: any[] } | null>(null);

  const engines = [
    { id: 'ai' as SearchEngine, name: 'AI智能', icon: <Sparkles size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'google' as SearchEngine, name: 'Google', icon: <Globe size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'baidu' as SearchEngine, name: '百度', icon: <Search size={14} />, color: 'text-blue-700', bg: 'bg-blue-50' },
    { id: 'bing' as SearchEngine, name: 'Bing', icon: <Globe size={14} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;

    if (engine === 'ai') {
      setLoading(true);
      setResult(null);
      
      const aiConfig: AIConfig = settings?.ai || { provider: 'gemini', apiKey: '', baseUrl: '', model: '' };

      try {
        if (aiConfig.provider === 'gemini') {
          const key = aiConfig.apiKey || process.env.API_KEY;
          if (!key) throw new Error("未配置 Gemini API Key");

          const ai = new GoogleGenAI({ apiKey: key });
          
          try {
            // 尝试 1: 启用 Google 搜索增强 (grounding)
            const response = await ai.models.generateContent({
              model: aiConfig.model || "gemini-3-flash-preview",
              contents: `作为一个小说资料检索助手，请针对以下主题提供详尽的创作背景资料、历史知识或器物设定：${query}`,
              config: {
                tools: [{ googleSearch: {} }],
              },
            });

            const text = response.text || "未能获取检索结果。";
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            setResult({ text, sources });

          } catch (toolError: any) {
            console.warn("Search grounding failed, attempting fallback...", toolError);
            
            // 如果是 RPC/Network 错误，Fallback 往往也会失败，但我们还是尝试一次无 Tools 的纯文本生成
            // 尝试 2: 降级为纯 LLM 生成 (不使用 tools)
            const fallbackResponse = await ai.models.generateContent({
              model: aiConfig.model || "gemini-3-flash-preview",
              contents: `作为一个小说资料检索助手，请针对以下主题提供详尽的创作背景资料、历史知识或器物设定：${query}\n\n(注意：由于联网检索暂时不可用，请基于你内置的知识库进行详细解答)`,
              // 移除 config.tools
            });

            const text = (fallbackResponse.text || "未能获取结果。") + "\n\n----------\n(注：因网络原因实时检索暂不可用，以上内容基于 AI 内置知识库生成)";
            setResult({ text, sources: [] });
          }

        } else {
          // Custom Provider (DeepSeek/OpenAI) 
          const text = await fetchOpenAICompatible(aiConfig, [
            { role: 'user', content: `作为一个小说资料检索助手，请针对以下主题提供详尽的创作背景资料、历史知识或器物设定：${query}` }
          ]);
          setResult({ text, sources: [] });
        }
      } catch (err: any) {
        console.error("Final search error:", err);
        const friendlyMsg = getFriendlyErrorMessage(err);
        setResult({ text: `检索遇到困难: ${friendlyMsg}`, sources: [] });
      } finally {
        setLoading(false);
      }
    } else {
      // 外部引擎搜索
      let url = '';
      switch (engine) {
        case 'google': url = `https://www.google.com/search?q=${encodeURIComponent(query)}`; break;
        case 'baidu': url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`; break;
        case 'bing': url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`; break;
      }
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-inherit">
      {/* Engine Switcher */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-4 border border-gray-200">
        {engines.map((eng) => (
          <button
            key={eng.id}
            onClick={() => setEngine(eng.id)}
            className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
              engine === eng.id 
              ? `bg-white shadow-sm ${eng.color}` 
              : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {eng.icon}
            <span>{eng.name}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={engine === 'ai' ? "查找历史背景、器物知识..." : `在 ${engine === 'baidu' ? '百度' : engine} 中搜索...`}
          className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm transition-all"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={18} />
        </div>
        <button 
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors shadow-sm"
        >
          {engine === 'ai' ? <Sparkles size={14} /> : <ExternalLink size={14} />}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {engine !== 'ai' && (
           <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs flex items-start border border-blue-100">
              <AlertCircle size={14} className="mr-2 mt-0.5 shrink-0" />
              <div>
                受限于浏览器安全策略 (X-Frame-Options)，外部搜索引擎无法直接内嵌显示。我们将在新窗口中为您打开搜索结果。
                <br/>
                <span className="opacity-70 text-[10px] mt-1 block">推荐使用 "AI智能" 模式获取沉浸式体验。</span>
              </div>
           </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-in fade-in zoom-in duration-300">
            <div className="relative mb-6">
                <Loader2 className="animate-spin text-amber-500" size={40} />
                <Sparkles size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-300 animate-pulse" />
            </div>
            <p className="text-sm font-medium">AI 正在深度检索与分析资料...</p>
          </div>
        ) : result ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className={`p-5 rounded-2xl border shadow-sm ${result.text.includes('失败') || result.text.includes('困难') ? 'bg-red-50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
              <h3 className={`text-xs font-black uppercase mb-4 flex items-center tracking-widest ${result.text.includes('失败') || result.text.includes('困难') ? 'text-red-600' : 'text-amber-600'}`}>
                {result.text.includes('失败') || result.text.includes('困难') ? <AlertCircle size={14} className="mr-2" /> : <Sparkles size={14} className="mr-2" />}
                {result.text.includes('失败') || result.text.includes('困难') ? '检索受阻' : '智能检索分析'}
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap serif">
                {result.text}
              </div>
            </div>

            {result.sources.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">溯源资料库</h4>
                <div className="grid gap-2">
                    {result.sources.map((src: any, i: number) => (
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
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">{src.web.uri}</p>
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
          <div className="text-center py-16 px-4">
            <div className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center mb-6 border-2 border-dashed border-gray-100 text-gray-200`}>
              {engine === 'ai' ? <Sparkles size={32} /> : <Globe size={32} />}
            </div>
            <h4 className="text-sm font-bold text-gray-400 mb-2">
                {engine === 'ai' ? '博采众长，文思泉涌' : `使用 ${engines.find(e => e.id === engine)?.name} 搜索`}
            </h4>
            <p className="text-xs text-gray-300 font-light italic">
                {engine === 'ai' ? '输入创作中遇到的专业名词或历史背景，AI 将为您检索整理相关资料。' : '搜索结果将在新窗口中打开。'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
