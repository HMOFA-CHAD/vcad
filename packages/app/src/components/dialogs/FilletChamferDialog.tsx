import { useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrubInput } from "@/components/ui/scrub-input";
import { useDocumentStore, useUiStore } from "@vcad/core";
import { useNotificationStore } from "@/stores/notification-store";

interface FilletChamferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "fillet" | "chamfer";
  partId: string;
}

export function FilletChamferDialog({
  open,
  onOpenChange,
  mode,
  partId,
}: FilletChamferDialogProps) {
  const [value, setValue] = useState(2);
  const addFillet = useDocumentStore((s) => s.addFillet);
  const addChamfer = useDocumentStore((s) => s.addChamfer);
  const select = useUiStore((s) => s.select);
  const addToast = useNotificationStore((s) => s.addToast);

  const label = mode === "fillet" ? "Fillet Radius" : "Chamfer Distance";
  const actionLabel = mode === "fillet" ? "Fillet" : "Chamfer";

  function handleApply() {
    const newPartId = mode === "fillet"
      ? addFillet(partId, value)
      : addChamfer(partId, value);

    if (newPartId) {
      select(newPartId);
      addToast(`Created ${actionLabel}`, "success");
    } else {
      addToast(`Failed to create ${actionLabel}`, "error");
    }
    onOpenChange(false);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={actionLabel}>
        <div className="flex flex-col gap-4 py-2">
          <ScrubInput
            label={label}
            value={value}
            onChange={setValue}
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
