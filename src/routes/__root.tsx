import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "ArtigianoAI — Backoffice per artigiani" },
      { name: "description", content: "Gestisci clienti e preventivi senza fatica. Pensato per elettricisti, idraulici, edili e installatori." },
      { name: "author", content: "ArtigianoAI" },
      // Nome sotto l'icona quando il sito viene aggiunto alla schermata Home:
      // senza questo iOS usa il <title>, che è troppo lungo e viene troncato.
      { name: "apple-mobile-web-app-title", content: "ArtigianoAI" },
      { name: "theme-color", content: "#F28F29" },
      { property: "og:title", content: "ArtigianoAI — Backoffice per artigiani" },
      { property: "og:description", content: "Gestisci clienti e preventivi senza fatica. Pensato per elettricisti, idraulici, edili e installatori." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "ArtigianoAI — Backoffice per artigiani" },
      { name: "twitter:description", content: "Gestisci clienti e preventivi senza fatica. Pensato per elettricisti, idraulici, edili e installatori." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/HkPR4eabisSNT3tr4HvMByGsJc63/social-images/social-1778491796292-2e9a6c2c-97a7-4375-ba36-1635ef17d23e.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/HkPR4eabisSNT3tr4HvMByGsJc63/social-images/social-1778491796292-2e9a6c2c-97a7-4375-ba36-1635ef17d23e.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Icona della schermata Home su iOS: deve essere un PNG opaco, iOS non
      // legge né SVG né il manifest per questo.
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
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
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
