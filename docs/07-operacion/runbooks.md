# Runbooks y playbooks

- **Estado:** Aprobado

En una librería, "producción" es el registro de npm y los proyectos de quienes la instalan. Los
incidentes son versiones rotas, problemas de seguridad o una publicación comprometida.

## RB-01 · Versión rota publicada

**Señal:** issues que reportan que la versión X.Y.Z rompe algo que funcionaba, o falla la prueba de humo.

1. Confirmar con la prueba de humo o reproduciendo el issue.
2. Si es grave, **deprecar** la versión (no se despublica: rompe a quien ya la fijó):
   `npm deprecate <paquete>@X.Y.Z "Rota: usa X.Y.Z+1. Ver <issue>"`.
3. Si `latest` apunta a la rota y la anterior estaba bien:
   `npm dist-tag add <paquete>@<anterior> latest` mientras sale el arreglo.
4. Arreglo por el flujo normal: PR `fix:` + changeset patch → versión nueva.
5. Postmortem si afectó a usuarios ([plantilla](postmortems/0000-plantilla.md)).

## RB-02 · Vulnerabilidad reportada

1. Llega por el canal privado de [SECURITY.md](../../SECURITY.md); se acusa recibo en ≤ 3 días hábiles.
2. Reproducir y evaluar severidad (CVSS).
3. Abrir un **GitHub Security Advisory** privado; preparar el arreglo en su fork privado.
4. Publicar la versión corregida, luego el advisory (pide CVE) y deprecar las versiones afectadas.
5. Agradecer al reportante si así lo desea.

## RB-03 · Publicación comprometida o sospechosa

**Señal:** una versión que no salió de `release.yml`, sin provenance, o cambios inesperados en el owner.

1. Deprecar de inmediato la versión sospechosa con un mensaje de advertencia.
2. Revisar los owners del paquete en npm y el historial de la configuración de Trusted Publishing.
3. Rotar todo lo que tenga acceso: 2FA, sesiones de npm y GitHub.
4. Contactar a soporte de npm para retirar la versión (malware sí justifica despublicar).
5. Advisory público y postmortem.

## RB-04 · Falla el pipeline de publicación

1. Ver el log del job `release`. Si falló **antes** de `npm publish`, basta con reintentar el job.
2. Si falló **después** (tag o release de GitHub), no volver a publicar: completar a mano el tag y el
   release apuntando al commit publicado.
3. Si npm rechaza por versión ya existente, la versión ya salió: verificar provenance y seguir con el paso 2.
