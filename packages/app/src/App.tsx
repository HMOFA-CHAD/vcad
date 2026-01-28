import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Viewport } from "@/components/Viewport";
import { Toolbar } from "@/components/Toolbar";
import { FeatureTree } from "@/components/FeatureTree";
import { PropertyPanel } from "@/components/PropertyPanel";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { AboutModal } from "@/components/AboutModal";
import { useEngine } from "@/hooks/useEngine";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEngineStore } from "@/stores/engine-store";
import { useDocumentStore } from "@/stores/document-store";
import { useUiStore } from "@/stores/ui-store";

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm text-text-muted">initializing engine...</div>
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-sm font-bold text-danger">engine error</div>
        <div className="max-w-md text-xs text-text-muted">{message}</div>
      </div>
    </div>
  );
}

export function App() {
  useEngine();
  useKeyboardShortcuts();

  const [aboutOpen, setAboutOpen] = useState(false);

  const engineReady = useEngineStore((s) => s.engineReady);
  const loading = useEngineStore((s) => s.loading);
  const error = useEngineStore((s) => s.error);
  const featureTreeOpen = useUiStore((s) => s.featureTreeOpen);
  const selectedPartId = useUiStore((s) => s.selectedPartId);
  const hasParts = useDocumentStore((s) => s.parts.length > 0);

  if (error && !engineReady) return <ErrorScreen message={error} />;
  if (loading || !engineReady) return <LoadingScreen />;

  return (
    <TooltipProvider>
      <Viewport />
      <Toolbar onAboutOpen={() => setAboutOpen(true)} />
      {featureTreeOpen && <FeatureTree />}
      {selectedPartId && <PropertyPanel />}
      {!hasParts && <WelcomeScreen />}
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </TooltipProvider>
  );
}
