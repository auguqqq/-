
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lock, Zap, Clock, Unlock, X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { BlackHouseConfig } from '../types';

interface BlackHouseOverlayProps {
  config: BlackHouseConfig;
  onExit: () => void;
  onStart: (cfg: Partial<BlackHouseConfig>) => void;
  onCancel: () => void;
  isSettingUp: boolean;
}

const BlackHouseOverlay: React.FC<BlackHouseOverlayProps> = ({ config, onExit, onStart, onCancel, isSettingUp }) => {
  const [step, setStep] = useState(1);
  const [localType, setLocalType] = useState<'word' | 'time'>('word');
  const [localTarget, setLocalTarget] = useState<string>('1000');
  const [timeLeft, setTimeLeft] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (config.active && config.type === 'time' && config.startTime) {
        const targetSeconds = config.target * 60;
        const update = () => {
            const elapsedSeconds = Math.floor((Date.now() - config.startTime!) / 1000);
            const remaining = Math.max(0, targetSeconds - elapsedSeconds);
            setTimeLeft(remaining);
        };
        update();
        interval = setInterval(update, 1000);
    }
    return () => clearInterval(interval);
  }, [config.active, config.type, config.target, config.startTime]);

  useEffect(() => {
    if (isSettingUp && step === 2 && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [step, isSettingUp]);

  const formattedTargetDisplay = useMemo(() => {
    const val = parseInt(localTarget) || 0;
    return localType === 'word' ? `${val} 字` : `${Math.floor(val/60)}小时${val%60}分`;
  }, [localTarget, localType]);

  const formattedCountdown = useMemo(() => {
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const progressPercentage = useMemo(() => {
    if (config.type === 'word') {
      return Math.min(100, (config.currentProgress / config.target) * 100);
    } else {
      const targetSeconds = config.target * 60;
      const elapsed = targetSeconds - timeLeft;
      return Math.min(100, (elapsed / targetSeconds) * 100);
    }
  }, [config, timeLeft]);

  const canExit = config.type === 'word' 
    ? config.currentProgress >= config.target 
    : timeLeft <= 0;

  if (isSettingUp && !config.active) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
          <div className="bg-[#1a252f] p-10 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
            <button onClick={onCancel} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors p-2"><X size={24} /></button>
            <div className="bg-amber-500 w-16 h-16 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-amber-500/20"><Lock className="text-white" size={32} /></div>
            <h2 className="text-3xl font-black serif">开启锁定模式</h2>
            <p className="text-gray-400 text-sm mt-3 font-medium leading-relaxed">排除干扰，深耕笔墨。字数统计仅计入本环节新增产量。</p>
          </div>
          
          <div className="p-10 bg-white">
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 mb-2">锁定类型</p>
                <div onClick={() => { setLocalType('word'); setLocalTarget('1000'); setStep(2); }} className="group flex items-center p-6 bg-gray-50 border border-gray-100 rounded-3xl hover:border-amber-500 hover:bg-amber-50 cursor-pointer transition-all">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-500 mr-5 group-hover:scale-110 transition-transform"><Zap size={24} /></div>
                  <div><h4 className="font-bold text-gray-800">按新增字数</h4><p className="text-[10px] font-bold text-gray-400 mt-0.5">跨章累计，只计新增</p></div>
                </div>
                <div onClick={() => { setLocalType('time'); setLocalTarget('30'); setStep(2); }} className="group flex items-center p-6 bg-gray-50 border border-gray-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500 mr-5 group-hover:scale-110 transition-transform"><Clock size={24} /></div>
                  <div><h4 className="font-bold text-gray-800">按专注时长</h4><p className="text-[10px] font-bold text-gray-400 mt-0.5">坚持直到倒计时结束</p></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <button onClick={() => setStep(1)} className="flex items-center text-[10px] font-black text-gray-400 hover:text-amber-600 mb-2 transition-colors tracking-widest uppercase"><ChevronLeft size={14} className="mr-1" /> 返回</button>
                <div className="text-center py-10 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">设定目标 ({localType === 'word' ? '字' : '分'})</p>
                  <input ref={inputRef} type="number" value={localTarget} onChange={(e) => setLocalTarget(e.target.value)} className={`text-6xl font-black w-full text-center focus:outline-none bg-transparent mb-6 ${localType === 'word' ? 'text-amber-600' : 'text-blue-600'}`} />
                  <div className={`px-8 py-3 rounded-2xl text-lg font-black bg-white border shadow-xl shadow-gray-200/50 inline-block ${localType === 'word' ? 'text-amber-700 border-amber-100' : 'text-blue-700 border-blue-100'}`}>锁定: {formattedTargetDisplay}</div>
                </div>
                <button onClick={() => onStart({ type: localType, target: Number(localTarget) })} className={`w-full py-5 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center space-x-2 active:scale-95 ${localType === 'word' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'}`}>
                    <Lock size={20} />
                    <span>确认锁定</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (config.active) {
    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center bg-white/70 backdrop-blur-3xl px-8 py-3 rounded-[2rem] text-gray-700 shadow-2xl border border-white/50 group transition-all duration-500">
          <div className="flex items-center space-x-4 pr-6 border-r border-gray-200/50">
            <div className="relative">
                <Lock className={config.type === 'word' ? 'text-amber-500' : 'text-blue-500'} size={20} />
                <Sparkles className="absolute -top-2 -right-2 text-amber-400 opacity-50 animate-pulse" size={12} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-1">
                {config.type === 'word' ? '产量目标' : '倒计时'}
              </span>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${config.type === 'word' ? 'bg-amber-500' : 'bg-blue-500'}`} 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="flex items-baseline space-x-2 min-w-[120px] justify-center px-6">
            <span className="text-3xl font-black font-mono tracking-tighter text-gray-800">
              {config.type === 'word' ? config.currentProgress : formattedCountdown}
            </span>
            {config.type === 'word' && <span className="text-xs font-bold text-gray-300">/ {config.target}</span>}
          </div>

          <button 
            disabled={!canExit} 
            onClick={onExit} 
            className={`flex items-center space-x-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                canExit 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed grayscale'
            }`}
          >
              {canExit ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{canExit ? '解除锁定' : '专注写作'}</span>
          </button>
      </div>
    );
  }
  return null;
};

export default BlackHouseOverlay;
