import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { siteQuery, formatPrice } from "@/lib/site-query";
import { BlurText } from "@/components/site/motion";
import { IMG } from "@/lib/ref-images";

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
  { t: "Viso", img: IMG.c1 },
  { t: "Rituali spa", img: IMG.c2 },
  { t: "Corpo", img: IMG.c3 },
  { t: "Ciglia e sopracciglia", img: IMG.c4 },
  { t: "Epilazione", img: IMG.c5 },
];

const PASSI = [
  { t: "Consulenza", d: "Un colloquio su pelle, abitudini e obiettivi, senza impegno, prima di scegliere qualsiasi trattamento.", img: IMG.t1 },
  { t: "Protocollo su misura", d: "Gesti, prodotti e frequenza vengono messi per iscritto e restano a tua disposizione.", img: IMG.t2 },
  { t: "Trattamento", d: "Mani esperte, tempi mai compressi, un ambiente pensato per rallentare.", img: IMG.t3 },
  { t: "Revisione nel tempo", d: "Dopo ogni seduta aggiorniamo il protocollo, così il risultato si costruisce e si mantiene.", img: IMG.c2 },
];

const FOCUS = [
  { tag: "Viso", t: "Protocolli viso che seguono la tua pelle, stagione dopo stagione", img: IMG.f1 },
  { tag: "Corpo", t: "Massaggi e trattamenti corpo, con pressioni decise insieme a te", img: IMG.c5 },
  { tag: "Spa", t: "Rituali lunghi per staccare davvero, anche in coppia", img: IMG.f3 },
];

const FAQ = [
  ["Come prenoto un trattamento?", "Dal sito, scegliendo trattamento, giorno e orario. Ricevi una conferma e un promemoria prima dell'appuntamento."],
  ["Quali sono gli orari di apertura?", "Dal lunedì al venerdì dalle 09:00 alle 20:00, il sabato dalle 09:00 alle 18:00. La domenica siamo chiusi."],
  ["Posso disdire o spostare?", "Sì, avvisandoci per tempo. Scrivici o telefona il prima possibile, così l'orario resta disponibile per altri."],
  ["La consulenza è a pagamento?", "No. È il punto di partenza di ogni protocollo e dura il tempo che serve per conoscerci."],
  ["Come funzionano le gift card?", "Sono nominative, valide dodici mesi e utilizzabili anche parzialmente, su tutti i trattamenti."],
  ["Cosa porto alla prima visita?", "Nulla di particolare. Se hai prodotti che usi abitualmente, portali: ci aiutano a costruire il protocollo."],
];

const h2 = "text-center text-[2.5rem] leading-[1.08] text-balance md:text-5xl";
const wrap = "mx-auto w-full max-w-[1080px] px-5 md:px-6";
const sec = "py-20 md:py-32";

function Faq({ items }: { items: string[][] }) {
  return (
    <div className="border-t border-border">
      {items.map(([q, a]) => (
        <details key={q} className="group border-b border-border">
          <summary className="flex list-none items-center justify-between gap-4 py-5 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
            {q}
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
        </details>
      ))}
    </div>
  );
}

