"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Book, CookingPot, Cpu, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SearchResult {
  title: string;
  description: string;
  href: string;
  category: "learn" | "cookbook" | "architecture";
}

// Static search index (in production, this would be generated or fetched)
const searchIndex: SearchResult[] = [
  {
    title: "Hello Cube",
    description: "Create your first 3D shape with vcad",
    href: "/learn/beginner/hello-cube",
    category: "learn",
  },
  {
    title: "Basic Transforms",
    description: "Learn to translate, rotate, and scale parts",
    href: "/learn/beginner/transforms",
    category: "learn",
  },
  {
    title: "Your First Hole",
    description: "Use boolean difference to create holes",
    href: "/learn/beginner/first-hole",
    category: "learn",
  },
  {
    title: "Mounting Plate",
    description: "Design a plate with bolt pattern",
    href: "/cookbook/mounting-plate",
    category: "cookbook",
  },
  {
    title: "L-Bracket",
    description: "Create a mounting bracket with holes",
    href: "/cookbook/bracket",
    category: "cookbook",
  },
  {
    title: "How Booleans Work",
    description: "Deep dive into CSG boolean operations",
    href: "/architecture/booleans",
    category: "architecture",
  },
  {
    title: "The IR Format",
    description: "Understanding the intermediate representation",
    href: "/architecture/ir",
    category: "architecture",
  },
];

const categoryIcons = {
  learn: <Book size={14} />,
  cookbook: <CookingPot size={14} />,
  architecture: <Cpu size={14} />,
};

const categoryLabels = {
  learn: "Learn",
  cookbook: "Cookbook",
  architecture: "Architecture",
};

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.trim()
    ? searchIndex.filter(
        item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      )
    : searchIndex.slice(0, 5); // Show recent/popular when no query

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          router.push(selected.href);
          onClose();
        }
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
        <div className="bg-card rounded-lg border border-border shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <MagnifyingGlass size={20} className="text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search documentation..."
              className="flex-1 bg-transparent outline-none placeholder:text-text-muted"
            />
            <kbd className="text-xs text-text-muted px-1.5 py-0.5 bg-surface rounded border border-border">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                No results found for "{query}"
              </div>
            ) : (
              <ul>
                {results.map((result, index) => (
                  <li key={result.href}>
                    <button
                      onClick={() => {
                        router.push(result.href);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        index === selectedIndex ? "bg-accent/10" : "hover:bg-hover"
                      )}
                    >
                      <span
                        className={cn(
                          "p-1.5 rounded",
                          index === selectedIndex
                            ? "bg-accent text-white"
                            : "bg-surface text-text-muted"
                        )}
                      >
                        {categoryIcons[result.category]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.title}</div>
                        <div className="text-sm text-text-muted truncate">
                          {result.description}
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">
                        {categoryLabels[result.category]}
                      </span>
                      <CaretRight
                        size={14}
                        className={cn(
                          "transition-opacity",
                          index === selectedIndex ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border text-xs text-text-muted flex items-center gap-4">
            <span>
              <kbd className="px-1 py-0.5 bg-surface rounded border border-border">↑</kbd>
              <kbd className="px-1 py-0.5 bg-surface rounded border border-border ml-1">↓</kbd>
              <span className="ml-2">navigate</span>
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-surface rounded border border-border">↵</kbd>
              <span className="ml-2">open</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
