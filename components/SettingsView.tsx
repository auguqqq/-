
import React, { useState, useEffect } from 'react';
import { AppSettings, AIConfig, CustomPrompts } from '../types';
import { Type, Layout, Settings, Palette, Save, Monitor, Bot, Key, Globe, Box, Mail, Info, Crown, Star, Check, Heart, MessageSquare, RotateCcw, ExternalLink, RefreshCw, List, ShieldAlert } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onProAction: () => void;
  trialStatus?: 'available' | 'active' | 'expired';
  onStartTrial?: () => void;
}

const MINIMAL_MODELS = {
    gemini: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (推荐)' },
    ],
    deepseek: [
        { id: 'deepseek-chat', name: 'DeepSeek V3' },
    ],
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o' },
    ]
};

const SettingsView: React.FC<SettingsViewProps> = ({ settings, setSettings, onProAction, trialStatus, onStartTrial }) => {
  const aiSettings = settings.ai || { provider: 'gemini', apiKey: '', baseUrl: '', model: '' };
  const customPrompts = settings.customPrompts || {};
  
  const [fetchedModels, setFetchedModels] = useState<string[]>(aiSettings.availableModels || []);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- Theme Detection ---
  const [isSystemDark, setIsSystemDark] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsSystemDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);

  // --- Dynamic Styles ---
  const cardClass = isDark ? 'bg-[#1c1c1e] border-white/5 text-gray-300' : 'bg-white border-gray-200 text-gray-800';
  const inputClass = isDark ? 'bg-black/20 border-white/10 text-gray-200 focus:bg-white/5' : 'bg-gray-50 border-gray-200 text-gray-800 focus:bg-white';
  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const subTextClass = isDark ? 'text-gray-500' : 'text-gray-400';
  const iconClass = isDark ? 'text-gray-500' : 'text-gray-400';

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAISetting = (key: keyof AIConfig, value: any) => {
    setSettings(prev => ({
      ...prev,
      ai: { ...prev.ai, [key]: value }
    }));
  };

  const updateCustomPrompt = (key: keyof CustomPrompts, value: string) => {
    setSettings(prev => ({
        ...prev,
        customPrompts: {
            ...prev.customPrompts,
            [key]: value
        }
    }));
  };

  const handleProviderChange = (provider: AIConfig['provider']) => {
    const defaults: Record<string, Partial<AIConfig>> = {
      gemini: { baseUrl: '', model: 'gemini-2.0-flash' },
      deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
      openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
      custom: { baseUrl: '', model: '' }
    };
    
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        provider,
        availableModels: [], 
        ...defaults[provider]
      }
    }));
    setFetchedModels([]);
    setFetchError(null);
  };

  const fetchCloudModels = async () => {
      if (!aiSettings.apiKey) return alert("请先填写 API Key");
      setIsFetchingModels(true);
      setFetchError(null);
      setFetchedModels([]);

      try {
          let models: string[] = [];
          if (aiSettings.provider === 'gemini') {
              const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${aiSettings.apiKey}`;
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              if (data.models) {
                  models = data.models
                    .map((m: any) => m.name.replace('models/', ''))
                    .filter((m: string) => m.includes('gemini'));
              }
          } else {
              let baseUrl = aiSettings.baseUrl.replace(/\/+$/, '');
              if (baseUrl.endsWith('/chat/completions')) {
                  baseUrl = baseUrl.replace('/chat/completions', '');
              }
              const res = await fetch(`${baseUrl}/models`, {
                  headers: { 'Authorization': `Bearer ${aiSettings.apiKey}` }
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              if (Array.isArray(data.data)) {
                  models = data.data.map((m: any) => m.id);
              }
          }

          if (models.length > 0) {
              setFetchedModels(models);
              updateAISetting('availableModels', models);
          } else {
              setFetchError("未找到可用模型，请检查 Key 权限");
          }
      } catch (e: any) {
          console.error(e);
          setFetchError(`获取失败: ${e.message || '网络错误'}`);
      } finally {
          setIsFetchingModels(false);
      }
  };

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto pb-20 custom-scrollbar">
      
      {/* Membership Plan */}
      <section className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
          <Heart size={14} className="mr-2" />
          赞助计划 (Sponsorship)
        </h3>
        <div className={`p-6 rounded-2xl border transition-all relative overflow-hidden ${settings.isPro ? (isDark ? 'bg-[#2c2c2e] border-amber-500/30 text-white' : 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white') : cardClass}`}>
           {/* Background Decoration */}
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Star size={120} />
           </div>

           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h2 className={`text-xl font-black serif tracking-wide ${settings.isPro ? 'text-white' : (isDark ? 'text-gray-100' : 'text-gray-900')}`}>
                        {settings.isPro ? '感谢您的赞助！' : '支持独立开发'}
                    </h2>
                    <p className={`text-xs mt-1 font-medium ${settings.isPro ? 'text-amber-400' : subTextClass}`}>
                        {settings.isPro ? '您已解锁所有高级功能，祝创作愉快。' : '小额赞助即可永久解锁白噪音、云同步与高级导出功能。'}
                    </p>
                 </div>
                 {settings.isPro && <div className="px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full">Pro Active</div>}
              </div>

              <div className="space-y-2 mb-6">
                 {[
                   '沉浸式白噪音 (风声/雨声/机械键盘)',
                   '高级导出 (EPUB/PDF)',
                   '多端云同步 (即将上线)',
                   '无限制版本回溯'
                 ].map((feat, i) => (
                    <div key={i} className="flex items-center space-x-2">
                        <div className={`rounded-full p-0.5 ${settings.isPro ? 'bg-amber-500 text-black' : (isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600')}`}>
                            <Check size={10} strokeWidth={3} />
                        </div>
                        <span className={`text-xs font-bold ${settings.isPro ? 'text-gray-300' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>{feat}</span>
                    </div>
                 ))}
              </div>

              {!settings.isPro && (
                <div className={`flex items-center justify-between p-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <span className={`text-xs font-bold ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>¥6.00 / 永久赞助</span>
                    <div className="flex space-x-2">
                        {trialStatus === 'available' && onStartTrial && (
                             <button 
                                onClick={onStartTrial}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white border border-amber-200 text-amber-600 hover:bg-amber-50"
                            >
                                试用 15 分钟
                            </button>
                        )}
                        {trialStatus === 'expired' && (
                             <button 
                                disabled
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                            >
                                试用已结束
                            </button>
                        )}
                        <button 
                        onClick={onProAction}
                        className="px-4 py-1.5 rounded-lg text-xs font-black transition-all bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/30"
                        >
                            成为赞助者
                        </button>
                    </div>
                </div>
              )}
           </div>
        </div>
      </section>

      {/* AI Assistant Configuration */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <Bot size={14} className="mr-2" />
            AI 助手配置 (BYOK)
            </h3>
            <a 
                href="https://docs.qq.com/doc/DWHNXd1FxdU9USFdk" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors flex items-center ${isDark ? 'text-amber-400 bg-amber-900/20 hover:bg-amber-900/40' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
            >
                <ExternalLink size={10} className="mr-1" />
                如何创建 API 并使用指南
            </a>
        </div>
        
        <div className={`p-5 rounded-2xl border shadow-sm space-y-5 ${cardClass}`}>
           <div className={`p-3 rounded-xl text-xs leading-relaxed border ${isDark ? 'bg-amber-900/20 border-amber-900/30 text-amber-200/80' : 'bg-amber-50 border-amber-100/50 text-amber-800'}`}>
              为了避免“模型未找到 (404)”错误，强烈建议点击下方的<strong>“获取云端可用模型”</strong>按钮。系统将直接从 API 获取您的账号有权使用的真实模型列表。
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'gemini', name: 'Gemini', desc: 'Google 官方' },
                { id: 'deepseek', name: 'DeepSeek', desc: '深度求索' },
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4 等' },
                { id: 'custom', name: '自定义', desc: '兼容接口' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id as any)}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 h-16 ${
                    aiSettings.provider === p.id 
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20' 
                    : (isDark ? 'border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300' : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-gray-50')
                  }`}
                >
                  <div className="text-xs font-bold">{p.name}</div>
                  <div className="text-[9px] opacity-70">{p.desc}</div>
                </button>
              ))}
           </div>

           <div className="space-y-4 pt-2">
              <div>
                <label className={`text-xs font-bold mb-1.5 flex items-center ${labelClass}`}><Key size={12} className="mr-1"/> API Key</label>
                <input 
                  type="password"
                  value={aiSettings.apiKey}
                  onChange={(e) => updateAISetting('apiKey', e.target.value)}
                  placeholder={aiSettings.provider === 'gemini' ? "留空使用内置 Key，或填入您的 Key" : "sk-..."}
                  className={`w-full rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-amber-500 transition-all ${inputClass}`}
                />
              </div>

              {aiSettings.provider !== 'gemini' && (
                <div>
                  <label className={`text-xs font-bold mb-1.5 flex items-center ${labelClass}`}><Globe size={12} className="mr-1"/> API Base URL</label>
                  <input 
                    type="text"
                    value={aiSettings.baseUrl}
                    onChange={(e) => updateAISetting('baseUrl', e.target.value)}
                    placeholder="例如: https://api.deepseek.com (勿包含 /chat/completions)"
                    className={`w-full rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-amber-500 transition-all ${inputClass}`}
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className={`text-xs font-bold flex items-center ${labelClass}`}><Box size={12} className="mr-1"/> 模型名称 (Model Name)</label>
                    <button 
                        onClick={fetchCloudModels}
                        disabled={isFetchingModels || !aiSettings.apiKey}
                        className={`text-[10px] flex items-center hover:underline disabled:opacity-50 disabled:no-underline px-2 py-1 rounded border transition-colors ${
                            isDark 
                            ? 'text-amber-400 bg-amber-900/20 border-amber-900/30 hover:bg-amber-900/40' 
                            : 'text-amber-600 bg-amber-50 border-amber-100 hover:text-amber-700'
                        }`}
                    >
                        {isFetchingModels ? <RefreshCw size={10} className="mr-1 animate-spin" /> : <List size={10} className="mr-1" />}
                        {isFetchingModels ? '获取中...' : '获取云端可用模型 (推荐)'}
                    </button>
                </div>
                <input 
                  type="text"
                  value={aiSettings.model}
                  onChange={(e) => updateAISetting('model', e.target.value)}
                  placeholder={aiSettings.provider === 'deepseek' ? 'deepseek-chat' : (aiSettings.provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o')}
                  className={`w-full rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-amber-500 transition-all ${inputClass}`}
                />
                
                {fetchError && <p className="text-[10px] text-red-500 mt-1">{fetchError}</p>}
                
                {fetchedModels.length > 0 && (
                    <div className={`mt-2 p-2 rounded-xl max-h-32 overflow-y-auto custom-scrollbar border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                        <p className={`text-[9px] mb-1 flex items-center ${subTextClass}`}>
                            <Check size={10} className="mr-1 text-green-500"/>
                            已获取云端模型 (点击填入):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {fetchedModels.map(m => (
                                <button
                                    key={m}
                                    onClick={() => updateAISetting('model', m)}
                                    className={`px-2 py-1 rounded text-[9px] font-mono border transition-all text-left truncate max-w-full ${
                                        aiSettings.model === m 
                                        ? 'bg-amber-500/20 border-amber-500 text-amber-600 font-bold' 
                                        : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300')
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {fetchedModels.length === 0 && aiSettings.provider !== 'custom' && MINIMAL_MODELS[aiSettings.provider as keyof typeof MINIMAL_MODELS] && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`text-[10px] self-center mr-1 ${subTextClass}`}>默认:</span>
                        {MINIMAL_MODELS[aiSettings.provider as keyof typeof MINIMAL_MODELS].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => updateAISetting('model', m.id)}
                                className={`px-2 py-1 rounded-md text-[10px] border transition-colors ${
                                    aiSettings.model === m.id 
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-600 font-bold' 
                                    : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                                }`}
                                title={m.name}
                            >
                                {m.id}
                            </button>
                        ))}
                    </div>
                )}
                
                <p className={`text-[10px] mt-2 pl-1 leading-relaxed ${subTextClass}`}>
                   * 为保证稳定，请优先使用“获取”按钮得到的模型 ID。
                </p>
              </div>
           </div>
        </div>
      </section>

      {/* Custom System Prompts */}
      <section className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <MessageSquare size={14} className="mr-2" />
          AI 人设调优 (System Prompt)
        </h3>
        <div className={`p-5 rounded-2xl border shadow-sm space-y-6 ${cardClass}`}>
           <div className={`text-xs leading-relaxed ${subTextClass}`}>
             在此可以自定义 AI 在不同模式下的底层指令。留空则使用系统默认的专业指令。
           </div>

           {[
             { id: 'critic', label: '毒舌主编 (深度复盘)', desc: '负责全文逻辑检查、节奏把控与毒点扫描。' },
             { id: 'partner', label: '灵感搭档 (创作助手)', desc: '负责脑洞风暴、情节推演与卡文急救。' },
             { id: 'polisher', label: '润色专家 (文笔优化)', desc: '负责优化辞藻、画面感增强与代入感提升。' }
           ].map((mode) => (
             <div key={mode.id}>
                <div className="flex justify-between items-center mb-2">
                   <div>
                       <label className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{mode.label}</label>
                       <p className={`text-[10px] ${subTextClass}`}>{mode.desc}</p>
                   </div>
                   <button 
                     onClick={() => updateCustomPrompt(mode.id as keyof CustomPrompts, '')}
                     className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-amber-400 hover:bg-white/10' : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'}`}
                     title="重置为默认"
                   >
                       <RotateCcw size={12} />
                   </button>
                </div>
                <textarea 
                   value={customPrompts[mode.id as keyof CustomPrompts] || ''}
                   onChange={(e) => updateCustomPrompt(mode.id as keyof CustomPrompts, e.target.value)}
                   placeholder="使用系统默认提示词..."
                   className={`w-full h-24 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 transition-all resize-none custom-scrollbar ${inputClass}`}
                />
             </div>
           ))}
        </div>
      </section>

      {/* 界面主题 */}
      <section className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Palette size={14} className="mr-2" />
          阅读配色
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[
            { id: 'system', name: '随动系统', icon: <Monitor size={14} />, bg: isDark ? 'bg-gray-800' : 'bg-gray-200', border: isDark ? 'border-gray-700' : 'border-gray-300' },
            { id: 'cream', name: '象牙白', bg: 'bg-[#f8f5f0]', border: 'border-amber-200' },
            { id: 'white', name: '纯白', bg: 'bg-white', border: 'border-gray-200' },
            { id: 'green', name: '护眼绿', bg: 'bg-[#e8f5e9]', border: 'border-green-200' },
            { id: 'dark', name: '水墨黑', bg: 'bg-[#1a1a1a]', border: 'border-gray-800' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                  setSettings(prev => ({
                      ...prev,
                      theme: t.id as any,
                      previousTheme: t.id !== 'dark' ? (t.id as any) : prev.previousTheme
                  }));
              }}
              className={`p-3 rounded-xl border-2 transition-all flex items-center space-x-3 ${
                settings.theme === t.id 
                ? 'border-amber-500 shadow-sm bg-amber-500/10' 
                : (isDark ? 'border-transparent bg-[#1c1c1e] hover:bg-white/5' : 'border-transparent bg-gray-50 hover:bg-gray-100')
              }`}
            >
              <div className={`w-6 h-6 rounded-full ${t.bg} border ${t.border} flex items-center justify-center shrink-0`}>
                {t.id === 'system' && <Monitor size={10} className="text-gray-500" />}
              </div>
              <span className={`text-xs font-bold ${settings.theme === t.id ? 'text-amber-600' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 字体排版 */}
      <section className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Type size={14} className="mr-2" />
          排版设置
        </h3>
        
        <div className={`space-y-4 p-4 rounded-xl border ${cardClass}`}>
          <div>
            <div className="flex justify-between mb-2">
              <label className={`text-xs font-bold ${labelClass}`}>字体大小 ({settings.fontSize}px)</label>
            </div>
            <input 
              type="range" min="14" max="32" step="1"
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className={`text-xs font-bold ${labelClass}`}>行间距 ({settings.lineHeight})</label>
            </div>
            <input 
              type="range" min="1.4" max="2.4" step="0.1"
              value={settings.lineHeight}
              onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className={`text-xs font-bold ${labelClass}`}>字体族</span>
            <div className={`flex rounded-lg p-1 border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200'}`}>
              <button 
                onClick={() => updateSetting('fontFamily', 'serif')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${settings.fontFamily === 'serif' ? 'bg-amber-600 text-white shadow-sm' : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
              >
                衬线
              </button>
              <button 
                onClick={() => updateSetting('fontFamily', 'sans')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${settings.fontFamily === 'sans' ? 'bg-amber-600 text-white shadow-sm' : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
              >
                无衬线
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 系统偏好 */}
      <section className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Settings size={14} className="mr-2" />
          系统偏好
        </h3>

        <div className="space-y-4">
          <div className={`flex items-center justify-between p-3 rounded-xl border ${cardClass}`}>
            <div className="flex items-center space-x-3">
              <Save size={16} className={iconClass} />
              <span className={`text-xs font-bold ${labelClass}`}>自动保存间隔</span>
            </div>
            <select 
              value={settings.autoSaveInterval}
              onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
              className={`bg-transparent text-xs font-bold text-amber-600 focus:outline-none ${isDark ? 'bg-black' : ''}`}
            >
              <option value={30}>30秒</option>
              <option value={60}>1分钟</option>
              <option value={300}>5分钟</option>
            </select>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-xl border ${cardClass}`}>
            <div className="flex items-center space-x-3">
              <Layout size={16} className={iconClass} />
              <span className={`text-xs font-bold ${labelClass}`}>保存时自动排版</span>
            </div>
            <button 
              onClick={() => updateSetting('autoFormatOnSave', !settings.autoFormatOnSave)}
              className={`w-10 h-5 rounded-full transition-colors relative ${settings.autoFormatOnSave ? 'bg-amber-600' : (isDark ? 'bg-white/20' : 'bg-gray-300')}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.autoFormatOnSave ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* 问题反馈 */}
      <section className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Mail size={14} className="mr-2" />
          关于与反馈
        </h3>
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col space-y-3 ${isDark ? 'bg-gradient-to-br from-[#1c1c1e] to-black border-white/5' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                  <div className={`text-sm font-bold flex items-center ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                    <Info size={14} className="mr-1.5 text-amber-500" />
                    笔纪 Inkflow Studio
                  </div>
                  <div className={`text-[10px] mt-1 pl-5 ${subTextClass}`}>版本 v2.0.0 · 让创作更自由</div>
              </div>
              <div className="flex space-x-2">
                  <button 
                      onClick={() => {
                          const w = window.open('', '_blank');
                          if(w) {
                              w.document.write(`
                                  <html>
                                  <head>
                                    <title>AI 辅助创作功能使用协议与合规预警</title>
                                    <style>
                                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.8; max-width: 900px; margin: 0 auto; color: #1d1d1f; background-color: #f5f5f7; }
                                        .container { background: #fff; padding: 60px; border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.05); }
                                        h1 { font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 30px; text-align: center; font-weight: 700; }
                                        h2 { font-size: 18px; margin-top: 30px; margin-bottom: 15px; color: #1d1d1f; font-weight: 600; }
                                        p { margin-bottom: 15px; font-size: 14px; color: #424245; text-align: justify; }
                                        ul, ol { margin-bottom: 15px; padding-left: 20px; }
                                        li { margin-bottom: 8px; font-size: 14px; color: #424245; }
                                        .highlight { font-weight: 600; color: #e63946; }
                                        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #86868b; }
                                    </style>
                                  </head>
                                  <body>
                                  <div class="container">
                                      <h1>AI 辅助创作功能使用协议与合规预警</h1>
                                      <p><strong>版本生效日期：2026年2月25日</strong></p>
                                      <p>欢迎使用笔纪 Inkflow Studio v2.0.0 提供的 AI 辅助创作服务（以下简称“本服务”）。本服务基于大语言模型（LLM）技术，旨在为创作者提供灵感激发、文本润色及内容分析等辅助功能。</p>
                                      <p class="highlight">在使用本服务前，请您务必仔细阅读并充分理解本《使用协议与合规预警》（以下简称“本协议”），特别是以粗体或红色标识的条款。您的使用行为将被视为对本协议全部内容的认可与接受。</p>

                                      <h2>第一条 服务性质与定位</h2>
                                      <ol>
                                          <li><strong>辅助工具属性</strong>：本服务仅作为辅助创作工具，而非替代人类创作者的独立主体。AI 生成的所有内容（包括但不限于大纲、正文、评论、建议）均基于概率模型生成，不代表本应用的立场或观点。</li>
                                          <li><strong>非人类编辑</strong>：AI 不具备人类的情感、道德判断或法律意识。其输出内容可能包含事实错误、逻辑漏洞、偏见或不当表述，您应当运用人类的判断力进行甄别。</li>
                                      </ol>

                                      <h2>第二条 内容合规与法律责任</h2>
                                      <ol>
                                          <li><strong>输入合规</strong>：您承诺在使用本服务时，输入的提示词（Prompt）及文本内容符合中国法律法规及您所在地的法律要求。严禁输入包含反动、色情、暴力、恐怖主义、诽谤、侵犯他人隐私或知识产权的内容。</li>
                                          <li><strong>输出审查义务</strong>：您作为最终作品的创作者和发布者，<strong>负有对 AI 生成内容进行全面审查、核实与修改的法定义务</strong>。若您直接发布未经人工审核的 AI 生成内容而导致侵权、违法或不良社会影响，相关法律责任由您自行承担，与本应用无关。</li>
                                          <li><strong>生成内容标识</strong>：根据《互联网信息服务深度合成管理规定》等法规要求，若您公开发布由 AI 生成或显著修改的内容，建议您显著标识该内容为“由人工智能辅助生成”，以保障公众知情权。</li>
                                      </ol>

                                      <h2>第三条 知识产权声明</h2>
                                      <ol>
                                          <li><strong>权利归属</strong>：在法律允许的范围内，您基于本服务生成的文本内容的知识产权归属于您（使用者）。本应用不对您生成的具体内容主张版权。</li>
                                          <li><strong>侵权风险预警</strong>：由于 AI 模型的训练数据来源广泛，理论上存在生成内容与既有作品相似的极低概率风险（即“撞车”）。<strong>建议您在使用 AI 生成内容（尤其是长段落）时，进行必要的查重或改写，以规避潜在的著作权侵权风险。</strong></li>
                                      </ol>

                                      <h2>第四条 数据安全与隐私保护</h2>
                                      <ol>
                                          <li><strong>数据传输</strong>：本应用采用“自带 Key (BYOK)”模式或本地加密存储模式。当您使用云端 AI 模型（如 Gemini, DeepSeek, OpenAI）时，您的输入数据将通过加密通道传输至相应的第三方模型服务商。</li>
                                          <li><strong>隐私保护</strong>：本应用自身不会收集、存储或出售您的创作内容。但请注意，第三方模型服务商可能会根据其隐私政策处理您的数据。<strong>严禁在 AI 对话中输入您或他人的真实姓名、身份证号、银行账号、密码等敏感个人信息。</strong></li>
                                      </ol>

                                      <h2>第五条 免责条款（重要）</h2>
                                      <ol>
                                          <li><strong>“按原样”提供</strong>：本服务按“现状”和“可获得”的状态提供。我们不保证服务不会中断，也不保证服务的及时性、安全性或不出现差错。</li>
                                          <li><strong>结果不可控</strong>：由于大语言模型的黑盒特性，我们无法控制或预测 AI 的具体输出内容。对于因使用 AI 生成内容而导致的任何直接、间接、附带或后果性的损失（包括但不限于稿费损失、声誉受损、法律诉讼），本应用不承担任何赔偿责任。</li>
                                          <li><strong>服务变更</strong>：我们保留随时修改、暂停或终止部分或全部 AI 功能的权利，恕不另行通知。</li>
                                      </ol>

                                      <h2>第六条 第三方服务依赖</h2>
                                      <p>本服务的核心能力依赖于第三方大模型（如 Google Gemini, DeepSeek 等）。若第三方服务发生故障、政策变更或停止服务，将直接影响本服务的可用性。此类不可抗力导致的无法使用，本应用不承担责任。</p>

                                      <div class="footer">
                                          <p>笔纪 Inkflow Studio v2.0.0 Team · 让创作更自由，更负责</p>
                                      </div>
                                  </div>
                                  </body>
                                  </html>
                              `);
                              w.document.close();
                          }
                      }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all border shadow-sm active:scale-95 ${
                          isDark 
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700' 
                          : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                  >
                      <ShieldAlert size={14} />
                      <span className="text-xs font-bold">AI 功能使用须知与合规预警</span>
                  </button>
                  <a 
                      href="mailto:kingkingaugust@foxmail.com?subject=笔纪App反馈"
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all border shadow-sm active:scale-95 ${
                          isDark 
                          ? 'bg-amber-900/20 hover:bg-amber-900/30 text-amber-500 border-amber-900/30' 
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100 hover:border-amber-200'
                      }`}
                  >
                      <Mail size={14} />
                      <span className="text-xs font-bold">邮件反馈</span>
                  </a>
              </div>
            </div>
            <div className={`text-[10px] pl-5 leading-relaxed ${subTextClass}`}>
               遇到 BUG 或有新功能建议？欢迎随时联系我们。<br/>
               官方邮箱: <span className={`font-mono select-all cursor-text ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>kingkingaugust@foxmail.com</span>
            </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
