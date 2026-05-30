
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Book as BookIcon, MoreVertical, Edit2, Download, Trash2, Image as ImageIcon, Check, X, Upload, CheckCircle2, FileText, Crown, Lock, BookOpen, ScrollText, Rocket, Feather, FileUp, AlertTriangle, FileType, ArrowLeft, Tag, LayoutTemplate } from 'lucide-react';
import { Book, Chapter } from '../types';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BookshelfProps {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  onSelectBook: (id: string) => void;
  isPro: boolean;
  onProAction: (callback: () => void) => void;
  theme?: string;
}

// 统一题材库 (Unified Genre Supermarket)
const UNIFIED_GENRES = [
    { id: 'xuanhuan', name: '玄幻/仙侠' },
    { id: 'urban', name: '都市/异能' },
    { id: 'ancient_romance', name: '古言/宫斗' },
    { id: 'modern_romance', name: '现言/豪门' },
    { id: 'history', name: '历史/年代' },
    { id: 'scifi', name: '科幻/赛博' },
    { id: 'suspense', name: '悬疑/刑侦' },
    { id: 'rules', name: '规则怪谈' },
    { id: 'apocalypse', name: '末世/囤货' },
    { id: 'system', name: '系统/无限' },
    { id: 'quick_trans', name: '快穿/攻略' },
    { id: 'groveling', name: '火葬场/虐' },
    { id: 'danmei', name: '纯爱/双男' },
    { id: 'farming', name: '种田/经营' },
    { id: 'entertainment', name: '娱乐/文抄' },
    { id: 'brainhole', name: '脑洞/反转' },
    { id: 'other', name: '通用/其他' }
];

