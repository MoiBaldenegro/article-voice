import { StaticDeviceCapabilities } from '../domain/outbound/testing/index.js';
import { EngineKind } from '../domain/value-objects/EngineKind.js';
import { SelectEngine, type FallbackEvent } from './SelectEngine.use-case.js';

const URL = 'https://tts.example.com';

function make(opts: { speech?: boolean; probe?: () => Promise<boolean> } = {}) {
  const events: FallbackEvent[] = [];
  const probe = jest.fn(opts.probe ?? (async () => true));
  const select = new SelectEngine(
    new StaticDeviceCapabilities({ speechSynthesis: opts.speech ?? true, webgpu: true }),
    probe,
    (e) => events.push(e),
  );
  return { select, probe, events };
}

describe('SelectEngine (auto)', () => {
  it('elige moss-server si hay server-url y responde, sin respaldo', async () => {
    const { select, events } = make();
    await expect(select.execute({ serverUrl: URL })).resolves.toEqual({
      kind: 'moss-server',
      fallback: false,
    });
    expect(events).toEqual([]);
  });

  it('sin server-url usa web-speech como respaldo con etiqueta y evento', async () => {
    const { select, probe, events } = make();
    const out = await select.execute();
    expect(out).toEqual({ kind: 'web-speech', fallback: true, label: 'voz del sistema' });
    expect(probe).not.toHaveBeenCalled();
    expect(events).toEqual([
      { from: 'auto', to: 'web-speech', reason: 'no-server-url', label: 'voz del sistema' },
    ]);
  });

  it.each([
    ['responde false', async () => false],
    [
      'lanza',
      async (): Promise<boolean> => {
        throw new Error('x');
      },
    ],
  ])('si el servidor %s, cae a web-speech', async (_n, probe) => {
    const { select, events } = make({ probe });
    const out = await select.execute({ serverUrl: URL });
    expect(out).toMatchObject({ kind: 'web-speech', fallback: true, label: 'voz del sistema' });
    expect(events[0]).toMatchObject({ from: 'moss-server', reason: 'server-unreachable' });
  });

  it('nunca elige moss-browser, aunque el dispositivo tenga WebGPU', async () => {
    const { select } = make();
    expect((await select.execute()).kind).not.toBe('moss-browser');
  });

  it('fallback="none" sin servidor → AV_ENGINE_UNAVAILABLE y sin evento', async () => {
    const { select, events } = make();
    await expect(select.execute({ fallback: 'none' })).rejects.toMatchObject({
      code: 'AV_ENGINE_UNAVAILABLE',
    });
    expect(events).toEqual([]);
  });

  it('sin voz del sistema y sin servidor → AV_ENGINE_UNAVAILABLE', async () => {
    const { select } = make({ speech: false });
    await expect(select.execute()).rejects.toMatchObject({ code: 'AV_ENGINE_UNAVAILABLE' });
  });
});

describe('SelectEngine (motor explícito)', () => {
  it('web-speech explícito no es respaldo pero lleva la etiqueta', async () => {
    const { select, events } = make();
    const out = await select.execute({ engine: EngineKind.of('web-speech') });
    expect(out).toEqual({ kind: 'web-speech', fallback: false, label: 'voz del sistema' });
    expect(events).toEqual([]);
  });

  it('moss-server explícito exige server-url', async () => {
    const { select } = make();
    await expect(select.execute({ engine: EngineKind.of('moss-server') })).rejects.toMatchObject({
      code: 'AV_ENGINE_UNAVAILABLE',
    });
    await expect(
      select.execute({ engine: EngineKind.of('moss-server'), serverUrl: URL }),
    ).resolves.toMatchObject({ kind: 'moss-server' });
  });

  it('moss-browser solo si se pide explícitamente', async () => {
    const { select } = make();
    await expect(select.execute({ engine: EngineKind.of('moss-browser') })).resolves.toEqual({
      kind: 'moss-browser',
      fallback: false,
    });
  });
});
