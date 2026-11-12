import * as React from "react";
import { Command } from "cmdk";
import {
  Wand2, SlidersHorizontal, Star, Download, Package, Copy,
  Smartphone, Tablet, Monitor, Zap, Gauge,
} from "lucide-react";
import { PROMPT_PRESETS, type PromptPreset } from "@/lib/prompt.presets";
import type { ViewportKey } from "@/components/build/ViewportSwitcher";

const PRESET_ORDER = ["landing", "dashboard", "pricing", "portfolio", "form"] as const;

const PRESET_DESC: Record<string, string> = {
  landing: "Modern high-converting SaaS landing page",
  dashboard: "Telemetry & analytics dense dashboard",
  pricing: "B2B tier pricing grid with monthly/annual toggle",
  portfolio: "Editorial Swiss-typography developer portfolio",
  form: "Multi-step checkout & payment terminal form",
};

function PItem({
  icon: Icon,
  label,
  description,
  shortcut,
  disabled,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      disabled={disabled}
      onSelect={onSelect}
      className="flex cursor-default items-center gap-2.5 rounded-[4px] px-2.5 py-2 font-mono text-[11px] text-foreground outline-none data-[selected=true]:bg-white/5 data-[selected=true]:text-amber data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {description && (
          <span className="block truncate text-[9px] uppercase tracking-widest text-muted-foreground/60">
            {description}
          </span>
        )}
      </span>
      {shortcut && (
        <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {shortcut}
        </span>
      )}
    </Command.Item>
  );
}

const groupClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.22em] [&_[cmdk-group-heading]]:text-muted-foreground";

export function StudioCommandPalette({
  open,
  onOpenChange,
  canDesigner,
  onDesignerPass,
  onToggleInspector,
  canSnapshot,
  onSnapshot,
  canExport,
  onDownloadHtml,
  onDownloadZip,
  onCopy,
  onViewport,
  onModel,
  onPickPreset,
  canSubmit,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (fn: (prev: boolean) => boolean) => void;
  canDesigner: boolean;
  onDesignerPass: () => void;
  onToggleInspector: () => void;
  canSnapshot: boolean;
  onSnapshot: () => void;
  canExport: boolean;
  onDownloadHtml: () => void;
  onDownloadZip: () => void;
  onCopy: () => void;
  onViewport: (v: ViewportKey) => void;
  onModel: (m: "flash" | "pro") => void;
  onPickPreset: (p: PromptPreset) => void;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  // Global shortcuts: ⌘K palette, ⌘I inspector, ⌘↵ generate (unless typing in the composer)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange((v) => !v);
      } else if (key === "i") {
        e.preventDefault();
        e.stopPropagation();
        onToggleInspector();
      } else if (e.key === "Enter") {
        // The composer textarea handles its own ⌘↵ — avoid double submit
        if ((e.target as HTMLElement | null)?.tagName === "TEXTAREA") return;
        if (!canSubmit) return;
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canSubmit, onOpenChange, onToggleInspector, onSubmit]);

  const close = () => onOpenChange(() => false);
  const act = (fn: () => void) => () => {
    close();
    fn();
  };

  const presets = PRESET_ORDER
    .map((id) => PROMPT_PRESETS.find((p) => p.id === id))
    .filter((p): p is PromptPreset => !!p);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o: boolean) => onOpenChange(() => o)}
      label="Studio commands"
      overlayClassName="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[16%] z-[71] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-[5px] bg-background hairline shadow-2xl"
    >
      <Command.Input
        autoFocus
        placeholder="Type a command or search…"
        className="w-full border-b bg-transparent px-3 py-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground hairline-bottom"
      />
      <Command.List className="max-h-[340px] overflow-y-auto overflow-x-hidden p-1 no-scrollbar">
        <Command.Empty className="py-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          No matching command.
        </Command.Empty>

        <Command.Group heading="Actions" className={groupClass}>
          <PItem icon={Wand2} label="Run AI Designer Pass" shortcut="⇧⌘D" disabled={!canDesigner} onSelect={act(onDesignerPass)} />
          <PItem icon={SlidersHorizontal} label="Toggle Inspector Sidebar" shortcut="⌘I" onSelect={act(onToggleInspector)} />
          <PItem icon={Star} label="Save Version Snapshot" shortcut="⌘S" disabled={!canSnapshot} onSelect={act(onSnapshot)} />
          <PItem icon={Download} label="Download HTML" disabled={!canExport} onSelect={act(onDownloadHtml)} />
          <PItem icon={Package} label="Export ZIP Package" disabled={!canExport} onSelect={act(onDownloadZip)} />
          <PItem icon={Copy} label="Copy HTML to Clipboard" disabled={!canExport} onSelect={act(onCopy)} />
        </Command.Group>

        <Command.Group heading="Viewports" className={groupClass}>
          <PItem icon={Smartphone} label="Switch to Mobile Viewport (390px)" onSelect={act(() => onViewport("mobile"))} />
          <PItem icon={Tablet} label="Switch to Tablet Viewport (768px)" onSelect={act(() => onViewport("tablet"))} />
          <PItem icon={Monitor} label="Switch to Full Desktop Viewport" onSelect={act(() => onViewport("full"))} />
        </Command.Group>

        <Command.Group heading="AI Model & Parameters" className={groupClass}>
          <PItem icon={Zap} label="Switch to Mistral Small (Flash)" onSelect={act(() => onModel("flash"))} />
          <PItem icon={Gauge} label="Switch to Mistral Large (Pro)" onSelect={act(() => onModel("pro"))} />
        </Command.Group>

        <Command.Group heading="Prompt Presets" className={groupClass}>
          {presets.map((p) => (
            <PItem
              key={p.id}
              icon={Zap}
              label={p.label}
              description={PRESET_DESC[p.id] ?? p.hint}
              onSelect={act(() => onPickPreset(p))}
            />
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
