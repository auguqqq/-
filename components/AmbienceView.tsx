
import React, { useState, useEffect, useRef } from 'react';
import { CloudRain, Flame, Crown, Lock, Waves, Wind, BookOpen, Keyboard, Upload, Trash2, Activity, Music, Shuffle, Loader2, AlertCircle } from 'lucide-react';

interface AmbienceViewProps {
  isPro: boolean;
}

// --- Audio Engine Core ---

class HybridAudioEngine {
  ctx: AudioContext | null = null;
  
  // Cache for decoded buffers: URL string -> AudioBuffer
  urlBuffers: Map<string, AudioBuffer> = new Map();
  
  // Active Nodes: ID -> { source, gain, currentUrl }
  activeNodes: Map<string, { source: AudioBufferSourceNode; gain: GainNode; currentUrl?: string }> = new Map();

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  initContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Universal Player (For both Built-in URLs and User Blobs) ---

  async playSound(channelId: string, sourceInput: string | AudioBuffer, volume: number): Promise<boolean> {
    if (!this.ctx) return false;
    this.initContext();

    // 1. Handle "Stop/Mute"
    if (volume <= 0) {
      this.stop(channelId);
      return true;
    }

    // 2. Check if already playing
    const active = this.activeNodes.get(channelId);
    
    // Determine the URL if input is string (for change detection)
    const targetUrl = typeof sourceInput === 'string' ? sourceInput : undefined;

    if (active) {
      // If it's the same URL (or we are dealing with a raw buffer without URL tracking), just update volume
      if (targetUrl && active.currentUrl === targetUrl) {
        active.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
        return true;
      }
      // If URL changed, we need to stop the old one and start new one
      this.stop(channelId);
    }

    // 3. Get AudioBuffer
    let buffer: AudioBuffer | null = null;

    if (typeof sourceInput === 'string') {
        // Mode A: Load from URL (Built-in sounds)
        if (this.urlBuffers.has(sourceInput)) {
            buffer = this.urlBuffers.get(sourceInput)!;
        } else {
            try {
                const response = await fetch(sourceInput);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                buffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.urlBuffers.set(sourceInput, buffer);
            } catch (e) {
                console.error(`Failed to load sound: ${sourceInput}`, e);
                return false;
            }
        }
    } else {
        // Mode B: Direct Buffer (User uploaded)
        buffer = sourceInput;
    }

    if (!buffer) return false;

    // 4. Create Source Graph
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0; // Start at 0 for fade in
    gainNode.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.5); // Soft fade in
    gainNode.connect(this.ctx.destination);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // Seamless loop
    source.connect(gainNode);
    source.start();

    this.activeNodes.set(channelId, { 
        source, 
        gain: gainNode, 
        currentUrl: targetUrl 
    });

    return true;
  }

  stop(channelId: string) {
    if (this.activeNodes.has(channelId)) {
      const node = this.activeNodes.get(channelId)!;
      try {
          // Fade out before stop
          node.gain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
          setTimeout(() => {
             try { node.source.stop(); node.gain.disconnect(); } catch(e){}
          }, 150);
      } catch (e) {
          // Ignore errors on stop
      }
      this.activeNodes.delete(channelId);
    }
  }

  // Helper for User Uploads
  async decodeFile(file: File): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error("Decode error", e);
      return null;
    }
  }

  stopAll() {
    this.activeNodes.forEach((_, id) => this.stop(id));
  }
}

const engine = new HybridAudioEngine();

// Configuration for Built-in Sounds
// 修正：确保只包含实际存在的文件，避免 404
const BUILT_IN_SOUNDS = {
    rain: { 
        name: '窗外雨声', 
        desc: '沉浸式白噪音', 
        icon: CloudRain, 
        color: 'text-blue-500 bg-blue-50',
        sources: ['/rain02.mp3', '/rain03.mp3'] 
    },
    fire: { 
        name: '壁炉篝火', 
        desc: '温暖的燃烧声', 
        icon: Flame, 
        color: 'text-orange-500 bg-orange-50',
        sources: ['/fire01.mp3', '/fire02.mp3', '/fire03.mp3', '/fire04.mp3'] 
    },
    wind: { 
        name: '旷野风声', 
        desc: '呼啸的气流声', 
        icon: Wind, 
        color: 'text-slate-500 bg-slate-50',
        sources: ['/wind03.mp3'] 
    },
    waves: { 
        name: '深海波涛', 
        desc: '有节奏的浪潮', 
        icon: Waves, 
        color: 'text-cyan-500 bg-cyan-50',
        sources: ['/waves02.mp3'] 
    },
    keyboard: {
        name: '机械键盘',
        desc: '清脆的打字声',
        icon: Keyboard,
        color: 'text-gray-500 bg-gray-50',
        sources: ['/keyboard01.mp3']
    },
    library: {
        name: '图书馆',
        desc: '静谧的环境音',
        icon: BookOpen,
        color: 'text-amber-700 bg-amber-50',
        sources: ['/library01.mp3'] 
    }
};

