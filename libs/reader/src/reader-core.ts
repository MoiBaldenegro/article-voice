/** Adaptadores ya construidos; vacío hasta que existan los puertos (T-020). */
export type CoreOptions = Record<string, never>;

/** Servicios de aplicación expuestos por el núcleo; vacío hasta T-020+. */
export type Core = Record<string, never>;

/** Composición explícita, sin DI mágica: recibe adaptadores y devuelve servicios. */
export function createCore(options: CoreOptions = {}): Core {
  void options;
  return {};
}
