from __future__ import annotations

import io
import re
import statistics
from dataclasses import asdict, dataclass
from typing import Any, Dict, List

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from PIL import Image


@dataclass
class OcrBlock:
  text: str
  confidence: float


@dataclass
class OcrRow:
  name: str
  hours: float
  confidence: float


def create_app() -> FastAPI:
  app = FastAPI(title='TipJar OCR Service', version='0.1.0')
  app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
  )

  ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

  @app.get('/healthz')
  async def healthz() -> Dict[str, str]:
    return {'status': 'ok'}

  @app.post('/ocr')
  async def ocr(file: UploadFile = File(...)) -> Dict[str, Any]:
    content = await file.read()
    if not content:
      raise HTTPException(status_code=400, detail='Empty file upload')

    try:
      image = Image.open(io.BytesIO(content)).convert('RGB')
    except Exception as exc:  # pragma: no cover - defensive
      raise HTTPException(status_code=400, detail='Invalid image upload') from exc

    image_array = np.array(image)
    raw_result = ocr_engine.ocr(image_array, cls=True)

    blocks: List[OcrBlock] = []
    rows: List[OcrRow] = []
    confidences: List[float] = []
    row_pattern = re.compile(r"([A-Za-z][\w\s\-']*?)\s+(\d+(?:[.,]\d+)?)")

    for page in raw_result:
      for box, (text, confidence) in page:
        cleaned_text = text.strip()
        if not cleaned_text:
          continue
        confidences.append(confidence)
        blocks.append(OcrBlock(text=cleaned_text, confidence=float(confidence)))

        match = row_pattern.search(cleaned_text)
        if match:
          name, hours_raw = match.groups()
          hours = float(hours_raw.replace(',', '.'))
          rows.append(OcrRow(name=name.strip(), hours=hours, confidence=float(confidence)))

    average_confidence = statistics.mean(confidences) if confidences else 0.0

    payload = {
      'blocks': [asdict(block) for block in blocks],
      'rows': [asdict(row) for row in rows],
      'confidence': {'average': average_confidence},
    }

    return payload

  return app


app = create_app()
