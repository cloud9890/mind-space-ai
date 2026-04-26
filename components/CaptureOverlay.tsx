
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Type, Image as ImageIcon, Link as LinkIcon, Upload, Sparkles, Send } from 'lucide-react';
import { MemoryType } from '../types';
import { cn } from '../lib/utils';

interface CaptureOverlayProps {
  onCapture: (type: MemoryType, content: string) => void;
  onClose: () => void;
}

const CaptureOverlay: React.FC<CaptureOverlayProps> = ({ onCapture, onClose }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'link'>('text');
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'text', icon: Type, label: 'Note' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'link', icon: LinkIcon, label: 'Link' },
  ] as const;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onCapture(MemoryType.IMAGE, reader.result as string);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    if (activeTab === 'link' && !isValidUrl(inputValue)) return;
    const type = activeTab === 'text' ? MemoryType.NOTE : MemoryType.LINK;
    onCapture(type, inputValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-slate-900 dark:text-slate-100">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      
      <motion.div 
        layoutId="capture-modal"
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-8">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Capture Memory</h2>
              </div>
              <p className="text-sm text-slate-500 pl-[3.25rem]">
                Store a rough thought, raw image, or URL. AI will automatically organize, tag, and extract action items from your entry.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-8 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-[1.5rem]">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "relative flex items-center justify-center gap-2 py-3 rounded-[1rem] text-sm font-semibold transition-all duration-300",
                  activeTab === id 
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {activeTab === id && (
                  <motion.div 
                    layoutId="active-tab-indicator"
                    className="absolute inset-0 border-2 border-primary/20 rounded-[1rem]"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="relative min-h-[260px]">
            <AnimatePresence mode="wait">
              {activeTab === 'text' && (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <textarea
                      autoFocus
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Brain dump your thoughts here..."
                      className="w-full h-40 md:h-48 p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 rounded-[2rem] focus:ring-0 transition-all resize-none text-slate-700 dark:text-slate-200 text-base md:text-lg leading-relaxed outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group"
                  >
                    <span>Store Reflection</span>
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {activeTab === 'image' && (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col items-center justify-center py-4"
                >
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[16/10] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-slate-300 group-hover:text-primary" />
                    </div>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-200">Upload Visual Memory</span>
                    <p className="text-slate-400 text-sm mt-1">Screenshots, photos, or documents</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                </motion.div>
              )}

              {activeTab === 'link' && (
                <motion.div
                  key="link"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                      <LinkIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      autoFocus
                      type="url"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="https://example.com/article"
                      className={cn(
                        "w-full pl-20 pr-6 py-6 border-2 transition-all text-slate-700 dark:text-slate-200 text-lg outline-none focus:ring-0 rounded-[2rem]",
                        inputValue.trim() && !isValidUrl(inputValue)
                          ? "bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-500/50 focus:border-red-400 dark:focus:border-red-400"
                          : "bg-slate-50 dark:bg-slate-800/50 border-transparent focus:border-primary/20"
                      )}
                    />
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || !isValidUrl(inputValue)}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group"
                  >
                    <span>Clip Website</span>
                    <LinkIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CaptureOverlay;
