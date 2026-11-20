/** Almacén persistente de archivos del modelo (clave = ruta del manifiesto). */
export interface ModelStore {
  has(key: string): Promise<boolean>;
  read(key: string): Promise<Uint8Array | undefined>;
  write(key: string, bytes: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<readonly string[]>;
  /** Bytes totales guardados. */
  size(): Promise<number>;
}
