# Política de seguridad

## Versiones soportadas

| Versión | Recibe arreglos de seguridad |
| --- | --- |
| Última mayor (`latest`) | ✅ |
| Mayor anterior | ✅ durante 6 meses desde la salida de la nueva mayor |
| Más antiguas | ❌ |

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:
pestaña **Security → Report a vulnerability** del repositorio.

Incluye: versión afectada, entorno, pasos para reproducir y el impacto que ves.

## Qué puedes esperar

| Paso | Plazo |
| --- | --- |
| Acuse de recibo | ≤ 3 días hábiles |
| Evaluación inicial y severidad | ≤ 7 días |
| Arreglo publicado (severidad alta o crítica) | ≤ 7 días desde la confirmación |
| Advisory público (con CVE si aplica) | Al publicar el arreglo |

Te daremos crédito en el advisory si así lo quieres. El proceso interno está en el
[runbook RB-02](docs/07-operacion/runbooks.md#rb-02--vulnerabilidad-reportada).

## Verificar lo que instalas

Toda versión se publica desde GitHub Actions con **provenance** de npm. Puedes comprobarlo con
`npm audit signatures` o en la página del paquete en npmjs.com.
