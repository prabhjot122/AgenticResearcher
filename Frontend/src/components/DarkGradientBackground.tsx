import React, { useEffect } from "react";
// Change the import to avoid the module error
import { Gradient } from "./Gradient";

interface DarkGradientBackgroundProps {
  className?: string;
}

const DarkGradientBackground: React.FC<DarkGradientBackgroundProps> = ({ className }) => {
  useEffect(() => {
    // Initialize the gradient after the component mounts
    const gradient = new Gradient();
    gradient.initGradient("#gradient-canvas");
  }, []);

  return (
    <div className={`gradient-container ${className || ""}`} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
      {/* Canvas for the gradient background */}
      <canvas
        id="gradient-canvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          "--gradient-color-1": "#0A0A0A",
          "--gradient-color-2": "#1A0933",
          "--gradient-color-3": "#0D0221",
          "--gradient-color-4": "#190628",
        } as React.CSSProperties}
      />
    </div>
  );
};

export default DarkGradientBackground;
