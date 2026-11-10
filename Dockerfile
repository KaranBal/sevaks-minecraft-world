FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    GOOGLE_CLOUD_LOCATION=us-central1 \
    GOOGLE_GENAI_USE_VERTEXAI=1 \
    GEMINI_MODEL=gemini-2.5-flash

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY index.html styles.css audio.js textures.js structures.js entities.js world.js main.js ./

EXPOSE 8080

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
