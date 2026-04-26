
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Trash2, Calendar, MapPin, Tag, CheckCircle2, User, Info, ArrowUpRight, Share2, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { Memory, MemoryType } from '../types';
import { cn } from '../lib/utils';
import { summarizeMemory } from '../geminiService';
import Markdown from 'react-markdown';

interface MemoryDetailProps {
  memory: Memory;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const MemoryDetail: React.FC<MemoryDetailProps> = ({ memory, onClose, onDelete, onToggleFavorite }) => {
  const isImage = memory.type === MemoryType.IMAGE || memory.type === MemoryType.SCREENSHOT;
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const summary = await summarizeMemory(memory);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  const handleCopy = () => {
    if (aiSummary) {
      navigator.clipboard.writeText(aiSummary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center sm:p-4 text-slate-900 dark:text-slate-100">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-[95dvh] md:h-auto max-h-[100dvh] md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* Visual Content Section */}
        <div className={cn(
          "flex-none h-[40dvh] md:h-auto md:flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative group",
          !isImage && "p-6 md:p-12"
        )}>
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
              <motion.img 
                layoutId={`img-${memory.id}`}
                src={memory.content} 
                alt={memory.title} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-8">
                <Info className="w-10 h-10 text-primary" />
              </div>
              <div className="max-w-xl">
                <p className="text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed italic">
                  "{memory.content}"
                </p>
              </div>
            </div>
          )}

          {/* Action Bar Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/10 dark:bg-black/10 backdrop-blur-md rounded-full border border-white/20">
             <button 
                onClick={() => onToggleFavorite(memory.id)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  memory.isFavorite ? "bg-amber-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <Star className={cn("w-5 h-5", memory.isFavorite && "fill-current")} />
              </button>
              <button className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onDelete(memory.id)}
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-red-500 flex items-center justify-center transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 min-h-[55dvh] md:min-h-0 md:w-[450px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800">
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {memory.type}
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {new Date(memory.timestamp).toLocaleDateString()}
                </span>
             </div>
             <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
               <X className="w-5 h-5 text-slate-400" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-12 custom-scrollbar space-y-8 md:space-y-10">
            <header>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-4">{memory.title || 'Untitled Space'}</h1>
              {memory.metadata.summary && (
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  {memory.metadata.summary}
                </p>
              )}
            </header>

            <section className="bg-gradient-to-br from-[#f8faff] to-[#f0f5ff] dark:from-slate-800/40 dark:to-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">AI Deep Dive</h3>
                </div>
                {!aiSummary ? (
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 shadow-sm hover:shadow-md hover:border-blue-300 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      'Generate Summary'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-2"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
              
              {aiSummary && (
                <div className="prose prose-sm dark:prose-invert prose-blue max-w-none prose-p:leading-relaxed prose-headings:font-semibold">
                  <Markdown>{aiSummary}</Markdown>
                </div>
              )}
            </section>

            {memory.metadata.tasks && memory.metadata.tasks.length > 0 && (
              <section className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Actionables Found</h3>
                </div>
                <ul className="space-y-3">
                  {memory.metadata.tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-md border-2 border-emerald-200 dark:border-emerald-800 flex-shrink-0 mt-0.5"></div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{task}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="grid grid-cols-2 gap-4">
               {memory.metadata.locations?.map((loc, i) => (
                 <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{loc}</span>
                 </div>
               ))}
               {memory.metadata.dates?.map((date, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{date}</span>
                 </div>
               ))}
               {memory.metadata.keyPeople?.map((person, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{person}</span>
                 </div>
               ))}
            </div>

            {memory.metadata.tags && memory.metadata.tags.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Semantic Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {memory.metadata.tags.map((tag, i) => (
                    <span key={i} className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[11px] font-bold border border-slate-200/50 dark:border-slate-700/50 hover:bg-primary/10 hover:text-primary transition-colors cursor-default capitalize">
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {memory.type === MemoryType.LINK && (
               <section className="pt-4">
                  <a 
                    href={memory.content} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-6 bg-primary rounded-3xl text-white group shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                       <LinkIcon className="w-6 h-6" />
                       <span className="font-bold">Visit Captured Source</span>
                    </div>
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
               </section>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MemoryDetail;
