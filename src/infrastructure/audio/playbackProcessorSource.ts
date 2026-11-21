/**
 * Código del AudioWorkletProcessor como texto: se carga con un Blob URL para que el
 * paquete no necesite un archivo aparte. Debe ser autocontenido (corre en otro ámbito).
 *
 * Mensajes de entrada: chunk {segmentIndex, samples, last} · pause · resume · clear · rate.
 * Mensajes de salida: ended {segmentIndex} · underrun.
 * Un underrun es quedarse sin audio a mitad de un segmento (el último fragmento
 * consumido no era `last`) con la reproducción activa; se avisa una vez por corte.
 */
export const PLAYBACK_PROCESSOR_NAME = 'article-voice-playback';

export const PLAYBACK_PROCESSOR_SOURCE = `
class ArticleVoicePlayback extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.pos = 0;
    this.paused = false;
    this.rate = 1;
    this.started = false;
    this.midSegment = false;
    this.reported = false;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'chunk') this.queue.push({ s: m.samples, i: m.segmentIndex, last: m.last });
      else if (m.type === 'pause') this.paused = true;
      else if (m.type === 'resume') this.paused = false;
      else if (m.type === 'rate') this.rate = m.rate;
      else if (m.type === 'clear') {
        this.queue = [];
        this.pos = 0;
        this.started = false;
        this.midSegment = false;
        this.reported = false;
      }
    };
  }
  process(_inputs, outputs) {
    const output = outputs[0];
    const out = output && output[0];
    if (!out) return true;
    for (let n = 0; n < out.length; n++) {
      const cur = this.paused ? undefined : this.queue[0];
      if (!cur) {
        out[n] = 0;
        if (!this.paused && this.started && this.midSegment && !this.reported) {
          this.reported = true;
          this.port.postMessage({ type: 'underrun' });
        }
        continue;
      }
      this.started = true;
      this.reported = false;
      const i = Math.floor(this.pos);
      const a = cur.s[i];
      const b = i + 1 < cur.s.length ? cur.s[i + 1] : a;
      const f = this.pos - i;
      out[n] = a + (b - a) * f;
      this.pos += this.rate;
      if (this.pos >= cur.s.length) {
        this.queue.shift();
        this.pos = 0;
        this.midSegment = !cur.last;
        if (cur.last) this.port.postMessage({ type: 'ended', segmentIndex: cur.i });
      } else {
        this.midSegment = true;
      }
    }
    for (let c = 1; c < output.length; c++) output[c].set(out);
    return true;
  }
}
registerProcessor('${PLAYBACK_PROCESSOR_NAME}', ArticleVoicePlayback);
`;
