/**
 * Supabase restituisce i messaggi d'errore in inglese. Mostrarli così com'erano
 * significava scrivere "New password should be different from the old password"
 * in mezzo a un'interfaccia tutta italiana.
 *
 * Si abbina prima sul codice, che è stabile, e solo dopo sul testo, che Supabase
 * cambia tra una versione e l'altra. Se non riconosciamo l'errore torniamo il
 * messaggio originale: meglio una frase in inglese che una frase sbagliata.
 */

type ErrorLike =
  | { message?: string | null; code?: string | null; status?: number | null }
  | null
  | undefined;

const PER_CODICE: Record<string, string> = {
  invalid_credentials: "Email o password non corretti.",
  email_not_confirmed: "Devi prima confermare la tua email. Controlla la posta.",
  email_exists: "Esiste già un account con questa email.",
  user_already_exists: "Esiste già un account con questa email.",
  same_password: "Scegli una password diversa da quella attuale.",
  weak_password: "Password troppo debole: usa almeno 8 caratteri.",
  user_not_found: "Nessun account trovato con questa email.",
  otp_expired: "Il link è scaduto. Richiedine uno nuovo.",
  over_request_rate_limit: "Troppi tentativi. Aspetta qualche minuto e riprova.",
  over_email_send_rate_limit: "Troppe email inviate. Aspetta qualche minuto e riprova.",
  session_not_found: "La sessione è scaduta. Accedi di nuovo.",
  validation_failed: "Controlla i dati inseriti.",
};

const PER_TESTO: Array<[RegExp, string]> = [
  [/different from the old password/i, "Scegli una password diversa da quella attuale."],
  [/invalid login credentials/i, "Email o password non corretti."],
  [/email not confirmed/i, "Devi prima confermare la tua email. Controlla la posta."],
  [
    /already registered|already been registered|user already exists/i,
    "Esiste già un account con questa email.",
  ],
  [/password should be at least (\d+)/i, "La password deve avere almeno $1 caratteri."],
  [
    /(email link is invalid|token has expired|expired or is invalid)/i,
    "Il link è scaduto o non è più valido. Richiedine uno nuovo.",
  ],
  [/auth session missing/i, "La sessione è scaduta. Accedi di nuovo."],
  [/for security purposes.*?(\d+) seconds/i, "Per sicurezza puoi riprovare tra $1 secondi."],
  [/rate limit/i, "Troppi tentativi. Aspetta qualche minuto e riprova."],
  [/unable to validate email address|invalid format/i, "L'indirizzo email non è valido."],
  [/user not found/i, "Nessun account trovato con questa email."],
  [
    /(failed to fetch|network ?request ?failed|networkerror)/i,
    "Connessione assente. Controlla la rete e riprova.",
  ],
  [/duplicate key value|already exists/i, "Questo valore è già presente."],
  [/violates row-level security/i, "Non hai i permessi per questa operazione."],
  [/jwt expired/i, "La sessione è scaduta. Accedi di nuovo."],
];

export function authErrorMessage(
  error: ErrorLike,
  fallback = "Riprova tra qualche istante.",
): string {
  if (!error) return fallback;

  const codice = error.code ?? undefined;
  if (codice && PER_CODICE[codice]) return PER_CODICE[codice];

  const testo = (error.message ?? "").trim();
  if (!testo) return fallback;

  for (const [regola, traduzione] of PER_TESTO) {
    const match = testo.match(regola);
    if (match) return traduzione.replace(/\$(\d)/g, (_, i) => match[Number(i)] ?? "");
  }

  return testo;
}
