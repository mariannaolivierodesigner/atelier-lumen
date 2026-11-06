import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

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
          "Trattamenti personalizzati viso e corpo, rituali spa e prenotazione online all'Atelier Lumen di Milano.",
      },
      { property: "og:title", content: "Atelier Lumen — Centro estetico e spa a Milano" },
      {
        property: "og:description",
        content: "Cura personale per la bellezza duratura della tua pelle.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Home,
});

const COLLEZIONE = [
  { t: "Pulizia profonda", img: serviceViso, pos: "center 30%" },
  { t: "Terapia viso", img: hero, pos: "30% center" },
  { t: "Levigatura della pelle", img: serviceCorpo, pos: "center 20%" },
  { t: "Rinnovo luminoso", img: giftcard, pos: "center" },
  { t: "Rimodellamento corpo", img: atelier, pos: "70% center" },
];

const PASSI = [
  {
    t: "Capire la tua pelle e le tue esigenze",
    d: "Iniziamo con una consulenza attenta, dedicata alla tua pelle, alle tue necessità e ai risultati che vuoi ottenere con una cura delicata e personalizzata.",
  },
  {
    t: "Creare un piano di trattamento su misura",
    d: "Ogni trattamento viene scelto con cura in base al tuo tipo di pelle, ai tuoi lineamenti naturali e ai tuoi obiettivi di bellezza, nel modo più equilibrato e personale.",
  },
  {
    t: "Trattamenti delicati, risultati che durano",
    d: "Il nostro metodo unisce tecniche moderne e gesti rilassanti, per una pelle fresca, sana, naturalmente luminosa e in equilibrio nel tempo.",
  },
];

const FOCUS = [
  { tag: "Le nostre esperte", t: "Estetiste esperte di cui fidarti", img: serviceViso },
  { tag: "I nostri prodotti", t: "Cosmetici scelti con attenzione per la tua pelle", img: serviceCorpo },
  { tag: "Il nostro spazio", t: "Uno spazio calmo, pensato per rilassarti", img: atelier },
];

const FAQ = [
  ["Come scelgo il trattamento giusto per la mia pelle?", "Durante la consulenza iniziale analizziamo pelle, abitudini e obiettivi, poi ti proponiamo un protocollo scritto. Non devi scegliere da sola."],
  ["Cosa succede durante la prima consulenza?", "Parliamo della tua pelle, osserviamo le zone da trattare e definiamo insieme priorità e frequenza. Non è un impegno e non ha costi."],
  ["Quanto dura una seduta di trattamento viso?", "Dipende dal trattamento: da 50 a 75 minuti per la maggior parte dei protocolli viso. La durata è sempre indicata nel listino."],
  ["I trattamenti sono personalizzati per ogni tipo di pelle?", "Sì. Ogni protocollo viene adattato a pelle secca, sensibile, impura o matura, e rivisto dopo ogni seduta."],
  ["Quando vedrò i primi risultati?", "Molti trattamenti danno un effetto visibile già dalla prima seduta. Per risultati duraturi serve un percorso costante, che costruiamo insieme."],
  ["Dopo i trattamenti c'è un tempo di recupero?", "Per la maggior parte dei trattamenti no: puoi tornare alle tue attività subito. Se serve qualche attenzione, te la spieghiamo a fine seduta."],
  ["I trattamenti sono adatti alle pelli sensibili?", "Sì, scegliamo prodotti e gesti delicati e facciamo sempre una prova prima di procedere. Segnalaci allergie e reazioni passate."],
  ["Quali prodotti usate durante i trattamenti?", "Cosmetici professionali selezionati per efficacia e delicatezza. Su richiesta ti indichiamo i prodotti usati in cabina."],
  ["I trattamenti migliorano texture e luminosità?", "Sì, pulizia, esfoliazione e idratazione mirate migliorano la grana della pelle e restituiscono luminosità."],
  ["Come mantengo i risultati tra un appuntamento e l'altro?", "Ti lasciamo una routine semplice a casa, scritta nel tuo protocollo: pochi gesti e prodotti, da fare con regolarità."],
  ["Ogni quanto devo prenotare i trattamenti?", "In genere ogni tre o quattro settimane per il viso, ma la frequenza dipende dal tuo protocollo."],
  ["La consulenza è inclusa prima di ogni trattamento?", "Sì, ogni percorso inizia con una consulenza, e la ripetiamo ogni volta che i tuoi obiettivi cambiano."],
];

