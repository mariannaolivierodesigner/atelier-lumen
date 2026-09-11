// scripts/generate-sitemap.mjs
//
// Rigenera public/sitemap.xml includendo, oltre alle pagine statiche, una
// riga /servizi/{slug} per ogni trattamento prenotabile online letto dalla
// tabella "services" su Supabase. Va eseguito ogni volta che il listino
// cambia — o, meglio, collegato a un hook di build su Vercel così parte da
// solo a ogni deploy.
//
// Uso:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... node scripts/generate-sitemap.mjs
//
// (i due valori sono già nel file .env del progetto)

import { writeFile } from "node:fs/promises";

const SITE_URL = process.env.VITE_SITE_URL ?? "https://atelier-lumen-silk.vercel.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const today = new Date().toISOString().slice(0, 10);

const staticPages = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/prenota", changefreq: "monthly", priority: "0.9" },
  { path: "/servizi", changefreq: "weekly", priority: "0.8" },
  { path: "/chi-siamo", changefreq: "monthly", priority: "0.6" },
  { path: "/team", changefreq: "monthly", priority: "0.5" },
  { path: "/contatti", changefreq: "monthly", priority: "0.6" },
  { path: "/gift-card", changefreq: "monthly", priority: "0.5" },
  { path: "/faq", changefreq: "monthly", priority: "0.4" },
  { path: "/blog", changefreq: "weekly", priority: "0.5" },
];

async function fetchServiceSlugs() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY mancanti: salto le pagine /servizi/{slug}.",
    );
    return [];
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/services?select=slug&is_bookable=eq.true`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    console.warn(`Impossibile leggere i servizi da Supabase (status ${res.status}).`);
    return [];
  }
  const rows = await res.json();
  return rows.map((r) => r.slug).filter(Boolean);
}

function urlEntry({ path, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

const slugs = await fetchServiceSlugs();
const servicePages = slugs.map((slug) => ({
  path: `/servizi/${slug}`,
  changefreq: "monthly",
  priority: "0.7",
}));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...staticPages.map(urlEntry),
  ...servicePages.map(urlEntry),
  "</urlset>",
  "",
].join("\n");

await writeFile(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(
  `sitemap.xml scritto con ${staticPages.length} pagine statiche + ${servicePages.length} trattamenti.`,
);
