import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";

import { siteQuery, formatPrice } from "@/lib/site-query";
import hero from "@/assets/hero.jpg";
import atelier from "@/assets/atelier.jpg";
import serviceViso from "@/assets/service-viso.jpg";
import serviceCorpo from "@/assets/service-corpo.jpg";
import giftcard from "@/assets/giftcard.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier Lumen — Centro estetico e spa a Milano" },
      {
        name: "description",
        content:
          "Protocolli viso e corpo su misura, rituali spa e prenotazione online in tre passaggi.",
      },
      { property: "og:title", content: "Atelier Lumen — Centro estetico e spa a Milano" },
      {
        property: "og:description",
        content: "Protocolli viso e corpo su misura, rituali spa e prenotazione online.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Home,
});

const METODO = [
  {
    t: "Consulenza",
    d: "Un colloquio su pelle, abitudini e obiettivi, senza impegno, prima di scegliere qualsiasi trattamento.",
  },
  {
    t: "Protocollo su misura",
    d: "Gesti, prodotti e frequenza vengono messi per iscritto e restano a tua disposizione.",
  },
  {
    t: "Trattamento",
    d: "Mani esperte, tempi mai compressi, un ambiente pensato per rallentare.",
  },
  {
    t: "Revisione nel tempo",
    d: "Dopo ogni seduta aggiorniamo il protocollo, così il risultato si costruisce e si mantiene.",
  },
];

const FOCUS = [
  {
    tag: "Pelle",
    t: "Viso su misura",
    d: "Protocolli che cambiano con la stagione e con la tua pelle, non il contrario.",
    img: serviceViso,
  },
  {
    tag: "Corpo",
    t: "Tempo per il corpo",
    d: "Massaggi decontratturanti e drenanti, con pressioni decise insieme a te.",
    img: serviceCorpo,
  },
  {
    tag: "Spa",
    t: "Rituali lunghi",
    d: "Percorsi da novanta minuti in su per staccare davvero, anche in coppia o con la sposa.",
    img: atelier,
  },
];

const FAQ = [
  {
    q: "Come prenoto un trattamento?",
    a: "Dal sito, scegliendo trattamento, giorno e orario. Ricevi una conferma e un promemoria prima dell'appuntamento.",
  },
  {
    q: "Posso disdire o spostare?",
    a: "Sì, avvisandoci per tempo. Ti chiediamo di scriverci o telefonare il prima possibile, così l'orario resta disponibile per altri.",
  },
  {
    q: "La consulenza è a pagamento?",
    a: "No. È il punto di partenza di ogni protocollo e dura il tempo che serve per conoscerci.",
  },
  {
    q: "Come funzionano le gift card?",
    a: "Sono nominative, valide dodici mesi e utilizzabili anche parzialmente, su tutti i trattamenti.",
  },
];

const pill =
  "inline-flex items-center rounded-full px-6 py-3 text-sm font-normal transition-transform hover:-translate-y-0.5";

