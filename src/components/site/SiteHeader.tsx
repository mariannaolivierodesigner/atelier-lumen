import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/servizi", label: "Trattamenti" },
  { to: "/chi-siamo", label: "Atelier" },
  { to: "/team", label: "Team" },
  { to: "/gift-card", label: "Gift Card" },
  { to: "/faq", label: "FAQ" },
  { to: "/contatti", label: "Contatti" },
] as const;

const LOGO_FONT = '"Noto Serif", Georgia, serif';

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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Sulla home l'intestazione è trasparente sopra la foto, poi diventa chiara.
  const overlay = isHome && !scrolled && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        overlay
          ? "bg-transparent text-white"
          : open
            ? "bg-background text-foreground"
            : "border-b border-border/70 bg-background/90 text-foreground backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1080px] items-center justify-between gap-6 px-5 md:px-8">
        <Link
          to="/"
          className="text-xl font-normal tracking-[-0.03em]"
          style={{ fontFamily: LOGO_FONT }}
        >
          {name}
        </Link>

        <nav aria-label="Navigazione principale" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm font-normal transition-opacity duration-300 hover:opacity-100 ${overlay ? "opacity-90" : "opacity-70"}`}
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
            className="inline-flex size-10 items-center justify-center lg:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Navigazione mobile"
          className="fixed inset-0 top-[72px] z-50 flex flex-col overflow-y-auto bg-background px-5 pt-8 text-foreground lg:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="py-[14px] font-sans text-2xl font-normal tracking-[-0.02em]"
            >
              {item.label}
            </Link>
          ))}
          <Link to="/prenota" onClick={() => setOpen(false)} className="btn mt-8 !w-full">
            Prenota
          </Link>
        </nav>
      )}
    </header>
  );
}
