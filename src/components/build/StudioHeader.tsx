import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft, Wand2, Pencil, Check, Star, GitBranch, Square, RotateCw,
  Download, Package, Copy, Share2, SlidersHorizontal, ChevronDown,
  PanelRightClose, PanelRightOpen, Gauge,
} from "lucide-react";
import { tap } from "@/hooks/useHaptic";

function HeaderBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-[5px] hairline transition-colors disabled:opacity-35 ${
        danger ? "text-destructive hover:text-amber" : "text-muted-foreground hover:text-amber"
      }`}
    >
      {children}
    </button>
  );
}

export function StudioHeader({
  title,
  onTitleCommit,
  version,
  streaming,
  qualityScore,
  designerBusy,
  canDesigner,
  onDesignerPass,
  onStop,
  canRegenerate,
  onRegenerate,
  canExport,
  onDownloadHtml,
  onDownloadZip,
  onCopy,
  onShare,
  canSnapshot,
  onSnapshot,
  projectId,
  showSplitToggle,
  previewOpen,
  onTogglePreview,
  inspectorOpen,
  onToggleInspector,
}: {
  title: string;
  onTitleCommit: (t: string) => void;
  version: number;
  streaming: boolean;
  qualityScore: number | null;
  designerBusy: boolean;
  canDesigner: boolean;
  onDesignerPass: () => void;
  onStop: () => void;
  canRegenerate: boolean;
  onRegenerate: () => void;
  canExport: boolean;
  onDownloadHtml: () => void;
  onDownloadZip: () => void;
  onCopy: () => void;
  onShare: () => void;
  canSnapshot: boolean;
  onSnapshot: () => void;
  projectId: string | null;
  showSplitToggle: boolean;
  previewOpen: boolean;
  onTogglePreview: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(title);
  const [exportOpen, setExportOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportOpen]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== title) onTitleCommit(next);
    setEditing(false);
  };

  return (
    <header className="flex shrink-0 items-center gap-2 px-2 py-2 hairline-bottom">
      <Link
        to="/"
        aria-label="Back"
        onClick={() => tap()}
        className="grid size-8 place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
      >
        <ArrowLeft className="size-4" />
      </Link>

      {/* Title + version + streaming dot */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded-[4px] bg-surface px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground focus:outline-none hairline"
            style={{ maxWidth: 220 }}
          />
        ) : (
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {streaming ? "Generating…" : title}
          </span>
        )}
        {editing ? (
          <button
            onClick={commit}
            aria-label="Save title"
            className="grid size-6 place-items-center rounded-[4px] hairline text-phosphor"
          >
            <Check className="size-3" />
          </button>
        ) : (
          <button
            onClick={() => { setDraft(title); setEditing(true); }}
            aria-label="Edit title"
            className="grid size-6 place-items-center rounded-[4px] text-muted-foreground/50 hover:text-amber"
          >
            <Pencil className="size-3" />
          </button>
        )}
        <span className="shrink-0 rounded-[4px] bg-surface hairline px-1.5 py-0.5 font-mono text-[9px] text-phosphor">
          v{version}
        </span>
        {streaming && (
          <span className="size-1.5 shrink-0 rounded-full bg-phosphor animate-phosphor" aria-label="streaming" />
        )}
      </div>

      {/* Center: quality health badge */}
      {qualityScore !== null && (
        <button
          aria-label={`Quality score ${qualityScore}`}
          className="hidden shrink-0 items-center gap-1 rounded-[5px] hairline bg-surface px-2 py-1 font-mono text-[10px] sm:flex"
          style={{ color: qualityScore >= 80 ? "var(--phosphor)" : "var(--amber)" }}
        >
          <Gauge className="size-3.5" />
          {qualityScore}
        </button>
      )}

      {/* Right action bar */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {streaming ? (
          <HeaderBtn label="Stop" onClick={onStop} danger>
            <Square className="size-3.5" />
          </HeaderBtn>
        ) : (
          <HeaderBtn label="AI Polish — designer pass" onClick={onDesignerPass} disabled={!canDesigner || designerBusy}>
            <Wand2 className={`size-4 ${designerBusy ? "animate-pulse" : ""}`} />
          </HeaderBtn>
        )}
        {showSplitToggle && (
          <HeaderBtn label={previewOpen ? "Hide preview pane" : "Show preview pane"} onClick={onTogglePreview}>
            {previewOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </HeaderBtn>
        )}
        <HeaderBtn label="Inspector" onClick={onToggleInspector}>
          <SlidersHorizontal className="size-4" />
        </HeaderBtn>
        <HeaderBtn label="Share build link" onClick={onShare}>
          <Share2 className="size-4" />
        </HeaderBtn>

        {/* Export dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setExportOpen((o) => !o)}
            disabled={!canExport}
            aria-label="Export"
            title="Export (.html / .zip / copy)"
            className="flex items-center gap-1 rounded-[5px] hairline px-1.5 py-1.5 text-muted-foreground transition-colors hover:text-amber disabled:opacity-35"
          >
            <Download className="size-4" />
            <ChevronDown className={`size-3 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 z-50 mt-1 w-44 rounded-[5px] bg-surface-2 hairline p-1 shadow-2xl">
              <MenuBtn icon={<Download className="size-3.5" />} label="Download .html" onClick={() => { setExportOpen(false); onDownloadHtml(); }} />
              <MenuBtn icon={<Package className="size-3.5" />} label="Download .zip" onClick={() => { setExportOpen(false); onDownloadZip(); }} />
              <MenuBtn icon={<Copy className="size-3.5" />} label="Copy code" onClick={() => { setExportOpen(false); onCopy(); }} />
            </div>
          )}
        </div>

        <HeaderBtn label="Snapshot" onClick={onSnapshot} disabled={!canSnapshot}>
          <Star className="size-4" />
        </HeaderBtn>
        {projectId && (
          <Link
            to="/projects/$projectId"
            params={{ projectId }}
            aria-label="Build tree"
            onClick={() => tap()}
            className="grid size-8 place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
          >
            <GitBranch className="size-4" />
          </Link>
        )}
        <HeaderBtn label="Regenerate" onClick={onRegenerate} disabled={!canRegenerate}>
          <RotateCw className={`size-4 ${streaming ? "animate-spin" : ""}`} />
        </HeaderBtn>
      </div>
    </header>
  );
}

function MenuBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-white/5 hover:text-amber"
    >
      {icon}
      {label}
    </button>
  );
}
