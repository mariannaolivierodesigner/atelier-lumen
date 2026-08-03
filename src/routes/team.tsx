import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery } from "@/lib/site-query";
import { PageHeader } from "@/components/site/Section";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Il team — Atelier Lumen" },
      {
        name: "description",
        content:
          "Estetiste, massoterapiste e spa manager dell'Atelier Lumen: specializzazioni ed esperienza di ogni operatore.",
      },
      { property: "og:title", content: "Il team — Atelier Lumen" },
      {
        property: "og:description",
        content: "Le persone che si prendono cura di te, con le loro specializzazioni.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Team,
});

function Team() {
  const { data } = useSuspenseQuery(siteQuery);

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Le mani dell'atelier"
        intro="Puoi scegliere il tuo operatore preferito già in fase di prenotazione."
      />

      <div className="shell grid gap-x-10 gap-y-14 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {data.staff.map((p) => (
          <article key={p.id}>
            <div
              aria-hidden
              className="flex aspect-3/4 w-full items-center justify-center rounded-lg bg-sand/70 font-display text-5xl text-clay"
            >
              {p.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <h2 className="mt-5 text-2xl">{p.full_name}</h2>
            <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
              {p.role_title}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.specialties.map((s) => (
                <li key={s} className="rounded-full border border-border px-3 py-1 text-xs">
                  {s}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
