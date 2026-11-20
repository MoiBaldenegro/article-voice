"""Spike T-000 · referencia en Python.

Ejecuta el runtime oficial de MOSS-TTS-Nano (ort_cpu_runtime.py, Apache-2.0, descargado aparte)
sobre unas frases fijas, mide tiempos y guarda datos dorados para comparar el port a TypeScript:
ids del tokenizador, números aleatorios consumidos y frames generados.

Uso:
  python reference.py --ref-dir <carpeta con ort_cpu_runtime.py> --models <carpeta de pesos> --out <carpeta golden>
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import wave
from pathlib import Path

import numpy as np

PHRASES = [
    {"id": "es_corta", "voice": "Nathan", "text": "La lectura en voz alta hace que un artículo llegue a más personas."},
    {"id": "en_corta", "voice": "Nathan", "text": "Reading an article aloud helps it reach more people."},
    {
        "id": "es_larga",
        "voice": "Nathan",
        "text": (
            "Durante años, escuchar un artículo dependía de servicios de pago en la nube. "
            "Hoy, un modelo pequeño puede generar la voz directamente en el navegador, "
            "sin enviar el texto a ningún servidor."
        ),
    },
]


class RecordingRng:
    """Envuelve el generador de numpy y registra cada número que consume el runtime."""

    def __init__(self, seed: int) -> None:
        self._rng = np.random.default_rng(seed)
        self.draws: list[float] = []

    def random(self) -> float:
        value = float(self._rng.random())
        self.draws.append(value)
        return value


def prepare_text(text: str) -> str:
    # Misma preparación que _prepare_text_for_sentence_chunking (onnx_tts_runtime.py) para texto latino.
    text = " ".join(text.replace("\r", " ").replace("\n", " ").split())
    if text[:1].islower():
        text = text[:1].upper() + text[1:]
    if text[-1].isalnum():
        text += "."
    if len(text.split()) < 5:
        text = f"        {text}"
    return text


def write_wav(path: Path, channels: list[np.ndarray], sample_rate: int) -> None:
    interleaved = np.stack(channels, axis=1).reshape(-1)
    pcm = (np.clip(interleaved, -1.0, 1.0) * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(len(channels))
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ref-dir", required=True)
    parser.add_argument("--models", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()

    sys.path.insert(0, args.ref_dir)
    import sentencepiece as spm
    from ort_cpu_runtime import OrtCpuRuntime

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    tts_dir = Path(args.models) / "MOSS-TTS-Nano-100M-ONNX"

    t0 = time.perf_counter()
    runtime = OrtCpuRuntime(model_dir=tts_dir, thread_count=args.threads, sample_mode="fixed")
    load_s = time.perf_counter() - t0
    sp = spm.SentencePieceProcessor(model_file=str(tts_dir / "tokenizer.model"))
    sample_rate = int(runtime.codec_meta["codec_config"]["sample_rate"])
    downsample = int(runtime.codec_meta["codec_config"]["downsample_rate"])

    t0 = time.perf_counter()
    runtime.warmup()
    warmup_s = time.perf_counter() - t0

    results = []
    for phrase in PHRASES:
        rng = RecordingRng(seed=1234)
        runtime.rng = rng
        prepared = prepare_text(phrase["text"])
        token_ids = [int(t) for t in sp.encode(prepared, out_type=int)]
        voice = next(v for v in runtime.list_builtin_voices() if v["voice"] == phrase["voice"])
        rows = runtime.build_voice_clone_request_rows(voice["prompt_audio_codes"], token_ids)

        frame_times: list[float] = []
        last = [time.perf_counter()]

        def on_frame(_frames, _step, _frame):
            now = time.perf_counter()
            frame_times.append(now - last[0])
            last[0] = now

        t_start = time.perf_counter()
        frames = runtime.generate_audio_frames(rows, on_frame=on_frame)
        gen_s = time.perf_counter() - t_start
        t_dec = time.perf_counter()
        channels, audio_len = runtime.decode_full_audio(frames)
        decode_s = time.perf_counter() - t_dec
        audio_s = audio_len / sample_rate
        write_wav(out_dir / f"{phrase['id']}.wav", channels, sample_rate)

        result = {
            "id": phrase["id"],
            "voice": phrase["voice"],
            "prepared_text": prepared,
            "token_ids": token_ids,
            "random_draws": rng.draws,
            "frames": frames,
            "audio_samples": audio_len,
            "timing": {
                "first_frame_ms": round(frame_times[0] * 1000, 1) if frame_times else None,
                "frame_ms_median": round(float(np.median(frame_times[1:])) * 1000, 1) if len(frame_times) > 1 else None,
                "frame_ms_p95": round(float(np.percentile(frame_times[1:], 95)) * 1000, 1) if len(frame_times) > 1 else None,
                "generate_s": round(gen_s, 3),
                "decode_full_s": round(decode_s, 3),
                "audio_s": round(audio_s, 3),
                "rtf": round((gen_s + decode_s) / audio_s, 3) if audio_s else None,
            },
        }
        results.append(result)
        print(json.dumps({"id": result["id"], "frames": len(frames), "tokens": len(token_ids), **result["timing"]}))

    tokenizer_corpus = [
        "Hola, ¿qué tal? El 3,5 % de 1.200 personas leyó el artículo.",
        "Ünïcödé — “comillas” y ‘apóstrofos’; ½ ﬁ ① ＡＢＣ",
        "The quick brown fox jumps over the lazy dog. Dr. Smith paid $4.50 on 2026-11-20.",
        "  espacios   múltiples\ty\ttabulaciones  ",
        "emoji 🙂 y símbolos ™ © ® ° ±",
        "",
    ]
    golden = {
        "meta": {
            "onnxruntime": __import__("onnxruntime").__version__,
            "threads": args.threads,
            "sample_rate": sample_rate,
            "downsample_rate": downsample,
            "load_s": round(load_s, 3),
            "warmup_s": round(warmup_s, 3),
        },
        "tokenizer": [{"text": t, "ids": [int(i) for i in sp.encode(t, out_type=int)]} for t in tokenizer_corpus],
        "phrases": results,
    }
    (out_dir / "golden.json").write_text(json.dumps(golden, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(golden["meta"]))


if __name__ == "__main__":
    main()
