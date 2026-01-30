"use client";

import dynamic from "next/dynamic";
import type { Document } from "@vcad/ir";
import { getExample } from "@/lib/examples";

const TutorialPlayground = dynamic(
  () =>
    import("./TutorialPlayground").then((m) => m.TutorialPlayground),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-surface animate-pulse rounded-lg" />
    ),
  }
);

interface PlaygroundProps {
  exampleId: string;
  height?: string;
}

export function Playground({ exampleId, height = "400px" }: PlaygroundProps) {
  const example = getExample(exampleId);

  if (!example) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
        Example not found: {exampleId}
      </div>
    );
  }

  return (
    <TutorialPlayground
      code={example.code}
      document={example.document as Document}
      height={height}
    />
  );
}
