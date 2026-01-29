import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  partNames: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  partNames,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border p-6 shadow-2xl max-w-sm">
        <h2 className="text-lg font-medium text-text mb-2">Delete Part?</h2>
        <p className="text-sm text-text-muted mb-4">
          {partNames.length === 1
            ? `"${partNames[0]}" will be permanently deleted.`
            : `${partNames.length} parts will be permanently deleted.`}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