const Bookshelf: React.FC<BookshelfProps> = ({ books, setBooks, onSelectBook, isPro, onProAction, theme = 'cream' }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [coverTargetId, setCoverTargetId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Custom Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  // Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // New Creation State
  const [newBookType, setNewBookType] = useState<'novel' | 'anthology'>('novel');
  const [newBookGenre, setNewBookGenre] = useState<string>('other');

  const isDark = theme === 'dark';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const resetCreateModal = () => {
      setShowCreateModal(false);
      setNewBookType('novel');
      setNewBookGenre('other');
  };

  const confirmCreateBook = () => {
    const id = `book-${Date.now()}`;
    const newBook: Book = {
      id,
      type: newBookType,
      subGenre: newBookGenre,
      title: newBookType === 'novel' ? '未命名长篇小说' : '未命名短篇文集',
      coverColor: 'default', 
      currentChapterId: 'chapter-1',
      chapters: [
        { 
          id: 'chapter-1', 
          title: newBookType === 'novel' ? '第 1 章' : '新篇章', 
          content: '', 
          synopsis: '', // Init as empty to show correct placeholders in Editor/Outline
          lastModified: Date.now() 
        }
      ],
      isFinished: false,
      createdAt: Date.now()
    };
    setBooks([newBook, ...books]);
    onSelectBook(newBook.id); 
    resetCreateModal();
  };

  // --- Import Logic ---
  const decodeFileContent = async (file: File): Promise<string> => {
      const buffer = await file.arrayBuffer();
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        return decoder.decode(buffer);
      } catch (e) {
        try {
          const decoder = new TextDecoder('gb18030', { fatal: true });
          return decoder.decode(buffer);
        } catch (e2) {
          const decoder = new TextDecoder('utf-8');
          return decoder.decode(buffer);
        }
      }
  };

  const processImportedText = (fileName: string, content: string) => {
      const title = fileName.replace(/\.(txt|md)$/i, '');
      const bookId = `book-import-${Date.now()}`;
      const chapterPattern = /(?:^|\n)\s*(第[0-9零一二三四五六七八九十百千万]+[章节回]|Chapter\s*\d+)[^\n]*/g;
      
      const matches = [...content.matchAll(chapterPattern)];
      let chapters: Chapter[] = [];
      let detectedChapters = false;
      
      if (matches.length > 0) {
          detectedChapters = true;
          if (matches[0].index && matches[0].index > 0) {
              const preamble = content.substring(0, matches[0].index).trim();
              if (preamble.length > 20) { 
                  chapters.push({
                      id: `ch-${Date.now()}-pre`,
                      title: '序章 / 前言',
                      content: preamble,
                      synopsis: '',
                      lastModified: Date.now()
                  });
              }
          }

          matches.forEach((match, i) => {
              const chapterTitle = match[0].trim();
              const startIndex = match.index! + match[0].length;
              const endIndex = (i < matches.length - 1) ? matches[i+1].index! : content.length;
              const body = content.substring(startIndex, endIndex).trim();
              
              if (body.length > 0) {
                  chapters.push({
                      id: `ch-${Date.now()}-${i}`,
                      title: chapterTitle,
                      content: body,
                      synopsis: '',
                      lastModified: Date.now()
                  });
              }
          });
      } else {
          chapters.push({
              id: `ch-${Date.now()}-full`,
              title: '全文',
              content: content,
              synopsis: '',
              lastModified: Date.now()
          });
      }

      if (chapters.length === 0) {
          chapters.push({ id: `ch-${Date.now()}-empty`, title: '正文', content: content, synopsis: '', lastModified: Date.now() });
      }

      const isNovel = detectedChapters || content.length > 20000;
      // Removed random colors
      const newBook: Book = {
          id: bookId,
          type: isNovel ? 'novel' : 'anthology',
          subGenre: 'other',
          title: title,
          coverColor: 'default',
          currentChapterId: chapters[0].id,
          chapters: chapters,
          isFinished: false,
          createdAt: Date.now()
      };

      setBooks(prev => [newBook, ...prev]);
      setIsImporting(false);
      onSelectBook(newBook.id);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.name.endsWith('.pdf')) {
          alert('PDF 解析需要复杂的依赖库，为了保证本地数据的隐私安全，暂不支持 PDF 直接解析。\n\n建议您将 PDF 另存为 TXT 或 Markdown 格式后重新导入，系统将自动为您识别章节。');
          e.target.value = '';
          return;
      }
      setIsImporting(true);
      try {
          const text = await decodeFileContent(file);
          processImportedText(file.name, text);
      } catch (err) {
          alert('文件读取失败，请检查文件是否损坏。');
          setIsImporting(false);
      } finally {
          if (importInputRef.current) importInputRef.current.value = '';
      }
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenuId(null);
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
        setBooks(prev => prev.filter(b => b.id !== deleteTargetId));
        setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
      setDeleteTargetId(null);
  };

  const startRename = (book: Book, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(book.id);
    setEditTitle(book.title);
    setActiveMenuId(null);
  };

  const saveRename = () => {
    if (editTitle.trim()) {
      setBooks(books.map(b => b.id === editingId ? { ...b, title: editTitle } : b));
    }
    setEditingId(null);
  };

  // --- Export Handler with Visual Feedback ---
  const exportFullBook = async (book: Book, format: 'txt' | 'epub' | 'pdf') => {
    setActiveMenuId(null);
    
    const doExport = async () => {
        if (format === 'txt') {
            const fullText = book.chapters.map(c => `【${c.title}】\n\n${c.content}\n\n`).join('--- 分章线 ---\n\n');
            const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${book.title}_全本.txt`;
            link.click();
            URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
             // Real PDF Export using html2canvas + jsPDF
             const element = document.createElement('div');
             element.style.position = 'absolute';
             element.style.left = '-9999px';
             element.style.top = '0';
             element.style.width = '210mm'; // A4 width
             element.innerHTML = `
                <div style="font-family: 'Noto Serif SC', serif; padding: 40px; color: #333; background: white;">
                  <h1 style="text-align: center; font-size: 32px; margin-bottom: 60px;">${book.title}</h1>
                  ${book.chapters.map(c => `
                    <div style="page-break-before: always;">
                        <h2 style="font-size: 24px; font-weight: bold; margin-top: 50px; margin-bottom: 30px; text-align: center;">${c.title}</h2>
                        ${c.content.split('\n').filter(line => line.trim()).map(p => `<p style="line-height: 1.8; text-indent: 2em; margin-bottom: 1em; font-size: 18px; text-align: justify;">${p}</p>`).join('')}
                    </div>
                  `).join('')}
                </div>
             `;
             document.body.appendChild(element);

             try {
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                
                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 0) {
                    position -= pageHeight; // Move image up
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                pdf.save(`${book.title}_全本.pdf`);
             } finally {
                document.body.removeChild(element);
             }
             
        } else if (format === 'epub') {
             // Real EPUB Export using JSZip
             // ... (existing EPUB logic)
             // ...
             // Update download filename to match request
             // link.download = `${book.title}_全本.epub`;
             // ...
             
              const zip = new JSZip();
              zip.file("mimetype", "application/epub+zip");
              
              zip.folder("META-INF")?.file("container.xml", `<?xml version="1.0"?>
                <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                    <rootfiles>
                        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                    </rootfiles>
                </container>`);

              const oebps = zip.folder("OEBPS");
              let manifestItems = '';
              let spineRefs = '';
              
              book.chapters.forEach((c, i) => {
                  const filename = `chapter_${i + 1}.html`;
                  const content = `<?xml version="1.0" encoding="utf-8"?>
                    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
                    <html xmlns="http://www.w3.org/1999/xhtml">
                    <head><title>${c.title}</title></head>
                    <body>
                        <h2>${c.title}</h2>
                        ${c.content.split('\n').filter(l => l.trim()).map(p => `<p>${p}</p>`).join('')}
                    </body>
                    </html>`;
                  oebps?.file(filename, content);
                  manifestItems += `<item id="ch${i+1}" href="${filename}" media-type="application/xhtml+xml"/>\n`;
                  spineRefs += `<itemref idref="ch${i+1}"/>\n`;
              });

              const opfContent = `<?xml version="1.0" encoding="utf-8"?>
                <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
                    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
                        <dc:title>${book.title}</dc:title>
                        <dc:language>zh-CN</dc:language>
                    </metadata>
                    <manifest>
                        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
                        ${manifestItems}
                    </manifest>
                    <spine toc="ncx">
                        ${spineRefs}
                    </spine>
                </package>`;
              oebps?.file("content.opf", opfContent);

              const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
                <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
                    <head><meta name="dtb:uid" content="urn:uuid:12345"/></head>
                    <docTitle><text>${book.title}</text></docTitle>
                    <navMap>
                        ${book.chapters.map((c, i) => `
                        <navPoint id="navPoint-${i+1}" playOrder="${i+1}">
                            <navLabel><text>${c.title}</text></navLabel>
                            <content src="chapter_${i+1}.html"/>
                        </navPoint>`).join('')}
                    </navMap>
                </ncx>`;
              oebps?.file("toc.ncx", ncxContent);

              const content = await zip.generateAsync({ type: "blob" });
              const url = URL.createObjectURL(content);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${book.title}_全本.epub`;
              link.click();
              URL.revokeObjectURL(url);
        }
    };

    // Pro Gate
    if (format !== 'txt') {
        onProAction(() => doExport()); 
    } else {
        doExport();
    }
  };

  const triggerCoverUpload = (bookId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCoverTargetId(bookId);
    fileInputRef.current?.click();
    setActiveMenuId(null);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && coverTargetId) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setBooks(prev => prev.map(b => b.id === coverTargetId ? { ...b, coverImage: base64 } : b));
      };
      reader.readAsDataURL(file);
    }
    setCoverTargetId(null);
  };

  const handleSelect = (book: Book) => {
    if (editingId) return;
    onSelectBook(book.id);
  };

  const toggleMenu = (e: React.MouseEvent, bookId: string) => {
      e.stopPropagation();
      e.preventDefault();
      setActiveMenuId(prev => prev === bookId ? null : bookId);
  };

  // Helper classes based on theme
  const modalBg = isDark ? 'bg-[#1c1c1e] border-white/10 text-gray-200' : 'bg-white text-gray-800';
  const modalText = isDark ? 'text-gray-300' : 'text-gray-600';
  const modalHeader = isDark ? 'text-white' : 'text-gray-800';
  const inputBg = isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800';

  return (
    <div className="p-6 md:p-12 h-full overflow-y-auto custom-scrollbar relative">
      <input type="file" ref={fileInputRef} onChange={handleCoverChange} accept="image/*" className="hidden" />
      <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".txt,.md" className="hidden" />

      {/* Delete Modal */}
      {deleteTargetId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden text-center border animate-in zoom-in-95 ${modalBg} border-white/20`}>
                  <div className="w-16 h-16 bg-red-100/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner ring-1 ring-red-500/20">
                      <Trash2 size={32} />
                  </div>
                  <h3 className={`text-xl font-black mb-2 ${modalHeader}`}>确认删除作品？</h3>
                  <p className={`text-sm mb-8 leading-relaxed font-medium ${modalText}`}>
                      此操作<span className="text-red-500 font-bold">不可撤销</span>。<br/>
                      这本作品及其所有章节将永久消失。
                  </p>
                  <div className="flex space-x-3">
                      <button onClick={cancelDelete} className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>我再想想</button>
                      <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">确认删除</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Creation Modal (Single Page "Supermarket" Style) */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-2xl rounded-3xl shadow-2xl p-8 relative overflow-hidden transition-all flex flex-col max-h-[90vh] ${modalBg}`}>
                  {books.length > 0 && (
                      <button onClick={resetCreateModal} className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'text-gray-500 hover:bg-white/10 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}><X size={20}/></button>
                  )}
                  
                  <div className="animate-in fade-in slide-in-from-right-8 duration-300 flex flex-col h-full">
                      <div className="text-center mb-6 shrink-0">
                          <h2 className={`text-2xl font-black mb-1 ${modalHeader}`}>新建作品</h2>
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>组合您的创作基因，激活专属 AI 责编</p>
                      </div>
                      
                      <div className="overflow-y-auto custom-scrollbar flex-grow pr-2">
                          {/* 1. Select Type (Cards) */}
                          <div className="mb-6">
                              <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block px-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  第一步：定骨架 (篇幅结构)
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                  <button 
                                    onClick={() => setNewBookType('novel')} 
                                    className={`relative p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-center justify-center space-y-2 group ${newBookType === 'novel' 
                                        ? (isDark ? 'bg-amber-900/20 border-amber-500/50 shadow-sm' : 'bg-amber-50 border-amber-400 shadow-sm') 
                                        : (isDark ? 'bg-white/5 border-white/5 hover:border-amber-500/30' : 'bg-white border-gray-100 hover:border-amber-200')
                                    }`}
                                  >
                                      <BookOpen size={24} className={newBookType === 'novel' ? 'text-amber-600' : (isDark ? 'text-gray-600 group-hover:text-amber-500' : 'text-gray-400 group-hover:text-amber-400')} />
                                      <div className="text-center">
                                          <h3 className={`font-bold text-sm ${newBookType === 'novel' ? (isDark ? 'text-amber-400' : 'text-amber-900') : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>长篇小说</h3>
                                          <p className="text-[10px] text-gray-500 mt-1">连载 · 伏笔 · 宏大叙事</p>
                                      </div>
                                  </button>
                                  
                                  <button 
                                    onClick={() => setNewBookType('anthology')} 
                                    className={`relative p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-center justify-center space-y-2 group ${newBookType === 'anthology' 
                                        ? (isDark ? 'bg-indigo-900/20 border-indigo-500/50 shadow-sm' : 'bg-indigo-50 border-indigo-400 shadow-sm')
                                        : (isDark ? 'bg-white/5 border-white/5 hover:border-indigo-500/30' : 'bg-white border-gray-100 hover:border-indigo-200')
                                    }`}
                                  >
                                      <ScrollText size={24} className={newBookType === 'anthology' ? 'text-indigo-600' : (isDark ? 'text-gray-600 group-hover:text-indigo-500' : 'text-gray-400 group-hover:text-indigo-400')} />
                                      <div className="text-center">
                                          <h3 className={`font-bold text-sm ${newBookType === 'anthology' ? (isDark ? 'text-indigo-400' : 'text-indigo-900') : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>短篇文集</h3>
                                          <p className="text-[10px] text-gray-500 mt-1">脑洞 · 节奏 · 黄金开篇</p>
                                      </div>
                                  </button>
                              </div>
                          </div>

                          {/* 2. Select Genre (Small Chips) */}
                          <div className="mb-4">
                              <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block px-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  第二步：选皮肉 (题材标签)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                  {UNIFIED_GENRES.map(g => (
                                      <button
                                          key={g.id}
                                          onClick={() => setNewBookGenre(g.id)}
                                          className={`
                                              px-3 py-2 rounded-lg text-[11px] font-bold border transition-all active:scale-95
                                              ${newBookGenre === g.id 
                                                  ? (newBookType === 'novel' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-indigo-500 text-white border-indigo-600 shadow-md')
                                                  : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700')
                                              }
                                          `}
                                      >
                                          {g.name}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Footer Action */}
                      <div className={`pt-4 border-t mt-2 shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                          <button 
                              onClick={confirmCreateBook}
                              className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                                  newBookType === 'novel' 
                                  ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200/20' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/20'
                              }`}
                          >
                              <Rocket size={16} />
                              <span>创建作品</span>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className={`text-3xl font-black tracking-tight mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>我的书架</h2>
          <p className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>共 {books.length} 部作品 · 字里行间皆是世界</p>
        </div>
        <div className="flex space-x-3">
             <button onClick={() => importInputRef.current?.click()} className={`flex items-center space-x-2 px-4 py-2 border rounded-xl font-bold text-xs transition-colors shadow-sm ${isDark ? 'bg-[#1c1c1e] border-white/10 text-gray-300 hover:bg-white/5' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><FileUp size={16} /><span>导入</span></button>
             <button onClick={() => { resetCreateModal(); setShowCreateModal(true); }} className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-lg active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20 shadow-black/20' : 'bg-gray-900 text-white hover:bg-black shadow-gray-200'}`}><Plus size={16} /><span>新建作品</span></button>
        </div>
      </div>
      
      {books.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 text-gray-300 border-2 border-dashed rounded-3xl ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
          <Feather size={64} className="mb-6 opacity-20" />
          <p className="text-lg font-black text-gray-400 mb-2">书架空空如也</p>
          <p className="text-xs text-gray-400 mb-8">开始您的第一部旷世巨作吧</p>
          <button id="btn-create-empty" onClick={() => { setShowCreateModal(true); }} className="px-8 py-3 bg-amber-500 text-white rounded-full font-bold shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all active:scale-95">开启创作之旅</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8 pb-20">
          {books.map(book => {
            const wordCount = book.chapters.reduce((acc, ch) => acc + (ch.content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length, 0);
            const isEditing = editingId === book.id;
            const isMenuOpen = activeMenuId === book.id;
            
            // Dynamic Cover Styling Logic
            const isFinished = book.isFinished;
            const coverBgClass = isFinished 
                ? "bg-gradient-to-br from-gray-900 via-stone-800 to-amber-900" // Premium Dark/Amber for finished
                : "bg-[#f3f4f6]"; // Minimal Light Gray for drafts/unfinished
            
            const titleClass = isFinished ? "text-amber-50/90" : "text-gray-800";
            const badgeClass = isFinished 
                ? "bg-amber-500/20 text-amber-200 border-amber-500/30"
                : "bg-white/60 text-gray-500 border-gray-200";

            // Resolve human-readable genre name
            const subGenreObj = UNIFIED_GENRES.find(g => g.id === book.subGenre);
            const displayGenre = subGenreObj ? subGenreObj.name.split('/')[0] : (book.type === 'anthology' ? '短篇' : '长篇');

            // Card Base Color
            const cardBaseClass = isDark ? 'bg-[#1c1c1e] border-l-white/10' : 'bg-white border-l-black/5';

            return (
              <div 
                key={book.id} 
                className="group relative flex flex-col w-full"
              >
                {/* Book Card - Vertical "Traditional" Design */}
                <div 
                    onClick={() => handleSelect(book)}
                    className={`relative aspect-[2/3] w-full rounded-r-lg rounded-l-[2px] shadow-[2px_3px_8px_rgba(0,0,0,0.12)] hover:shadow-[4px_6px_16px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden z-0 group-hover:z-10 border-l-2 ${cardBaseClass}`}
                >
                    {/* Main Cover Background */}
                    <div className={`absolute inset-0 ${coverBgClass} transition-colors duration-500`}>
                        {book.coverImage ? (
                             <div className="relative w-full h-full">
                                <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20" />
                                {/* Title Overlay on Image */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                    <h3 className="font-serif font-bold text-sm md:text-base text-white drop-shadow-md leading-tight line-clamp-3">
                                        {book.title}
                                    </h3>
                                </div>
                             </div>
                        ) : (
                             // Default Stylized Cover
                             <div className="w-full h-full flex flex-col p-3 relative">
                                 {/* Decorative Lines */}
                                 <div className={`absolute top-2 left-2 right-2 h-full border-2 border-opacity-20 pointer-events-none rounded ${isFinished ? 'border-amber-200' : 'border-gray-300'}`} />
                                 
                                 <div className="mt-6 mb-auto text-center px-1">
                                    <h3 className={`font-serif font-bold text-sm md:text-base leading-tight line-clamp-3 ${titleClass}`}>
                                        {book.title}
                                    </h3>
                                    {isFinished && <div className="mt-1.5 w-6 h-0.5 bg-amber-500/50 mx-auto rounded-full" />}
                                 </div>

                                 <div className="flex justify-center opacity-30 mt-auto pb-2">
                                     {book.type === 'anthology' ? <ScrollText size={24} className={isFinished ? "text-amber-100" : "text-gray-400"} /> : <BookIcon size={24} className={isFinished ? "text-amber-100" : "text-gray-400"} />}
                                 </div>
                             </div>
                        )}
                        
                        {/* Spine Shadow Effect */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                        
                        {/* Badges */}
                        <div className="absolute top-2 left-2 z-20">
                            <span className={`px-1.5 py-[2px] rounded text-[8px] font-bold backdrop-blur-md shadow-sm border ${badgeClass}`}>
                                {displayGenre}
                            </span>
                        </div>
                        {book.isFinished && (
                            <div className="absolute top-2 right-2 z-20">
                                <span className="px-1 py-[2px] rounded text-[8px] font-bold bg-emerald-500 text-white flex items-center shadow-sm border border-emerald-400">
                                    <CheckCircle2 size={8} className="mr-0.5" /> 完结
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata & Actions Below Card */}
                <div className="pt-2 px-1 flex justify-between items-start">
                    <div className="flex-grow min-w-0 pr-1">
                        {isEditing ? (
                            <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                                <input 
                                    autoFocus
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveRename()}
                                    onBlur={saveRename}
                                    className={`w-full border rounded px-1 py-0.5 text-xs font-bold focus:outline-none ${isDark ? 'bg-black/20 border-white/20 text-white' : 'bg-white border-amber-300'}`}
                                />
                                <button onClick={saveRename} className="text-emerald-500 shrink-0"><Check size={12}/></button>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className={`text-[9px] font-medium flex items-center space-x-1 leading-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <span className={`font-mono font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{wordCount.toLocaleString()}</span> <span className="scale-90 origin-left">字</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Secondary Operations Menu Trigger */}
                    <div className="relative">
                        <button 
                            onClick={(e) => toggleMenu(e, book.id)}
                            className={`p-1 rounded-md transition-colors ${isMenuOpen ? 'bg-amber-100 text-amber-600' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                            <MoreVertical size={14} />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className={`absolute bottom-full right-0 mb-2 w-40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border py-1 z-50 animate-in fade-in zoom-in-95 origin-bottom-right overflow-hidden ${isDark ? 'bg-[#1c1c1e] border-white/10' : 'bg-white border-gray-100'}`}>
                                <button onClick={(e) => startRename(book, e)} className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50 hover:text-amber-600'}`}>
                                    <Edit2 size={12} className="mr-2 opacity-70"/> 重命名
                                </button>
                                <button onClick={(e) => triggerCoverUpload(book.id, e)} className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50 hover:text-amber-600'}`}>
                                    <ImageIcon size={12} className="mr-2 opacity-70"/> 更换封面
                                </button>
                                
                                <div className={`h-px my-1 mx-2 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`} />
                                <div className="px-3 py-1 text-[9px] font-black text-gray-400 uppercase tracking-wider">导出选项</div>
                                
                                <button onClick={() => exportFullBook(book, 'txt')} className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50 hover:text-amber-600'}`}>
                                    <FileText size={12} className="mr-2 opacity-70"/> 纯文本 (.txt)
                                </button>
                                <button onClick={() => exportFullBook(book, 'epub')} className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between group/item ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50 hover:text-amber-600'}`}>
                                    <div className="flex items-center"><BookOpen size={12} className="mr-2 opacity-70"/> EPUB 电子书</div>
                                    {!isPro && <Crown size={10} className="text-amber-500" />}
                                </button>
                                <button onClick={() => exportFullBook(book, 'pdf')} className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between group/item ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50 hover:text-amber-600'}`}>
                                    <div className="flex items-center"><FileType size={12} className="mr-2 opacity-70"/> PDF 排版</div>
                                    {!isPro && <Crown size={10} className="text-amber-500" />}
                                </button>

                                <div className={`h-px my-1 mx-2 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`} />
                                
                                <button onClick={(e) => requestDelete(e, book.id)} className={`w-full text-left px-3 py-2 text-xs font-bold text-red-500 flex items-center ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}>
                                    <Trash2 size={12} className="mr-2 opacity-70"/> 删除作品
                                </button>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bookshelf;
