import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useDocumentStore, useUiStore, useEngineStore } from "@vcad/core";
import { Viewport3D } from "./components/Viewport3D.js";
import { FeatureTree } from "./components/FeatureTree.js";
import { CommandInput } from "./components/CommandInput.js";
import { StatusBar } from "./components/StatusBar.js";

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [commandActive, setCommandActive] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);

  // Get terminal dimensions
  const termWidth = stdout?.columns ?? 120;
  const termHeight = stdout?.rows ?? 40;

  const parts = useDocumentStore((s) => s.parts);
  const addPrimitive = useDocumentStore((s) => s.addPrimitive);
  const removePart = useDocumentStore((s) => s.removePart);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);

  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const select = useUiStore((s) => s.select);
  const clearSelection = useUiStore((s) => s.clearSelection);

  const engineReady = useEngineStore((s) => s.engineReady);
  const error = useEngineStore((s) => s.error);

  // Reset focused index when parts change
  useEffect(() => {
    if (focusedIndex >= parts.length && parts.length > 0) {
      setFocusedIndex(parts.length - 1);
    }
  }, [parts.length, focusedIndex]);

  // Global keyboard shortcuts
  useInput((input, key) => {
    if (commandActive) return;

    // Quit
    if (input === "q") {
      exit();
      return;
    }

    // Toggle sidebar
    if (input === "\\") {
      setShowSidebar((s) => !s);
      return;
    }

    // Add primitives
    if (input === "1") {
      const partId = addPrimitive("cube");
      select(partId);
      setFocusedIndex(parts.length);
      return;
    }
    if (input === "2") {
      const partId = addPrimitive("cylinder");
      select(partId);
      setFocusedIndex(parts.length);
      return;
    }
    if (input === "3") {
      const partId = addPrimitive("sphere");
      select(partId);
      setFocusedIndex(parts.length);
      return;
    }

    // Delete
    if ((key.delete || key.backspace || input === "x") && selectedPartIds.size > 0) {
      for (const id of selectedPartIds) {
        removePart(id);
      }
      clearSelection();
      return;
    }

    // Undo/Redo
    if (input === "u") {
      undo();
      return;
    }
    if (input === "r" && !key.ctrl) {
      redo();
      return;
    }

    // Escape to deselect
    if (key.escape) {
      clearSelection();
      return;
    }
  });

  if (error && !engineReady) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Engine Error</Text>
        <Text color="red">{error}</Text>
        <Text dimColor>Press q to quit</Text>
      </Box>
    );
  }

  if (!engineReady) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Initializing engine...</Text>
      </Box>
    );
  }

  // Calculate viewport dimensions
  const sidebarWidth = showSidebar ? 24 : 0;
  const viewportWidth = termWidth - sidebarWidth - 2; // 2 for borders
  const viewportHeight = termHeight - 6; // Room for header, status, command

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">vcad</Text>
        <Text dimColor> │ 1:box 2:cyl 3:sph │ ←→↑↓:rotate │ +/-:zoom │ x:del │ u:undo │ q:quit</Text>
      </Box>

      {/* Main content */}
      <Box flexGrow={1}>
        {/* Sidebar */}
        {showSidebar && (
          <Box
            width={sidebarWidth}
            borderStyle="single"
            flexDirection="column"
          >
            <Box paddingX={1}>
              <Text bold>Parts</Text>
            </Box>
            <FeatureTree
              parts={parts}
              selectedIds={selectedPartIds}
              focusedIndex={focusedIndex}
              onFocusChange={setFocusedIndex}
            />
          </Box>
        )}

        {/* 3D Viewport */}
        <Box flexGrow={1} borderStyle="single" flexDirection="column">
          <Viewport3D
            width={viewportWidth}
            height={viewportHeight}
          />
        </Box>
      </Box>

      {/* Command input */}
      <CommandInput
        active={commandActive}
        onActivate={() => setCommandActive(true)}
        onDeactivate={() => setCommandActive(false)}
      />

      {/* Status bar */}
      <Box borderStyle="single" borderColor="gray">
        <StatusBar />
      </Box>
    </Box>
  );
}
