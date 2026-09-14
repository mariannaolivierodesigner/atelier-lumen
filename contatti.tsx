import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery } from "@/lib/site-query";
import { PageHeader } from "@/components/site/Section";

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

/**
 * Mappa stilizzata "editoriale": non è una vera mappa interattiva (evita di
 * dover collegare una API key per un indirizzo di esempio), ma una
 * composizione grafica nei colori e nello stile del sito, con un segnaposto
 * e un cartellino con l'indirizzo. Quando l'indirizzo del centro sarà reale
 * si potrà sostituire con un embed vero (Google Maps o Mapbox) mantenendo lo
 * stesso spazio.
 */
function StaticLocationMap({ name, addressLines }: { name: string; addressLines: string[] }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-sand/40 md:aspect-auto md:h-full md:min-h-100">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="400" height="400" className="fill-sand" opacity="0.55" />
        <rect x="34" y="34" width="124" height="94" rx="7" className="fill-card stroke-border" />
        <rect x="222" y="52" width="146" height="74" rx="7" className="fill-card stroke-border" />
        <rect x="46" y="222" width="104" height="126" rx="7" className="fill-card stroke-border" />
        <rect x="232" y="238" width="134" height="104" rx="7" className="fill-card stroke-border" />
        <line x1="0" y1="182" x2="400" y2="182" className="stroke-border" strokeWidth="9" />
        <line x1="196" y1="0" x2="196" y2="400" className="stroke-border" strokeWidth="9" />
        <line x1="0" y1="332" x2="400" y2="332" className="stroke-border" strokeWidth="5" opacity="0.7" />
        <line x1="330" y1="0" x2="330" y2="400" className="stroke-border" strokeWidth="5" opacity="0.7" />
      </svg>

      <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-full">
        <svg width="34" height="44" viewBox="0 0 40 52" fill="none" aria-hidden="true">
          <path
            d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z"
            className="fill-primary"
          />
          <circle cx="20" cy="20" r="7" className="fill-background" />
        </svg>
      </div>

      <div className="absolute inset-x-4 bottom-4 rounded-md border border-border bg-card/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <p className="text-sm">{name}</p>
        {addressLines.map((line) => (
          <p key={line} className="text-xs text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function Contatti() {
  const { data } = useSuspenseQuery(siteQuery);

  return (
    <>
      <PageHeader eyebrow="Contatti" title="Dove trovarci" />

      <div className="shell grid gap-14 pb-24 md:grid-cols-2 md:items-start">
        <div className="space-y-14">
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

        {data.locations[0] && (
          <StaticLocationMap
            name={data.locations[0].name}
            addressLines={[
              data.locations[0].address,
              `${data.locations[0].postal_code} ${data.locations[0].city}`,
            ]}
          />
        )}
      </div>
    </>
  );
}
