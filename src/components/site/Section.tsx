import type { ReactNode } from "react";

export function Section({
  eyebrow,
  title,
  intro,
  children,
  className = "",
}: {
  eyebrow?: string | undefined;
  title?: string | undefined;
  intro?: string | undefined;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`shell py-20 md:py-28 ${className}`}>
      {(eyebrow || title || intro) && (
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && <h2 className="mt-4 text-4xl md:text-5xl">{title}</h2>}
          {intro && <p className="mt-5 text-base leading-relaxed text-muted-foreground">{intro}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/* Testata delle pagine interne: spazio sotto l'intestazione fissa, titolo grande al centro. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string | undefined;
}) {
  return (
    <div className="shell pt-16 pb-10 text-center md:pt-24">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mx-auto mt-5 max-w-[16ch] text-5xl text-balance md:text-7xl">{title}</h1>
      {intro && (
        <p className="mx-auto mt-6 max-w-xl leading-relaxed text-muted-foreground">{intro}</p>
      )}
    </div>
  );
}
