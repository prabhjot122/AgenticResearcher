import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue } from "framer-motion";
import { NotepadText, FileStack, Library } from "lucide-react";
import { TbBrandBlogger } from "react-icons/tb";
import "./BubbleSelector.css";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

// Helper function to darken/lighten hex colors

interface BubbleContent {
  id: string;
  label: string;
  color: string;
  size: number;
}

interface LibraryItem {
  id: string;
  title: string;
  category: string;
  content: string;
  timestamp: number;
}

interface BubbleSelectorProps {
  onLibraryOpen: () => void;
  recentItems: LibraryItem[];
  onItemSelect?: (item: LibraryItem) => void;
}

// Reduced to only three bubbles
const libraryContents: BubbleContent[] = [
  { id: "petaluma", label: "1", color: "rgba(15, 15, 15, 0.8)", size: 50 },
  { id: "murrieta", label: "2", color: "rgba(15, 15, 15, 0.8)", size: 50 },
  { id: "fargo", label: "3", color: "rgba(15, 15, 15, 0.8)", size: 50 },
];

interface Position {
  x: number;
  y: number;
}

// Function to check if two bubbles overlap

// Function to find non-overlapping position

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "executive-summary":
      return <NotepadText size={16} strokeWidth={1.5} />;
    case "blog-style":
      return <TbBrandBlogger size={16} />;
    case "detailed-report":
      return <FileStack size={16} strokeWidth={1.5} />;
    default:
      return <NotepadText size={16} strokeWidth={1.5} />;
  }
};

/* 
const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'executive-summary': '#3b82f6', // blue
    'blog-style': '#10b981', // emerald
    'detailed-report': '#8b5cf6', // violet
  };
  return colors[category] || '#6b7280'; // gray as default
};
*/

// Make sure the active getCategoryColor function uses the new categories
const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'executive-summary': '#3b82f6', // blue
    'blog-style': '#8b5cf6', // violet
    'detailed-report': '#10b981', // emerald
  };
  return colors[category] || '#6b7280'; // gray as default
};

// Format timestamp function
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

