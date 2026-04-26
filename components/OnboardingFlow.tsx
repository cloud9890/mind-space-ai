import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, PlusCircle, Search, Headphones, ArrowRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'Welcome to Mind Space',
    description: 'Your AI-powered second brain. We help you capture thoughts, organize research, and synthesize information effortlessly.',
    icon: Brain,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    title: 'Capture Everything',
    description: 'Save text, links, tasks, and images in seconds. Click the + button from anywhere to store a new memory instantly.',
    icon: PlusCircle,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'Auto-Organized by AI',
    description: 'Mind Space uses AI to automatically extract metadata, generate tags, and connect your memories together automatically.',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
  },
  {
    title: 'Synthesize & Retrieve',
    description: 'Ask questions about your captured knowledge, or use Notebook Workspace to generate audio podcasts, FAQs, and briefings.',
    icon: Headphones,
    color: 'from-amber-400 to-orange-500',
  }
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 md:p-10 flex flex-col items-center text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 0.1 }}
            className={cn(
              "w-24 h-24 rounded-[2rem] bg-gradient-to-br flex items-center justify-center shadow-xl mb-8",
              step.color
            )}
          >
            <Icon className="w-12 h-12 text-white" />
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-4 tracking-tight"
          >
            {step.title}
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[15px] leading-relaxed font-medium text-slate-500 dark:text-slate-400 mb-10"
          >
            {step.description}
          </motion.p>
          
          <div className="w-full flex items-center justify-between">
            <button 
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Skip
            </button>
            
            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i === currentStep ? "w-6 bg-primary" : "bg-slate-200 dark:bg-slate-700"
                  )}
                />
              ))}
            </div>
            
            <button 
              onClick={handleNext}
              className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 flex items-center gap-2 group"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingFlow;
