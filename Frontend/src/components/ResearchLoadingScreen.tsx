import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Define the 10 detailed research steps
export const researchSteps = [
  {
    title: "Query Analysis",
    description: "Analyzing your query to understand intent and context"
  },
  {
    title: "Query Optimization",
    description: "Refining your query with domain-specific terminology"
  },
  {
    title: "Source Identification",
    description: "Identifying the most reliable and relevant sources"
  },
  {
    title: "Deep Research",
    description: "Gathering comprehensive information from multiple sources"
  },
  {
    title: "Information Synthesis",
    description: "Combining and structuring the gathered information"
  },
  {
    title: "Claim Extraction",
    description: "Identifying key claims that require verification"
  },
  {
    title: "Fact Verification",
    description: "Cross-checking claims against trusted sources"
  },
  {
    title: "Content Structuring",
    description: "Organizing information into a coherent structure"
  },
  {
    title: "Draft Creation",
    description: "Creating a polished draft in your chosen style"
  },
  {
    title: "Citation & Referencing",
    description: "Adding proper citations and references to sources"
  }
];

interface ResearchLoadingScreenProps {
  isLoading: boolean;
}

const ResearchLoadingScreen: React.FC<ResearchLoadingScreenProps> = ({ isLoading }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showScreen, setShowScreen] = useState(false);
  
  // Use refs to track intervals to prevent them from being recreated
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Show/hide the screen with a slight delay when loading changes
  useEffect(() => {
    if (isLoading) {
      // Clear any existing hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      
      setShowScreen(true);
    } else {
      // Add a small delay before hiding to ensure animations complete
      hideTimeoutRef.current = setTimeout(() => {
        setShowScreen(false);
      }, 1000);
    }
    
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isLoading]);
  
  // Cycle through research steps during loading
  useEffect(() => {
    // Clean up function to clear all intervals
    const cleanupIntervals = () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
        stepIntervalRef.current = null;
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
    
    if (isLoading) {
      // Reset progress when loading starts
      setProgress(0);
      
      // Clean up any existing intervals
      cleanupIntervals();
      
      // Cycle through steps
      stepIntervalRef.current = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % researchSteps.length);
      }, 3000); // Change step every 3 seconds
      
      // Increment progress
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          // Slowly increase progress, but never reach 100% until loading is complete
          const newProgress = prev + 0.5;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 500); // Update progress every 500ms
    } else {
      // Set progress to 100% when loading completes
      setProgress(100);
      
      // Clean up intervals
      cleanupIntervals();
    }
    
    // Clean up on unmount
    return cleanupIntervals;
  }, [isLoading]);

  return (
    <AnimatePresence>
      {showScreen && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-md w-full bg-background/50 backdrop-blur-md rounded-xl border border-border p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-6">Researching...</h2>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-700 rounded-full mb-6 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeInOut" }}
              />
            </div>
            
            {/* Current step animation */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h3 className="text-xl font-semibold text-primary mb-2">
                {researchSteps[currentStep].title}
              </h3>
              <p className="text-gray-400">
                {researchSteps[currentStep].description}
              </p>
            </motion.div>
            
            {/* Step indicators */}
            <div className="flex justify-center mt-8 space-x-1">
              {researchSteps.map((_, index) => (
                <div 
                  key={index} 
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    index === currentStep ? 'bg-primary' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            
            <p className="text-center text-gray-500 text-sm mt-6">
              This may take up to 2 minutes as we thoroughly research your topic
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResearchLoadingScreen;