const h2 = "text-4xl text-balance md:text-[42px] md:leading-[1.1]";

function Home() {
  const { data } = useSuspenseQuery(siteQuery);
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
          Cura naturale per la bellezza della tua pelle
        </h1>
        <div className="flex flex-col items-center">
          <p className="max-w-md text-base leading-relaxed text-white/85">
            Trattamenti personalizzati pensati per il comfort, la sicurezza e una bellezza naturale
            senza tempo.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/prenota" className="btn !bg-[#c7a08b] text-white">
              Prenota
            </Link>
            <Link to="/contatti" className="btn-glass !bg-black/40">
              Contattaci
            </Link>
          </div>
        </div>
      </section>

      {/* Panoramica */}
      <section className="shell py-24 md:py-36">
        <div className="mx-auto max-w-4xl">
          <p className="rv font-display text-3xl leading-[1.15] font-medium tracking-[-0.04em] text-balance md:text-[42px]">
            Crediamo che la pelle rifletta la cura, la sicurezza e la dolcezza che ti fanno sentire
            te stessa. Con trattamenti delicati ti aiutiamo a preservare la bellezza naturale, in
            modo calmo e personale.
          </p>
          <p className="rv mt-10 ml-auto max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            Aiutiamo la tua pelle a sentirsi sana, fresca e naturalmente giovane, con trattamenti,
            cure delicate ed esperienze di bellezza personalizzate.
          </p>
        </div>
      </section>

      {/* Collezione */}
      <section id="trattamenti" className="shell pb-24 md:pb-36">
        <h2 className={`rv mx-auto max-w-[18ch] text-center ${h2}`}>
          Una collezione personalizzata per la tua bellezza naturale
        </h2>
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

      {/* Processo */}
      <section id="metodo" className="bg-secondary/60 py-24 md:py-36">
        <div className="shell">
          <h2 className={`rv max-w-[20ch] ${h2}`}>
            Una cura attenta, pensata intorno alla tua bellezza
          </h2>
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

      {/* Focus */}
      <section id="atelier" className="shell py-24 md:py-36">
        <h2 className={`rv max-w-[14ch] ${h2}`}>Attenzione al comfort e alla bellezza naturale</h2>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {FOCUS.map((f) => (
            <article key={f.tag} className="rv flex min-w-0 flex-col gap-5">
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
            </article>
          ))}
        </div>
      </section>

      {/* Numeri */}
      <section className="border-y border-border py-16 md:py-24">
        <div className="shell">
          <h2 className={`rv max-w-[16ch] ${h2}`}>Esperienze di bellezza con risultati concreti</h2>
          <div className="mt-14 grid grid-cols-2 gap-y-10 md:grid-cols-5">
            {[
              [String(data.services.length), "trattamenti in listino"],
              ["7", "categorie di trattamento"],
              ["4", "professioniste in team"],
              ["6", "giorni di apertura a settimana"],
              ["12", "mesi di validità delle gift card"],
            ].map(([n, l]) => (
              <div key={l} className="rv">
                <p className="font-display text-5xl font-medium tracking-[-0.04em] tabular-nums md:text-6xl">
                  {n}
                </p>
                <p className="mt-3 max-w-[18ch] text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pelle sana */}
      <section className="shell py-24 md:py-36">
        <div className="grid gap-10 md:grid-cols-2 md:gap-20">
          <h2 className={`rv ${h2}`}>La pelle sana riflette come ti prendi cura di te</h2>
          <div className="rv">
            <p className="font-display text-2xl leading-snug tracking-tight">
              La cura che dai oggi alla tua pelle diventa la bellezza che porti domani.
            </p>
            <p className="mt-6 max-w-md text-muted-foreground">
              Con il tempo la pelle perde collagene ed elasticità: una cura costante e una buona
              idratazione sono essenziali per un aspetto sano.
            </p>
            <Link to="/prenota" className="btn mt-8">
              Prenota
            </Link>
          </div>
        </div>

        <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-20">
          <img
            src={atelier}
            alt="Interno dell'atelier"
            loading="lazy"
            width={1408}
            height={1008}
            className="rv aspect-[5/4] w-full rounded-xl object-cover"
          />
          <div className="rv">
            <h3 className="font-display text-3xl leading-tight md:text-4xl">
              Una pelle più sana a ogni trattamento
            </h3>
            <p className="mt-5 max-w-md text-muted-foreground">
              Trattamenti pensati per migliorare la grana della pelle, ripristinare l'idratazione e
              lasciarla morbida, fresca ed equilibrata nel tempo.
            </p>
            <Link to="/prenota" className="btn mt-8">
              Prenota
            </Link>
          </div>
        </div>

        <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-20">
          <div className="rv md:order-1">
            <h3 className="font-display text-3xl leading-tight md:text-4xl">
              Una pelle naturalmente liscia e luminosa
            </h3>
            <p className="mt-5 max-w-md text-muted-foreground">
              Cura personalizzata e trattamenti delicati sostengono l'elasticità, la levigatezza e
              un aspetto fresco che si sente sano ogni giorno.
            </p>
            <Link to="/prenota" className="btn mt-8">
              Prenota
            </Link>
          </div>
          <img
            src={serviceViso}
            alt="Trattamento viso"
            loading="lazy"
            width={1000}
            height={1200}
            className="rv aspect-[5/4] w-full rounded-xl object-cover md:order-2"
          />
        </div>
      </section>

      {/* Listino */}
      <section className="bg-secondary/60 py-24 md:py-36">
        <div className="shell">
          <h2 className={`rv max-w-[18ch] ${h2}`}>Trattamenti premium con prezzi chiari</h2>
          <div className="mt-14 border-t border-border">
            {prezzi.map((s) => (
              <div
                key={s.id}
                className="rv flex items-baseline justify-between gap-6 border-b border-border py-5"
              >
                <span className="font-display text-xl tracking-tight md:text-2xl">{s.name}</span>
                <span className="font-display text-xl whitespace-nowrap tabular-nums md:text-2xl">
                  {formatPrice(s.price_cents)}
                </span>
              </div>
            ))}
          </div>
          <Link to="/servizi" className="btn mt-10">
            Tutto il listino
          </Link>
        </div>
      </section>

      {/* Testimonianze */}
      {data.reviews.length > 0 && (
        <section className="shell py-24 md:py-36">
          <h2 className={`rv max-w-[18ch] ${h2}`}>
            La soddisfazione delle clienti è il nostro standard quotidiano
          </h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {data.reviews.map((r) => (
              <figure
                key={r.id}
                className="rv flex flex-col justify-between rounded-xl bg-secondary/60 p-8"
              >
                <blockquote className="font-display text-lg leading-snug tracking-tight">
                  “{r.body}”
                </blockquote>
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
        <h2 className={`rv max-w-[14ch] ${h2}`}>Tutto sui nostri trattamenti e sull'esperienza</h2>
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
            Scopri la tua luce naturale
          </h2>
          <p className="mx-auto mt-5 max-w-md text-white/85">
            Trattamenti personalizzati per una pelle fresca, equilibrata e naturalmente bella, a
            ogni visita.
          </p>
          <Link to="/prenota" className="btn mt-8 !bg-[#c7a08b] text-white">
            Prenota
          </Link>
        </div>
      </section>
    </>
  );
}
