# Atelier Lumen — Una sede sola: modifiche funzionali e visive

## Parte 1 — Dato mancante (bloccante, va fatto per primo)
Il database di partenza non ha **nessuna** azienda (tenant) né sede: senza questi due dati il
sito darebbe errore su ogni pagina. Esegui questa query, **una volta sola**, nell'SQL Editor del
progetto Supabase, dopo aver eseguito il file completo delle migrazioni:

```sql
-- 1) L'azienda (tenant) — riga obbligatoria, il sito non parte senza questa
insert into public.tenants (slug, name, tagline)
values ('atelier-lumen', 'Atelier Lumen', 'Il tuo centro estetico di fiducia')
on conflict (slug) do nothing;

-- 2) L'unica sede, collegata all'azienda appena creata
insert into public.locations (tenant_id, name, address, city, postal_code, phone, email)
select id, 'Atelier Lumen', 'Via Esempio 1', 'Milano', '20100', '02 000 0000', 'info@atelierlumen.it'
from public.tenants where slug = 'atelier-lumen'
on conflict do nothing;
```

Personalizza indirizzo/città/telefono/email con i dati veri (o placeholder per la demo) — non
toccare `slug: 'atelier-lumen'`, è il nome tecnico con cui il sito riconosce l'azienda giusta.

**Nota**: anche altre tabelle di contenuto (trattamenti, staff, orari) partono vuote allo stesso
modo — quando vedrai sezioni bianche sul sito sarà per lo stesso motivo, non un bug. Ne parliamo
quando arrivi a popolare quei contenuti.

## Parte 2 — Modifiche al codice (funzionali + visive)

**Flusso di prenotazione** (`src/routes/prenota.tsx`): con una sola sede in archivio, il sistema
la seleziona da solo e il cliente parte direttamente da "Trattamento" — 3 passaggi invece di 4
("Tre passaggi" anche nel titolo visibile a schermo, non solo nella logica). Se in futuro
aggiungerai una seconda sede, il flusso a 4 passaggi torna automaticamente.

**Testi che davano per scontate due sedi a Milano** ("Brera e Porta Nuova"), corretti in:
- `src/routes/contatti.tsx` — titolo e descrizione della pagina
- `src/routes/index.tsx` — descrizione della home page
- `src/routes/gift-card.tsx` — testo introduttivo e descrizione
- `src/components/site/SiteFooter.tsx` — l'etichetta "Sedi" ora diventa "Sede" al singolare da
  sola quando c'è una sola sede in archivio (si adatta anche questa se ne aggiungerai un'altra)

Non ho toccato il filtro "Tutte le sedi" nel pannello turni/chiusure dello staff: resta corretto
anche con una sola sede (significa semplicemente "non filtrare"), non è un testo rivolto ai
clienti.

## Come caricarlo
1. Esegui prima la Parte 1 (SQL) nel progetto Supabase
2. GitHub (`visualappealagency/atelier-lumen`) → Add file → Upload files → trascina `src`
3. Commit changes
4. Publish su Lovable, o attendi il deploy automatico se hai già completato la migrazione a Vercel

## Collaudo
1. Home, Contatti, Gift Card: nessun riferimento a "due sedi" o nomi di sedi inventate
2. `/prenota`: parte da "Trattamento" (tre passaggi), il riepilogo finale mostra comunque il nome
   della sede presa in automatico
3. Footer: l'etichetta sopra l'indirizzo dice "Sede" (singolare)
