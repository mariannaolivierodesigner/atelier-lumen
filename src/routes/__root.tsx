import { QueryClient, QueryClientProvider, useSuspenseQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { siteQuery } from "../lib/site-query";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow">Errore 404</p>
        <h1 className="mt-4 text-5xl">Pagina non trovata</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground"
        >
          Torna alla home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl">Questa pagina non si è caricata</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Riprova tra un istante oppure torna alla home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground"
          >
            Riprova
          </button>
          <a
            href="/"
            className="rounded-md border border-border px-5 py-2.5 text-sm text-foreground"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Atelier Lumen — Centro estetico e spa a Milano" },
      {
        name: "description",
        content:
          "Trattamenti viso, corpo e rituali spa su misura. Prenota online in meno di un minuto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#4a3728" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Atelier Lumen" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
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

function SiteChrome() {
  const { data } = useSuspenseQuery(siteQuery);
  return (
    <>
      <SiteHeader name={data.tenant.name} />
      <main id="contenuto">
        <Outlet />
      </main>
      <SiteFooter name={data.tenant.name} locations={data.locations} />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Le aree riservate (accesso e gestionale) hanno una loro interfaccia.
  const bare = pathname.startsWith("/gestionale") || pathname.startsWith("/auth");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Contesto non sicuro o non supportato: il sito resta comunque utilizzabile da browser.
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {bare ? (
        <main id="contenuto">
          <Outlet />
        </main>
      ) : (
        <div className="flex min-h-dvh flex-col">
          <SiteChrome />
        </div>
      )}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
