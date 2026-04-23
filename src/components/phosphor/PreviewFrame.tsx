import * as React from "react";

export function PreviewFrame({ html }: { html: string }) {
  const [doc, setDoc] = React.useState(html);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDoc(html), 180);
    return () => window.clearTimeout(id);
  }, [html]);

  return (
    <div className="relative h-full w-full bg-white">
      {!doc.trim() ? (
        <div className="grid h-full w-full place-items-center bg-background">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            preview will appear here
          </span>
        </div>
      ) : (
        <iframe
          title="Preview"
          srcDoc={doc}
          sandbox="allow-scripts"
          className="h-full w-full border-0 bg-white"
        />
      )}
    </div>
  );
}