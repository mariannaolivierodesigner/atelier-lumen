import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery } from "@/lib/site-query";
import { PageHeader } from "@/components/site/Section";

export const Route = createFileRoute("/contatti")({
  head: () => ({
    meta: [
      { title: "Contatti e sedi a Milano — Atelier Lumen" },
      {
        name: "description",
        content:
          "Indirizzi, telefoni, email e orari delle due sedi Atelier Lumen a Milano: Brera e Porta Nuova.",
      },
      { property: "og:title", content: "Contatti e sedi a Milano — Atelier Lumen" },
      { property: "og:description", content: "Indirizzi, telefoni e orari delle due sedi." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Contatti,
});

function Contatti() {
  const { data } = useSuspenseQuery(siteQuery);

  return (
    <>
      <PageHeader eyebrow="Contatti" title="Dove trovarci" />

      <div className="shell grid gap-12 pb-24 md:grid-cols-2">
        {data.locations.map((l) => {
          const hours = (l.opening_hours ?? {}) as Record<string, string>;
          return (
            <section key={l.id} className="border-t border-border pt-8">
              <h2 className="text-3xl">{l.name}</h2>
              <address className="mt-4 text-sm leading-relaxed text-muted-foreground not-italic">
                {l.address}
                <br />
                {l.postal_code} {l.city}
                <br />
                <a href={`tel:${l.phone?.replace(/\s/g, "")}`} className="hover:text-foreground">
                  {l.phone}
                </a>
                <br />
                <a href={`mailto:${l.email}`} className="hover:text-foreground">
                  {l.email}
                </a>
              </address>
              <dl className="mt-6 space-y-1.5 text-sm">
                {Object.entries(hours).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 border-b border-border py-1.5">
                    <dt className="text-muted-foreground capitalize">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </>
  );
}
