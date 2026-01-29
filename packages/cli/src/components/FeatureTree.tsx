import React from "react";
import { Box, Text } from "ink";
import { isBooleanPart } from "@vcad/core";
import type { PartInfo } from "@vcad/core";

interface Props {
  parts: PartInfo[];
  selectedIds: Set<string>;
  focusedIndex: number;
  onFocusChange: (index: number) => void;
}

function getPartIcon(part: PartInfo): string {
  switch (part.kind) {
    case "cube": return "■";
    case "cylinder": return "○";
    case "sphere": return "●";
    case "boolean": return "⊕";
    case "extrude": return "↑";
    case "revolve": return "↻";
    case "sweep": return "~";
    case "loft": return "≡";
    default: return "?";
  }
}

export function FeatureTree({ parts, selectedIds, focusedIndex }: Props) {
  if (parts.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No parts</Text>
        <Text dimColor>Press 1/2/3</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {parts.map((part, i) => {
        const isSelected = selectedIds.has(part.id);
        const isFocused = i === focusedIndex;
        const icon = getPartIcon(part);

        return (
          <Box key={part.id} paddingX={1}>
            <Text
              inverse={isFocused}
              color={isSelected ? "cyan" : undefined}
              bold={isSelected}
            >
              {icon} {part.name.slice(0, 18)}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
