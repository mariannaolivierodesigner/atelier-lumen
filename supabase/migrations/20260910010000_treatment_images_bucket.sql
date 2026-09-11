-- Spazio di archiviazione per le immagini dei trattamenti, caricate
-- direttamente dallo staff (invece di dover incollare un indirizzo esterno).
-- Pubblico in lettura (le immagini vanno mostrate sul sito), solo lo staff
-- del centro può caricarne/sostituirle/cancellarle.

INSERT INTO storage.buckets (id, name, public)
VALUES ('treatment-images', 'treatment-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chiunque vede le immagini dei trattamenti"
ON storage.objects FOR SELECT
USING (bucket_id = 'treatment-images');

CREATE POLICY "staff carica immagini dei trattamenti"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'treatment-images');

CREATE POLICY "staff aggiorna immagini dei trattamenti"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'treatment-images')
WITH CHECK (bucket_id = 'treatment-images');

CREATE POLICY "staff elimina immagini dei trattamenti"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'treatment-images');
