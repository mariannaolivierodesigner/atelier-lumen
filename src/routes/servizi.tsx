import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery, formatPrice } from "@/lib/site-query";
import { PageHeader } from "@/components/site/Section";

export const Route = createFileRoute("/servizi")({
  head: () => ({
    meta: [
      { title: "Trattamenti viso, corpo e spa — Atelier Lumen" },
      {
        name: "description",
        content:
          "Listino completo dei trattamenti Atelier Lumen: viso, corpo, rituali spa, mani e piedi. Durata e prezzi trasparenti.",
      },
      { property: "og:title", content: "Trattamenti viso, corpo e spa — Atelier Lumen" },
      {
        property: "og:description",
        content: "Listino completo con durata e prezzi di ogni protocollo.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Servizi,
});

function Servizi() {
  const { data } = useSuspenseQuery(siteQuery);

  return (
    <>
      <PageHeader
        eyebrow="Listino"
        title="Trattamenti"
        intro="Durate e prezzi indicativi: il protocollo definitivo viene definito in consulenza."
      />

      <div className="shell pb-8">
        {data.categories.map((cat) => {
          const items = data.services.filter((s) => s.category_id === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} className="border-t border-border py-14">
              <div className="grid gap-10 md:grid-cols-[18rem_1fr]">
                <div>
                  <h2 className="text-3xl">{cat.name}</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{cat.description}</p>
                </div>
                <ul className="space-y-8">
                  {items.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-4">
                      <div className="max-w-xl">
                        <h3 className="text-xl">{s.name}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {s.duration_minutes}′ · <span className="text-foreground">{formatPrice(s.price_cents)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      <div className="shell pb-24">
        <Link
          to="/prenota"
          className="inline-flex rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground"
        >
          Prenota un trattamento
        </Link>
      </div>
    </>
  );
}
