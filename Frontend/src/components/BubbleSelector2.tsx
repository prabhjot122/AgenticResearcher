import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Lightbulb, Compass, HandHelping, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card";
import './BubbleSelector.css'; // Reusing the same CSS file

// Helper function to darken/lighten hex colors

interface BubbleContent {
  id: string;
  label: string;
  color: string;
  size: number;
  tip: string;
  icon: React.ReactNode;
}

// Three info tip bubbles
const infoContents: BubbleContent[] = [
  { 
    id: 'navigation', 
    label: 'Navigation', 
    color: '#171717', 
    size: 50,
    tip: "The orbiting bubbles let you filter content by categories: \n\n• Executive Summary - Brief overviews of topics\n• Blog Style - Conversational, engaging content\n• Detailed Report - In-depth analysis with comprehensive information",
    icon: <Compass size={16} strokeWidth={1.5} />
  },
  { 
    id: 'research', 
    label: 'Research', 
    color: '#171717', 
    size: 50,
    tip: "To research a topic, start from the home screen and enter your query in the search hub. You can prefix with 'executive-summary:', 'blog-style:', or 'detailed-report:' to specify the content type.",
    icon: <Lightbulb size={16} strokeWidth={1.5} />
  },
  { 
    id: 'tips', 
    label: 'Tips', 
    color: '#171717', 
    size: 50,
    tip: "• Hover on Navigation bubbles to know about their use cases. \n• Click the Library bubble to view your saved content. \n• In the editor, use the toolbar for formatting options.",
    icon: <HandHelping size={16} strokeWidth={1.5} />
  },
];

interface Position {
  x: number;
  y: number;
}

interface BubbleSelector2Props {
  onCategorySelect?: (category: string) => void;
}

export const BubbleSelector2: React.FC<BubbleSelector2Props> = () => {
  const navigate = useNavigate();
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);
  const [draggedBubble, setDraggedBubble] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Motion values for the main bubble
  const mainX = useMotionValue(0);
  const mainY = useMotionValue(0);
  
  // Create motion values for only 3 bubbles
  const bubbleX = [
    useMotionValue(0),
    useMotionValue(0),
    useMotionValue(0)
  ];
  const bubbleY = [
    useMotionValue(0),
    useMotionValue(0),
    useMotionValue(0)
  ];
  
  // Initialize positions for the three bubbles - horizontally inverted
  useEffect(() => {
    // Place bubbles in specific positions - horizontally inverted
    const fixedPositions = [
      { x: 0, y: 80 },     // Bottom
      { x: -80, y: 0 },    // Left (inverted from right)
      { x: -70, y: 70 },   // Bottom-Left (inverted from bottom-right)
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
      // Find the hovered bubble
      const hoveredIndex = infoContents.findIndex(b => b.id === hoveredBubble);
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
  }, [hoveredBubble, positions]);
  
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
      // A content bubble is being dragged
      const draggedIndex = infoContents.findIndex(b => b.id === draggedBubble);
      
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
  }, [draggedBubble, positions, mainX, mainY]);

  const handleMainBubbleClick = () => {
    // Navigate to the instructions page
    navigate('/instructions');
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
          mass: 1.2
        }}
        drag 
        dragElastic={0.7}
        dragConstraints={containerRef}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
        style={{ x: mainX, y: mainY }}
        onDragStart={() => setDraggedBubble('main')}
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
        onHoverStart={() => setHoveredBubble('main')}
        onHoverEnd={() => setHoveredBubble(null)}
        onClick={handleMainBubbleClick}
      >
        <div className="inner-circle">
          <Info size={22} strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Content Bubbles */}
      {infoContents.map((content, index) => (
        positions[index] && (
          <HoverCard key={content.id}>
            <HoverCardTrigger asChild>
              <motion.div
                className="content-bubble"
                style={{ 
                  background: '#242424',
                  width: content.size,
                  height: content.size,
                  boxShadow: '0 0 15px rgba(23, 23, 23, 0.6)',
                  x: bubbleX[index],
                  y: bubbleY[index],
                }}
                animate={{ 
                  scale: hoveredBubble === content.id || draggedBubble === content.id ? 1.1 : 1
                }}
                drag
                dragElastic={0.7}
                dragConstraints={containerRef}
                dragMomentum={false}
                dragTransition={{ 
                  power: 0.2,
                  timeConstant: 200,
                  modifyTarget: t => Math.round(t * 2) / 2
                }}
                onDragStart={() => {
                  setDraggedBubble(content.id);
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
                }}
                onHoverStart={() => setHoveredBubble(content.id)}
                onHoverEnd={() => setHoveredBubble(null)}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  {content.icon}
                </div>
              </motion.div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-4">
              <div className="flex justify-between space-x-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">{content.label}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {content.tip}
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )
      ))}
    </div>
  );
};

export default BubbleSelector2;