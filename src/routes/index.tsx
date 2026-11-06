import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";

import { siteQuery, formatPrice } from "@/lib/site-query";
import { BlurText } from "@/components/site/motion";
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

const COLLEZIONE = [
  { t: "Viso", img: serviceViso, pos: "center 30%" },
  { t: "Sopracciglia e ciglia", img: hero, pos: "30% center" },
  { t: "Corpo", img: serviceCorpo, pos: "center 20%" },
  { t: "Epilazione", img: giftcard, pos: "center" },
  { t: "Rituali spa", img: atelier, pos: "70% center" },
];

const PASSI = [
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
  { tag: "Pelle", t: "Viso su misura", d: "Protocolli che cambiano con la stagione e con la tua pelle, non il contrario.", img: serviceViso },
  { tag: "Corpo", t: "Tempo per il corpo", d: "Massaggi decontratturanti e drenanti, con pressioni decise insieme a te.", img: serviceCorpo },
  { tag: "Spa", t: "Rituali lunghi", d: "Percorsi da novanta minuti in su per staccare davvero, anche in coppia o con la sposa.", img: atelier },
];

const FAQ = [
  ["Come prenoto un trattamento?", "Dal sito, scegliendo trattamento, giorno e orario. Ricevi una conferma e un promemoria prima dell'appuntamento."],
  ["Posso disdire o spostare?", "Sì, avvisandoci per tempo. Ti chiediamo di scriverci o telefonare il prima possibile, così l'orario resta disponibile per altri."],
  ["La consulenza è a pagamento?", "No. È il punto di partenza di ogni protocollo e dura il tempo che serve per conoscerci."],
  ["Come funzionano le gift card?", "Sono nominative, valide dodici mesi e utilizzabili anche parzialmente, su tutti i trattamenti."],
  ["Quali sono gli orari di apertura?", "Dal lunedì al venerdì dalle 09:00 alle 20:00, il sabato dalle 09:00 alle 18:00. La domenica siamo chiusi."],
];

const h2 = "text-4xl text-balance md:text-[42px] md:leading-[1.1]";

