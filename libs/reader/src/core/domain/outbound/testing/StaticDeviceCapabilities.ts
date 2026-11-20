import type { DeviceCapabilities, DeviceCapabilitiesSnapshot } from '../DeviceCapabilities.port.js';

export class StaticDeviceCapabilities implements DeviceCapabilities {
  constructor(private readonly snapshot: Partial<DeviceCapabilitiesSnapshot> = {}) {}

  async detect(): Promise<DeviceCapabilitiesSnapshot> {
    return {
      webgpu: false,
      wasmThreads: false,
      estimatedMemoryMb: undefined,
      speechSynthesis: false,
      ...this.snapshot,
    };
  }
}
