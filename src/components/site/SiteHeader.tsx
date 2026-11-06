import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

const LOGO_FONT = '"Cormorant Garamond", Georgia, serif';

export function SiteHeader({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sulla home l'intestazione è trasparente sopra la foto, poi diventa chiara.
  const overlay = isHome && !scrolled && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        overlay
          ? "bg-transparent text-white"
          : "border-b border-border/70 bg-background/90 text-foreground backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-20 w-full max-w-[1240px] items-center justify-between gap-6 px-5 md:px-8">
        <Link
          to="/"
          className="text-[1.75rem] font-normal"
          style={{ fontFamily: LOGO_FONT }}
        >
          {name}
        </Link>

        <nav aria-label="Navigazione principale" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-opacity hover:opacity-100 ${overlay ? "opacity-85" : "opacity-70"}`}
              activeProps={{ className: "!opacity-100" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/prenota"
            className={`hidden sm:inline-flex ${overlay ? "btn-glass" : "btn"}`}
          >
            Prenota
          </Link>
          <button
            type="button"
            aria-label={open ? "Chiudi il menu" : "Apri il menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-11 items-center justify-center lg:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Navigazione mobile"
          className="fixed inset-0 top-20 flex flex-col bg-background px-5 pt-6 text-foreground lg:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="border-b border-border py-4 font-display text-3xl font-medium tracking-tight"
            >
              {item.label}
            </Link>
          ))}
          <Link to="/prenota" onClick={() => setOpen(false)} className="btn mt-8">
            Prenota
          </Link>
        </nav>
      )}
    </header>
  );
}
