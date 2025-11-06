export interface OcrBlock {
  text: string;
  confidence: number;
}

export interface OcrRow {
  name: string;
  hours: number;
  confidence: number;
}

export interface OcrResponse {
  blocks: OcrBlock[];
  rows: OcrRow[];
  confidence: {
    average: number;
  };
}

export interface BillBreakdown {
  twenties: number;
  fives: number;
  ones: number;
}

export interface PartnerPayout {
  name: string;
  hours: number;
  payout: number;
  bills: BillBreakdown;
  confidence: number;
}

export interface TipSummary {
  totalHours: number;
  hourlyRate: number;
  totalDistributed: number;
}

const BILL_DENOMINATIONS = [
  { value: 20, key: 'twenties' as const },
  { value: 5, key: 'fives' as const },
  { value: 1, key: 'ones' as const }
];

export function calculateBills(amount: number): BillBreakdown {
  let remainder = Math.round(amount);
  const breakdown: BillBreakdown = { twenties: 0, fives: 0, ones: 0 };

  BILL_DENOMINATIONS.forEach(({ value, key }) => {
    const count = Math.floor(remainder / value);
    breakdown[key] = count;
    remainder -= count * value;
  });

  return breakdown;
}

export function calculateSummary(rows: OcrRow[], totalTips: number): TipSummary {
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const hourlyRate = totalHours > 0 ? totalTips / totalHours : 0;
  const totalDistributed = rows.reduce((sum, row) => sum + row.hours * hourlyRate, 0);
  return { totalHours, hourlyRate, totalDistributed };
}

export function calculatePartnerPayouts(rows: OcrRow[], totalTips: number): PartnerPayout[] {
  const { totalHours, hourlyRate } = calculateSummary(rows, totalTips);
  if (totalHours === 0) return [];

  return rows
    .map((row) => {
      const payout = row.hours * hourlyRate;
      return {
        name: row.name,
        hours: row.hours,
        payout,
        bills: calculateBills(payout),
        confidence: row.confidence
      };
    })
    .sort((a, b) => b.payout - a.payout);
}

export function parseOcrRows(blocks: OcrBlock[]): OcrRow[] {
  const rows: OcrRow[] = [];
  const rowPattern = /([a-zA-Z][\w\s\-']*?)\s+(\d+(?:[.,]\d+)?)/;

  blocks.forEach((block) => {
    const match = block.text.match(rowPattern);
    if (!match) return;

    const [, name, hoursRaw] = match;
    const hours = parseFloat(hoursRaw.replace(',', '.'));
    if (!Number.isFinite(hours)) return;

    rows.push({
      name: name.trim(),
      hours,
      confidence: block.confidence
    });
  });

  return rows;
}

export async function callOcrService(file: File, endpoint: string): Promise<OcrResponse> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    throw new Error(`OCR request failed (${response.status})`);
  }

  const payload = await response.json();
  return {
    blocks: payload.blocks ?? [],
    rows: payload.rows ?? parseOcrRows(payload.blocks ?? []),
    confidence: payload.confidence ?? { average: 0 }
  };
}

export function sanitizeRows(rows: OcrRow[]): OcrRow[] {
  const seen = new Map<string, OcrRow>();

  rows.forEach((row) => {
    const key = row.name.toLowerCase();
    const existing = seen.get(key);
    if (!existing || existing.confidence < row.confidence) {
      seen.set(key, row);
    }
  });

  return Array.from(seen.values());
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}
