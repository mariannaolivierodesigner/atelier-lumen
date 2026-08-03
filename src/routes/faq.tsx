import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { siteQuery } from "@/lib/site-query";
import { PageHeader } from "@/components/site/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Domande frequenti — Atelier Lumen" },
      {
        name: "description",
        content:
          "Disdette, ritardi, gift card, scelta dell'operatore e pagamenti: le risposte alle domande più frequenti.",
      },
      { property: "og:title", content: "Domande frequenti — Atelier Lumen" },
      {
        property: "og:description",
        content: "Disdette, gift card, pagamenti: tutte le risposte in una pagina.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Faq,
});

function Faq() {
  const { data } = useSuspenseQuery(siteQuery);

  return (
    <>
      <PageHeader eyebrow="Supporto" title="Domande frequenti" />

      <div className="shell max-w-3xl pb-24">
        <Accordion type="single" collapsible className="w-full">
          {data.faqs.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-left text-lg">{f.question}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}
