"use client";

import { useRef, useEffect } from "react";
import MonacoEditor, { type OnMount, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useTheme } from "@/components/ThemeProvider";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

// Monokai-inspired theme matching vcad.io
const darkTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: false,
  rules: [
    { token: "", foreground: "e0e0e0", background: "0c0c0c" },
    { token: "comment", foreground: "777777", fontStyle: "italic" },
    { token: "keyword", foreground: "cc7832" },
    { token: "string", foreground: "6a8759" },
    { token: "number", foreground: "6897bb" },
    { token: "type", foreground: "ffc66d" },
    { token: "function", foreground: "ffc66d" },
    { token: "variable", foreground: "e0e0e0" },
    { token: "operator", foreground: "e0e0e0" },
    { token: "delimiter", foreground: "e0e0e0" },
  ],
  colors: {
    "editor.background": "#0c0c0c",
    "editor.foreground": "#e0e0e0",
    "editor.lineHighlightBackground": "#1a1a1a",
    "editor.selectionBackground": "#f0400040",
    "editor.inactiveSelectionBackground": "#f0400020",
    "editorCursor.foreground": "#f04000",
    "editorLineNumber.foreground": "#444444",
    "editorLineNumber.activeForeground": "#666666",
    "editorIndentGuide.background": "#1a1a1a",
    "editorIndentGuide.activeBackground": "#333333",
    "editorWhitespace.foreground": "#333333",
    "scrollbarSlider.background": "#1a1a1a",
    "scrollbarSlider.hoverBackground": "#333333",
    "scrollbarSlider.activeBackground": "#444444",
  },
};

const lightTheme: editor.IStandaloneThemeData = {
  base: "vs",
  inherit: false,
  rules: [
    { token: "", foreground: "111111", background: "f3f3f3" },
    { token: "comment", foreground: "666666", fontStyle: "italic" },
    { token: "keyword", foreground: "9d3a0a" },
    { token: "string", foreground: "2a6f2d" },
    { token: "number", foreground: "1558b0" },
    { token: "type", foreground: "9d3a0a" },
    { token: "function", foreground: "9d3a0a" },
    { token: "variable", foreground: "111111" },
    { token: "operator", foreground: "111111" },
    { token: "delimiter", foreground: "111111" },
  ],
  colors: {
    "editor.background": "#f3f3f3",
    "editor.foreground": "#111111",
    "editor.lineHighlightBackground": "#e8e8e8",
    "editor.selectionBackground": "#f0400040",
    "editor.inactiveSelectionBackground": "#f0400020",
    "editorCursor.foreground": "#f04000",
    "editorLineNumber.foreground": "#999999",
    "editorLineNumber.activeForeground": "#666666",
    "editorIndentGuide.background": "#e0e0e0",
    "editorIndentGuide.activeBackground": "#cccccc",
    "editorWhitespace.foreground": "#cccccc",
    "scrollbarSlider.background": "#e0e0e0",
    "scrollbarSlider.hoverBackground": "#cccccc",
    "scrollbarSlider.activeBackground": "#bbbbbb",
  },
};

export function Editor({ value, onChange, language = "rust", readOnly = false }: EditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom themes
    monaco.editor.defineTheme("vcad-dark", darkTheme);
    monaco.editor.defineTheme("vcad-light", lightTheme);
    monaco.editor.setTheme(theme === "dark" ? "vcad-dark" : "vcad-light");

    // Set editor options
    editor.updateOptions({
      fontSize: 13,
      fontFamily: "'Berkeley Mono', 'SF Mono', ui-monospace, monospace",
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      padding: { top: 16, bottom: 16 },
      lineNumbers: "on",
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 3,
      readOnly,
    });
  };

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === "dark" ? "vcad-dark" : "vcad-light");
    }
  }, [theme]);

  return (
    <div className="h-full min-h-[300px] rounded-lg border border-border overflow-hidden">
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleEditorDidMount}
        theme={theme === "dark" ? "vcad-dark" : "vcad-light"}
        options={{
          readOnly,
          automaticLayout: true,
        }}
        loading={
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
