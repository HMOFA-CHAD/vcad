import { useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrubInput } from "@/components/ui/scrub-input";
import { useDocumentStore, useUiStore } from "@vcad/core";
import { useNotificationStore } from "@/stores/notification-store";

interface ShellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId: string;
}

export function ShellDialog({
  open,
  onOpenChange,
  partId,
}: ShellDialogProps) {
  const [thickness, setThickness] = useState(2);
  const addShell = useDocumentStore((s) => s.addShell);
  const select = useUiStore((s) => s.select);
  const addToast = useNotificationStore((s) => s.addToast);

  function handleApply() {
    const newPartId = addShell(partId, thickness);

    if (newPartId) {
      select(newPartId);
      addToast("Created Shell", "success");
    } else {
      addToast("Failed to create Shell", "error");
    }
    onOpenChange(false);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Shell">
        <p className="text-xs text-text-muted mb-3">
          Hollow out the solid with the specified wall thickness.
        </p>

        <div className="flex flex-col gap-4 py-2">
          <ScrubInput
            label="Thickness"
            value={thickness}
            onChange={setThickness}
            min={0.1}
            max={50}
            step={0.5}
            unit="mm"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
