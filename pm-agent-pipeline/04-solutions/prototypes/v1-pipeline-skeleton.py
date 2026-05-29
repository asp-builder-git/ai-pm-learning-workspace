#!/usr/bin/env python3
"""
vocabreel v1 — Content Generation Pipeline
============================================
Prototype skeleton for the minimal automation build.

Usage:
    python3 vocabreel.py generate --count 10 --words "Moien, Äddi, Gromper"
    python3 vocabreel.py generate --from-vocab 5  # pick N random from VOCAB.md
    python3 vocabreel.py generate --from-lod high-frequency-100

Dependencies (v1):
    - requests (LOD.lu API, GIPHY API)
    - Pillow (image overlay compositing)
    - openai / httpx (LLM call via OpenClaw or direct API)
    - python-dotenv (API keys)
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────

@dataclass
class Config:
    lod_api_base: str = "https://lod.lu/api"
    giphy_api_key: str = os.getenv("GIPHY_API_KEY", "")
    output_dir: Path = Path("./generated_content")
    llm_model: str = "deepseek/deepseek-v4-flash"  # via OpenClaw
    default_lang_pair: tuple = ("en", "lb")


config = Config()


# ─────────────────────────────────────────
# Step 1: Vocabulary Source
# ─────────────────────────────────────────

class VocabularySource:
    """Fetches word data from LOD.lu API."""

    def search(self, word: str, lang: str = "lb") -> dict:
        """Search LOD for a word, return structured data."""
        # GET /api/en/search?query={word}&lang=lb
        # Returns LOD IDs for matching entries
        pass  # Implement in v1

    def get_entry(self, lod_id: str) -> dict:
        """Get full entry: IPA, translations, examples, audio URL."""
        # GET /api/lb/entry/{lod_id}
        pass

    def random(self, count: int = 10) -> list[dict]:
        """Pick random words (or from a frequency list)."""
        pass


# ─────────────────────────────────────────
# Step 2: Sentence Generation
# ─────────────────────────────────────────

class SentenceGenerator:
    """Uses LLM to create simple, natural sentences for each word."""

    def generate(self, word: str, translation: str, language: str = "lb") -> dict:
        """Returns dict with lb_sentence, en_translation, and word_position."""
        prompt = f"""
        Create a simple, natural Luxembourgish sentence using the word "{word}".
        - The sentence should be easy for an A1-A2 learner to understand.
        - The word "{word}" should appear once in a natural position.
        - Provide the English translation.
        
        Return as JSON:
        {{"lb": "...", "en": "...", "word_position": "start|middle|end"}}
        """
        # Call LLM via OpenClaw or direct API
        pass

    def generate_batch(self, words: list[dict]) -> list[dict]:
        """Generate sentences for multiple words."""
        return [self.generate(w["word"], w.get("en", "")) for w in words]


# ─────────────────────────────────────────
# Step 3: Media Sourcing
# ─────────────────────────────────────────

class MediaFinder:
    """Searches GIPHY/Tenor for trending, relevant GIFs."""

    def search_gif(self, query: str, trending_bias: float = 0.5) -> Optional[str]:
        """
        Search for a GIF related to the word/sentence.
        trending_bias: 0 = most relevant, 1 = most trending.
        Returns URL of best GIF found.
        """
        # GET https://api.giphy.com/v1/gifs/search?api_key={key}&q={query}&limit=5
        # Or use trending endpoint + filter by relevance
        pass

    def search_by_word(self, word: str, sentence: str) -> Optional[str]:
        """Combine word and sentence context for better GIF match."""
        # Try: word itself, then sentence theme, then fallback to trending
        pass


# ─────────────────────────────────────────
# Step 4: Overlay Composition
# ─────────────────────────────────────────

class OverlayComposer:
    """Composes GIF/image + text overlay using Pillow."""

    def compose(
        self,
        gif_url: str,
        word_lb: str,
        word_en: str,
        ipa: str = "",
        sentence_lb: str = "",
        sentence_en: str = "",
    ) -> Path:
        """
        Creates a composed image:
        ┌─────────────────────────┐
        │                         │
        │      [GIF/IMAGE]        │
        │                         │
        │    Moien [IPA]          │
        │    (Hello / Good day)   │
        │                         │
        │    "Moien, wéi geet et?"│
        │    "Hello, how are you?"│
        │                         │
        │  @vocabreel              │
        └─────────────────────────┘
        
        Returns path to output image.
        """
        # Use Pillow to:
        #   - Download GIF (or first frame for static)
        #   - Add semi-transparent overlay bar
        #   - Render text with proper font
        #   - Save output
        pass


# ─────────────────────────────────────────
# Step 5: Generation Pipeline
# ─────────────────────────────────────────

class ContentPipeline:
    """Orchestrates the full pipeline from vocabulary to output."""

    def __init__(self):
        self.vocab = VocabularySource()
        self.sentences = SentenceGenerator()
        self.media = MediaFinder()
        self.overlay = OverlayComposer()

    def generate_one(self, word: str) -> Path:
        """Generate one content piece for a single word."""
        # 1. Look up word data
        entry = self.vocab.search(word)
        if not entry:
            print(f"Warning: '{word}' not found in LOD")
            return None

        # 2. Generate sentence
        sentence = self.sentences.generate(word, entry.get("en", ""))

        # 3. Find GIF
        gif_url = self.media.search_by_word(word, sentence["lb"])

        # 4. Compose overlay
        output = self.overlay.compose(
            gif_url=gif_url,
            word_lb=word,
            word_en=entry.get("en", ""),
            ipa=entry.get("ipa", ""),
            sentence_lb=sentence["lb"],
            sentence_en=sentence["en"],
        )

        return output

    def generate_batch(self, words: list[str]) -> list[Path]:
        """Generate content pieces for multiple words."""
        return [self.generate_one(w) for w in words]


# ─────────────────────────────────────────
# CLI
# ─────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Vocabreel content generator")
    sub = parser.add_subparsers(dest="command")

    # generate command
    gen = sub.add_parser("generate", help="Generate content pieces")
    gen.add_argument("--count", type=int, default=5, help="Number of pieces")
    gen.add_argument("--words", type=str, help="Comma-separated word list")
    gen.add_argument("--from-vocab", type=int, help="N words from VOCAB.md")

    args = parser.parse_args()

    if args.command == "generate":
        pipeline = ContentPipeline()

        if args.words:
            word_list = [w.strip() for w in args.words.split(",")]
        elif args.from_vocab:
            # Read from luxembourgish-vocab/VOCAB.md
            word_list = ["Moien", "Äddi", "Gromper", "Schéin", "Waasser"]  # placeholder
        else:
            # Default selection
            word_list = ["Moien", "Äddi", "Gromper", "Schéin", "Waasser"]

        # Truncate to count
        word_list = word_list[:args.count]

        print(f"Generating {len(word_list)} content pieces...")
        outputs = pipeline.generate_batch(word_list)

        print(f"\nDone! Output at: {config.output_dir}")
        for path in filter(None, outputs):
            print(f"  ✅ {path}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
