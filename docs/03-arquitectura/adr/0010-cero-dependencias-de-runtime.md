# ADR-0010 · Cero dependencias de runtime salvo excepción aprobada

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** [Modelo de amenazas](../modelo-de-amenazas.md) (amenazas de la cadena de suministro)

## Contexto

Cada dependencia de runtime se instala en el proyecto de cada usuario: suma peso, superficie de
ataque y riesgo de licencias. Muchos incidentes de npm vinieron de una dependencia transitiva
comprometida.

## Decisión

- `dependencies` vacío por defecto. Las herramientas van en `devDependencies`.
- Para agregar una dependencia de runtime hace falta un ADR que muestre:
  1. que hacerlo a mano es claramente peor;
  2. el mantenimiento y la popularidad del paquete;
  3. su árbol de dependencias y su licencia (compatible con MIT);
  4. el costo en tamaño (medido con size-limit).
- Si una integración necesita una librería grande (por ejemplo, un framework de UI), va como
  `peerDependency` opcional, nunca como dependencia directa.
- Sin scripts `postinstall` ni equivalentes.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Usar dependencias libremente | Riesgo de cadena de suministro y peso para el usuario |

## Consecuencias

- Algunas utilidades se escriben en el propio dominio (y se prueban ahí).
- CI falla si `dependencies` cambia sin ADR referenciado en el PR (comprobación en revisión).
