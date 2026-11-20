/** Base de los value objects: inmutables y comparados por valor. */
export abstract class ValueObject<Props extends Readonly<Record<string, unknown>>> {
  protected readonly props: Readonly<Props>;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<Props> | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    const a = this.props as Record<string, unknown>;
    const b = other.props as Record<string, unknown>;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => Object.is(a[k], b[k]));
  }
}
