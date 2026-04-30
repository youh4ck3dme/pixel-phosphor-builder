import * as React from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Lock, Link2, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setProjectVisibility } from "@/lib/builds.cloud";
import { tap } from "@/hooks/useHaptic";

type Vis = "private" | "unlisted" | "public";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  slug: string;
  visibility: Vis;
  onVisibilityChange: (v: Vis) => void;
};

export function ShareSheet({ open, onClose, projectId, slug, visibility, onVisibilityChange }: Props) {
  const [busy, setBusy] = React.useState<Vis | null>(null);
  const [qr, setQr] = React.useState<string>("");
  const url = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

  React.useEffect(() => {
    if (!open || visibility === "private") {
      setQr("");
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [open, visibility, url]);

  async function setVis(v: Vis) {
    setBusy(v);
    try {
      await setProjectVisibility(projectId, v);
      onVisibilityChange(v);
      tap();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update visibility");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      tap();
    } catch {
      toast.error("Copy failed");
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
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[88dvh] bg-background hairline-top rounded-t-[5px] flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <header className="flex items-center justify-between px-4 py-3 hairline-bottom">
              <span className="font-mono text-[11px] uppercase tracking-widest text-amber">Share</span>
              <button onClick={onClose} aria-label="Close" className="size-8 grid place-items-center rounded-[5px] hairline">
                <X className="size-4" />
              </button>
            </header>

            <div className="p-4 space-y-4 overflow-auto">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Visibility
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <VisBtn icon={Lock} label="Private" active={visibility === "private"} busy={busy === "private"} onClick={() => setVis("private")} />
                  <VisBtn icon={Link2} label="Unlisted" active={visibility === "unlisted"} busy={busy === "unlisted"} onClick={() => setVis("unlisted")} />
                  <VisBtn icon={Globe} label="Public" active={visibility === "public"} busy={busy === "public"} onClick={() => setVis("public")} />
                </div>
              </div>

              {visibility !== "private" ? (
                <>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                      Public link
                    </div>
                    <div className="flex items-center gap-2 hairline rounded-[5px] bg-surface px-2 py-2">
                      <code className="flex-1 font-mono text-[11px] truncate text-foreground">{url}</code>
                      <button
                        onClick={copyLink}
                        className="size-8 grid place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
                        aria-label="Copy"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {qr && (
                    <div className="flex justify-center">
                      <img src={qr} alt="QR code" className="size-40 rounded-[5px] hairline" />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground py-6">
                  ▒ make unlisted or public to share ▒
                </p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function VisBtn({
  icon: Icon,
  label,
  active,
  busy,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex flex-col items-center gap-1 rounded-[5px] hairline py-3 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-amber disabled:opacity-50"
      style={{
        borderColor: active ? "var(--phosphor)" : undefined,
        color: active ? "var(--phosphor)" : undefined,
        boxShadow: active ? "0 0 16px -8px var(--phosphor)" : undefined,
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {label}
    </button>
  );
}