import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery, formatPrice } from "@/lib/site-query";

const SITE_URL = "https://salonstream-suite.lovable.app";

export const Route = createFileRoute("/servizi/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(siteQuery);
    const service = data.services.find((s) => s.slug === params.slug);
    if (!service) throw notFound();
    return { service, tenantName: data.tenant.name };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Trattamento non disponibile" }, { name: "robots", content: "noindex" }],
      };
    }
    const { service, tenantName } = loaderData;
    const title = `${service.name} — ${tenantName}`;
    const description =
      service.description?.slice(0, 155) ??
      `${service.name}: durata ${service.duration_minutes} minuti, ${formatPrice(service.price_cents)}.`;
    const url = `${SITE_URL}/servizi/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.name,
            description: service.description ?? undefined,
            provider: { "@type": "HealthAndBeautyBusiness", name: tenantName },
            offers: {
              "@type": "Offer",
              price: (service.price_cents / 100).toFixed(2),
              priceCurrency: "EUR",
            },
          }),
        },
      ],
    };
  },
  notFoundComponent: TrattamentoNonTrovato,
  component: DettaglioTrattamento,
});

function TrattamentoNonTrovato() {
  return (
    <div className="shell py-32">
      <h1 className="text-4xl">Trattamento non disponibile</h1>
      <p className="mt-4 text-muted-foreground">
        Il trattamento cercato non è più in listino.
      </p>
      <Link to="/servizi" className="mt-8 inline-flex text-sm underline">
        Torna al listino
      </Link>
    </div>
  );
}

function DettaglioTrattamento() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(siteQuery);

  const service = data.services.find((s) => s.slug === slug);
  if (!service) return <TrattamentoNonTrovato />;

  const category = data.categories.find((c) => c.id === service.category_id);
  const related = data.services
    .filter((s) => s.category_id === service.category_id && s.id !== service.id)
    .slice(0, 3);
  const faqs = data.faqs.slice(0, 5);

  return (
    <>
      <div className="shell pt-20 pb-6 md:pt-28">
        <p className="eyebrow">
          <Link to="/servizi" className="hover:text-foreground">
            Trattamenti
          </Link>
          {category ? ` · ${category.name}` : ""}
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl md:text-6xl">{service.name}</h1>
        <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
          {service.description}
        </p>
      </div>

      <div className="shell grid gap-12 pb-20 md:grid-cols-[1fr_20rem]">
        <div>
          {service.image_url && (
            <img
              src={service.image_url}
              alt={`Trattamento ${service.name}`}
              loading="lazy"
              className="w-full rounded-md object-cover"
            />
          )}

          {faqs.length > 0 && (
            <section className="mt-16 border-t border-border pt-10">
              <h2 className="text-3xl">Domande frequenti</h2>
              <dl className="mt-8 space-y-7">
                {faqs.map((f) => (
                  <div key={f.id}>
                    <dt className="text-lg">{f.question}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {f.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-16 border-t border-border pt-10">
              <h2 className="text-3xl">Altri trattamenti</h2>
              <ul className="mt-8 space-y-5">
                {related.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-4">
                    <Link
                      to="/servizi/$slug"
                      params={{ slug: s.slug }}
                      className="text-lg hover:underline"
                    >
                      {s.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {s.duration_minutes}′ · {formatPrice(s.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-md border border-border p-7 md:sticky md:top-28">
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Durata</dt>
              <dd>{service.duration_minutes} minuti</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Prezzo</dt>
              <dd>{formatPrice(service.price_cents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Disponibilità</dt>
              <dd>{service.is_bookable ? "Prenotabile online" : "Su richiesta"}</dd>
            </div>
            {category && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Categoria</dt>
                <dd>{category.name}</dd>
              </div>
            )}
          </dl>

          {service.is_bookable ? (
            <Link
              to="/prenota"
              search={{ servizio: service.slug }}
              className="mt-7 inline-flex w-full justify-center rounded-md bg-primary px-6 py-3 text-sm text-primary-foreground"
            >
              Prenota ora
            </Link>
          ) : (
            <Link
              to="/contatti"
              className="mt-7 inline-flex w-full justify-center rounded-md border border-border px-6 py-3 text-sm"
            >
              Richiedi informazioni
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
