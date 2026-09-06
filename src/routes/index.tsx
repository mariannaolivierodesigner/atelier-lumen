import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { siteQuery, formatPrice } from "@/lib/site-query";
import { Section } from "@/components/site/Section";
import hero from "@/assets/hero.jpg";
import atelier from "@/assets/atelier.jpg";
import serviceViso from "@/assets/service-viso.jpg";
import serviceCorpo from "@/assets/service-corpo.jpg";

const IMAGES: Record<string, string> = { viso: serviceViso, corpo: serviceCorpo };

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

function Home() {
  const { data } = useSuspenseQuery(siteQuery);
  const heroContent = data.sections["hero"] ?? {};
  const about = data.sections["about"] ?? {};
  const promo = data.sections["promo"] ?? {};
  const featured = data.services.filter((s) => s.is_featured).slice(0, 4);

  return (
    <>
      <section className="shell grid items-center gap-12 pt-16 pb-8 md:pt-24 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="eyebrow">{heroContent["eyebrow"]}</p>
          <h1 className="mt-6 text-5xl leading-[1.05] md:text-7xl">{heroContent["title"]}</h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
            {heroContent["body"]}
          </p>
          <Link
            to="/prenota"
            className="mt-10 inline-flex rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            {heroContent["cta"] ?? "Prenota"}
          </Link>
        </div>
        <img
          src={hero}
          alt="Trattamento viso in cabina all'Atelier Lumen"
          width={1600}
          height={1200}
          className="aspect-4/3 w-full rounded-xl object-cover shadow-[var(--shadow-lift)]"
        />
      </section>

      <Section
        eyebrow="Trattamenti"
        title="I nostri protocolli"
        intro="Ogni trattamento inizia con una consulenza e prosegue con un protocollo scritto, rivisto nel tempo."
      >
        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {featured.map((s) => (
            <article key={s.id} className="group">
              <img
                src={IMAGES[s.image_url ?? "viso"] ?? serviceViso}
                alt={s.name}
                loading="lazy"
                width={1000}
                height={1200}
                className="aspect-5/4 w-full rounded-lg object-cover"
              />
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <h3 className="text-2xl">{s.name}</h3>
                <span className="text-sm text-muted-foreground">{formatPrice(s.price_cents)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{s.duration_minutes} minuti</p>
            </article>
          ))}
        </div>
        <Link
          to="/servizi"
          className="mt-12 inline-flex border-b border-foreground/30 pb-1 text-sm hover:border-foreground"
        >
          Tutti i trattamenti
        </Link>
      </Section>

      <section className="shell grid items-center gap-12 py-8 lg:grid-cols-2">
        <img
          src={atelier}
          alt="Interno dell'atelier con cabina trattamenti"
          loading="lazy"
          width={1408}
          height={1008}
          className="aspect-4/3 w-full rounded-xl object-cover"
        />
        <div>
          <p className="eyebrow">L'atelier</p>
          <h2 className="mt-4 text-4xl md:text-5xl">{about["title"]}</h2>
          <p className="mt-6 leading-relaxed text-muted-foreground">{about["body"]}</p>
          <Link
            to="/chi-siamo"
            className="mt-8 inline-flex border-b border-foreground/30 pb-1 text-sm hover:border-foreground"
          >
            Scopri la nostra storia
          </Link>
        </div>
      </section>

      <Section eyebrow="Promozione" title={promo["title"] ?? ""}>
        <div className="mt-8 flex flex-col gap-6 rounded-xl bg-sand/60 p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="max-w-md leading-relaxed">{promo["body"]}</p>
            <p className="mt-2 text-xs text-muted-foreground">{promo["note"]}</p>
          </div>
          <p className="font-display text-5xl">{promo["price"]}</p>
        </div>
      </Section>

      <Section eyebrow="Recensioni" title="Cosa dicono i clienti">
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {data.reviews.map((r) => (
            <figure key={r.id} className="rounded-lg border border-border bg-card p-7">
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
      </Section>
    </>
  );
}
