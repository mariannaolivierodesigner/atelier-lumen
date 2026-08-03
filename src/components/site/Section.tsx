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
    <div className="shell pt-20 pb-6 md:pt-28">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-5xl md:text-6xl">{title}</h1>
      {intro && <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">{intro}</p>}
    </div>
  );
}
