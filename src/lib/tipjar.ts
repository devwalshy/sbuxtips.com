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

type OcrEngineOption = 'service' | 'azure';

interface AzureConfig {
  endpoint: string;
  key: string;
  modelId: string;
  apiVersion: string;
}

interface AzureTableCell {
  rowIndex: number;
  columnIndex: number;
  content?: string;
  confidence?: number;
  kind?: string;
}

interface AzureTable {
  cells?: AzureTableCell[];
}

function readEnv(name: string): string {
  const env = import.meta.env as Record<string, unknown>;
  const value = env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getAzureConfig(): AzureConfig | null {
  const endpoint = readEnv('AZURE_DI_ENDPOINT');
  const key = readEnv('AZURE_DI_KEY');
  if (!endpoint || !key) {
    return null;
  }

  const modelId = readEnv('AZURE_DI_MODEL_ID') || 'prebuilt-layout';
  const apiVersion = readEnv('AZURE_DI_API_VERSION') || '2024-07-31';

  return { endpoint, key, modelId, apiVersion };
}

function resolveOcrEngine(): OcrEngineOption {
  const raw = readEnv('OCR_ENGINE').toLowerCase();
  if (raw === 'azure') return 'azure';
  if (raw === 'auto') {
    return getAzureConfig() ? 'azure' : 'service';
  }
  return 'service';
}

export async function callOcrService(file: File, endpoint: string): Promise<OcrResponse> {
  const engine = resolveOcrEngine();
  if (engine === 'azure') {
    return callAzureDocumentIntelligence(file);
  }
  return callSelfHostedOcr(file, endpoint);
}

async function callSelfHostedOcr(file: File, endpoint: string): Promise<OcrResponse> {
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

async function callAzureDocumentIntelligence(file: File): Promise<OcrResponse> {
  const config = getAzureConfig();
  if (!config) {
    throw new Error('Azure Document Intelligence is not configured.');
  }

  const { endpoint, key, modelId, apiVersion } = config;
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');
  const analyzeUrl = `${normalizedEndpoint}/formrecognizer/documentModels/${encodeURIComponent(
    modelId
  )}:analyze?api-version=${encodeURIComponent(apiVersion)}`;

  const contentType = file.type || 'application/octet-stream';

  const analyzeResponse = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Ocp-Apim-Subscription-Key': key
    },
    body: file
  });

  if (analyzeResponse.status !== 202) {
    const errorText = await safeReadText(analyzeResponse);
    throw new Error(
      `Azure Document Intelligence request failed (${analyzeResponse.status}): ${errorText}`.trim()
    );
  }

  const operationLocation =
    analyzeResponse.headers.get('operation-location') ??
    analyzeResponse.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error('Azure Document Intelligence response missing operation location header.');
  }

  let delayMs = parseRetryAfter(analyzeResponse.headers.get('retry-after')) ?? 1000;
  const maxAttempts = 15;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await wait(delayMs);
    }

    const statusResponse = await fetch(operationLocation, {
      headers: {
        'Ocp-Apim-Subscription-Key': key
      }
    });

    if (!statusResponse.ok) {
      const errorText = await safeReadText(statusResponse);
      throw new Error(
        `Azure Document Intelligence status check failed (${statusResponse.status}): ${errorText}`.trim()
      );
    }

    const statusPayload = await statusResponse.json();
    const status = (statusPayload.status ?? '').toString().toLowerCase();

    if (status === 'succeeded') {
      const analyzeResult = statusPayload.analyzeResult ?? {};
      const parsed = parseAzureAnalyzeResult(analyzeResult);
      if (parsed.rows.length === 0) {
        throw new Error('Azure Document Intelligence did not return any partner rows.');
      }
      return parsed;
    }

    if (status === 'failed') {
      const message =
        statusPayload.error?.message ??
        statusPayload.analyzeResult?.errors?.[0]?.message ??
        'Unknown Azure Document Intelligence error';
      throw new Error(`Azure Document Intelligence failed: ${message}`);
    }

    const retryAfter = parseRetryAfter(statusResponse.headers.get('retry-after'));
    if (typeof retryAfter === 'number') {
      delayMs = retryAfter;
    } else {
      delayMs = Math.min(delayMs + 250, 3000);
    }
  }

  throw new Error('Azure Document Intelligence polling timed out.');
}

function parseAzureAnalyzeResult(analyzeResult: any): OcrResponse {
  const tables = Array.isArray(analyzeResult?.tables) ? analyzeResult.tables : [];
  for (const table of tables as AzureTable[]) {
    const rows = extractRowsFromAzureTable(table);
    if (rows.length > 0) {
      const blocks = createBlocksFromRows(rows);
      return {
        rows,
        blocks,
        confidence: { average: averageConfidence(rows) }
      };
    }
  }

  const content = typeof analyzeResult?.content === 'string' ? analyzeResult.content : '';
  const fallbackBlocks = content ? createBlocksFromContent(content) : [];
  const fallbackRows = parseOcrRows(fallbackBlocks);
  return {
    rows: fallbackRows,
    blocks: fallbackBlocks,
    confidence: { average: averageConfidence(fallbackRows) }
  };
}

