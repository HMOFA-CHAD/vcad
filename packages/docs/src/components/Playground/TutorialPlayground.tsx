"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Document } from "@vcad/ir";
import { cn } from "@/lib/utils";

const Editor = dynamic(() => import("./Editor").then(m => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-surface animate-pulse rounded-lg" />
  ),
});

const Viewport = dynamic(() => import("./Viewport").then(m => m.Viewport), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-surface flex items-center justify-center text-text-muted rounded-lg">
      Loading...
    </div>
  ),
});

interface TutorialPlaygroundProps {
  code: string;
  document: Document;
  height?: string;
}

export function TutorialPlayground({
  code: initialCode,
  document,
  height = "400px",
}: TutorialPlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");

  return (
    <div
      className="rounded-lg border border-border overflow-hidden bg-surface"
      style={{ height }}
    >
      {/* Mobile tabs */}
      <div className="flex lg:hidden border-b border-border">
        <button
          onClick={() => setActiveTab("code")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "code"
              ? "bg-accent/10 text-accent border-b-2 border-accent"
              : "text-text-muted hover:text-text"
          )}
        >
          Code
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "preview"
              ? "bg-accent/10 text-accent border-b-2 border-accent"
              : "text-text-muted hover:text-text"
          )}
        >
          Preview
        </button>
      </div>

      {/* Content */}
      <div className="h-full flex">
        {/* Editor - hidden on mobile when preview tab is active */}
        <div
          className={cn(
            "w-full lg:w-1/2 h-full",
            activeTab !== "code" && "hidden lg:block"
          )}
        >
          <Editor value={code} onChange={setCode} language="rust" />
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-border" />

        {/* Viewport - hidden on mobile when code tab is active */}
        <div
          className={cn(
            "w-full lg:w-1/2 h-full",
            activeTab !== "preview" && "hidden lg:block"
          )}
        >
          <Viewport document={document} />
        </div>
      </div>
    </div>
  );
}
