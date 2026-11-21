"""Servidor /v1/audio/speech sobre MOSS-TTS-Nano (ONNX, CPU) para la prueba E2E de moss-server.

Mantiene el modelo cargado y responde PCM 16-bit LE mono a 48 kHz (lo que espera el servidor de
referencia con BACKEND=upstream). Reutiliza el runtime oficial descargado por el spike T-000.

Uso: python -I moss_upstream.py --models <carpeta de pesos> --runtime <carpeta con ort_cpu_runtime.py> [--port 9000]
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

TARGET_RATE = 48000
DEFAULT_VOICE = "Nathan"


def prepare_text(text: str) -> str:
    # Misma preparación que el spike (reference.py / _prepare_text_for_sentence_chunking).
    text = " ".join(text.replace("\r", " ").replace("\n", " ").split())
    if text[:1].islower():
        text = text[:1].upper() + text[1:]
    if text and text[-1].isalnum():
        text += "."
    if len(text.split()) < 5:
        text = f"        {text}"
    return text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True)
    parser.add_argument("--runtime", required=True)
    parser.add_argument("--port", type=int, default=9000)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()

    sys.path.insert(0, args.runtime)
    import sentencepiece as spm
    from ort_cpu_runtime import OrtCpuRuntime

    tts_dir = Path(args.models) / "OpenMOSS-Team__MOSS-TTS-Nano-100M-ONNX"
    runtime = OrtCpuRuntime(model_dir=tts_dir, thread_count=args.threads, sample_mode="fixed")
    sp = spm.SentencePieceProcessor(model_file=str(tts_dir / "tokenizer.model"))
    rate = int(runtime.codec_meta["codec_config"]["sample_rate"])
    if rate != TARGET_RATE:
        raise SystemExit(f"El códec produce {rate} Hz y el contrato exige {TARGET_RATE} Hz")
    voices = {v["voice"]: v for v in runtime.list_builtin_voices()}
    runtime.warmup()
    lock = threading.Lock()  # el runtime mantiene estado: una síntesis a la vez

    def synthesize(text: str, voice: str) -> bytes:
        v = voices.get(voice) or voices[DEFAULT_VOICE]
        ids = [int(t) for t in sp.encode(prepare_text(text), out_type=int)]
        with lock:
            runtime.rng = np.random.default_rng(1234)
            rows = runtime.build_voice_clone_request_rows(v["prompt_audio_codes"], ids)
            frames = runtime.generate_audio_frames(rows)
            channels, _ = runtime.decode_full_audio(frames)
        mono = np.mean(np.stack(channels, axis=0), axis=0)
        return (np.clip(mono, -1.0, 1.0) * 32767.0).astype("<i2").tobytes()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args) -> None:  # no se registra el texto
            pass

        def do_POST(self) -> None:
            if self.path != "/v1/audio/speech":
                return self.send_error(404)
            try:
                body = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))))
                t0 = time.perf_counter()
                pcm = synthesize(str(body["input"]), str(body.get("voice", DEFAULT_VOICE)))
            except Exception as e:  # noqa: BLE001
                sys.stderr.write(f"error: {type(e).__name__}: {e}\n")
                return self.send_error(500)
            self.send_response(200)
            self.send_header("content-type", "audio/pcm")
            self.send_header("content-length", str(len(pcm)))
            self.send_header("x-synthesis-seconds", f"{time.perf_counter() - t0:.3f}")
            self.end_headers()
            self.wfile.write(pcm)

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"listo en http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
