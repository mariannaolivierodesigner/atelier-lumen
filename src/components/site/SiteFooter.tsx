import { Link } from "@tanstack/react-router";

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
};

export function SiteFooter({ name, locations }: { name: string; locations: Location[] }) {
  return (
    <footer className="mt-28 border-t border-border bg-secondary/40">
      <div className="shell grid gap-12 py-16 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">{name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Bellezza essenziale, protocolli su misura, tempo che rallenta.
          </p>
        </div>

        <div>
          <p className="eyebrow">Sedi</p>
          <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
            {locations.map((l) => (
              <li key={l.id}>
                <span className="text-foreground">{l.name}</span>
                <br />
                {l.address}, {l.city}
                <br />
                {l.phone}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Pagine</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/servizi" className="hover:text-foreground">
                Trattamenti
              </Link>
            </li>
            <li>
              <Link to="/gift-card" className="hover:text-foreground">
                Gift Card
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-foreground">
                Journal
              </Link>
            </li>
            <li>
              <Link to="/contatti" className="hover:text-foreground">
                Contatti
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="shell hairline flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {name}. Tutti i diritti riservati.
        </p>
        <p>Powered by BeautyOS</p>
      </div>
    </footer>
  );
}
