export type Build = {
  id: string;
  prompt: string;
  html: string;
  model: string;
  createdAt: number;
};

const KEY = "h4ckd:builds";

export function listBuilds(): Build[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Build[];
  } catch {
    return [];
  }
}

export function saveBuild(b: Build) {
  if (typeof window === "undefined") return;
  const all = listBuilds();
  const next = [b, ...all.filter((x) => x.id !== b.id)].slice(0, 30);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function getBuild(id: string): Build | undefined {
  return listBuilds().find((b) => b.id === id);
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const MODEL_KEY = "h4ckd:model";
export function getModel(): "flash" | "pro" {
  if (typeof window === "undefined") return "flash";
  return (localStorage.getItem(MODEL_KEY) as "flash" | "pro") || "flash";
}
export function setModel(m: "flash" | "pro") {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_KEY, m);
}

const TEMPERATURE_KEY = "h4ckd:temperature";
export function getTemperature(): number {
  if (typeof window === "undefined") return 0.7;
  const v = Number(localStorage.getItem(TEMPERATURE_KEY));
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.7;
}
export function setTemperature(t: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPERATURE_KEY, String(t));
}

const MAX_TOKENS_KEY = "h4ckd:maxTokens";
export function getMaxTokens(): number {
  if (typeof window === "undefined") return 8192;
  const v = Number(localStorage.getItem(MAX_TOKENS_KEY));
  return Number.isFinite(v) && v >= 256 && v <= 16384 ? Math.round(v) : 8192;
}
export function setMaxTokens(n: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MAX_TOKENS_KEY, String(Math.round(n)));
}