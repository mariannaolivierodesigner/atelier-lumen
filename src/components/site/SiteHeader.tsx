import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/servizi", label: "Trattamenti" },
  { to: "/chi-siamo", label: "Atelier" },
  { to: "/team", label: "Team" },
  { to: "/gift-card", label: "Gift Card" },
  { to: "/blog", label: "Journal" },
  { to: "/faq", label: "FAQ" },
  { to: "/contatti", label: "Contatti" },
] as const;

export function SiteHeader({ name }: { name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="shell flex h-20 items-center justify-between gap-6">
        <Link to="/" className="font-display text-2xl tracking-tight">
          {name}
        </Link>

        <nav aria-label="Navigazione principale" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/prenota"
            className="hidden rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Prenota
          </Link>
          <button
            type="button"
            aria-label={open ? "Chiudi il menu" : "Apri il menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-md text-foreground lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Navigazione mobile" className="border-t border-border bg-background lg:hidden">
          <div className="shell flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-muted-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/prenota"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-primary px-5 py-3 text-center text-sm text-primary-foreground"
            >
              Prenota
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
