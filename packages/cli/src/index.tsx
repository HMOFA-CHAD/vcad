#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { Engine, useEngineStore, useDocumentStore } from "@vcad/core";
import { App } from "./App.js";

async function main() {
  // Initialize the engine
  const setEngineReady = useEngineStore.getState().setEngineReady;
  const setLoading = useEngineStore.getState().setLoading;
  const setError = useEngineStore.getState().setError;
  const setScene = useEngineStore.getState().setScene;

  setLoading(true);

  try {
    const engine = await Engine.init();
    setEngineReady(true);
    setLoading(false);

    // Evaluate initial document
    const doc = useDocumentStore.getState().document;
    if (doc.roots.length > 0) {
      try {
        setScene(engine.evaluate(doc));
      } catch (e) {
        setError(String(e));
      }
    }

    // Subscribe to document changes and re-evaluate
    useDocumentStore.subscribe((state) => {
      try {
        const scene = engine.evaluate(state.document);
        setScene(scene);
      } catch (e) {
        setError(String(e));
      }
    });
  } catch (e) {
    setError(String(e));
    setLoading(false);
  }

  // Render the app
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
