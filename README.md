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

Copy `.env.example` to `.env` and adjust as needed. `OCR_ENGINE=auto` will use Azure when credentials are
present and otherwise fall back to the bundled OCR microservice at `http://localhost:8000/ocr`. If you need
to point at a different self-hosted endpoint, export `OCR_SERVICE_URL` in your shell or deployment
environment.

### Using Azure Document Intelligence

If you prefer Azure Document Intelligence instead of the self-hosted service:

1. Set `OCR_ENGINE=azure` (or leave `auto` with valid credentials).
2. Provide `AZURE_DI_ENDPOINT` (for example `https://your-resource.cognitiveservices.azure.com/`).
3. Provide `AZURE_DI_KEY` with a valid key from your Azure resource.
4. Optionally set `AZURE_DI_MODEL_ID` (defaults to `prebuilt-layout`) and `AZURE_DI_API_VERSION`.

Azure keys grant full access to your resource. Keep them out of source control and avoid embedding them in
public builds; route requests through a trusted backend when possible.

### Build for GitHub Pages

```bash
npm run build
```

The build command emits a `dist/` directory with an SPA-friendly `404.html` fallback and Vite base path set
to `/` for GitHub Pages. The GitHub Actions workflow will automatically deploy on every push to `main`.

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

Once deployed, set `OCR_ENGINE=service` and export `OCR_SERVICE_URL` with the hosted URL (e.g.
`https://your-app.up.railway.app/ocr`).

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
