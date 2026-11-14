import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery } from "@/lib/site-query";

export const Route = createFileRoute("/contatti")({
  head: () => ({
    meta: [
      { title: "Contatti — Atelier Lumen" },
      {
        name: "description",
        content: "Indirizzo, telefono, email e orari di apertura di Atelier Lumen.",
      },
      { property: "og:title", content: "Contatti — Atelier Lumen" },
      { property: "og:description", content: "Indirizzo, telefono e orari di apertura." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Contatti,
});

function Contatti() {
  const { data } = useSuspenseQuery(siteQuery);

  return (
    <>
      <div className="shell pt-16 pb-24 md:pt-24">
        <div className="max-w-xl space-y-16">
          {data.locations.map((l, i) => {
            const hours = (l.opening_hours ?? {}) as Record<string, string>;
            return (
              <section key={l.id} className={i > 0 ? "border-t border-border pt-10" : ""}>
                <h2 className="text-3xl">{l.name}</h2>
                <address className="mt-4 text-sm leading-relaxed text-muted-foreground not-italic">
                  {l.address}, {l.city}
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
      </div>
    </>
  );
}
