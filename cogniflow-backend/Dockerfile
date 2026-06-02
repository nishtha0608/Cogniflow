FROM python:3.12-slim

WORKDIR /app

# gcc is needed to compile some wheels (python-jose, bcrypt, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download tiktoken encoding so the container works fully offline at runtime
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')" || true

COPY . .

# Runtime directories (overridden by compose volume mounts)
RUN mkdir -p /app/uploads /app/data /app/chroma

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
