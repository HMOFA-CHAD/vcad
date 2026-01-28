import { Cube, Cylinder, Globe, Trash } from "@phosphor-icons/react";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useDocumentStore } from "@/stores/document-store";
import { useUiStore } from "@/stores/ui-store";
import type { PrimitiveKind } from "@/types";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<PrimitiveKind, typeof Cube> = {
  cube: Cube,
  cylinder: Cylinder,
  sphere: Globe,
};

export function FeatureTree() {
  const parts = useDocumentStore((s) => s.parts);
  const removePart = useDocumentStore((s) => s.removePart);
  const selectedPartId = useUiStore((s) => s.selectedPartId);
  const select = useUiStore((s) => s.select);

  return (
    <Panel side="left">
      <PanelHeader>Features</PanelHeader>
      <PanelBody>
        {parts.length === 0 && (
          <div className="px-2 py-4 text-center text-xs text-text-muted">
            no parts yet — add one from the toolbar
          </div>
        )}
        {parts.map((part) => {
          const Icon = KIND_ICONS[part.kind];
          const isSelected = part.id === selectedPartId;

          return (
            <div
              key={part.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors",
                isSelected
                  ? "bg-accent/20 text-accent"
                  : "text-text-muted hover:bg-border/30 hover:text-text",
              )}
              onClick={() => select(part.id)}
            >
              <Icon size={14} className="shrink-0" />
              <span className="flex-1 truncate">{part.name}</span>
              <Tooltip content="Delete">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePart(part.id);
                    if (isSelected) select(null);
                  }}
                >
                  <Trash size={12} />
                </Button>
              </Tooltip>
            </div>
          );
        })}
      </PanelBody>
    </Panel>
  );
}
