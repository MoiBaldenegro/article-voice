"""Genera el audio de la demo de la landing con MOSS-TTS-Nano (runtime oficial en CPU).

Un archivo OGG/Opus mono por frase + manifest.json con las duraciones. Se ejecuta a mano y el
resultado se commitea (docs/04-diseno/ui/landing/audio). Las frases salen de SENTENCES: deben
coincidir, en orden, con los <span class="s"> de landing.html (lo comprueba la prueba de Playwright).

Uso (con el venv del spike, que tiene numpy, onnxruntime, sentencepiece y soundfile):
  spikes/t000-moss-browser/.venv/Scripts/python.exe -X utf8 scripts/generate-landing-audio.py \
      --models spikes/t000-moss-browser/models/native
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
REF_DIR = ROOT / "spikes/t000-moss-browser/models/ref-runtime"
OUT_DIR = ROOT / "docs/04-diseno/ui/landing/audio"
VOICE = "Nathan"  # voz incluida, ver README de la landing
BITRATE_NOTE = "OGG/Opus mono 48 kHz"

# (texto de la página, texto que se locuta). Se locuta con las cifras escritas para que no se lean mal.
SENTENCES = [
    ("Durante años, escuchar un artículo dependía de servicios de pago en la nube.",) * 2,
    ("Cada palabra costaba dinero y el texto viajaba a un servidor ajeno.",) * 2,
    (
        "Hoy un modelo de cien millones de parámetros genera la voz en el propio navegador, a 48 kHz y en estéreo.",
        "Hoy un modelo de cien millones de parámetros genera la voz en el propio navegador, a cuarenta y ocho kilohercios y en estéreo.",
    ),
    (
        "Lo hace por fragmentos de 80 milisegundos, así que empieza a sonar antes de terminar la primera frase.",
        "Lo hace por fragmentos de ochenta milisegundos, así que empieza a sonar antes de terminar la primera frase.",
    ),
    (
        "El 3,5 % de los lectores lo prueba la primera semana.",
        "El tres coma cinco por ciento de los lectores lo prueba la primera semana.",
    ),
    ("Los demás simplemente siguen leyendo, como siempre.",) * 2,
]


def prepare_text(text: str) -> str:
    text = " ".join(text.replace("\r", " ").replace("\n", " ").split())
    if text[:1].islower():
        text = text[:1].upper() + text[1:]
    if text[-1].isalnum():
        text += "."
    if len(text.split()) < 5:
        text = f"        {text}"
    return text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()

    sys.path.insert(0, str(REF_DIR))
    import sentencepiece as spm
    from ort_cpu_runtime import OrtCpuRuntime

    tts_dir = Path(args.models) / "MOSS-TTS-Nano-100M-ONNX"
    runtime = OrtCpuRuntime(model_dir=tts_dir, thread_count=args.threads, sample_mode="fixed")
    sp = spm.SentencePieceProcessor(model_file=str(tts_dir / "tokenizer.model"))
    rate = int(runtime.codec_meta["codec_config"]["sample_rate"])
    voice = next(v for v in runtime.list_builtin_voices() if v["voice"] == VOICE)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("s*.ogg"):
        old.unlink()
    items = []
    for i, (page_text, spoken) in enumerate(SENTENCES):
        ids = [int(t) for t in sp.encode(prepare_text(spoken), out_type=int)]
        rows = runtime.build_voice_clone_request_rows(voice["prompt_audio_codes"], ids)
        frames = runtime.generate_audio_frames(rows)
        channels, length = runtime.decode_full_audio(frames)
        mono = np.clip(np.mean(np.stack(channels, axis=1), axis=1), -1.0, 1.0)
        # recorta silencio final largo para que las pausas entre frases sean naturales
        loud = np.nonzero(np.abs(mono) > 0.01)[0]
        if len(loud):
            mono = mono[: min(len(mono), loud[-1] + int(0.15 * rate))]
        name = f"s{i + 1:02d}.ogg"
        sf.write(OUT_DIR / name, mono.astype("float32"), rate, format="OGG", subtype="OPUS")
        info = sf.info(OUT_DIR / name)
        items.append({"file": name, "text": page_text, "duration": round(info.duration, 3)})
        print(name, round(info.duration, 2), "s", (OUT_DIR / name).stat().st_size, "bytes")

    manifest = {"engine": "MOSS-TTS-Nano-100M-ONNX", "voice": VOICE, "format": BITRATE_NOTE, "sentences": items}
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(p.stat().st_size for p in OUT_DIR.glob("s*.ogg"))
    print("total", total, "bytes")


if __name__ == "__main__":
    main()
