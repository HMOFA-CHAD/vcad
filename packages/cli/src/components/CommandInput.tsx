import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { createCommandRegistry, useDocumentStore, useUiStore } from "@vcad/core";

interface Props {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function CommandInput({ active, onActivate, onDeactivate }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Store actions
  const addPrimitive = useDocumentStore((s) => s.addPrimitive);
  const applyBoolean = useDocumentStore((s) => s.applyBoolean);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const removePart = useDocumentStore((s) => s.removePart);
  const duplicateParts = useDocumentStore((s) => s.duplicateParts);
  const undoStack = useDocumentStore((s) => s.undoStack);
  const redoStack = useDocumentStore((s) => s.redoStack);
  const parts = useDocumentStore((s) => s.parts);

  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const select = useUiStore((s) => s.select);
  const selectMultiple = useUiStore((s) => s.selectMultiple);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const setTransformMode = useUiStore((s) => s.setTransformMode);
  const toggleWireframe = useUiStore((s) => s.toggleWireframe);
  const toggleGridSnap = useUiStore((s) => s.toggleGridSnap);
  const toggleFeatureTree = useUiStore((s) => s.toggleFeatureTree);

  const commands = createCommandRegistry({
    addPrimitive: (kind) => {
      const partId = addPrimitive(kind);
      select(partId);
      onDeactivate();
    },
    applyBoolean: (type) => {
      const ids = Array.from(selectedPartIds);
      if (ids.length === 2) {
        const newId = applyBoolean(type, ids[0]!, ids[1]!);
        if (newId) select(newId);
      }
      onDeactivate();
    },
    setTransformMode: (mode) => {
      setTransformMode(mode);
      onDeactivate();
    },
    undo: () => {
      undo();
      onDeactivate();
    },
    redo: () => {
      redo();
      onDeactivate();
    },
    toggleWireframe: () => {
      toggleWireframe();
      onDeactivate();
    },
    toggleGridSnap: () => {
      toggleGridSnap();
      onDeactivate();
    },
    toggleFeatureTree: () => {
      toggleFeatureTree();
      onDeactivate();
    },
    save: () => onDeactivate(),
    open: () => onDeactivate(),
    exportStl: () => onDeactivate(),
    exportGlb: () => onDeactivate(),
    openAbout: () => onDeactivate(),
    deleteSelected: () => {
      for (const id of selectedPartIds) {
        removePart(id);
      }
      clearSelection();
      onDeactivate();
    },
    duplicateSelected: () => {
      if (selectedPartIds.size > 0) {
        const ids = Array.from(selectedPartIds);
        const newIds = duplicateParts(ids);
        selectMultiple(newIds);
      }
      onDeactivate();
    },
    deselectAll: () => {
      clearSelection();
      onDeactivate();
    },
    hasTwoSelected: () => selectedPartIds.size === 2,
    hasSelection: () => selectedPartIds.size > 0,
    hasParts: () => parts.length > 0,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  });

  const filteredCommands = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        if (cmd.label.toLowerCase().includes(q)) return true;
        return cmd.keywords.some((kw) => kw.includes(q));
      })
    : commands;

  useInput((input, key) => {
    if (!active) {
      if (key.ctrl && input === "p") {
        onActivate();
        setQuery("");
        setSelectedIndex(0);
      }
      return;
    }

    if (key.escape) {
      onDeactivate();
      setQuery("");
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
      return;
    }
    if (key.return && filteredCommands.length > 0) {
      const cmd = filteredCommands[selectedIndex];
      if (cmd && (!cmd.enabled || cmd.enabled())) {
        cmd.action();
      }
      return;
    }
  }, { isActive: active });

  if (!active) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Ctrl+P: command palette</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan">
      <Box paddingX={1}>
        <Text color="cyan">&gt; </Text>
        <TextInput value={query} onChange={(v) => { setQuery(v); setSelectedIndex(0); }} />
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {filteredCommands.slice(0, 6).map((cmd, idx) => {
          const isDisabled = cmd.enabled && !cmd.enabled();
          const isSelected = idx === selectedIndex;
          return (
            <Text
              key={cmd.id}
              inverse={isSelected}
              dimColor={isDisabled}
            >
              {cmd.label}
            </Text>
          );
        })}
        {filteredCommands.length === 0 && (
          <Text dimColor>No commands found</Text>
        )}
      </Box>
    </Box>
  );
}
