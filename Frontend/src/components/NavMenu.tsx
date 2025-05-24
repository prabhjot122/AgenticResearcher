import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavMenuProps {
  onLibraryOpen: () => void;
  recentItems: Array<{ id: string; title: string }>;
}

export const NavMenu = ({ onLibraryOpen, recentItems }: NavMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-accent transition-colors md:hidden"
      >
        <motion.div
          animate={isOpen ? "open" : "closed"}
          className="w-6 h-5 flex flex-col justify-between"
        >
          <motion.span
            variants={{
              closed: { rotate: 0, y: 0 },
              open: { rotate: 45, y: 9 },
            }}
            className="w-full h-0.5 bg-foreground block origin-left"
          />
          <motion.span
            variants={{
              closed: { opacity: 1 },
              open: { opacity: 0 },
            }}
            className="w-full h-0.5 bg-foreground block"
          />
          <motion.span
            variants={{
              closed: { rotate: 0, y: 0 },
              open: { rotate: -45, y: -9 },
            }}
            className="w-full h-0.5 bg-foreground block origin-left"
          />
        </motion.div>
      </button>

      {/* Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0.2 }}
            className="fixed top-0 left-0 w-64 h-screen bg-background/95 backdrop-blur-sm border-r border-border z-40 md:hidden"
          >
            <div className="p-6 space-y-6">
              <div className="pt-8">
                <h2 className="text-lg font-semibold mb-4">Library</h2>
                <div className="space-y-2">
                  {recentItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onLibraryOpen();
                        setIsOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-accent/10 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground">
                        {index + 1}. {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    onLibraryOpen();
                    setIsOpen(false);
                  }}
                  className="w-full p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Open Library
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}; 