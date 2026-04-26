import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Headphones, X, Send, Loader2, Play, Pause, ScrollText, FileText, HelpCircle, Sparkles, Files, Layers, Menu, Search, Download } from 'lucide-react';
import { Memory } from '../types';
import { generateAudioPodcast, chatWithMemories, generateBriefingDoc, generateFAQ } from '../geminiService';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

interface NotebookWorkspaceProps {
  memories: Memory[];
  onClose: () => void;
}

const NotebookWorkspace: React.FC<NotebookWorkspaceProps> = ({ memories, onClose }) => {
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string, type?: 'chat' | 'briefing' | 'faq'}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [isGeneratingFaq, setIsGeneratingFaq] = useState(false);
  
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filteredMemories = useMemo(() => {
    if (!sourceSearchQuery.trim()) return memories;
    return memories.filter(m => 
      m.title.toLowerCase().includes(sourceSearchQuery.toLowerCase()) || 
      m.metadata.summary?.toLowerCase().includes(sourceSearchQuery.toLowerCase()) ||
      m.metadata.tags?.some(t => t.toLowerCase().includes(sourceSearchQuery.toLowerCase()))
    );
  }, [memories, sourceSearchQuery]);

  const handleDownloadMarkdown = (content: string, prefix: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGeneratingBriefing, isGeneratingFaq, isGeneratingAudio]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;
    
    const query = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: query, type: 'chat' }]);
    setIsChatting(true);
    
    const response = await chatWithMemories(query, filteredMemories);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: response, type: 'chat' }]);
    setIsChatting(false);
  };

  const handleGenerateBriefing = async () => {
    setIsGeneratingBriefing(true);
    const content = await generateBriefingDoc(filteredMemories);
    setChatHistory(prev => [...prev, { role: 'ai', text: content, type: 'briefing' }]);
    setIsGeneratingBriefing(false);
  };

  const handleGenerateFaq = async () => {
    setIsGeneratingFaq(true);
    const content = await generateFAQ(filteredMemories);
    setChatHistory(prev => [...prev, { role: 'ai', text: content, type: 'faq' }]);
    setIsGeneratingFaq(false);
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    const audioBase64 = await generateAudioPodcast(filteredMemories);
    
    if (audioBase64) {
      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      
      view.setUint32(0, 0x52494646, false);
      view.setUint32(4, 36 + bytes.length, true);
      view.setUint32(8, 0x57415645, false);
      view.setUint32(12, 0x666d7420, false);
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
      view.setUint16(32, numChannels * (bitsPerSample / 8), true);
      view.setUint16(34, bitsPerSample, true);
      view.setUint32(36, 0x64617461, false);
      view.setUint32(40, bytes.length, true);
      
      const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } else {
      alert('Failed to generate podcast.');
    }
    
    setIsGeneratingAudio(false);
  };
  
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 text-slate-900 dark:text-slate-100">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[#f8f9fc] dark:bg-slate-900 w-full max-w-[1400px] h-full sm:h-[90vh] sm:rounded-[24px] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200/50 dark:border-slate-800"
      >
        {/* Source Guide (Sidebar) */}
        {isSidebarOpen && (
            <div className="w-full md:w-[320px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-[40vh] md:h-full absolute md:relative z-20 bottom-0 md:bottom-auto rounded-t-3xl md:rounded-none shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-none transition-transform">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 md:rounded-tl-[24px]">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        <h2 className="font-semibold text-[15px] dark:text-white">Notebook guide</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 md:hidden bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                      <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Find a source..."
                            value={sourceSearchQuery}
                            onChange={(e) => setSourceSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl py-2 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-3">Sources ({filteredMemories.length})</h3>
                    {filteredMemories.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-sm text-slate-400">No sources found.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredMemories.map(m => (
                                <div key={m.id} className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer">
                                    <div className="w-8 h-8 rounded-lg bg-[#eef2ff] dark:bg-[#1e1b4b] flex items-center justify-center shrink-0">
                                        <Files className="w-4 h-4 text-[#4f46e5] dark:text-[#818cf8]" />
                                    </div>
                                    <div className="min-w-0 pr-2">
                                        <span className="font-medium text-[13px] text-slate-800 dark:text-slate-200 block truncate leading-tight group-hover:text-blue-600 transition-colors">{m.title || "Untitled"}</span>
                                        <span className="text-[11px] text-slate-500 mt-0.5 block truncate">{m.type === 'link' ? m.metadata.url : (m.metadata.summary ? m.metadata.summary.slice(0, 40) + '...' : 'Text document')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Studio Workspace Area */}
        <div className="flex-1 flex flex-col bg-[#f8f9fc] dark:bg-[#0f111a] overflow-hidden relative">
            <div className="flex items-center justify-between p-3 md:p-5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  {!isSidebarOpen && (
                      <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <Menu className="w-5 h-5" />
                      </button>
                  )}
                  <h1 className="font-semibold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-blue-600" />
                     Studio
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                    {chatHistory.length > 0 && (
                        <button 
                            onClick={handleExportJSON}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Chat
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col h-full relative">
                <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-32 custom-scrollbar">
                    
                    {/* Audio Overview Block (NotebookLM Style) */}
                    <div className="bg-[#12141c] rounded-[24px] overflow-hidden mb-6 relative group shadow-lg">
                        <div className="px-6 py-5 flex items-start justify-between relative z-10">
                            <div>
                                <h3 className="text-white font-medium text-lg flex items-center gap-2">
                                  <Headphones className="w-5 h-5 opacity-70" />
                                  Audio Overview
                                </h3>
                                <p className="text-slate-400 text-[13px] mt-1 max-w-[200px] leading-relaxed">
                                  Deep Dive podcast synthesized from {filteredMemories.length} sources
                                </p>
                            </div>
                            <div className="mt-1">
                                {isGeneratingAudio ? (
                                    <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                                       <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                    </div>
                                ) : audioUrl ? (
                                    <button 
                                        onClick={togglePlayAudio}
                                        className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                                    >
                                        {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-1" fill="currentColor" />}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleGenerateAudio}
                                        className="text-[13px] font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-slate-200 transition-colors"
                                    >
                                        Generate
                                    </button>
                                )}
                            </div>
                        </div>
                        {audioUrl && (
                           <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                        )}
                        {/* Decorative audio waves */}
                        <div className="absolute bottom-0 right-0 left-0 h-[60%] bg-gradient-to-t from-blue-600/10 to-transparent pointer-events-none" />
                        <div className="absolute bottom-0 right-10 flex gap-1 items-end h-8 opacity-20">
                           {[20, 40, 30, 50, 25, 45, 30].map((h, i) => (
                             <div key={i} className="w-1 bg-white rounded-t-sm" style={{ height: `${isPlaying ? h : h/3}px`, transition: 'height 0.2s ease' }} />
                           ))}
                        </div>
                    </div>

                    {/* Suggested Actions Chips */}
                    <div className="mb-10">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            <button 
                                onClick={handleGenerateBriefing} disabled={isGeneratingBriefing}
                                className="whitespace-nowrap flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-full text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {isGeneratingBriefing ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                                Briefing doc
                            </button>
                            <button 
                                onClick={handleGenerateFaq} disabled={isGeneratingFaq}
                                className="whitespace-nowrap flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-full text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {isGeneratingFaq ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <HelpCircle className="w-4 h-4 text-purple-500" />}
                                FAQ
                            </button>
                        </div>
                    </div>

                    {/* Chat History */}
                    <div className="space-y-6">
                        {chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center mt-10">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-4 text-slate-400">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Ask a question or select an action above.</p>
                            </div>
                        ) : (
                            chatHistory.map((msg, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i} 
                                    className={cn("flex gap-3 w-full", msg.role === 'user' ? "justify-end" : "justify-start")}
                                >
                                    {msg.role === 'ai' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className={cn(
                                        msg.role === 'user' 
                                          ? "max-w-[85%] rounded-[20px] rounded-tr-sm px-5 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" 
                                          : "max-w-[100%] rounded-3xl"
                                    )}>
                                        {msg.role === 'ai' ? (
                                            <div className="prose prose-slate dark:prose-invert markdown-body text-[15px] leading-relaxed w-full">
                                                {(msg.type === 'briefing' || msg.type === 'faq') && (
                                                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700/50">
                                                    <div className={cn(
                                                      "inline-flex items-center px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider border",
                                                      msg.type === 'briefing' 
                                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
                                                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50"
                                                    )}>
                                                      {msg.type === 'briefing' ? 'Briefing Document' : 'FAQ'}
                                                    </div>
                                                    <button 
                                                      onClick={() => handleDownloadMarkdown(msg.text, msg.type || 'document')} 
                                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                                                      title="Export as Markdown"
                                                    >
                                                      <Download className="w-3.5 h-3.5" />
                                                      Export
                                                    </button>
                                                  </div>
                                                )}
                                                <Markdown>{msg.text}</Markdown>
                                            </div>
                                        ) : (
                                            <p className="text-[15px]">{msg.text}</p>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                        {isChatting && (
                            <div className="flex gap-3 w-full justify-start">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="flex items-center gap-2 h-8 px-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <motion.div 
                                                key={i}
                                                className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} className="h-4" />
                    </div>
                </div>
                
                {/* Fixed Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#f8f9fc] dark:from-[#0f111a] via-[#f8f9fc]/90 dark:via-[#0f111a]/90 to-transparent">
                    <div className="max-w-3xl mx-auto relative group">
                        <input 
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="w-full bg-white dark:bg-[#1a1d2d] border border-slate-200 dark:border-slate-800/80 rounded-full py-4 pl-6 pr-14 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isChatting}
                            className="absolute right-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 disabled:opacity-0 transition-all"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-1">
                           <Sparkles className="w-3 h-3" />
                           MindSpace AI
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotebookWorkspace;