export const BubbleSelector: React.FC<BubbleSelectorProps> = ({
  onLibraryOpen,
  recentItems,
  onItemSelect,
}) => {
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);
  const [draggedBubble, setDraggedBubble] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartTimeRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Motion values for the main bubble
  const mainX = useMotionValue(0);
  const mainY = useMotionValue(0);

  // Create motion values for only 3 bubbles
  const bubbleX = [useMotionValue(0), useMotionValue(0), useMotionValue(0)];
  const bubbleY = [useMotionValue(0), useMotionValue(0), useMotionValue(0)];

  // Initialize positions for the three bubbles as requested
  useEffect(() => {
    // Place bubbles in specific positions as requested
    const fixedPositions = [
      { x: 0, y: 80 }, // Bottom
      { x: 80, y: 0 }, // Right
      { x: 70, y: 70 }, // Bottom-Right
    ];

    setPositions(fixedPositions);

    // Initialize motion values with fixed positions
    fixedPositions.forEach((pos, index) => {
      bubbleX[index].set(pos.x);
      bubbleY[index].set(pos.y);
    });
  }, []);

  // Restore the original hover effect
  useEffect(() => {
    if (hoveredBubble === 'main') {
      // Push all bubbles slightly outward when main bubble is hovered
      positions.forEach((pos, index) => {
        const direction = Math.atan2(pos.y, pos.x);
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        const newDistance = distance * 1.15; // Push 15% outward
        
        bubbleX[index].set(Math.cos(direction) * newDistance);
        bubbleY[index].set(Math.sin(direction) * newDistance);
      });
    } else if (hoveredBubble) {
      // Find the hovered bubble's index from recentItems
      const hoveredIndex = recentItems.findIndex(item => item.id === hoveredBubble);
      if (hoveredIndex >= 0) {
        // Push nearby bubbles away
        positions.forEach((pos, index) => {
          if (index !== hoveredIndex) {
            const hoverPos = positions[hoveredIndex];
            const dx = pos.x - hoverPos.x;
            const dy = pos.y - hoverPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only affect nearby bubbles
            if (distance < 150) {
              const angle = Math.atan2(dy, dx);
              const pushDistance = (150 - distance) * 0.3;
              
              bubbleX[index].set(pos.x + Math.cos(angle) * pushDistance);
              bubbleY[index].set(pos.y + Math.sin(angle) * pushDistance);
            }
          }
        });
      }
    } else {
      // Return to original positions when nothing is hovered
      positions.forEach((pos, index) => {
        bubbleX[index].set(pos.x);
        bubbleY[index].set(pos.y);
      });
    }
  }, [hoveredBubble, positions, recentItems]);

  // Restore the original drag effects useEffect
  useEffect(() => {
    if (draggedBubble === 'main') {
      // Main bubble is being dragged - push all bubbles away
      const mainPosX = mainX.get();
      const mainPosY = mainY.get();
      
      positions.forEach((pos, index) => {
        const originalX = pos.x;
        const originalY = pos.y;
        const dx = originalX - mainPosX;
        const dy = originalY - mainPosY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 120) {
          const angle = Math.atan2(dy, dx);
          const pushDistance = (120 - distance) * 0.5;
          
          bubbleX[index].set(originalX + Math.cos(angle) * pushDistance);
          bubbleY[index].set(originalY + Math.sin(angle) * pushDistance);
        } else {
          // Return to original position
          bubbleX[index].set(originalX);
          bubbleY[index].set(originalY);
        }
      });
    } else if (draggedBubble) {
      // Find the dragged bubble's index from recentItems
      const draggedIndex = recentItems.findIndex(item => item.id === draggedBubble);
      
      if (draggedIndex >= 0) {
        const draggedX = bubbleX[draggedIndex].get();
        const draggedY = bubbleY[draggedIndex].get();
        
        positions.forEach((pos, index) => {
          if (index !== draggedIndex) {
            const originalX = pos.x;
            const originalY = pos.y;
            const dx = originalX - draggedX;
            const dy = originalY - draggedY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
              const angle = Math.atan2(dy, dx);
              const pushDistance = (100 - distance) * 0.6;
              
              bubbleX[index].set(originalX + Math.cos(angle) * pushDistance);
              bubbleY[index].set(originalY + Math.sin(angle) * pushDistance);
            } else {
              // Return to original position
              bubbleX[index].set(originalX);
              bubbleY[index].set(originalY);
            }
          }
        });
      }
    }
  }, [draggedBubble, positions, mainX, mainY, recentItems]);

  // Modify the handleBubbleClick function
  const handleBubbleClick = (item: LibraryItem) => {
    if (hasMovedRef.current) {
      // If the bubble was dragged, don't trigger navigation
      hasMovedRef.current = false;
      return;
    }

    // If it was a quick tap/click (less than 200ms), treat as a click
    const timeSinceDragStart = Date.now() - dragStartTimeRef.current;
    if (timeSinceDragStart < 200 || !dragStartTimeRef.current) {
      if (onItemSelect) {
        console.log(
          "BubbleSelector: Direct click on item:",
          item.id,
          item.title
        );
        onItemSelect(item);
      }
    }
  };

  return (
    <div className="bubble-selector" ref={containerRef}>
      {/* Main Bubble in the center */}
      <motion.div
        className="main-bubble"
        whileHover={{ scale: 1.15 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15,
          mass: 1.2,
        }}
        drag
        dragElastic={0.7}
        dragConstraints={containerRef}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
        style={{ x: mainX, y: mainY }}
        onDragStart={() => setDraggedBubble("main")}
        onDragEnd={() => {
          setDraggedBubble(null);
          // Reset main bubble position with animation
          const animateBack = () => {
            const x = mainX.get();
            const y = mainY.get();

            if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) {
              mainX.set(0);
              mainY.set(0);
              return;
            }

            mainX.set(x * 0.9);
            mainY.set(y * 0.9);

            requestAnimationFrame(animateBack);
          };

          requestAnimationFrame(animateBack);
        }}
        onHoverStart={() => setHoveredBubble("main")}
        onHoverEnd={() => setHoveredBubble(null)}
        onClick={onLibraryOpen}
      >
        <div className="inner-circle">
          <Library size={22} strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Content Bubbles */}
      {recentItems.slice(0, 3).map(
        (item, index) =>
          positions[index] && (
            <HoverCard key={item.id}>
              <HoverCardTrigger asChild>
                <motion.div
                  key={item.id}
                  className="content-bubble clickable"
                  style={{
                    background: `#242424`,
                    opacity: 1,
                    width: libraryContents[index].size,
                    height: libraryContents[index].size,
                    boxShadow: `0 0 15px rgba(15, 15, 15, 0.6)`,
                    x: bubbleX[index],
                    y: bubbleY[index],
                  }}
                  animate={{
                    scale:
                      hoveredBubble === item.id || draggedBubble === item.id
                        ? 1.1
                        : 1,
                  }}
                  drag
                  dragElastic={0.7}
                  dragConstraints={containerRef}
                  dragMomentum={false}
                  dragTransition={{
                    power: 0.2,
                    timeConstant: 200,
                    modifyTarget: (t) => Math.round(t * 2) / 2,
                  }}
                  onDragStart={() => {
                    dragStartTimeRef.current = Date.now();
                    hasMovedRef.current = false;
                    setDraggedBubble(item.id);
                  }}
                  onDrag={() => {
                    hasMovedRef.current = true;
                  }}
                  onDragEnd={() => {
                    setDraggedBubble(null);
                    // Return to original position
                    const originalPos = positions[index];
                    const animateBack = () => {
                      const x = bubbleX[index].get();
                      const y = bubbleY[index].get();
                      const dx = originalPos.x - x;
                      const dy = originalPos.y - y;

                      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
                        bubbleX[index].set(originalPos.x);
                        bubbleY[index].set(originalPos.y);
                        return;
                      }

                      bubbleX[index].set(x + dx * 0.2);
                      bubbleY[index].set(y + dy * 0.2);

                      requestAnimationFrame(animateBack);
                    };

                    requestAnimationFrame(animateBack);

                    // Handle as a click if appropriate
                    if (!hasMovedRef.current) {
                      handleBubbleClick(item);
                    }
                  }}
                  onHoverStart={() => setHoveredBubble(item.id)}
                  onHoverEnd={() => setHoveredBubble(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBubbleClick(item);
                  }}
                >
                  <div className="flex items-center justify-center w-full h-full relative">
                    {/* The icon for the category */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                      {getCategoryIcon(item.category)}
                    </div>

                    {/* Invisible button that guarantees click behavior */}
                    <button
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onItemSelect) {
                          console.log(
                            "BubbleSelector: Button click for item:",
                            item.id,
                            item.title
                          );
                          onItemSelect(item);
                        }
                      }}
                      aria-label={`View ${item.title}`}
                    />
                  </div>
                </motion.div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 p-4">
                <div className="flex justify-between space-x-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">{item.title}</h4>
                    <div className="flex items-center mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center mr-3">
                        <span className="mr-1">
                          {getCategoryIcon(item.category)}
                        </span>
                        <span
                          style={{ color: getCategoryColor(item.category) }}
                        >
                          {item.category
                            .split("-")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")}
                        </span>
                      </span>
                      <span>Added: {formatTimestamp(item.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {item.content.substring(0, 100)}
                      {item.content.length > 100 ? "..." : ""}
                    </p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )
      )}
    </div>
  );
};

export default BubbleSelector;
