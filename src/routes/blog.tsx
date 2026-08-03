import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery } from "@/lib/site-query";
import { PageHeader } from "@/components/site/Section";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Journal — consigli di skincare e benessere | Atelier Lumen" },
      {
        name: "description",
        content:
          "Articoli su skincare, linfodrenaggio e rituali di benessere scritti dalle specialiste dell'Atelier Lumen.",
      },
      { property: "og:title", content: "Journal — Atelier Lumen" },
      {
        property: "og:description",
        content: "Skincare, linfodrenaggio e rituali: i consigli delle nostre specialiste.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Blog,
});

function Blog() {
  const { data } = useSuspenseQuery(siteQuery);

  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="Note dall'atelier"
        intro="Quello che raccontiamo in cabina, messo per iscritto."
      />

      <div className="shell pb-24">
        {data.posts.map((p) => (
          <article key={p.slug} className="border-t border-border py-10">
            <p className="eyebrow">
              {p.published_at
                ? new Date(p.published_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl">{p.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {p.excerpt}
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed">{p.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}