function Home() {
  const { data } = useSuspenseQuery(siteQuery);
  const heroContent = data.sections["hero"] ?? {};
  const about = data.sections["about"] ?? {};
  const promo = data.sections["promo"] ?? {};
  const prezzi = data.services.slice(0, 10);
  const [ri, setRi] = useState(0);
  const reviews = data.reviews;
  const rev = reviews.length ? reviews[ri % reviews.length] : null;
  const portraits = [IMG.t1, IMG.t2, IMG.t3];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate flex min-h-[100svh] flex-col items-center justify-between overflow-hidden px-5 pt-36 pb-16 text-center text-white md:pb-20">
        <img
          src={IMG.hero}
          alt="Trattamento viso in cabina all'Atelier Lumen"
          width={1600}
          height={1200}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/40" />
        <div aria-hidden className="grain absolute inset-0 -z-10" />
        <h1 className="mt-[10vh] max-w-[16ch] text-[2.75rem] leading-[1.02] font-normal text-balance sm:text-6xl md:text-[5.25rem]">
          {heroContent["title"]}
        </h1>
        <div className="flex flex-col items-center">
        <p className="max-w-md text-base leading-relaxed text-white/90">{heroContent["body"]}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/prenota" className="btn">
            {heroContent["cta"] ?? "Prenota"}
          </Link>
          <Link to="/contatti" className="btn-glass">
            Contatti
          </Link>
        </div>
        </div>
      </section>

      {/* Frase di apertura */}
      <section className={`${wrap} ${sec}`}>
        <BlurText
          text="Ogni trattamento inizia con una consulenza e prosegue con un protocollo scritto, rivisto nel tempo."
          className="mx-auto max-w-[24ch] text-center font-display text-3xl leading-[1.15] tracking-[-0.03em] text-balance md:text-[2.75rem]"
        />
        <img
          src={IMG.intro}
          alt=""
          loading="lazy"
          width={600}
          height={720}
          className="rv mx-auto mt-14 aspect-[5/6] w-full max-w-sm rounded-2xl object-cover"
        />
      </section>

      {/* Trattamenti */}
      <section id="trattamenti" className={`${wrap} pb-20 md:pb-32`}>
        <h2 className={`rv ${h2}`}>I nostri trattamenti</h2>
        <div className="mt-14 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-5 md:gap-x-4">
          {COLLEZIONE.map((c, i) => (
            <Link
              to="/servizi"
              key={c.t}
              className={`rv group block ${i === 4 ? "col-span-2 md:col-span-1" : ""}`}
            >
              <div className={`overflow-hidden rounded-2xl ${i === 4 ? "aspect-[16/9] md:aspect-[3/4]" : "aspect-[3/4]"}`}>
                <img
                  src={c.img}
                  alt=""
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-center text-sm">{c.t}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Metodo */}
      <section id="metodo" className={`${wrap} pb-20 md:pb-32`}>
        <h2 className={`rv ${h2}`}>Un protocollo scritto per te</h2>
        <div className="mt-14 border-t border-border">
          {PASSI.map((p) => (
            <div
              key={p.t}
              className="rv grid items-center gap-5 border-b border-border py-8 md:grid-cols-3 md:gap-10"
            >
              <h3 className="text-2xl font-normal tracking-[-0.03em] md:text-[1.75rem]">{p.t}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{p.d}</p>
              <img
                src={p.img}
                alt=""
                loading="lazy"
                width={600}
                height={400}
                className="aspect-[3/2] w-full rounded-xl object-cover md:justify-self-end md:max-w-[15rem]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Pensato per te */}
      <section id="atelier" className={`${wrap} pb-20 md:pb-32`}>
        <h2 className={`rv ${h2}`}>Pensato per te</h2>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FOCUS.map((f) => (
            <article key={f.tag} className="rv relative isolate overflow-hidden rounded-2xl">
              <img
                src={f.img}
                alt=""
                loading="lazy"
                width={1000}
                height={1200}
                className="aspect-[0.73] w-full object-cover"
              />
              <span className="absolute top-[18px] left-[18px] rounded-full bg-[#c7a08b] px-5 py-3.5 text-base text-white uppercase md:px-6 md:py-[18px] md:text-lg">
                {f.tag}
              </span>
              <p className="absolute inset-x-[18px] bottom-[18px] rounded-2xl bg-white px-6 py-7 text-xl leading-[1.3] tracking-[-0.01em] text-foreground md:px-9 md:py-8 md:text-2xl">
                {f.t}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Banner */}
      <section className="mx-auto w-full max-w-[1208px] px-5 pb-16 md:px-6 md:pb-24">
        <div className="rv relative isolate flex min-h-[26rem] flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-16 text-center text-white md:min-h-[38rem]">
          <img
            src={IMG.banner}
            alt=""
            loading="lazy"
            width={1600}
            height={900}
            className="absolute inset-0 -z-20 size-full object-cover"
          />
          <h2 className="max-w-[16ch] font-sans text-[2.5rem] leading-[1.05] font-normal tracking-[-0.04em] text-balance md:text-[4.25rem]">
            Bellezza essenziale, tempo che rallenta.
          </h2>
          <Link to="/prenota" className="btn mt-10 !bg-white !text-foreground hover:!bg-white/90">
            Prenota il trattamento
          </Link>
        </div>
        <p className="rv mx-auto mt-24 max-w-[34rem] text-center text-lg leading-[1.45] text-muted-foreground md:mt-32 md:text-xl">
          Con il tempo la pelle perde collagene ed elasticità: per questo una cura costante e una
          buona idratazione fanno davvero la differenza.
        </p>
      </section>

      {/* Atelier, team, gift card */}
      <section className={`${wrap} space-y-20 pb-20 md:space-y-28 md:pb-32`}>
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="rv">
            <h2 className="text-4xl leading-[1.08] text-balance md:text-[2.75rem]">
              {about["title"] ?? "Un atelier, non un salone"}
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">{about["body"]}</p>
            <Link to="/chi-siamo" className="btn mt-8">
              Scopri la nostra storia
            </Link>
          </div>
          <img src={IMG.row1} alt="Interno dell'atelier" loading="lazy" width={1408} height={1008}
            className="rv aspect-[5/4] w-full rounded-2xl object-cover" />
        </div>

        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <img src={IMG.row2} alt="Trattamento viso" loading="lazy" width={1000} height={1200}
            className="rv aspect-[5/4] w-full rounded-2xl object-cover md:order-1" />
          <div className="rv md:order-2">
            <h2 className="text-4xl leading-[1.08] text-balance md:text-[2.75rem]">
              Mani esperte, un nome per ogni gesto
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Quattro professioniste, una sola idea di cura. Ti accompagnano dalla consulenza
              all'ultimo appuntamento.
            </p>
            <Link to="/team" className="btn mt-8">
              Conosci il team
            </Link>
          </div>
        </div>

        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="rv">
            <h2 className="text-4xl leading-[1.08] text-balance md:text-[2.75rem]">Regalare tempo</h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Nominative, valide dodici mesi, utilizzabili anche parzialmente. Da 50, 100 o 150 euro.
            </p>
            <Link to="/gift-card" className="btn mt-8">
              Richiedi una gift card
            </Link>
          </div>
          <img src={IMG.f2} alt="Cura della pelle" loading="lazy" width={1200} height={900}
            className="rv aspect-[5/4] w-full rounded-2xl object-cover" />
        </div>
      </section>

      {/* Promozione (dal gestionale) */}
      {promo["title"] && (
        <section className={`${wrap} pb-20 md:pb-32`}>
          <div className="rv flex flex-col gap-6 rounded-2xl bg-sand/60 p-8 sm:flex-row sm:items-center sm:justify-between md:p-12">
            <div>
              <h2 className="text-3xl md:text-4xl">{promo["title"]}</h2>
              <p className="mt-4 max-w-md leading-relaxed">{promo["body"]}</p>
              <p className="mt-2 text-xs text-muted-foreground">{promo["note"]}</p>
            </div>
            <p className="font-display text-5xl tracking-[-0.04em]">{promo["price"]}</p>
          </div>
        </section>
      )}

      {/* Listino */}
      <section className={`${wrap} pb-20 md:pb-32`}>
        <h2 className={`rv ${h2}`}>Trattamenti dai prezzi chiari</h2>
        <div className="mt-14 grid gap-x-12 md:grid-cols-2">
          {[prezzi.slice(0, 5), prezzi.slice(5, 10)].map((col, ci) => (
            <div key={ci} className="border-t border-border">
              {col.map((s) => (
                <Link
                  to="/servizi"
                  key={s.id}
                  className="rv flex items-center justify-between gap-6 border-b border-border py-6"
                >
                  <span className="text-lg md:text-xl">{s.name}</span>
                  <span className="text-base whitespace-nowrap tabular-nums">{formatPrice(s.price_cents)}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Recensioni (dal gestionale) */}
      {rev && (
        <section className={`${wrap} pb-20 md:pb-32`}>
          <h2 className={`rv ${h2}`}>La soddisfazione di chi viene da noi</h2>
          <div className="rv mt-14 grid gap-8 md:grid-cols-2 md:gap-14">
            <img
              src={portraits[ri % 3]}
              alt=""
              loading="lazy"
              width={600}
              height={720}
              className="aspect-[4/4.3] w-full rounded-2xl object-cover"
            />
            <div className="flex flex-col justify-between gap-10">
              <blockquote className="font-sans text-2xl leading-[1.3] md:text-[1.9rem]">
                “{rev.body}”
              </blockquote>
              <div className="flex items-center justify-between border-t border-border pt-5">
                <div>
                  <p className="text-lg">{rev.author_name}</p>
                  <p className="text-sm text-muted-foreground">{rev.source}</p>
                </div>
                {reviews.length > 1 && (
                  <div className="flex gap-2">
                    <button type="button" aria-label="Precedente" onClick={() => setRi((v) => v - 1 + reviews.length)}
                      className="inline-flex size-10 items-center justify-center rounded-full bg-[#c7a08b] text-white">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button type="button" aria-label="Successiva" onClick={() => setRi((v) => v + 1)}
                      className="inline-flex size-10 items-center justify-center rounded-full bg-[#c7a08b] text-white">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className={`${wrap} pb-20 md:pb-32`}>
        <h2 className={`rv mx-auto max-w-[20ch] ${h2}`}>Le risposte prima di venire</h2>
        <div className="rv mt-14 grid gap-x-12 md:grid-cols-2">
          <Faq items={FAQ.slice(0, 3)} />
          <Faq items={FAQ.slice(3)} />
        </div>
      </section>

      {/* Invito finale */}
      <section className={`${wrap} pb-20 md:pb-28`}>
        <div className="rv relative isolate flex min-h-[26rem] flex-col items-center justify-center overflow-hidden rounded-2xl px-6 py-16 text-center text-white">
          <img src={IMG.cta} alt="" loading="lazy" width={1600} height={1200}
            className="absolute inset-0 -z-20 size-full object-cover" />
          <h2 className="max-w-[14ch] text-4xl leading-[1.08] text-balance md:text-5xl">
            Prenditi il tuo tempo
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85">
            Trattamenti su misura, pensati per far stare bene la tua pelle e te con lei.
          </p>
          <Link to="/prenota" className="btn mt-8 !bg-white !text-foreground">
            Prenota
          </Link>
        </div>
      </section>
    </>
  );
}
