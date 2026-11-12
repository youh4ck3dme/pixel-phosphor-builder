/**
 * Runtime console guard for the preview iframe.
 * PreviewFrame injects PREVIEW_CAPTURE_SCRIPT into generated pages; the
 * script reports uncaught errors and console.error calls to the parent
 * window via postMessage with a stable shape.
 */
export type PreviewError = {
  key: string;
  message: string;
  source?: string;
  lineno?: number | null;
};

export function previewErrorFromMessage(data: unknown): PreviewError | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.type !== "preview-error" || typeof d.message !== "string") return null;
  const message = d.message.slice(0, 300);
  const lineno = typeof d.lineno === "number" ? d.lineno : null;
  const source = typeof d.source === "string" ? d.source.slice(0, 120) : "preview";
  return { key: `${message}|${lineno ?? 0}`, message, source, lineno };
}

/** One-tap fix prompt derived from the runtime error class. */
export function guardFixPrompt(e: PreviewError): string {
  const m = e.message.toLowerCase();
  if (m.includes("getcontext")) {
    return "Fix runtime error: the element you draw on with the 2D context API must be a real <canvas>; never call getContext on an <svg>. Use literal hex colors in canvas contexts and scale the backing store by devicePixelRatio. Keep everything else unchanged.";
  }
  if (m.includes("is not a function") || m.includes("is null") || m.includes("is undefined") || m.includes("cannot read")) {
    return `Fix runtime error "${e.message}"${e.lineno ? ` (line ${e.lineno})` : ""} — verify the target element/id exists in the DOM and that the API matches the actual element type before calling it. Keep everything else unchanged.`;
  }
  return `Fix this runtime error and keep everything else unchanged: ${e.message}`;
}

/** Injected first inside <head> of every generated preview document. */
export const PREVIEW_CAPTURE_SCRIPT = `<script>(function(){
var send=function(m,l){try{parent.postMessage({type:"preview-error",message:String(m).slice(0,300),source:"preview",lineno:l||0},"*")}catch(e){}};
var last=0,lastMsg=null;
function once(m,l){var now=Date.now();if(now-last<400&&lastMsg===m)return;last=now;lastMsg=m;send(m,l)}
window.addEventListener("error",function(e){once(e.message,e.lineno)});
var orig=console.error;
console.error=function(){try{var a=Array.prototype.slice.call(arguments).map(String).join(" ");once(a,0)}catch(_){}return orig.apply(console,arguments)};
})();</script>`;
