export interface DeviceCapabilitiesSnapshot {
  readonly webgpu: boolean;
  readonly wasmThreads: boolean;
  /** Memoria estimada en MiB; `undefined` si no se puede saber. */
  readonly estimatedMemoryMb: number | undefined;
  readonly speechSynthesis: boolean;
}

export interface DeviceCapabilities {
  detect(): Promise<DeviceCapabilitiesSnapshot>;
}
