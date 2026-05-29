# MoneyPrinterTurbo — External Tool Candidate

**Source:** https://github.com/harry0703/MoneyPrinterTurbo  
**Date evaluated:** 2026-05-29

## What is it

Given a topic or keyword, MoneyPrinterTurbo automatically generates:
- Video script / copy (via LLM)
- Video materials (royalty-free stock clips or local files)
- Subtitles (edge or whisper)
- TTS voiceover (multiple providers)
- Background music (random or specified)
- Final high-definition short video (MP4)

Think: you type "Luxembourgish word: gefalen" → it outputs a finished reel video.

## How it fits the vocabreel project

| Our need | MoneyPrinterTurbo capability |
|---|---|
| Portrait short reels (9:16, 1080×1920) | ✅ Native support |
| Batch generation of multiple reels | ✅ Built-in batch mode |
| TTS voiceover (Luxembourgish pronunciation) | ✅ Multiple TTS providers — needs to be tested if Lux audio works |
| Subtitles on video | ✅ Adjustable font, position, color, size, outlining |
| Background music | ✅ Random or specified, adjustable volume |
| AI-generated script | ✅ Integrates OpenAI, DeepSeek, Gemini, Ollama, etc. |
| GPU not required | ✅ CPU-only works (slower whisper without GPU) |
| API + Web UI | ✅ Both available |

## Quick comparison to custom pipeline approach

| Aspect | Custom v1 pipeline (prototype) | MoneyPrinterTurbo |
|---|---|---|
| Output | Static HTML with audio button | Actual MP4 video |
| Visuals | Text-only scenes | Auto-pulled HD stock video clips + text overlays |
| Audio | Single LOD audio pronunciation link | TTS voiceover + background music |
| Setup effort | Build from scratch | Deploy + configure API keys |
| Maintenance | Ongoing | Upstream open-source maintenance |
| Customisation | Full control | Config-driven |
| Language support | Must build Lux TTS ourselves | Uses existing TTS providers |

## Requirements

- **OS:** Windows 10+, macOS 11+, Linux
- **CPU:** 4+ cores recommended
- **RAM:** 4 GB min, 8 GB+ recommended
- **GPU:** Not required (without whisper)
- **Dependencies:** ffmpeg, ImageMagick, Python 3.11

## Quickstart (on this machine)

```bash
git clone https://github.com/harry0703/MoneyPrinterTurbo.git
cd MoneyPrinterTurbo
cp config.example.toml config.toml
# Edit config.toml → set pexels_api_keys, llm_provider (DeepSeek?), api keys
uv sync --frozen
uv run streamlit run ./webui/Main.py --browser.gatherUsageStats=False
```

Then open http://0.0.0.0:8501

## LLM Integration Options

OpenAI, Moonshot, Azure, gpt4free, one-api, Qwen, Google Gemini, Ollama, DeepSeek, MiniMax, ERNIE, Pollinations, ModelScope, etc.

Our DeepSeek key should work — just configure it as the LLM provider.

## Free alternative (no deploy)

The [RecCloud](https://reccloud.com) service is built on top of MoneyPrinterTurbo — can try without local setup.

## Next steps to evaluate

1. Clone and configure on this machine
2. Test with a Luxembourgish word → check output quality
3. Test if available TTS voices can pronounce Luxembourgish (likely need Azure voices or ElevenLabs integration)
4. Decide: use MoneyPrinterTurbo as replacement for `03_script.py` + `04_render.py`, or keep as standalone parallel pipeline

## See also

- `options.md` — compares this against the custom pipeline approach
- `prototypes/v1-pipeline-skeleton.py` — our custom pipeline prototype
