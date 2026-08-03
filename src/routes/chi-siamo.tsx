import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery } from "@/lib/site-query";
import { PageHeader } from "@/components/site/Section";
import atelier from "@/assets/atelier.jpg";

export const Route = createFileRoute("/chi-siamo")({
  head: () => ({
    meta: [
      { title: "L'atelier — Atelier Lumen Milano" },
      {
        name: "description",
        content:
          "Un atelier di bellezza a Milano: consulenza della pelle, protocolli scritti, ambienti silenziosi e appuntamenti singoli.",
      },
      { property: "og:title", content: "L'atelier — Atelier Lumen Milano" },
      {
        property: "og:description",
        content: "Consulenza della pelle, protocolli scritti, ambienti silenziosi.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: ChiSiamo,
});

function ChiSiamo() {
  const { data } = useSuspenseQuery(siteQuery);
  const about = data.sections["about"] ?? {};

  return (
    <>
      <PageHeader eyebrow="Chi siamo" title={about["title"] ?? "L'atelier"} intro={about["body"]} />

      <div className="shell pb-10">
        <img
          src={atelier}
          alt="Cabina trattamenti dell'Atelier Lumen"
          loading="lazy"
          width={1408}
          height={1008}
          className="aspect-video w-full rounded-xl object-cover"
        />
      </div>

      <div className="shell grid gap-12 pb-24 md:grid-cols-3">
        {[
          {
            t: "Consulenza prima di tutto",
            b: "Ogni percorso inizia con un'analisi della pelle e un colloquio: nessun trattamento standard.",
          },
          {
            t: "Un cliente alla volta",
            b: "Cabine singole, tempi distesi e nessuna sovrapposizione di appuntamenti.",
          },
          {
            t: "Protocolli documentati",
            b: "Ogni seduta viene registrata nella scheda cliente, con foto e note di avanzamento.",
          },
        ].map((c) => (
          <div key={c.t} className="border-t border-border pt-6">
            <h2 className="text-2xl">{c.t}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
          </div>
        ))}
      </div>
    </>
  );
}
