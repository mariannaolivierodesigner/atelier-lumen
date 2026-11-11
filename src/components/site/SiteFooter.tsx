import { Link } from "@tanstack/react-router";

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
};

const head = "text-xs text-muted-foreground";
const ul = "mt-4 space-y-3 text-xs";
const LOGO = '"Cormorant Garamond", Georgia, serif';

export function SiteFooter({ name, locations }: { name: string; locations: Location[] }) {
  return (
    <footer className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-10 md:px-6">
      <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <p className="max-w-[16ch] text-xl leading-snug">
          Cura personale per la bellezza duratura della tua pelle.
        </p>
        <div>
          <p className={head}>Navigazione</p>
          <ul className={ul}>
            <li><Link to="/servizi">Trattamenti</Link></li>
            <li><Link to="/chi-siamo">Atelier</Link></li>
            <li><Link to="/team">Team</Link></li>
            <li><Link to="/gift-card">Gift Card</Link></li>
          </ul>
        </div>
        <div>
          <p className={head}>Informazioni</p>
          <ul className={ul}>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/contatti">Contatti</Link></li>
            <li><Link to="/prenota">Prenota</Link></li>
          </ul>
        </div>
        <div>
          <p className={head}>{locations.length === 1 ? "Sede" : "Sedi"}</p>
          <ul className={ul}>
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
      <div className="mt-20 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="text-xl text-foreground" style={{ fontFamily: LOGO }}>{name}</span>
        <span>© {new Date().getFullYear()} {name} · Tutti i diritti riservati.</span>
      </div>
    </footer>
  );
}
