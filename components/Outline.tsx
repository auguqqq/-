
import React, { useState } from 'react';
import { Plus, GripVertical, Trash2, Download } from 'lucide-react';
import { Chapter, Book } from '../types';

interface OutlineProps {
  chapters: Chapter[];
  currentChapterId: string;
  onSelectChapter: (id: string) => void;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  bookId: string;
}

const Outline: React.FC<OutlineProps> = ({ chapters, currentChapterId, onSelectChapter, setBooks, bookId }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addChapter = () => {
    const nextNum = chapters.length + 1;
    const newId = `chapter-${Date.now()}`;
    const newChapter: Chapter = {
      id: newId,
      title: `第 ${nextNum} 章`,
      content: '',
      synopsis: '本章梗概待填写...',
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">目录结构</span>
        <button 
            onClick={addChapter}
            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100"
            title="新建章节"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="space-y-1.5" onDragLeave={() => setDragOverIndex(null)}>
        {chapters.map((chapter, idx) => (
          <div 
            key={chapter.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelectChapter(chapter.id)}
            className={`group flex items-center p-3 rounded-xl transition-all cursor-pointer border relative overflow-hidden ${
              currentChapterId === chapter.id 
              ? 'bg-amber-50 border-amber-200 shadow-sm' 
              : 'bg-white border-gray-100 hover:border-amber-200'
            } ${draggedIndex === idx ? 'opacity-40 scale-95 grayscale' : ''} ${
              dragOverIndex === idx ? 'border-blue-400 bg-blue-50/30 -translate-y-1' : ''
            }`}
          >
            <div className={`cursor-grab active:cursor-grabbing text-gray-300 mr-2 transition-colors ${currentChapterId === chapter.id ? 'text-amber-400' : 'group-hover:text-amber-400'}`}>
              <GripVertical size={16} />
            </div>

            <div className="flex-grow overflow-hidden flex items-center">
              <span className={`text-[10px] font-mono mr-3 w-5 transition-colors ${currentChapterId === chapter.id ? 'text-amber-600' : 'text-gray-400'}`}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className={`text-sm font-medium line-clamp-1 transition-colors ${currentChapterId === chapter.id ? 'text-amber-900' : 'text-gray-700'}`}>
                {chapter.title}
              </span>
            </div>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                onClick={(e) => exportChapter(e, chapter)}
                className="p-1.5 text-gray-300 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                title="导出单章TXT"
                >
                <Download size={14} />
                </button>
                
                <button 
                onClick={(e) => removeChapter(e, chapter.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                title="删除章节"
                >
                <Trash2 size={14} />
                </button>
            </div>

            {currentChapterId === chapter.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
            )}
          </div>
        ))}
      </div>

      {chapters.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
          <p className="text-xs text-gray-400 italic">空空如也，开启第一章吧</p>
        </div>
      )}
    </div>
  );
};

export default Outline;
