
import React from 'react';
import { Clock, RotateCcw, ShieldCheck } from 'lucide-react';
import { ChapterVersion } from '../types';

interface VersionHistoryProps {
  versions: ChapterVersion[];
  onRevert: (version: ChapterVersion) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, onRevert }) => {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 flex flex-col space-y-4">
      <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mb-2">
        <p className="text-[10px] text-amber-700 font-bold leading-tight">系统已为您实时备份，每当章节发生较大变动时会自动记录版本。</p>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">历史记录 (最近100条)</p>
        
        {versions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs italic">暂无历史记录</p>
          </div>
        ) : (
          versions.map((v) => (
            <div 
              key={v.id} 
              className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-amber-200 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center text-gray-400 space-x-1">
                  <Clock size={12} />
                  <span className="text-[10px] font-medium">{new Date(v.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{v.wordCount} 字</span>
              </div>
              <h4 className="text-sm font-bold text-gray-700 mb-3 truncate">{v.title}</h4>
              <button 
                onClick={() => { if (window.confirm('还原此版本？当前工作将保存为新历史点。')) onRevert(v); }}
                className="w-full flex items-center justify-center space-x-2 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <RotateCcw size={14} />
                <span>还原此版本</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
