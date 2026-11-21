import type {
  DeviceCapabilities,
  DeviceCapabilitiesSnapshot,
} from '../../../libs/reader/src/core-api.js';

/** Capacidades reales del navegador. */
export class BrowserDeviceCapabilities implements DeviceCapabilities {
  async detect(): Promise<DeviceCapabilitiesSnapshot> {
    const g = globalThis as { navigator?: { gpu?: unknown; deviceMemory?: number } };
    return {
      webgpu: g.navigator?.gpu !== undefined,
      wasmThreads: typeof SharedArrayBuffer !== 'undefined',
      estimatedMemoryMb:
        g.navigator?.deviceMemory !== undefined ? g.navigator.deviceMemory * 1024 : undefined,
      speechSynthesis: 'speechSynthesis' in globalThis,
    };
  }
}
