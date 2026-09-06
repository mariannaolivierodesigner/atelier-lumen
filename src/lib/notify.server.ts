/**
 * Invio email transazionali tramite Resend.
 *
 * Richiede due variabili d'ambiente su Vercel:
 *  - RESEND_API_KEY       (dalla dashboard Resend, dopo aver creato un account gratuito)
 *  - EMAIL_FROM_ADDRESS   (un indirizzo sul dominio verificato in Resend, es. prenotazioni@ilTuoDominio.it)
 *
 * Se mancano, l'invio viene saltato silenziosamente (log lato server) senza far fallire
 * la prenotazione: il cliente vede comunque la conferma a schermo.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBookingConfirmationEmail(params: {
  to: string;
  customerName: string;
  serviceName: string;
  locationName: string;
  startsAt: string;
}): Promise<boolean> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM_ADDRESS"];

  if (!apiKey || !from) {
    console.warn(
      "[notify] RESEND_API_KEY o EMAIL_FROM_ADDRESS non configurati: email non inviata.",
    );
    return false;
  }

  const when = new Date(params.startsAt);
  const dateLabel = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(when);
  const timeLabel = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(
    when,
  );

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #2b2118;">
      <h1 style="font-size: 20px; font-weight: normal;">Richiesta ricevuta</h1>
      <p>Ciao ${escapeHtml(params.customerName)},</p>
      <p>abbiamo ricevuto la tua richiesta di prenotazione:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #6b5d4f;">Trattamento</td><td style="padding: 6px 0; text-align: right;"><strong>${escapeHtml(params.serviceName)}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b5d4f;">Quando</td><td style="padding: 6px 0; text-align: right;"><strong>${escapeHtml(dateLabel)}, ore ${escapeHtml(timeLabel)}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b5d4f;">Dove</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.locationName)}</td></tr>
      </table>
      <p>Riceverai un'altra email non appena lo staff avrà confermato l'appuntamento.</p>
      <p style="color: #6b5d4f; font-size: 13px;">Atelier Lumen</p>
    </div>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: "La tua richiesta di prenotazione — Atelier Lumen",
        html,
      }),
    });
    if (!res.ok) {
      console.error("[notify] Resend ha risposto con errore", res.status, await res.text());
    }
    return res.ok;
  } catch (err) {
    console.error("[notify] invio email fallito", err);
    return false;
  }
}
