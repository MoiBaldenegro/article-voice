// CU-06: elegir el motor (ADR-0014 con ADR-0018, RN-13).
// `auto`: moss-server si hay `server-url` y responde; si no, web-speech (respaldo, con aviso);
// nunca moss-browser (solo con engine="moss-browser" explícito, experimental).

import { DomainError } from '../domain/exceptions/errors.js';
import type { DeviceCapabilities } from '../domain/outbound/DeviceCapabilities.port.js';
import { EngineKind, type EngineKindValue } from '../domain/value-objects/EngineKind.js';

export const SYSTEM_VOICE_LABEL = 'voz del sistema';

export type FallbackReason = 'no-server-url' | 'server-unreachable';

export interface FallbackEvent {
  readonly from: 'moss-server' | 'auto';
  readonly to: 'web-speech';
  readonly reason: FallbackReason;
  readonly label: typeof SYSTEM_VOICE_LABEL;
}

export interface SelectEngineInput {
  readonly engine?: EngineKind;
  readonly serverUrl?: string | undefined;
  /** Opción `fallback`; por defecto `web-speech`. */
  readonly fallback?: 'web-speech' | 'none';
}

export interface SelectEngineOutput {
  readonly kind: Exclude<EngineKindValue, 'auto'>;
  /** true si se usa web-speech porque el motor preferido no estaba disponible. */
  readonly fallback: boolean;
  /** Etiqueta visible (RN-13); presente siempre que suene la voz del sistema. */
  readonly label?: typeof SYSTEM_VOICE_LABEL;
}

/** ¿Responde el servidor? No debe lanzar; `false` = no disponible. */
export type ServerProbe = (serverUrl: string, signal?: AbortSignal) => Promise<boolean>;

class EngineUnavailableError extends DomainError {}

export class SelectEngine {
  constructor(
    private readonly capabilities: DeviceCapabilities,
    private readonly probe: ServerProbe,
    private readonly onFallback: (event: FallbackEvent) => void = () => undefined,
  ) {}

  async execute(input: SelectEngineInput = {}, signal?: AbortSignal): Promise<SelectEngineOutput> {
    const requested = (input.engine ?? EngineKind.DEFAULT).value;
    const allowFallback = (input.fallback ?? 'web-speech') === 'web-speech';

    if (requested === 'moss-browser') return { kind: 'moss-browser', fallback: false };
    if (requested === 'moss-server') {
      if (!input.serverUrl) throw unavailable('engine="moss-server" requiere server-url');
      return { kind: 'moss-server', fallback: false };
    }
    if (requested === 'web-speech') {
      await this.assertSystemVoice();
      return { kind: 'web-speech', fallback: false, label: SYSTEM_VOICE_LABEL };
    }

    // auto
    let reason: FallbackReason = 'no-server-url';
    if (input.serverUrl) {
      if (await this.safeProbe(input.serverUrl, signal)) {
        return { kind: 'moss-server', fallback: false };
      }
      reason = 'server-unreachable';
    }
    if (!allowFallback) {
      throw unavailable('Ningún motor disponible y fallback="none"', { reason });
    }
    await this.assertSystemVoice();
    this.onFallback({
      from: input.serverUrl ? 'moss-server' : 'auto',
      to: 'web-speech',
      reason,
      label: SYSTEM_VOICE_LABEL,
    });
    return { kind: 'web-speech', fallback: true, label: SYSTEM_VOICE_LABEL };
  }

  private async safeProbe(url: string, signal?: AbortSignal): Promise<boolean> {
    try {
      return await this.probe(url, signal);
    } catch {
      return false;
    }
  }

  private async assertSystemVoice(): Promise<void> {
    const caps = await this.capabilities.detect();
    if (!caps.speechSynthesis) throw unavailable('Este dispositivo no tiene voz del sistema');
  }
}

function unavailable(message: string, details?: Record<string, unknown>): EngineUnavailableError {
  return new EngineUnavailableError('AV_ENGINE_UNAVAILABLE', message, {
    ...(details ? { details } : {}),
  });
}
