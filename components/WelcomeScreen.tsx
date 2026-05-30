
import React, { useState, useEffect } from 'react';
import { Feather, ChevronRight, PenTool } from 'lucide-react';

interface WelcomeScreenProps {
  onDismiss: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onDismiss }) => {
  const [visible, setVisible] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

  const handleStart = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 800); // Wait for animation to finish
  };

  if (!visible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1a1a1a] text-white transition-opacity duration-1000 overflow-hidden ${animateOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Background Ambient Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      <div className={`relative z-10 flex flex-col items-center max-w-lg px-8 text-center transition-all duration-1000 transform ${animateOut ? 'scale-110 blur-sm' : 'scale-100 blur-0'}`}>
        
        {/* Logo Icon */}
        <div className="mb-12 relative group">
            <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <Feather size={64} strokeWidth={1} className="text-amber-50 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-[bounce_3s_infinite]" />
        </div>

        {/* Main Title */}
        <h1 className="text-3xl md:text-4xl font-black serif tracking-widest mb-6 leading-relaxed text-transparent bg-clip-text bg-gradient-to-br from-amber-100 to-amber-600/80">
          笔纪 Inkflow Studio
        </h1>

        {/* Soul Text (Quotes Removed) */}
        <div className="space-y-4 mb-16 opacity-90">
            <p className="text-lg md:text-xl font-serif font-medium text-gray-300 tracking-wide leading-loose">
                做您漫漫创作长路上的<br/>
                <span className="text-amber-400 italic">静默僚机</span>
            </p>
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-gray-500 to-transparent mx-auto my-6" />
            <p className="text-xs md:text-sm text-gray-500 font-sans tracking-[0.2em] uppercase">
                THE SILENT WINGMAN FOR YOUR CREATION
            </p>
        </div>

        {/* Action Button */}
        <button 
            onClick={handleStart}
            className="group relative px-10 py-4 overflow-hidden rounded-full bg-transparent border border-white/20 hover:border-amber-500/50 transition-all duration-500"
        >
            <div className="absolute inset-0 w-0 bg-amber-900/40 transition-all duration-[250ms] ease-out group-hover:w-full opacity-0 group-hover:opacity-100" />
            <div className="relative flex items-center space-x-3">
                <span className="text-xs font-bold tracking-[0.3em] uppercase text-gray-300 group-hover:text-amber-100 transition-colors">
                    开启旅程
                </span>
                <ChevronRight size={14} className="text-gray-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
        </button>
      </div>

      {/* Footer Disclaimer */}
      <div className="absolute bottom-8 text-[10px] text-gray-600 tracking-wider font-mono">
          LOCAL STORAGE · PRIVACY FIRST · IMMERSIVE WRITING
      </div>
    </div>
  );
};

export default WelcomeScreen;