function Home() {
  const { data } = useSuspenseQuery(siteQuery);
  const heroContent = data.sections["hero"] ?? {};
  const about = data.sections["about"] ?? {};
  const promo = data.sections["promo"] ?? {};
  const prezzi = data.services.slice(0, 10);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate flex min-h-[100svh] flex-col items-center justify-between overflow-hidden px-5 pt-36 pb-12 text-center text-white md:pb-16">
        <img
          src={hero}
          alt="Trattamento viso in cabina all'Atelier Lumen"
          width={1600}
          height={1200}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/35" />
        <h1 className="mt-[8vh] max-w-[14ch] text-5xl leading-[1] text-balance sm:text-6xl md:text-7xl">
          {heroContent["title"]}
        </h1>
        <div className="flex flex-col items-center">
          <p className="max-w-md text-base leading-relaxed text-white/85">{heroContent["body"]}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/prenota" className="btn !bg-[#c7a08b] text-white">
              {heroContent["cta"] ?? "Prenota"}
            </Link>
            <Link to="/contatti" className="btn-glass !bg-black/40">
              Contatti
            </Link>
          </div>
        </div>
      </section>

      {/* Frase di apertura */}
      <section className="shell py-24 md:py-36">
        <div className="mx-auto max-w-4xl">
          <BlurText
            text="Ogni trattamento inizia con una consulenza e prosegue con un protocollo scritto, rivisto nel tempo."
            className="font-display text-3xl leading-[1.15] font-medium tracking-[-0.04em] text-balance md:text-[42px]"
          />
          <p className="rv mt-10 ml-auto max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            {about["body"]}
          </p>
        </div>
      </section>

      {/* Collezione */}
      <section id="trattamenti" className="shell pb-24 md:pb-36">
        <h2 className={`rv mx-auto max-w-[18ch] text-center ${h2}`}>I nostri trattamenti</h2>
        <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {COLLEZIONE.map((c, i) => (
            <Link
              to="/servizi"
              key={c.t}
              className={`rv group relative isolate block aspect-[3/4] overflow-hidden rounded-xl text-white ${i === 4 ? "col-span-2 aspect-[16/9] md:col-span-1 md:aspect-[3/4]" : ""}`}
            >
              <img
                src={c.img}
                alt=""
                loading="lazy"
                width={800}
                height={1000}
                style={{ objectPosition: c.pos }}
                className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/0 via-black/5 to-black/60" />
              <p className="absolute inset-x-4 bottom-4 font-display text-xl leading-tight font-medium tracking-tight">
                {c.t}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Metodo */}
      <section id="metodo" className="bg-secondary/60 py-24 md:py-36">
        <div className="shell">
          <h2 className={`rv max-w-[20ch] ${h2}`}>Un protocollo scritto per te</h2>
          <div className="mt-16 border-t border-border">
            {PASSI.map((p) => (
              <div
                key={p.t}
                className="rv grid gap-4 border-b border-border py-10 md:grid-cols-[1fr_1.2fr] md:gap-16"
              >
                <h3 className="font-display text-2xl leading-tight md:text-3xl">{p.t}</h3>
                <p className="max-w-[52ch] leading-relaxed text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pensato per te */}
      <section id="atelier" className="shell py-24 md:py-36">
        <h2 className={`rv max-w-[14ch] ${h2}`}>Pensato per te</h2>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {FOCUS.map((f) => (
            <article key={f.tag} className="rv flex min-w-0 flex-col gap-4">
              <img
                src={f.img}
                alt=""
                loading="lazy"
                width={1000}
                height={1200}
                className="aspect-[4/5] w-full rounded-xl object-cover"
              />
              <span className="eyebrow">{f.tag}</span>
              <h3 className="font-display text-2xl leading-tight">{f.t}</h3>
              <p className="max-w-[40ch] text-muted-foreground">{f.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Atelier, team, gift card */}
      <section className="shell py-24 md:py-36">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-20">
          <div className="rv">
            <p className="eyebrow">L'atelier</p>
            <h2 className={`mt-4 ${h2}`}>{about["title"] ?? "Un atelier, non un salone"}</h2>
            <p className="mt-5 max-w-md text-muted-foreground">{about["body"]}</p>
            <Link to="/chi-siamo" className="btn mt-8">
              Scopri la nostra storia
            </Link>
          </div>
          <img
            src={atelier}
            alt="Interno dell'atelier"
            loading="lazy"
            width={1408}
            height={1008}
            className="rv aspect-[5/4] w-full rounded-xl object-cover"
          />
        </div>

        <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-20">
          <img
            src={serviceViso}
            alt="Trattamento viso"
            loading="lazy"
            width={1000}
            height={1200}
            className="rv aspect-[5/4] w-full rounded-xl object-cover md:order-1"
          />
          <div className="rv md:order-2">
            <p className="eyebrow">Il team</p>
            <h2 className={`mt-4 ${h2}`}>Mani esperte, un nome per ogni gesto</h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Quattro professioniste, una sola idea di cura. Ti accompagnano dalla consulenza
              all'ultimo appuntamento.
            </p>
            <Link to="/team" className="btn mt-8">
              Conosci il team
            </Link>
          </div>
        </div>

        <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-20">
          <div className="rv">
            <p className="eyebrow">Gift card</p>
            <h2 className={`mt-4 ${h2}`}>Regalare tempo</h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Nominative, valide dodici mesi, utilizzabili anche parzialmente. Da 50, 100 o 150
              euro.
            </p>
            <Link to="/gift-card" className="btn mt-8">
              Richiedi una gift card
            </Link>
          </div>
          <img
            src={giftcard}
            alt="Gift card Atelier Lumen"
            loading="lazy"
            width={1200}
            height={900}
            className="rv aspect-[5/4] w-full rounded-xl object-cover"
          />
        </div>
      </section>

      {/* Promozione (dal gestionale) */}
      {promo["title"] && (
        <section className="shell pb-24 md:pb-36">
          <div className="rv flex flex-col gap-6 rounded-2xl bg-sand/60 p-8 sm:flex-row sm:items-center sm:justify-between md:p-12">
            <div>
              <p className="eyebrow">Promozione</p>
              <h2 className="mt-3 text-3xl md:text-4xl">{promo["title"]}</h2>
              <p className="mt-4 max-w-md leading-relaxed">{promo["body"]}</p>
              <p className="mt-2 text-xs text-muted-foreground">{promo["note"]}</p>
            </div>
            <p className="font-display text-5xl font-medium tracking-[-0.04em]">{promo["price"]}</p>
          </div>
        </section>
      )}

      {/* Listino */}
      <section className="bg-secondary/60 py-24 md:py-36">
        <div className="shell">
          <h2 className={`rv max-w-[18ch] ${h2}`}>Listino</h2>
          <p className="rv mt-4 max-w-md text-muted-foreground">
            Durate e prezzi indicativi: il protocollo definitivo viene definito in consulenza.
          </p>
          <div className="mt-12 border-t border-border">
            {prezzi.map((s) => (
              <div
                key={s.id}
                className="rv flex items-baseline justify-between gap-6 border-b border-border py-5"
              >
                <span className="font-display text-xl tracking-tight md:text-2xl">
                  {s.name}
                  <span className="ml-3 text-sm text-muted-foreground">
                    {s.duration_minutes} min
                  </span>
                </span>
                <span className="font-display text-xl whitespace-nowrap tabular-nums md:text-2xl">
                  {formatPrice(s.price_cents)}
                </span>
              </div>
            ))}
          </div>
          <Link to="/servizi" className="btn mt-10">
            Tutti i trattamenti
          </Link>
        </div>
      </section>

      {/* Recensioni (dal gestionale) */}
      {data.reviews.length > 0 && (
        <section className="shell py-24 md:py-36">
          <h2 className={`rv max-w-[18ch] ${h2}`}>Cosa dicono i clienti</h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {data.reviews.map((r) => (
              <figure
                key={r.id}
                className="rv flex flex-col justify-between rounded-xl bg-secondary/60 p-8"
              >
                <div>
                  <div className="flex gap-1" aria-label={`Valutazione ${r.rating} su 5`}>
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} aria-hidden className="size-3.5 fill-accent text-accent" />
                    ))}
                  </div>
                  <blockquote className="mt-5 font-display text-lg leading-snug tracking-tight">
                    “{r.body}”
                  </blockquote>
                </div>
                <figcaption className="mt-8 text-sm">
                  <span className="block font-medium">{r.author_name}</span>
                  <span className="text-muted-foreground">{r.source}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="shell grid gap-12 pb-24 md:pb-36 lg:grid-cols-[1fr_1.6fr] lg:gap-24">
        <h2 className={`rv max-w-[14ch] ${h2}`}>Prima di venire</h2>
        <div className="rv border-t border-border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-border">
              <summary className="flex list-none items-center justify-between gap-5 py-5 font-display text-lg tracking-tight marker:content-none md:text-xl [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="size-5 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="max-w-[56ch] pb-5 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Invito finale */}
      <section className="relative isolate mx-auto flex min-h-[28rem] w-full max-w-[1240px] items-center justify-center overflow-hidden rounded-2xl px-5 py-24 text-center text-white">
        <img
          src={hero}
          alt=""
          loading="lazy"
          width={1600}
          height={1200}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/50" />
        <div className="rv">
          <h2 className="mx-auto max-w-[12ch] text-5xl text-balance md:text-6xl">
            Prenditi il tuo tempo
          </h2>
          <Link to="/prenota" className="btn mt-8 !bg-[#c7a08b] text-white">
            Prenota un trattamento
          </Link>
        </div>
      </section>
    </>
  );
}