const AmbienceView: React.FC<AmbienceViewProps> = ({ isPro }) => {
  // Built-in Channels State
  const [genVolumes, setGenVolumes] = useState<Record<string, number>>({ 
    rain: 0, fire: 0, wind: 0, waves: 0, keyboard: 0, library: 0 
  });
  
  // Randomly initialize variants
  const [activeVariants, setActiveVariants] = useState<Record<string, number>>(() => {
    const initialState: Record<string, number> = {};
    Object.keys(BUILT_IN_SOUNDS).forEach(key => {
        const k = key as keyof typeof BUILT_IN_SOUNDS;
        const count = BUILT_IN_SOUNDS[k].sources.length;
        if (count > 0) {
            initialState[key] = Math.floor(Math.random() * count);
        } else {
            initialState[key] = 0;
        }
    });
    return initialState;
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({ 
    rain: false, fire: false, wind: false, waves: false, keyboard: false, library: false 
  });

  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});

  // Custom Channels (User Upload) - Simplified
  const [customTracks, setCustomTracks] = useState<{
    id: string; 
    name: string; 
    icon: any; 
    buffer: AudioBuffer | null; 
    hasFile: boolean; 
    volume: number; 
    fileName?: string; 
    loading: boolean;
  }[]>([
    { id: 'custom1', name: '自定义音轨 A', icon: Music, buffer: null, hasFile: false, volume: 0, loading: false },
    { id: 'custom2', name: '自定义音轨 B', icon: Music, buffer: null, hasFile: false, volume: 0, loading: false },
    { id: 'custom3', name: '自定义音轨 C', icon: Music, buffer: null, hasFile: false, volume: 0, loading: false },
  ]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Effect: Sync Built-in Sounds
  useEffect(() => {
    Object.keys(genVolumes).forEach(async (key) => {
        const k = key as keyof typeof BUILT_IN_SOUNDS;
        const volume = genVolumes[k];
        const config = BUILT_IN_SOUNDS[k];
        
        if (!config.sources || config.sources.length === 0) return;

        // Randomize source based on current variant index
        const variantIndex = activeVariants[k] || 0;
        const url = config.sources[variantIndex % config.sources.length];

        if (volume > 0) {
            setLoadingStates(prev => ({ ...prev, [k]: true }));
            setLoadErrors(prev => ({ ...prev, [k]: false }));
            
            const success = await engine.playSound(k, url, volume);
            
            setLoadingStates(prev => ({ ...prev, [k]: false }));
            if (!success) {
                setLoadErrors(prev => ({ ...prev, [k]: true }));
            }
        } else {
            engine.playSound(k, url, 0);
        }
    });
  }, [genVolumes, activeVariants]);

  // Effect: Sync Custom Sounds
  useEffect(() => {
    customTracks.forEach(track => {
      if (track.hasFile && track.buffer) {
        engine.playSound(track.id, track.buffer, track.volume);
      } else {
        engine.playSound(track.id, '', 0); // Stop
      }
    });
  }, [customTracks]);

  const handleUpload = async (id: string, file: File) => {
    if (!file.type.startsWith('audio/')) return alert('仅支持音频文件');
    
    // No file size limit check here as requested
    
    setCustomTracks(prev => prev.map(t => t.id === id ? { ...t, loading: true } : t));
    
    const buffer = await engine.decodeFile(file);
    
    setCustomTracks(prev => prev.map(t => t.id === id ? { 
      ...t, 
      loading: false, 
      hasFile: !!buffer,
      buffer: buffer,
      fileName: file.name,
      volume: buffer ? 0.5 : 0 
    } : t));
  };

  const removeCustomTrack = (id: string) => {
    engine.playSound(id, '', 0); // Stop
    setCustomTracks(prev => prev.map(t => t.id === id ? { ...t, hasFile: false, volume: 0, fileName: undefined, buffer: null } : t));
    if (fileInputRefs.current[id]) fileInputRefs.current[id]!.value = '';
  };

  const switchVariant = (id: string) => {
      const k = id as keyof typeof BUILT_IN_SOUNDS;
      const config = BUILT_IN_SOUNDS[k];
      
      if (config.sources.length <= 1) {
          // If only 1 or 0 files, do nothing (keep current playing)
          // The button exists for future extensibility as requested
          return;
      }

      // True Random Switch: Ensure we don't pick the exact same index if possible
      setActiveVariants(prev => {
          const current = prev[k] || 0;
          let next = Math.floor(Math.random() * config.sources.length);
          
          let attempts = 0;
          while (next === current && attempts < 3) {
              next = Math.floor(Math.random() * config.sources.length);
              attempts++;
          }
          
          return { ...prev, [k]: next };
      });
  };

  if (!isPro) {
      return (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center relative">
                 <Crown size={40} className="text-gray-300" />
                 <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-full border-4 border-white">
                     <Lock size={12} />
                 </div>
              </div>
              <div>
                  <h3 className="text-lg font-black text-gray-800">升级到 Pro 混音台</h3>
                  <div className="text-sm text-gray-500 mt-3 leading-relaxed text-left max-w-xs mx-auto space-y-2">
                      <p className="flex items-center"><Activity size={14} className="mr-2 text-amber-500"/> 内置高清环境采样 (雨/风/火/浪)</p>
                      <p className="flex items-center"><Upload size={14} className="mr-2 text-blue-500"/> 自定义导入键盘/翻书声</p>
                      <p className="flex items-center"><Activity size={14} className="mr-2 text-emerald-500"/> 独家双引擎混音技术</p>
                  </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
                  请在“设置”中输入激活码解锁
              </p>
          </div>
      )
  }

  return (
    <div className="p-6 h-full flex flex-col custom-scrollbar overflow-y-auto">
      
      {/* 1. Built-in Section (Sample Based) */}
      <div className="mb-8">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                <Activity size={12} className="mr-2 text-amber-500" />
                自然氛围 (高清采样)
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Pro</span>
         </div>
         
         <div className="grid grid-cols-1 gap-3">
             {Object.entries(BUILT_IN_SOUNDS).map(([key, config]) => {
               const id = key as keyof typeof BUILT_IN_SOUNDS;
               const currentVol = genVolumes[id];
               const hasMultiple = config.sources.length > 1;
               const isLoading = loadingStates[id];
               const isError = loadErrors[id];

               return (
               <div key={id} className={`flex items-center p-3 rounded-xl border transition-all ${currentVol > 0 ? 'bg-white border-amber-200 shadow-sm' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className={`p-2 rounded-lg mr-3 ${config.color} relative`}>
                      {isLoading ? (
                          <Loader2 size={18} className="animate-spin"/> 
                      ) : isError ? (
                          <AlertCircle size={18} className="text-red-500" />
                      ) : (
                          <config.icon size={18} />
                      )}
                  </div>
                  <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1.5">
                          <div>
                            <span className="text-xs font-bold text-gray-700 flex items-center">
                                {config.name}
                            </span>
                            <span className="text-[9px] text-gray-400 block">
                                {isError ? '音频加载失败' : config.desc}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                              {/* Always show Shuffle button, opacity lowered if not clickable effectively */}
                              <button 
                                onClick={() => switchVariant(id)}
                                className={`p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all group ${hasMultiple ? '' : 'opacity-40 hover:opacity-100'}`}
                                title={hasMultiple ? "随机切换音源" : "暂无更多变体 (点击维持当前)"}
                              >
                                  <Shuffle size={12} className={hasMultiple ? "group-active:rotate-180 transition-transform" : ""} />
                              </button>
                              
                              <span className="text-[10px] font-mono text-gray-400 min-w-[24px] text-right">{Math.round(currentVol * 100)}%</span>
                          </div>
                      </div>
                      <input 
                        type="range" min="0" max="0.8" step="0.01"
                        value={currentVol}
                        onChange={(e) => setGenVolumes(prev => ({ ...prev, [id]: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500 block"
                      />
                  </div>
               </div>
             )})}
         </div>
      </div>

      {/* 2. Custom Upload Section */}
      <div className="pb-10">
         <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                <Upload size={12} className="mr-2 text-blue-500" />
                扩展音轨 (自定义)
            </h3>
         </div>
         <p className="text-[10px] text-gray-400 mb-4 px-1">
             支持上传 MP3/WAV/FLAC 等通用格式音频 (推荐使用无缝循环素材)。
         </p>

         <div className="space-y-3">
            {customTracks.map((track) => (
                <div key={track.id} className={`p-3 rounded-xl border transition-all ${track.hasFile ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-100 border-dashed'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <div className="p-1.5 bg-gray-200 text-gray-500 rounded-lg shrink-0">
                                <track.icon size={14} />
                            </div>
                            <div className="truncate">
                                <div className="text-xs font-bold text-gray-700">{track.name}</div>
                                <div className="text-[9px] text-gray-400 truncate max-w-[100px]">
                                    {track.loading ? '正在加载...' : (track.hasFile ? track.fileName : '空闲槽位')}
                                </div>
                            </div>
                        </div>

                        <div>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="audio/*"
                                ref={el => { fileInputRefs.current[track.id] = el; }}
                                onChange={(e) => e.target.files?.[0] && handleUpload(track.id, e.target.files[0])}
                            />
                            {track.hasFile ? (
                                <button onClick={() => removeCustomTrack(track.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            ) : (
                                <button onClick={() => fileInputRefs.current[track.id]?.click()} className="px-2 py-1 bg-white border border-gray-200 text-[10px] font-bold text-gray-600 rounded hover:bg-gray-50 transition-colors shadow-sm">
                                    导入
                                </button>
                            )}
                        </div>
                    </div>

                    {track.hasFile && (
                        <div className="flex items-center space-x-2 pt-1">
                             <input 
                                type="range" min="0" max="1" step="0.01"
                                value={track.volume}
                                onChange={(e) => setCustomTracks(prev => prev.map(t => t.id === track.id ? { ...t, volume: parseFloat(e.target.value) } : t))}
                                className="flex-grow h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                             />
                             <span className="text-[9px] font-mono text-gray-400 w-6 text-right">{Math.round(track.volume * 100)}%</span>
                        </div>
                    )}
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default AmbienceView;