function extractRowsFromAzureTable(table: AzureTable): OcrRow[] {
  const cells = Array.isArray(table.cells) ? table.cells : [];
  if (cells.length === 0) {
    return [];
  }

  const headerRowIndex = determineHeaderRowIndex(cells);
  const headerMap = new Map<number, string>();

  cells.forEach((cell) => {
    if (!Number.isInteger(cell.rowIndex) || !Number.isInteger(cell.columnIndex)) {
      return;
    }
    if (cell.rowIndex === headerRowIndex) {
      headerMap.set(cell.columnIndex, (cell.content ?? '').toString());
    }
  });

  const nameColumn = findColumnIndex(headerMap, ['partner name', 'name']);
  const hoursColumn = findColumnIndex(headerMap, ['total tippable hours', 'tippable hours', 'hours']);

  if (nameColumn === undefined || hoursColumn === undefined) {
    return [];
  }

  const rows = new Map<
    number,
    { name?: string; hours?: number; confidences: number[]; rawName?: string }
  >();

  cells.forEach((cell) => {
    if (!Number.isInteger(cell.rowIndex) || !Number.isInteger(cell.columnIndex)) {
      return;
    }
    if (cell.rowIndex <= headerRowIndex) {
      return;
    }

    const text = (cell.content ?? '').toString().trim();
    const confidence = clampConfidence(typeof cell.confidence === 'number' ? cell.confidence : 0);
    const record =
      rows.get(cell.rowIndex) ?? rows.set(cell.rowIndex, { confidences: [] }).get(cell.rowIndex)!;

    if (cell.columnIndex === nameColumn) {
      record.name = normalizeWhitespace(text);
      record.rawName = text;
      if (confidence > 0) {
        record.confidences.push(confidence);
      }
    } else if (cell.columnIndex === hoursColumn) {
      const numeric = parseHours(text);
      if (Number.isFinite(numeric)) {
        record.hours = numeric;
      }
      if (confidence > 0) {
        record.confidences.push(confidence);
      }
    }
  });

  const sortedRowIndexes = Array.from(rows.keys()).sort((a, b) => a - b);
  const result: OcrRow[] = [];

  sortedRowIndexes.forEach((rowIndex) => {
    const record = rows.get(rowIndex);
    if (!record) return;
    const name = record.name ?? '';
    const hours = record.hours;
    if (!name || !Number.isFinite(hours)) {
      return;
    }

    if (/total\s+tippable\s+hours/i.test(name) || /total\s+tippable\s+hours/i.test(record.rawName ?? '')) {
      return;
    }

    const confidence =
      record.confidences.length > 0
        ? record.confidences.reduce((sum, value) => sum + value, 0) / record.confidences.length
        : 0;

    result.push({
      name,
      hours,
      confidence
    });
  });

  return result;
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function averageConfidence(rows: OcrRow[]): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => sum + clampConfidence(row.confidence), 0);
  return total / rows.length;
}

function createBlocksFromRows(rows: OcrRow[]): OcrBlock[] {
  return rows.map((row) => ({
    text: `${row.name} ${row.hours.toFixed(2)}`,
    confidence: clampConfidence(row.confidence)
  }));
}

function createBlocksFromContent(content: string): OcrBlock[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text, confidence: 0.5 }));
}

function determineHeaderRowIndex(cells: AzureTableCell[]): number {
  const headerCells = cells.filter((cell) => cell.kind === 'columnHeader');
  if (headerCells.length > 0) {
    return Math.min(...headerCells.map((cell) => cell.rowIndex ?? 0));
  }
  return Math.min(...cells.map((cell) => cell.rowIndex ?? 0));
}

function findColumnIndex(headerMap: Map<number, string>, candidates: string[]): number | undefined {
  const normalizedEntries = Array.from(headerMap.entries()).map(([column, text]) => ({
    column,
    text: normalizeWhitespace(text).toLowerCase()
  }));

  for (const candidate of candidates) {
    const match = normalizedEntries.find((entry) => entry.text.includes(candidate));
    if (match) {
      return match.column;
    }
  }
  return undefined;
}

function parseHours(raw: string): number | undefined {
  const normalized = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 1000;
  }
  return undefined;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) return 'Unknown error';
    if (trimmed.length > 200) {
      return `${trimmed.slice(0, 200)}...`;
    }
    return trimmed;
  } catch (error) {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
