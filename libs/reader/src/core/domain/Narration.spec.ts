import { Narration } from './Narration.js';
import { NARRATION_STATES, type NarrationState } from './NarrationState.js';
import { InvalidStateTransitionError } from './exceptions/errors.js';
import { PlaybackRate } from './value-objects/PlaybackRate.js';
import { VoiceId } from './value-objects/VoiceId.js';

const seg = (index: number) => ({
  index,
  text: `Frase ${index}.`,
  spans: [{ block: 'b', start: 0, end: 5 }],
});

function make(count = 3): Narration {
  return new Narration({
    id: 'n1',
    segments: Array.from({ length: count }, (_, i) => seg(i)),
    voice: VoiceId.of('default'),
  });
}

function inState(state: NarrationState): Narration {
  const n = make();
  switch (state) {
    case 'idle':
      break;
    case 'preparing':
      n.play();
      break;
    case 'playing':
      n.play();
      n.prepared();
      break;
    case 'paused':
      n.play();
      n.prepared();
      n.pause();
      break;
    case 'stopped':
      n.play();
      n.stop();
      break;
    case 'error':
      n.play();
      n.fail('AV_ENGINE_INIT_FAILED');
      break;
  }
  expect(n.state).toBe(state);
  return n;
}

const ACTIONS: Record<string, (n: Narration) => void> = {
  play: (n) => n.play(),
  prepared: (n) => n.prepared(),
  cancelPreparation: (n) => n.cancelPreparation(),
  pause: (n) => n.pause(),
  resume: (n) => n.resume(),
  stop: (n) => n.stop(),
  segmentEnded: (n) => n.segmentEnded(),
  fail: (n) => n.fail('AV_SYNTHESIS_FAILED'),
};

// estado → acciones válidas y su destino
const VALID: Record<NarrationState, Record<string, NarrationState>> = {
  idle: { play: 'preparing' },
  preparing: { prepared: 'playing', cancelPreparation: 'idle', fail: 'error', stop: 'stopped' },
  playing: { pause: 'paused', stop: 'stopped', fail: 'error', segmentEnded: 'playing' },
  paused: { resume: 'playing', stop: 'stopped' },
  stopped: { play: 'preparing' },
  error: { play: 'preparing', stop: 'stopped' },
};

describe('Narration', () => {
  it('nace en idle con cursor 0, rate 1 y sin fallback', () => {
    const n = make();
    expect(n.state).toBe('idle');
    expect(n.cursor).toBe(0);
    expect(n.rate.value).toBe(1);
    expect(n.isFallback).toBe(false);
  });

  it('rechaza una narración sin segmentos', () => {
    expect(() => new Narration({ id: 'x', segments: [], voice: VoiceId.of('default') })).toThrow(
      expect.objectContaining({ code: 'AV_INVALID_OPTION' }),
    );
  });

  describe.each(NARRATION_STATES)('desde %s', (from) => {
    for (const [action, run] of Object.entries(ACTIONS)) {
      const target = VALID[from][action];
      if (target) {
        it(`${action} → ${target}`, () => {
          const n = inState(from);
          run(n);
          expect(n.state).toBe(target);
        });
      } else {
        it(`${action} lanza AV_INVALID_NARRATION_TRANSITION y no cambia el estado`, () => {
          const n = inState(from);
          let error: unknown;
          try {
            run(n);
          } catch (e) {
            error = e;
          }
          expect(error).toBeInstanceOf(InvalidStateTransitionError);
          expect(error).toMatchObject({
            code: 'AV_INVALID_NARRATION_TRANSITION',
            details: { from, action },
          });
          expect(n.state).toBe(from);
        });
      }
    }
  });

  it('segmentEnded avanza el cursor y tras el último pasa a stopped', () => {
    const n = inState('playing');
    n.segmentEnded();
    n.segmentEnded();
    expect(n.cursor).toBe(2);
    n.segmentEnded();
    expect(n.state).toBe('stopped');
  });

  it('play tras stopped reinicia el cursor; tras error lo conserva', () => {
    const a = inState('playing');
    a.segmentEnded();
    a.fail('AV_SYNTHESIS_FAILED');
    expect(a.errorCode).toBe('AV_SYNTHESIS_FAILED');
    a.play();
    expect(a.cursor).toBe(1);
    expect(a.errorCode).toBeUndefined();

    const b = inState('playing');
    b.segmentEnded();
    b.stop();
    b.play();
    expect(b.cursor).toBe(0);
  });

  it('seek mueve el cursor en playing/paused y valida el rango', () => {
    const n = inState('playing');
    n.seek(2);
    expect(n.cursor).toBe(2);
    n.pause();
    n.seek(0);
    expect(n.cursor).toBe(0);
    expect(() => n.seek(3)).toThrow(expect.objectContaining({ code: 'AV_INVALID_OPTION' }));
    expect(() => n.seek(1.5)).toThrow(expect.objectContaining({ code: 'AV_INVALID_OPTION' }));
    expect(() => inState('idle').seek(0)).toThrow(InvalidStateTransitionError);
  });

  it('pendingSynthesis respeta el lookahead (RN-07) y el final', () => {
    const n = make(6);
    expect(n.pendingSynthesis()).toEqual([0, 1, 2]);
    expect(n.pendingSynthesis(0)).toEqual([0]);
    n.play();
    n.prepared();
    n.seek(5);
    expect(n.pendingSynthesis()).toEqual([5]);
  });

  it('setRate cambia la velocidad', () => {
    const n = make();
    n.setRate(PlaybackRate.of(1.5));
    expect(n.rate.value).toBe(1.5);
  });
});
