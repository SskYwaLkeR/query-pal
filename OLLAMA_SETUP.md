# Ollama Setup Guide for QueryPal

Run QueryPal completely free using Ollama for local LLM inference.

## Requirements

- **RAM**: 24GB recommended (14B model uses ~10GB, leaves room for OS + app)
- **Disk**: ~10GB for the model weights
- **OS**: macOS, Linux, or Windows

## Step 1: Install Ollama

### macOS

```bash
brew install ollama
```

Or download from [ollama.com](https://ollama.com).

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows

Download the installer from [ollama.com](https://ollama.com).

## Step 2: Pull the Model

```bash
ollama pull qwen2.5-coder:14b
```

This downloads ~9GB. It takes a few minutes depending on your connection.

### Why qwen2.5-coder:14b?

| Model | Size | SQL Quality | JSON Reliability | Speed |
|---|---|---|---|---|
| **qwen2.5-coder:14b** | ~9GB | Excellent | Excellent | ~5-10s/query |
| qwen2.5-coder:7b | ~4.5GB | Good | Good | ~2-5s/query |
| llama3.1:8b | ~4.7GB | Decent | Fair | ~2-5s/query |
| codellama:13b | ~7GB | Good | Poor | ~5-8s/query |

**qwen2.5-coder:14b** is the best fit because:
- Specifically trained on code tasks — generates clean SQLite syntax
- Reliably follows the strict JSON response format the app requires
- 14B parameters is the sweet spot: fits in 24GB RAM with plenty of headroom
- Qwen 2.5 series has strong instruction-following capabilities

If you want faster responses and are OK with slightly less accurate SQL, use `qwen2.5-coder:7b`.

## Step 3: Start Ollama

```bash
ollama serve
```

This starts the Ollama server on `http://localhost:11434`. Keep this terminal open.

You can verify it's running:

```bash
curl http://localhost:11434/api/tags
```

## Step 4: Configure QueryPal

Edit `.env.local`:

```env
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5-coder:14b
```

That's it. Start the app:

```bash
npm run dev
```

## Troubleshooting

### "Ollama request failed (404)"

The model isn't pulled yet:

```bash
ollama pull qwen2.5-coder:14b
```

### "Ollama request failed" / Connection refused

Ollama server isn't running:

```bash
ollama serve
```

### Slow responses (>15s per query)

The 14B model needs GPU acceleration to be fast. If you're running on CPU only:

1. **Try the 7B model** — faster on CPU:
   ```env
   OLLAMA_MODEL=qwen2.5-coder:7b
   ```

2. **Check GPU offloading** — Ollama auto-detects GPU. Verify with:
   ```bash
   ollama ps
   ```
   The `PROCESSOR` column should show `gpu` (not `cpu`).

3. **On Mac** — Apple Silicon (M1/M2/M3/M4) uses Metal GPU acceleration automatically. Intel Macs run on CPU only — use the 7B model.

### Responses aren't valid JSON

Some smaller models struggle with strict JSON output. If you see parse errors:

1. **Upgrade to 14B** — it's much more reliable at structured output
2. The app handles this gracefully — if JSON parsing fails, it treats the response as a plain text explanation

### Custom Ollama host

If Ollama runs on a different machine or port:

```env
OLLAMA_HOST=http://192.168.1.100:11434
```

## RAM Usage Guide

| Model | RAM Used | 24GB Machine | 16GB Machine |
|---|---|---|---|
| qwen2.5-coder:14b | ~10GB | Works well | Tight, may swap |
| qwen2.5-coder:7b | ~5GB | Plenty of room | Works well |
| qwen2.5-coder:3b | ~2.5GB | Overkill | Works well |

Ollama automatically manages model loading/unloading. If you run other apps alongside, the 7B model is safer on 24GB.
