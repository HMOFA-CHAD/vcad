import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";
import { useDocumentStore } from "@/stores/document-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const { selectedPartId, select, setTransformMode } =
        useUiStore.getState();
      const { undo, redo, removePart } = useDocumentStore.getState();

      // Undo: Ctrl/Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
        return;
      }

      // Transform modes
      if (e.key === "w" || e.key === "W") {
        setTransformMode("translate");
        return;
      }
      if (e.key === "e" || e.key === "E") {
        setTransformMode("rotate");
        return;
      }
      if (e.key === "r" || e.key === "R") {
        setTransformMode("scale");
        return;
      }

      // Delete selected
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedPartId
      ) {
        e.preventDefault();
        removePart(selectedPartId);
        select(null);
        return;
      }

      // Escape: deselect
      if (e.key === "Escape") {
        select(null);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
