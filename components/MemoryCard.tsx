
import React from 'react';
import { motion } from 'motion/react';
import { FileText, Image as ImageIcon, Link as LinkIcon, StickyNote, Clipboard, Star, Calendar, MapPin, CheckCircle2, Files } from 'lucide-react';
import { Memory, MemoryType } from '../types';
import { cn } from '../lib/utils';

interface MemoryCardProps {
  memory: Memory;
  onClick: (memory: Memory) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick }) => {
  const isImage = memory.type === MemoryType.IMAGE || memory.type === MemoryType.SCREENSHOT;

  const IconMap = {
    [MemoryType.SCREENSHOT]: ImageIcon,
    [MemoryType.IMAGE]: ImageIcon,
    [MemoryType.LINK]: LinkIcon,
    [MemoryType.NOTE]: FileText,
    [MemoryType.CLIPBOARD]: Clipboard,
  };

  const Icon = IconMap[memory.type] || FileText;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(memory)}
      className="group relative bg-[#ffffff] dark:bg-[#1a1d2d] rounded-[24px] border border-[#e8eaed] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(26,115,232,0.08)] hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-[280px]"
    >
      {/* Type Badge */}
      <div className="absolute top-4 left-4 z-10">
        <div className="w-10 h-10 bg-[#f0f4f9] dark:bg-slate-800 rounded-full flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </div>
      </div>

      {memory.isFavorite && (
        <div className="absolute top-5 right-5 z-10 text-amber-500">
          <Star className="w-5 h-5 fill-current" />
        </div>
      )}

      {isImage ? (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800">
          <img 
            src={memory.content} 
            alt={memory.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 opacity-60" />
          
          <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col justify-end text-white z-20">
            <h3 className="text-xl font-display font-medium leading-tight mb-2 line-clamp-2">
              {memory.title || 'Untitled Space'}
            </h3>
            <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
              {memory.metadata.summary || 'Processing intelligence...'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 pt-16 flex flex-col flex-1 h-full">
          <h3 className="text-xl font-display font-medium text-slate-900 dark:text-slate-100 leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
            {memory.title || 'Untitled Space'}
          </h3>
          
          <p className="text-[15px] text-slate-600 dark:text-slate-400 line-clamp-4 mb-4 leading-relaxed flex-1">
            {memory.metadata.summary || (memory.type === MemoryType.NOTE ? memory.content : 'Processing intelligence...')}
          </p>

          <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5 h-[24px] overflow-hidden">
               {memory.metadata.tags && memory.metadata.tags.length > 0 ? (
                 memory.metadata.tags.slice(0, 3).map((tag, i) => (
                   <span key={i} className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                     #{tag}
                   </span>
                 ))
               ) : (
                 <span className="text-xs font-medium text-slate-500">Uncategorized</span>
               )}
               {memory.metadata.tags && memory.metadata.tags.length > 3 && (
                 <span className="text-[10px] font-medium text-slate-400">+{memory.metadata.tags.length - 3}</span>
               )}
            </div>
            <div className="text-[11px] font-medium text-slate-400 whitespace-nowrap ml-2">
              {new Date(memory.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MemoryCard;
