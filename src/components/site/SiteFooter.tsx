import { Link } from "@tanstack/react-router";

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
};

const col = "space-y-2.5 text-sm text-muted-foreground";

export function SiteFooter({ name, locations }: { name: string; locations: Location[] }) {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <p className="text-4xl" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
            {name}
          </p>
          <p className="mt-4 max-w-[22ch] font-display text-lg leading-snug tracking-tight">
            Cura personale per la bellezza duratura della tua pelle.
          </p>
        </div>

        <div>
          <p className="eyebrow">Navigazione</p>
          <ul className={`mt-5 ${col}`}>
            <li><Link to="/servizi" className="hover:text-foreground">Trattamenti</Link></li>
            <li><Link to="/chi-siamo" className="hover:text-foreground">Atelier</Link></li>
            <li><Link to="/team" className="hover:text-foreground">Team</Link></li>
            <li><Link to="/gift-card" className="hover:text-foreground">Gift Card</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Informazioni</p>
          <ul className={`mt-5 ${col}`}>
            <li><Link to="/blog" className="hover:text-foreground">Journal</Link></li>
            <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
            <li><Link to="/contatti" className="hover:text-foreground">Contatti</Link></li>
            <li><Link to="/prenota" className="hover:text-foreground">Prenota</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">{locations.length === 1 ? "Sede" : "Sedi"}</p>
          <ul className={`mt-5 ${col}`}>
            {locations.map((l) => (
              <li key={l.id}>
                {l.address}, {l.city}
                <br />
                {l.phone}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] border-t border-border px-5 py-6 text-xs text-muted-foreground md:px-8">
        © {new Date().getFullYear()} {name} · Tutti i diritti riservati.
      </div>
    </footer>
  );
}
