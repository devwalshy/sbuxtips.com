# TipJar – Tip Distribution Web App with Self-Hosted OCR

TipJar is a two-part solution for automatically distributing pooled tips based on partner hours extracted
from schedule images. The frontend is a Vite + React + Tailwind SPA that can be deployed to GitHub Pages,
while the backend is a FastAPI microservice powered by PaddleOCR that you can run anywhere Docker is
available.

## Features

- 🌙 **Spring-night dark UI** – Tailwind-powered layout with spring greens, blues, and pink accents.
- 🖼️ **OCR-driven hours import** – Upload a schedule image and extract partner names + hours with PaddleOCR.
- 💸 **Transparent tip distribution** – Automatic hourly rate calculation and partner payouts.
- 💵 **Bill denomination helper** – Break payouts into $20, $5, and $1 bills for quick cash-outs.
- 📊 **Confidence reporting** – Surface OCR confidence to help verify extracted data.
- 🚀 **Deploy anywhere** – Static frontend for GitHub Pages and Docker-ready OCR microservice.

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
└── ocr_service/      # FastAPI + PaddleOCR backend
    ├── main.py
    ├── Dockerfile
    └── requirements.txt
```

## Frontend Setup

```bash
npm install
npm run dev
```

The SPA expects an OCR endpoint URL in `VITE_OCR_SERVICE_URL`. Copy `.env.example` to `.env` and adjust as
needed. When deploying to GitHub Pages, remember to update the environment variable to your hosted OCR
service URL.

### Build for GitHub Pages

```bash
npm run build
```

The build command emits a `dist/` directory with an SPA-friendly `404.html` fallback and Vite base path set
to `/tipjar/` for GitHub Pages. Push the `dist/` directory to the `gh-pages` branch or use an action of your
choice.

## OCR Microservice

The FastAPI app lives in `ocr_service/main.py` and exposes:

- `GET /healthz` – basic health check returning `{ "status": "ok" }`.
- `POST /ocr` – accepts a multipart image upload and returns OCR results.

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

### Run Locally with Docker

```bash
cd ocr_service
docker build -t tipjar-ocr .
docker run -it --rm -p 8000:8000 tipjar-ocr
```

### Railway or Render Deployment

1. Create a new **Docker** deployment.
2. Connect this repository or upload the contents of `ocr_service/`.
3. Ensure the service exposes port `8000`.
4. Deploy – both providers automatically build using the provided Dockerfile.

Once deployed, set the frontend `VITE_OCR_SERVICE_URL` to the hosted URL (e.g. `https://your-app.up.railway.app/ocr`).

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
