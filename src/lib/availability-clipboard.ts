import { useEffect, useState } from "react";

import type { CopiedRule } from "./availability";

export type AvailabilityClipboard = {
  serviceName: string;
  rules: CopiedRule[];
  staffIds: string[];
};

const KEY = "beautyos:availability-clipboard";
const EVENT = "beautyos:availability-clipboard-change";

function read(): AvailabilityClipboard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AvailabilityClipboard) : null;
  } catch {
    return null;
  }
}

/** Salva negli appunti locali le regole di un trattamento. */
export function writeAvailabilityClipboard(value: AvailabilityClipboard) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

/** Svuota gli appunti delle regole di disponibilità. */
export function clearAvailabilityClipboard() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Legge gli appunti solo dopo l'idratazione, per evitare disallineamenti di render. */
export function useAvailabilityClipboard() {
  const [value, setValue] = useState<AvailabilityClipboard | null>(null);

  useEffect(() => {
    const sync = () => setValue(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return value;
}
