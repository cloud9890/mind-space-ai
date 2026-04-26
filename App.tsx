
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Grid, LayoutGrid, StickyNote, Image as ImageIcon, 
  Link as LinkIcon, CheckCircle2, Star, Settings, Sidebar, 
  Menu, X, Sparkles, Loader2, ArrowRight, Tags, History, 
  Filter, Moon, Sun, Database, Command, Bot
} from 'lucide-react';
import { Memory, MemoryType, CategoryFilter } from './types';
import { extractMemoryDetails, searchMemoriesAI, generateCollections } from './geminiService';
import MemoryCard from './components/MemoryCard';
import CaptureOverlay from './components/CaptureOverlay';
import MemoryDetail from './components/MemoryDetail';
import NotebookWorkspace from './components/NotebookWorkspace';
import OnboardingFlow from './components/OnboardingFlow';
import { cn } from './lib/utils';

const App: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter | string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<string[] | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [collections, setCollections] = useState<string[]>(['General', 'Inspiration', 'Research']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Persistence
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('mindspace_has_seen_onboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    const saved = localStorage.getItem('mindspace_memories');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Patch old mock data with new tags
      const patched = parsed.map((m: Memory) => {
        if (m.title === 'Design Direction 2026' && !m.metadata.tags?.includes('general')) {
          return { ...m, metadata: { ...m.metadata, tags: [...(m.metadata.tags || []), 'research', 'general'] } };
        }
        if (m.title === 'Abstract Gradient Inspiration' && !m.metadata.tags?.includes('inspiration')) {
           return { ...m, metadata: { ...m.metadata, tags: [...(m.metadata.tags || []), 'inspiration'] } };
        }
        return m;
      });
      setMemories(patched);
    } else {
      setMemories([
        {
          id: '1',
          type: MemoryType.NOTE,
          content: 'The new design system should prioritize accessibility and motion. Focus on Inter and Outfit typefaces.',
          title: 'Design Direction 2026',
          timestamp: Date.now() - 3600000,
          metadata: { 
            extractedText: 'Design details',
            summary: 'Core UI/UX principles for the upcoming year.', 
            tags: ['design', 'strategy', 'ux', 'research', 'general'] 
          }
        },
        {
          id: '2',
          type: MemoryType.SCREENSHOT,
          content: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop',
          title: 'Abstract Gradient Inspiration',
          timestamp: Date.now() - 86400000 * 2,
          metadata: { 
            extractedText: 'Blue and purple gradients',
            summary: 'Visual reference for modern glassmorphism.', 
            tags: ['visuals', 'gradients', 'art', 'inspiration'] 
          }
        }
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mindspace_memories', JSON.stringify(memories));
    if (memories.length > 5) {
      generateCollections(memories).then(setCollections);
    }
  }, [memories]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open capture (Ctrl+N or Cmd+N)
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        // Prevent default browser behavior (e.g., opening a new window)
        e.preventDefault();
        
        // Don't trigger if user is actively typing in an input
        if (
          document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.hasAttribute('contenteditable')
        ) {
          return;
        }

        setIsCapturing(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // AI Search Handling
  useEffect(() => {
    const performAISearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 3) {
        setAiSearchResults(null);
        return;
      }
      setIsAILoading(true);
      try {
        const results = await searchMemoriesAI(searchQuery, memories);
        setAiSearchResults(results);
      } catch (err) {
        console.error("AI Search Error", err);
      } finally {
        setIsAILoading(false);
      }
    };

    const debounceTimer = setTimeout(performAISearch, 800);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, memories]);

  const handleCapture = async (type: MemoryType, content: string) => {
    setIsAILoading(true);
    const tempId = Math.random().toString(36).substr(2, 9);
    const newMemory: Memory = {
      id: tempId,
      type,
      content,
      timestamp: Date.now(),
      metadata: {},
      title: 'Syncing to Mind Space...'
    };
    
    setMemories(prev => [newMemory, ...prev]);

    try {
      const extracted = await extractMemoryDetails(content, type);
      setMemories(prev => prev.map(m => m.id === tempId ? { ...m, ...extracted } : m));
    } catch (e) {
      setMemories(prev => prev.map(m => m.id === tempId ? { ...m, title: 'Captured Reflection' } : m));
    } finally {
      setIsAILoading(false);
    }
  };

  const filteredMemories = useMemo(() => {
    let list = memories;

    if (aiSearchResults !== null) {
      list = list.filter(m => aiSearchResults.includes(m.id));
    } else if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.title?.toLowerCase().includes(q) || 
        m.metadata.summary?.toLowerCase().includes(q) ||
        m.metadata.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (activeCategory === 'Favorites') {
      list = list.filter(m => m.isFavorite);
    } else if (activeCategory === 'Tasks') {
      list = list.filter(m => (m.metadata.tasks?.length ?? 0) > 0);
    } else if (activeCategory !== 'All' && !collections.includes(activeCategory)) {
      const mapping: Record<string, MemoryType[]> = {
        'Screenshots': [MemoryType.SCREENSHOT, MemoryType.IMAGE],
        'Notes': [MemoryType.NOTE],
        'Links': [MemoryType.LINK]
      };
      list = list.filter(m => mapping[activeCategory as string]?.includes(m.type));
    } else if (collections.includes(activeCategory)) {
      list = list.filter(m => 
        m.metadata.tags?.some(t => t.toLowerCase().includes(activeCategory.toLowerCase())) ||
        m.title?.toLowerCase().includes(activeCategory.toLowerCase())
      );
    }

    return list;
  }, [memories, activeCategory, searchQuery, aiSearchResults, collections]);

  const toggleFavorite = useCallback((id: string) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    setSelectedMemory(null);
  }, []);

  const stats = useMemo(() => ({
    total: memories.length,
    tasks: memories.reduce((acc, m) => acc + (m.metadata.tasks?.length || 0), 0),
    images: memories.filter(m => m.type === MemoryType.SCREENSHOT || m.type === MemoryType.IMAGE).length
  }), [memories]);

  const searchRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsCapturing(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn("min-h-[100dvh] flex flex-col lg:flex-row", isDarkMode ? "dark bg-slate-950" : "bg-slate-50")}>
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop & Responsive Mobile */}
      <aside 
        className={cn(
          "fixed h-[100dvh] left-0 top-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 flex-col transition-all duration-300 overflow-hidden shadow-2xl lg:shadow-none",
          isMobileMenuOpen ? "flex translate-x-0 w-[280px]" : "hidden lg:flex lg:translate-x-0 w-[280px] lg:w-[80px]",
          isSidebarOpen && "lg:w-[280px]"
        )}
      >
        <div className="p-6 flex items-center justify-between mb-4">
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.div 
                key="full"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight dark:text-white">MindSpace</span>
              </motion.div>
            ) : (
              <motion.div 
                key="mini"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto"
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 space-y-1 custom-scrollbar overflow-y-auto">
          <SectionLabel label="General" show={isSidebarOpen || isMobileMenuOpen} />
          <NavItem 
            icon={Bot} 
            label="AI Workspace"
            description="Chat & synthesize memories" 
            active={isWorkspaceOpen} 
            onClick={() => { setIsWorkspaceOpen(true); setIsMobileMenuOpen(false); }} 
            collapsed={!isSidebarOpen && !isMobileMenuOpen}
          />
          <NavItem 
            icon={Grid} 
            label="All Memories" 
            description="Complete timeline"
            active={activeCategory === 'All'} 
            onClick={() => { setActiveCategory('All'); setIsMobileMenuOpen(false); }} 
            collapsed={!isSidebarOpen && !isMobileMenuOpen}
          />
          <NavItem 
            icon={Star} 
            label="Favorites" 
            description="Starred entries"
            active={activeCategory === 'Favorites'} 
            onClick={() => { setActiveCategory('Favorites'); setIsMobileMenuOpen(false); }} 
            collapsed={!isSidebarOpen && !isMobileMenuOpen}
          />
          <NavItem 
            icon={CheckCircle2} 
            label="Action Items" 
            description="Tasks & to-dos via AI"
            active={activeCategory === 'Tasks'} 
            onClick={() => { setActiveCategory('Tasks'); setIsMobileMenuOpen(false); }} 
            collapsed={!isSidebarOpen && !isMobileMenuOpen}
            count={stats.tasks > 0 ? stats.tasks : undefined}
          />

          <SectionLabel label="Library" show={isSidebarOpen || isMobileMenuOpen} />
          <NavItem 
            icon={ImageIcon} 
            label="Visuals" 
            description="Image & screenshots"
            active={activeCategory === 'Screenshots'} 
            onClick={() => { setActiveCategory('Screenshots'); setIsMobileMenuOpen(false); }} 
            collapsed={!isSidebarOpen && !isMobileMenuOpen}
          />
          <NavItem 
            icon={StickyNote} 
            label="Reflections" 
            description="Text & journal entries"
            active={activeCategory === 'Notes'} 
            onClick={() => { setActiveCategory('Notes'); setIsMobileMenuOpen(false); }} 
            collapsed={!isSidebarOpen && !isMobileMenuOpen}
          />
          <NavItem 
            icon={LinkIcon} 
            label="Web Clips" 
            description="Bookmarks & resources"
            active={activeCategory === 'Links'} 
            onClick={() => { setActiveCategory('Links'); setIsMobileMenuOpen(false); }} 
            collapsed={!isSidebarOpen && !isMobileMenuOpen}
          />

          <SectionLabel label="Notebooks (Discovery)" show={isSidebarOpen || isMobileMenuOpen} />
          {collections.map(col => (
            <NavItem 
              key={col}
              icon={Database} 
              label={`${col} Notebook`} 
              description={{'General': 'Catch-all thoughts', 'Inspiration': 'Creative sparks', 'Research': 'Gathered findings'}[col] || "AI-curated collection"}
              active={activeCategory === col} 
              onClick={() => {
                setActiveCategory(col);
                setIsMobileMenuOpen(false);
              }} 
              collapsed={!isSidebarOpen && !isMobileMenuOpen}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-500 dark:text-slate-400 font-semibold text-sm"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {isSidebarOpen && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-500 dark:text-slate-400 font-semibold text-sm"
          >
            <Sidebar className="w-5 h-5" />
            {isSidebarOpen && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0 pb-24 lg:pb-0 relative",
        isSidebarOpen ? "lg:pl-[280px]" : "lg:pl-[80px]"
      )}>
        {/* Header */}
        <header className="sticky top-0 lg:top-0 z-30 p-3 sm:p-6 md:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6 bg-[#f8f9fc]/90 dark:bg-[#0f111a]/90 backdrop-blur-xl border-b border-slate-200/50 lg:border-none dark:border-slate-800">
          
          {/* Mobile-only Top Bar */}
          <div className="lg:hidden flex flex-row items-center justify-between w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-full shadow-sm border border-slate-200/50 dark:border-slate-800 mb-2">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-display font-medium text-lg tracking-tight text-slate-900 dark:text-white">MindSpace</span>
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex-1 w-full max-w-2xl relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              {isAILoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Search className={cn("w-5 h-5 transition-colors", searchQuery ? "text-primary" : "text-slate-400 group-focus-within:text-primary")} />
              )}
            </div>
            <input 
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts or ask AI..."
              className="w-full bg-[#f0f4f9] dark:bg-slate-800/80 border border-transparent py-4 pl-14 pr-12 rounded-full shadow-none focus:bg-white focus:shadow-md focus:border-slate-200 dark:focus:border-slate-700 transition-all outline-none text-slate-700 dark:text-slate-100 placeholder:text-slate-500 font-medium text-base ring-0"
            />
            <div className="absolute right-5 inset-y-0 flex items-center">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-bold text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 w-full xl:w-auto">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCapturing(true)}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-primary dark:bg-primary text-white px-6 py-3.5 rounded-full font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all group shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>New source</span>
            </motion.button>
          </div>
        </header>

        {/* Mobile FAB */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCapturing(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 pt-2 md:pt-0">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {/* Context bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
               <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl md:text-[32px] font-display font-medium dark:text-white tracking-tight">
                      {activeCategory === 'All' ? 'My Notebooks' : activeCategory}
                    </h2>
                    <span className="bg-[#e4efff] dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium tracking-wide flex items-center h-fit">
                      {filteredMemories.length} item{filteredMemories.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-slate-500 mt-2">
                    {{
                      'All': 'Your complete timeline of captured thoughts, ideas, and memories.',
                      'Favorites': 'Quick access to your starred and most important entries.',
                      'Tasks': 'Actionable to-dos extracted from your entries via AI.',
                      'Notes': 'Text-based reflections, journals, and textual brain dumps.',
                      'Screenshots': 'Visual inspirations, uploaded images, and diagrams.',
                      'Links': 'Web bookmarks and external knowledge sources.',
                      'Inspiration': 'A collection of ideas to spark your creativity.',
                      'Research': 'Gathered info and notes for your projects.',
                      'General': 'Your uncategorized thoughts and ideas.'
                    }[activeCategory] || 'Explore this collection of memories.'}
                  </p>
               </div>
               
               <div className="flex items-center gap-2 self-end sm:self-center">
                  <button className="p-2 md:p-2.5 bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button className="p-2 md:p-2.5 bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <Filter className="w-5 h-5" />
                  </button>
               </div>
            </div>

            {filteredMemories.length === 0 ? (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex flex-col items-center justify-center py-32 text-center"
               >
                 <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-8">
                   <div className="relative">
                      <Search className="w-10 h-10 text-slate-300" />
                      <Plus className="w-5 h-5 text-primary absolute -bottom-1 -right-1" />
                   </div>
                 </div>
                 <h3 className="text-2xl font-bold dark:text-white mb-2">The void is silent.</h3>
                 <p className="text-slate-500 max-w-sm mx-auto">No memories match your current lens. Try expanding your search or capture a new moment.</p>
               </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              >
                <AnimatePresence mode="popLayout">
                  {filteredMemories.map((memory) => (
                    <MemoryCard 
                      key={memory.id} 
                      memory={memory} 
                      onClick={setSelectedMemory} 
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isCapturing && (
          <CaptureOverlay 
            onCapture={handleCapture} 
            onClose={() => setIsCapturing(false)} 
          />
        )}
        {selectedMemory && (
          <MemoryDetail 
            memory={selectedMemory} 
            onClose={() => setSelectedMemory(null)}
            onDelete={deleteMemory}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </AnimatePresence>

      {/* AI Intelligence Floating Progress */}
      <AnimatePresence>
        {isAILoading && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm font-bold tracking-tight">AI Intelligence Engine active...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isWorkspaceOpen && (
            <NotebookWorkspace memories={memories} onClose={() => setIsWorkspaceOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingFlow onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('mindspace_has_seen_onboarding', 'true');
          }} />
        )}
      </AnimatePresence>
    </div>
  );
};

const SectionLabel: React.FC<{ label: string; show: boolean }> = ({ label, show }) => (
  <div className={cn("px-4 py-4", !show && "flex justify-center")}>
    {show ? (
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    ) : (
      <div className="w-8 h-px bg-slate-100 dark:bg-slate-800" />
    )}
  </div>
);

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  count?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, description, active, onClick, collapsed, count }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center transition-all duration-300 relative group",
      collapsed ? "justify-center p-3" : "px-4 py-3 gap-4 rounded-2xl",
      active 
        ? "text-primary bg-primary/5 dark:bg-primary/10" 
        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
    )}
  >
    <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform mt-0.5", active && "scale-110", !collapsed && description && "items-start")} />
    {!collapsed && (
      <div className="flex flex-col flex-1 text-left min-w-0">
        <span className="text-sm font-semibold truncate">{label}</span>
        {description && (
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal tracking-wide">{description}</span>
        )}
      </div>
    )}
    {!collapsed && count !== undefined && (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{count}</span>
    )}
    
    {active && (
      <motion.div 
        layoutId="active-indicator"
        className={cn(
          "bg-primary absolute",
          collapsed ? "right-0 w-1 h-6 rounded-l-full top-1/2 -translate-y-1/2" : "left-0 w-1 h-6 rounded-r-full top-1/2 -translate-y-1/2"
        )}
      />
    )}
  </button>
);

export default App;
