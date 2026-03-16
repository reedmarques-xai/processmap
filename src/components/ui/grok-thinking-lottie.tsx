"use client";

interface GrokThinkingLottieProps {
  className?: string;
  size?: number;
}

// Figure-6 pattern animation
// Grid positions:
// 0 1 2
// 3 4 5
// 6 7 8
// 
// Figure-6 path: top-right → left → down → right → up → middle
// Order: 2 → 1 → 0 → 3 → 6 → 7 → 8 → 5 → 4 (repeat)

export default function GrokThinkingLottie({ className = "", size = 24 }: GrokThinkingLottieProps) {
  const dotSize = Math.max(4, size / 6);
  const gap = Math.max(2, size / 12);
  
  // Map grid position to animation order in figure-6 pattern
  // Position: [col, row] -> order in sequence
  const figure6Order: Record<string, number> = {
    "2,0": 0, // top-right (start)
    "1,0": 1, // top-middle
    "0,0": 2, // top-left
    "0,1": 3, // middle-left
    "0,2": 4, // bottom-left
    "1,2": 5, // bottom-middle
    "2,2": 6, // bottom-right
    "2,1": 7, // middle-right
    "1,1": 8, // center (end)
  };
  
  const totalSteps = 9;
  const duration = 1.8; // total animation duration in seconds
  const stepDuration = duration / totalSteps;
  
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`} 
      style={{ width: size, height: size }}
    >
      <div 
        className="grid grid-cols-3"
        style={{ gap }}
      >
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => {
            const order = figure6Order[`${col},${row}`];
            const delay = order * stepDuration;
            
            return (
              <div
                key={`${col}-${row}`}
                className="rounded-full bg-amber-400"
                style={{
                  width: dotSize,
                  height: dotSize,
                  opacity: 0.25,
                  transform: "scale(0.85)",
                  animation: `grokFigure6 ${duration}s ease-in-out ${delay}s infinite`,
                  animationFillMode: "both",
                }}
              />
            );
          })
        )}
      </div>
      <style jsx>{`
        @keyframes grokFigure6 {
          0%, 15% {
            opacity: 1;
            transform: scale(1.1);
          }
          20%, 100% {
            opacity: 0.25;
            transform: scale(0.85);
          }
        }
      `}</style>
    </div>
  );
}
