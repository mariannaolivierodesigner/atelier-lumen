/** Utility CSV client-safe: parsing tollerante (virgola o punto e virgola) e serializzazione. */

export type CsvRow = Record<string, string>;

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

/** Converte un testo CSV in righe chiave/valore usando la prima riga come intestazione. */
export function parseCsv(text: string): CsvRow[] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) pushField();
    else if (char === "\n") pushRow();
    else if (char !== "\r") field += char;
  }
  pushRow();

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) =>
    h
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase(),
  );
  return body.map((cells) => {
    const entry: CsvRow = {};
    keys.forEach((key, index) => {
      entry[key] = cells[index] ?? "";
    });
    return entry;
  });
}

/** Serializza righe in CSV con separatore punto e virgola (compatibile con Excel italiano). */
export function toCsv(headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const raw = String(value ?? "");
    return /[";\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };
  return [headers, ...rows].map((line) => line.map(escape).join(";")).join("\n");
}

/** Avvia il download di un file CSV nel browser. */
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
