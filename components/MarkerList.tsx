
import React, { useMemo } from 'react';
import { Flag, Search, PenTool, StickyNote, ArrowRight, Anchor } from 'lucide-react';

interface MarkerListProps {
  content: string;
  onJump: (index: number) => void;
  isDark: boolean;
  isGreen: boolean;
}

interface Marker {
  index: number;
  type: 'fix' | 'research' | 'note';
  text: string;
  context: string;
}

const MarkerList: React.FC<MarkerListProps> = ({ content, onJump, isDark, isGreen }) => {
  
  const markers = useMemo(() => {
    const list: Marker[] = [];
    if (!content) return list;

    // Regex to match markers like 【⚓修】, 【⚓查: 资料】, 【⚓注: ...】
    // Captures: 1=TypeChar, 2=Content(optional)
    const regex = /【⚓(修|查|注)(?:[:：](.*?))?】/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const typeChar = match[1];
      const noteContent = match[2] || '';
      const index = match.index;
      
      // Get context (10 chars after)
      const contextStart = index + match[0].length;
      const context = content.substring(contextStart, contextStart + 20).replace(/\n/g, ' ') + '...';

      let type: Marker['type'] = 'note';
      if (typeChar === '修') type = 'fix';
      if (typeChar === '查') type = 'research';

      list.push({
        index,
        type,
        text: noteContent,
        context
      });
    }
    return list;
  }, [content]);

  const getStyle = (type: Marker['type']) => {
      switch (type) {
          case 'fix': return {
              icon: PenTool,
              label: '需重写',
              color: isGreen ? 'text-red-700 bg-red-50 border-red-200' : 'text-red-500 bg-red-50 border-red-100',
              iconColor: 'text-red-500'
          };
          case 'research': return {
              icon: Search,
              label: '需查阅',
              color: isGreen ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-blue-500 bg-blue-50 border-blue-100',
              iconColor: 'text-blue-500'
          };
          case 'note': return {
              icon: StickyNote,
              label: '备注',
              color: isGreen ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-amber-600 bg-amber-50 border-amber-100',
              iconColor: 'text-amber-500'
          };
      }
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`p-4 border-b shrink-0 ${isDark ? 'border-white/10' : (isGreen ? 'border-green-100' : 'border-gray-100')}`}>
          <div className="flex justify-between items-center mb-1">
            <h3 className={`text-xs font-black uppercase tracking-widest flex items-center ${isDark ? 'text-gray-400' : (isGreen ? 'text-emerald-800' : 'text-gray-500')}`}>
                <Anchor size={12} className="mr-2" />
                创作锚点 ({markers.length})
            </h3>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-gray-600' : (isGreen ? 'text-emerald-600/60' : 'text-gray-400')}`}>
              像剪辑视频一样，为后续修改打点
          </p>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-3">
        {markers.length === 0 ? (
            <div className="text-center py-20 opacity-30 flex flex-col items-center">
                <Flag size={40} className="mb-4" />
                <p className="text-xs font-bold">暂无锚点</p>
                <p className="text-[10px] mt-1">写作时点击右下角浮标插入</p>
            </div>
        ) : (
            markers.map((m, i) => {
                const style = getStyle(m.type);
                const Icon = style.icon;
                return (
                    <div 
                        key={i}
                        onClick={() => onJump(m.index)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                            isDark 
                            ? 'bg-[#1c1c1e] border-white/5 hover:border-white/20' 
                            : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200'
                        }`}
                    >
                        {/* Hover Indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center ${style.color}`}>
                                <Icon size={10} className="mr-1" />
                                {style.label}
                            </span>
                            <span className={`text-[10px] font-mono opacity-40 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                #{(i + 1).toString().padStart(2, '0')}
                            </span>
                        </div>
                        
                        {m.text && (
                            <p className={`text-xs font-bold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {m.text}
                            </p>
                        )}
                        
                        <div className={`text-[10px] flex items-center ${isDark ? 'text-gray-600' : (isGreen ? 'text-emerald-700/50' : 'text-gray-400')}`}>
                            <span className="truncate">{m.context}</span>
                            <ArrowRight size={10} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default MarkerList;
