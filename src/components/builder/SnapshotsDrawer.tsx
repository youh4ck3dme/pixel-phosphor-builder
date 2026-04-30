import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listSnapshots, deleteSnapshot, type Snapshot } from "@/lib/snapshots";
import { tap } from "@/hooks/useHaptic";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onOpenBuild: (buildId: string) => void;
};

export function SnapshotsDrawer({ open, onClose, projectId, onOpenBuild }: Props) {
  const [items, setItems] = React.useState<Snapshot[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    listSnapshots(projectId)
      .then(setItems)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  async function onDelete(id: string) {
    try {
      await deleteSnapshot(id);
      setItems((s) => s.filter((x) => x.id !== id));
      tap();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80dvh] bg-background hairline-top rounded-t-[5px] flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <header className="flex items-center justify-between px-4 py-3 hairline-bottom">
              <span className="font-mono text-[11px] uppercase tracking-widest text-amber inline-flex items-center gap-2">
                <Star className="size-3.5" /> Snapshots
              </span>
              <button onClick={onClose} aria-label="Close" className="size-8 grid place-items-center rounded-[5px] hairline">
                <X className="size-4" />
              </button>
            </header>
            <div className="overflow-auto p-3">
              {loading && (
                <div className="grid place-items-center py-10">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && items.length === 0 && (
                <p className="text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground py-10">
                  ▒ no snapshots ▒
                </p>
              )}
              <ul className="grid gap-2">
                {items.map((s) => (
                  <li key={s.id} className="hairline rounded-[5px] bg-surface p-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        onOpenBuild(s.build_id);
                        onClose();
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-mono text-sm text-foreground truncate">{s.label}</div>
                      {s.note && (
                        <div className="text-[11px] text-muted-foreground truncate">{s.note}</div>
                      )}
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                    </button>
                    <button
                      onClick={() => onDelete(s.id)}
                      aria-label="Delete"
                      className="size-8 grid place-items-center rounded-[5px] hairline text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}