import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/site/Section";
import giftcard from "@/assets/giftcard.jpg";

const TAGLI = [
  { v: "50 €", d: "Un gesto essenziale: manicure signature o consulenza della pelle." },
  { v: "100 €", d: "Un trattamento viso completo o un massaggio drenante." },
  { v: "150 €", d: "Il Percorso Lumen: hammam, scrub e massaggio aromatico." },
];

export const Route = createFileRoute("/gift-card")({
  head: () => ({
    meta: [
      { title: "Gift Card — Atelier Lumen" },
      {
        name: "description",
        content: "Gift card Atelier Lumen da 50, 100 o 150 euro. Validità dodici mesi.",
      },
      { property: "og:title", content: "Gift Card — Atelier Lumen" },
      {
        property: "og:description",
        content: "Regala tempo: gift card valide dodici mesi su tutti i trattamenti.",
      },
    ],
  }),
  component: GiftCard,
});

function GiftCard() {
  return (
    <>
      <PageHeader
        eyebrow="Gift Card"
        title="Regalare tempo"
        intro="Nominative, valide dodici mesi, utilizzabili anche parzialmente."
      />

      <div className="shell grid gap-12 pb-24 lg:grid-cols-2">
        <img
          src={giftcard}
          alt="Gift card Atelier Lumen con sigillo dorato"
          loading="lazy"
          width={1200}
          height={900}
          className="aspect-4/3 w-full rounded-xl object-cover"
        />
        <div>
          <ul className="space-y-6">
            {TAGLI.map((t) => (
              <li
                key={t.v}
                className="flex items-baseline justify-between gap-6 border-b border-border pb-6"
              >
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t.d}</p>
                <p className="font-display text-4xl">{t.v}</p>
              </li>
            ))}
          </ul>
          <Link
            to="/contatti"
            className="mt-10 inline-flex rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground"
          >
            Richiedi una gift card
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            L'acquisto online con pagamento immediato arriva con il modulo ecommerce.
          </p>
        </div>
      </div>
    </>
  );
}
