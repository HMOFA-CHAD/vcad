"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { examples } from "@/lib/examples";
import { cn } from "@/lib/utils";

// Dynamic imports for client-only components
const Editor = dynamic(() => import("./Editor").then(m => m.Editor), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

const Viewport = dynamic(() => import("./Viewport").then(m => m.Viewport), {
  ssr: false,
  loading: () => <ViewportSkeleton />,
});

function EditorSkeleton() {
  return (
    <div className="h-full bg-surface rounded-lg border border-border animate-pulse">
      <div className="p-4 space-y-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-4 bg-border rounded"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ViewportSkeleton() {
  return (
    <div className="h-full bg-surface rounded-lg border border-border flex items-center justify-center">
      <div className="text-text-muted text-sm">Loading 3D viewport...</div>
    </div>
  );
}

export function HeroPlayground() {
  const [selectedExample, setSelectedExample] = useState(examples[0]!);
  const [code, setCode] = useState(selectedExample.code);

  const handleExampleChange = (id: string) => {
    const example = examples.find(e => e.id === id);
    if (example) {
      setSelectedExample(example);
      setCode(example.code);
    }
  };

  return (
    <div className="space-y-4">
      {/* Example selector tabs */}
      <div className="flex gap-2 flex-wrap">
        {examples.map(example => (
          <button
            key={example.id}
            onClick={() => handleExampleChange(example.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md border transition-colors",
              selectedExample.id === example.id
                ? "bg-accent text-white border-accent"
                : "bg-surface text-text-muted border-border hover:border-text-muted hover:text-text"
            )}
          >
            {example.name}
          </button>
        ))}
      </div>

      {/* Main playground area */}
      <div className="grid lg:grid-cols-2 gap-4 min-h-[400px]">
        {/* Code editor */}
        <div className="relative">
          <Editor
            value={code}
            onChange={setCode}
            language="rust"
          />
        </div>

        {/* 3D viewport */}
        <div className="relative min-h-[300px] lg:min-h-0">
          <Viewport document={selectedExample.document} />
        </div>
      </div>
    </div>
  );
}
