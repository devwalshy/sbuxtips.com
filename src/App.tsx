import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  OcrRow,
  PartnerPayout,
  callOcrService,
  calculatePartnerPayouts,
  calculateSummary,
  formatCurrency,
  sanitizeRows
} from './lib/tipjar';
import { SummaryCard } from './components/SummaryCard';
import { PartnerCard } from './components/PartnerCard';

const DEFAULT_TIPS = 500;

function useOcrEndpoint() {
  const env = import.meta.env as Record<string, unknown>;
  const raw = typeof env.OCR_SERVICE_URL === 'string' ? env.OCR_SERVICE_URL.trim() : '';
  return raw || 'http://localhost:8000/ocr';
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('No file selected');
  const [tipDraft, setTipDraft] = useState<string>(DEFAULT_TIPS.toString());
  const [totalTips, setTotalTips] = useState<number>(DEFAULT_TIPS);
  const [rows, setRows] = useState<OcrRow[]>([]);
  const [partners, setPartners] = useState<PartnerPayout[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);

  const ocrEndpoint = useOcrEndpoint();

  const sanitizedRows = useMemo(() => sanitizeRows(rows), [rows]);

  const summary = useMemo(() => calculateSummary(sanitizedRows, totalTips), [sanitizedRows, totalTips]);

  useEffect(() => {
    setPartners(calculatePartnerPayouts(sanitizedRows, totalTips));
  }, [sanitizedRows, totalTips]);

  const handleFileButton = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError('');

    try {
      const response = await callOcrService(file, ocrEndpoint);
      setConfidence(response.confidence?.average ?? 0);
      setRows(response.rows ?? []);
    } catch (err) {
      console.error(err);
      setError('We could not extract hours from that image. Please try again or enter them manually.');
      setRows([]);
      setConfidence(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    const parsed = Number.parseFloat(tipDraft.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed)) {
      setTotalTips(parsed);
    } else {
      setTotalTips(0);
    }
  };

  const hasRows = sanitizedRows.length > 0;

  return (
    <div className="min-h-screen bg-canvas/90 pb-12">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-2">
          <span className="text-sm uppercase tracking-[0.3em] text-secondary">TipJar</span>
          <h1 className="text-4xl font-semibold text-text">Tip distribution assistant</h1>
          <p className="max-w-2xl text-base text-text-muted">
            Upload a partner schedule, extract hours with PaddleOCR, and distribute tips with
            transparent bill breakdowns.
          </p>
        </header>

        <div className="grid flex-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          <aside className="flex flex-col gap-6 rounded-3xl border border-outline/60 bg-surface/80 p-6 shadow-elevation">
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-text">Upload hours</h2>
              <p className="text-sm text-text-muted">
                Select an image of the partner schedule. We will use OCR to pull names and hours for each
                partner.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={handleFileButton}
                className="inline-flex items-center justify-center rounded-2xl border border-outline bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {loading ? 'Processing…' : 'Upload schedule'}
              </button>
              <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-text">
                <p className="font-semibold">{fileName}</p>
                {loading ? (
                  <p className="text-text-muted">Extracting partner hours…</p>
                ) : (
                  <p className="text-text-muted">
                    {hasRows
                      ? `Found ${sanitizedRows.length} partners (avg confidence ${(confidence * 100).toFixed(0)}%)`
                      : 'Waiting for an upload'}
                  </p>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-text">Tip pool</h2>
              <label className="text-sm font-medium text-text-muted" htmlFor="tip-input">
                Total tips collected
              </label>
              <input
                id="tip-input"
                value={tipDraft}
                onChange={(event) => setTipDraft(event.target.value)}
                className="rounded-2xl border border-outline/70 bg-transparent px-4 py-3 text-base text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="500"
              />
              <button
                onClick={handleCalculate}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-canvas transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Calculate distribution
              </button>
              {error && <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>}
            </section>

            <footer className="mt-auto space-y-2 text-xs text-text-muted">
              <p>PaddleOCR microservice ready for Railway, Render, or Docker deployment.</p>
              <p>Designed with a spring night palette by TipJar.</p>
            </footer>
          </aside>

          <main className="flex flex-col gap-6 rounded-3xl border border-outline/60 bg-surface/80 p-6 shadow-elevation">
            <section className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Total hours"
                value={summary.totalHours.toFixed(2)}
                icon={<span className="text-2xl">⏱️</span>}
              />
              <SummaryCard
                label="Hourly rate"
                value={formatCurrency(summary.hourlyRate)}
                icon={<span className="text-2xl">💵</span>}
              />
              <SummaryCard
                label="Total distributed"
                value={formatCurrency(summary.totalDistributed)}
                icon={<span className="text-2xl">🎉</span>}
              />
            </section>

            <section className="rounded-3xl border border-outline/50 bg-muted/50 p-6">
              <h2 className="text-lg font-semibold text-text">How we calculate</h2>
              <div className="mt-4 space-y-3 text-sm text-text-muted">
                <p>
                  We divide the total tips by the number of partner hours to compute an hourly rate, then
                  multiply each partner&apos;s hours by that rate.
                </p>
                <div className="rounded-2xl border border-outline/40 bg-surface/70 p-4 text-text">
                  <p className="font-semibold">Formula</p>
                  <p className="text-sm text-text-muted">
                    hourlyRate = totalTips ÷ totalHours
                    <br />
                    payout = partnerHours × hourlyRate
                  </p>
                </div>
                <p>
                  To make cashing out easy, we provide a bill breakdown for $20s, $5s, and $1s. Amounts are
                  rounded to the nearest dollar before bill distribution.
                </p>
              </div>
            </section>
          </main>

          <aside className="flex max-h-[80vh] flex-col gap-4 overflow-hidden rounded-3xl border border-outline/60 bg-surface/80 p-6 shadow-elevation">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">Partner payouts</h2>
              <span className="text-xs uppercase tracking-widest text-secondary">{partners.length} partners</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              {partners.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-text-muted">
                  <span className="text-4xl">🌱</span>
                  <p className="mt-4 text-sm">
                    Upload a schedule and calculate the distribution to see partner payouts.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-6">
                  {partners.map((partner, index) => (
                    <PartnerCard key={partner.name} partner={partner} index={index} />
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
