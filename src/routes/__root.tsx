import * as React from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "H4CK3D — Phosphor Noir AI Builder" },
      { name: "description", content: "Mobile-first AI agent builder. AMOLED black, amber CRT, phosphor green LED. Porsche × Apple × Vercel." },
      { name: "author", content: "H4CK3D Labs" },
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "H4CK3D" },
      { property: "og:title", content: "H4CK3D — Phosphor Noir AI Builder" },
      { property: "og:description", content: "Mobile-first AI agent builder. AMOLED black, amber CRT, phosphor green LED. Porsche × Apple × Vercel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "H4CK3D — Phosphor Noir AI Builder" },
      { name: "twitter:description", content: "Mobile-first AI agent builder. AMOLED black, amber CRT, phosphor green LED. Porsche × Apple × Vercel." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f28a6745-81dc-4b46-a00c-bbb3e94291c8/id-preview-a032e1cd--8e89812c-3366-4a46-98df-c2d8b4f1bc4e.lovable.app-1776958134359.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f28a6745-81dc-4b46-a00c-bbb3e94291c8/id-preview-a032e1cd--8e89812c-3366-4a46-98df-c2d8b4f1bc4e.lovable.app-1776958134359.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  React.useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
    document.addEventListener("gesturestart", prevent as EventListener);
    document.addEventListener("gesturechange", prevent as EventListener);
    document.addEventListener("gestureend", prevent as EventListener);
    document.addEventListener("keydown", onKey);
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", prevent as EventListener);
      document.removeEventListener("gesturechange", prevent as EventListener);
      document.removeEventListener("gestureend", prevent as EventListener);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);
  return <Outlet />;
}
