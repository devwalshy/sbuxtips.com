# TipJar – Tip Distribution Web App for GitHub Pages

TipJar is a GitHub Pages–ready Vite + React + Tailwind single-page application that helps teams distribute
pooled tips based on partner hours. Upload a schedule image, review the OCR results, and instantly view
transparent payouts with bill breakdowns – all from a static site.

## Features

- 🌙 **Spring-night dark UI** – Tailwind-powered layout with spring greens, blues, and pink accents.
- 🖼️ **OCR-driven hours import** – Upload a schedule image and extract partner names + hours with PaddleOCR.
- 💸 **Transparent tip distribution** – Automatic hourly rate calculation and partner payouts.
- 💵 **Bill denomination helper** – Break payouts into $20, $5, and $1 bills for quick cash-outs.
- 📊 **Confidence reporting** – Surface OCR confidence to help verify extracted data.
- 🚀 **Deploy to GitHub Pages** – Everything you need to host the SPA from a GitHub repository.

## Repository Structure

```
.
├── index.html
├── package.json
├── src/              # React + Tailwind frontend
│   ├── App.tsx
│   ├── components/
│   ├── lib/
│   └── style.css
```

## Frontend Setup

```bash
npm install
npm run dev
```

The SPA expects an OCR endpoint URL in `VITE_OCR_SERVICE_URL`. Copy `.env.example` to `.env` and adjust as
needed. When deploying to GitHub Pages, point this value at any publicly reachable OCR service you control
or trust.

### Build for GitHub Pages

```bash
npm run build
```

The build command emits a `dist/` directory with an SPA-friendly `404.html` fallback. Push the `dist/`
directory to the `gh-pages` branch or use a GitHub Action of your choice.

> **Note:** GitHub Pages serves the site from the repository root, so the Vite base path is configured as `/`.

## OCR Endpoint

TipJar expects an OCR API that follows the shape documented below. You can deploy any compatible service –
for example, a PaddleOCR FastAPI wrapper – and host it separately from GitHub Pages. Point
`VITE_OCR_SERVICE_URL` at the `/ocr` endpoint of that service.

Example response:

```json
{
  "blocks": [
    { "text": "Alex 6", "confidence": 0.93 }
  ],
  "rows": [
    { "name": "Alex", "hours": 6, "confidence": 0.93 }
  ],
  "confidence": { "average": 0.93 }
}
```

## Tip Calculation Details

The frontend computes totals using:

```
hourlyRate = totalTips / totalHours
payout = partnerHours * hourlyRate
```

Payouts are rounded to the nearest dollar before generating bill denominations:

- $20 bills – maximize first
- $5 bills – remaining whole dollars
- $1 bills – final residue

## UI Theme

- **Canvas:** `#082f37`
- **Surface:** `#052127`
- **Primary:** `#3fdd78`
- **Secondary:** `#41c5f5`
- **Accent:** `#ff8cc6`
- **Font:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)

Layouts adjust from a three-column desktop to a single-column mobile stack. Interactive elements include
focus outlines and hover states for accessibility.

## Testing Checklist

- ✅ Upload PNG/JPG/GIF schedules.
- ✅ Verify OCR confidence and parsed partner list.
- ✅ Adjust total tips and recalculate partner payouts.
- ✅ Confirm bill breakdown matches rounded payout values.
- ✅ Ensure CORS allows GitHub Pages origin.
- ✅ Validate loading states and error messaging for failed OCR calls.

## Attribution

Created by TipJar. Please keep attribution intact in the UI footer.
