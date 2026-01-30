import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GhostPromptProps {
  message: string;
  visible: boolean;
}

export function GhostPrompt({ message, visible }: GhostPromptProps) {
  const [show, setShow] = useState(false);
  const [text, setText] = useState(message);

  // Handle visibility with delay for smooth transitions
  useEffect(() => {
    if (visible) {
      setText(message);
      setShow(true);
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => setShow(false), 8000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, message]);

  return (
    <div
      className={cn(
        "absolute bottom-20 left-1/2 -translate-x-1/2 z-25 pointer-events-none",
        "transition-all duration-500",
        show ? "opacity-60" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "px-3 py-1.5",
          "bg-surface/80 backdrop-blur-sm",
          "border border-border/50",
          "text-xs text-text-muted"
        )}
      >
        {text}
      </div>
    </div>
  );
}