function Home() {
  const { data } = useSuspenseQuery(siteQuery);
  const heroContent = data.sections["hero"] ?? {};
  const about = data.sections["about"] ?? {};
  const promo = data.sections["promo"] ?? {};
  const featured = data.services.filter((s) => s.is_featured).slice(0, 4);

  return (
    <>
      {/* Hero a tutta larghezza */}
      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden text-white md:min-h-[88svh]">
        <img
          src={hero}
          alt="Trattamento viso in cabina all'Atelier Lumen"
          width={1600}
          height={1200}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/25 via-black/5 to-black/65" />
        <div className="shell pt-32 pb-12 md:pb-20">
          <h1 className="max-w-[12ch] text-5xl leading-none text-balance sm:text-7xl lg:text-8xl">
            {heroContent["title"]}
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-md text-base leading-relaxed text-white/90 md:text-lg">
              {heroContent["body"]}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/prenota" className={`${pill} bg-white text-[#2f241d]`}>
                {heroContent["cta"] ?? "Prenota"}
              </Link>
              <Link to="/servizi" className={`${pill} border border-white/70`}>
                Scopri i trattamenti
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Frase centrale */}
      <section className="shell py-24 text-center md:py-36">
        <p className="eyebrow rv">Atelier Lumen · Milano</p>
        <p className="rv mx-auto mt-6 max-w-[20ch] font-display text-3xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
          Ogni trattamento inizia con una consulenza e prosegue con un protocollo scritto, rivisto
          nel tempo.
        </p>
      </section>

      {/* Trattamenti in evidenza (dal gestionale) */}
      <section className="shell pb-24 md:pb-32">
        <div className="rv flex flex-wrap items-end justify-between gap-6">
          <h2 className="text-4xl md:text-6xl">I nostri trattamenti</h2>
          <Link to="/servizi" className={`${pill} border border-foreground/30`}>
            Tutti i trattamenti
          </Link>
        </div>
        <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((s) => (
            <article key={s.id} className="rv group min-w-0">
              <div className="overflow-hidden rounded-md">
                <img
                  src={s.image_url || (s.id.charCodeAt(0) % 2 === 0 ? serviceViso : serviceCorpo)}
                  alt={s.name}
                  loading="lazy"
                  width={1000}
                  height={1200}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-3">
                <h3 className="text-xl">{s.name}</h3>
                <span className="text-sm whitespace-nowrap text-muted-foreground">
                  {formatPrice(s.price_cents)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{s.duration_minutes} minuti</p>
            </article>
          ))}
        </div>
      </section>

      {/* Metodo */}
      <section className="bg-secondary/60 py-24 md:py-32">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
          <div className="rv">
            <p className="eyebrow">Il metodo</p>
            <h2 className="mt-4 text-4xl text-balance md:text-6xl lg:sticky lg:top-32">
              Un protocollo scritto per te
            </h2>
          </div>
          <div className="border-t border-border">
            {METODO.map((m) => (
              <div key={m.t} className="rv space-y-2 border-b border-border py-8">
                <h3 className="text-2xl md:text-3xl">{m.t}</h3>
                <p className="max-w-[52ch] text-muted-foreground">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tre card */}
      <section className="shell py-24 md:py-32">
        <h2 className="rv text-4xl md:text-6xl">Pensato per te</h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {FOCUS.map((f) => (
            <article key={f.t} className="rv flex min-w-0 flex-col gap-5 rounded-xl bg-secondary/60 p-3.5 pb-8">
              <img
                src={f.img}
                alt={f.t}
                loading="lazy"
                width={1000}
                height={800}
                className="aspect-[4/3] w-full rounded-md object-cover"
              />
              <span className="ml-2.5 self-start rounded-full border border-border bg-background px-3.5 py-1 text-xs tracking-wider text-muted-foreground uppercase">
                {f.tag}
              </span>
              <h3 className="px-2.5 text-3xl">{f.t}</h3>
              <p className="px-2.5 text-muted-foreground">{f.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Numeri */}
      <section className="border-y border-border py-14 md:py-20">
        <div className="shell grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {[
            [String(data.services.length), "trattamenti in sette categorie"],
            ["4", "professioniste in team"],
            ["6", "giorni di apertura a settimana"],
            ["12", "mesi di validità delle gift card"],
          ].map(([n, l]) => (
            <div key={l} className="rv">
              <p className="font-display text-5xl font-semibold tracking-tight tabular-nums md:text-7xl">
                {n}
              </p>
              <p className="mt-3 max-w-[22ch] text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Banner */}
      <section className="shell mt-24 md:mt-32">
        <div className="rv relative isolate flex min-h-80 items-end overflow-hidden rounded-2xl p-8 text-white md:min-h-[30rem] md:p-14">
          <img
            src={atelier}
            alt="Interno dell'atelier"
            loading="lazy"
            width={1408}
            height={1008}
            className="absolute inset-0 -z-20 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 to-black/60" />
          <h2 className="max-w-[16ch] text-4xl text-balance md:text-6xl">
            {about["title"] ?? "Bellezza essenziale, tempo che rallenta."}
          </h2>
        </div>
      </section>

      {/* Atelier + gift card */}
      <section className="shell grid items-center gap-12 py-24 md:py-32 lg:grid-cols-2 lg:gap-24">
        <div className="rv">
          <p className="eyebrow">L'atelier</p>
          <h2 className="mt-4 text-4xl text-balance md:text-5xl">Mani esperte, un nome per ogni gesto</h2>
          <p className="mt-6 max-w-[48ch] leading-relaxed text-muted-foreground">{about["body"]}</p>
          <Link to="/team" className={`${pill} mt-8 bg-primary text-primary-foreground`}>
            Conosci il team
          </Link>
        </div>
        <img
          src={hero}
          alt="Trattamento in cabina"
          loading="lazy"
          width={1600}
          height={1200}
          className="rv aspect-[5/4] w-full rounded-lg object-cover"
        />
        <img
          src={giftcard}
          alt="Gift card Atelier Lumen"
          loading="lazy"
          width={1200}
          height={900}
          className="rv aspect-[5/4] w-full rounded-lg object-cover lg:order-3"
        />
        <div className="rv lg:order-4">
          <p className="eyebrow">Gift card</p>
          <h2 className="mt-4 text-4xl text-balance md:text-5xl">Regalare tempo</h2>
          <p className="mt-6 max-w-[48ch] leading-relaxed text-muted-foreground">
            Nominative, valide dodici mesi, utilizzabili anche parzialmente. Da 50, 100 o 150 euro.
          </p>
          <Link to="/gift-card" className={`${pill} mt-8 border border-foreground/30`}>
            Richiedi una gift card
          </Link>
        </div>
      </section>

      {/* Promozione (dal gestionale) */}
      {promo["title"] && (
        <section className="shell pb-24 md:pb-32">
          <div className="rv flex flex-col gap-6 rounded-2xl bg-sand/60 p-8 sm:flex-row sm:items-center sm:justify-between md:p-12">
            <div>
              <p className="eyebrow">Promozione</p>
              <h2 className="mt-3 text-3xl md:text-4xl">{promo["title"]}</h2>
              <p className="mt-4 max-w-md leading-relaxed">{promo["body"]}</p>
              <p className="mt-2 text-xs text-muted-foreground">{promo["note"]}</p>
            </div>
            <p className="font-display text-5xl font-semibold tracking-tight">{promo["price"]}</p>
          </div>
        </section>
      )}

      {/* Recensioni (dal gestionale) */}
      {data.reviews.length > 0 && (
        <section className="shell pb-24 md:pb-32">
          <h2 className="rv text-4xl md:text-6xl">Cosa dicono i clienti</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {data.reviews.map((r) => (
              <figure key={r.id} className="rv rounded-xl border border-border bg-card p-7">
                <div className="flex gap-1" aria-label={`Valutazione ${r.rating} su 5`}>
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} aria-hidden className="size-3.5 fill-accent text-accent" />
                  ))}
                </div>
                <blockquote className="mt-5 text-sm leading-relaxed">{r.body}</blockquote>
                <figcaption className="mt-5 text-xs text-muted-foreground">
                  {r.author_name} · {r.source}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="shell grid gap-12 pb-24 md:pb-32 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
        <div className="rv">
          <p className="eyebrow">Domande frequenti</p>
          <h2 className="mt-4 text-4xl text-balance md:text-6xl">Prima di venire</h2>
        </div>
        <div className="rv border-t border-border">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-border">
              <summary className="flex list-none items-center justify-between gap-5 py-6 text-xl font-medium tracking-tight marker:content-none md:text-2xl [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="size-6 shrink-0 font-light transition-transform group-open:rotate-45" />
              </summary>
              <p className="max-w-[56ch] pb-6 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Invito finale */}
      <section className="shell">
        <div className="rv relative isolate overflow-hidden rounded-2xl px-5 py-20 text-center text-white md:py-32">
          <img
            src={hero}
            alt=""
            loading="lazy"
            width={1600}
            height={1200}
            className="absolute inset-0 -z-20 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-black/55" />
          <h2 className="mx-auto max-w-[14ch] text-5xl text-balance md:text-7xl">
            Prenditi il tuo tempo
          </h2>
          <Link to="/prenota" className={`${pill} mt-8 bg-white text-[#2f241d]`}>
            Prenota un trattamento
          </Link>
        </div>
      </section>
    </>
  );
}
