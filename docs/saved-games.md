# Partidas guardadas

Cada Guardar crea una instantánea inmutable con el estado y todos los pasos de revelado. Un código de 8 caracteres identifica esa instantánea. No caduca automáticamente ni sobrescribe códigos anteriores. Quien tenga el código puede cargar la partida.

## Vercel

Conectar Upstash Redis al proyecto gh-sim desde Storage / Marketplace y habilitar Production. La integración debe aportar una pareja de variables al servidor:

- UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN; o
- KV_REST_API_URL y KV_REST_API_TOKEN.

Usar el token de lectura/escritura, no el de solo lectura. No utilizar prefijo NEXT_PUBLIC ni incluir las credenciales en Git. Después de conectar la base y publicar este código, crear un nuevo deployment (Redeploy) para que incorpore las variables.

Guardar usa SET NX (evita colisiones), cargar usa GET. No se fija TTL. Desactivar la expulsión automática de claves (eviction) en la base destinada a partidas. Mantener la base conectada y revisar sus límites de almacenamiento.

No configurar GH_SAVE_DIR ni /tmp como solución en Vercel: el disco de las funciones no es persistente. Sin Redis configurado se devuelve un error explícito. Si Redis falla, no se cambia a disco local ni se comunica un guardado ficticio.

## Desarrollo local / servidor Node con disco persistente

Sin las variables de Redis, guarda en .data/saves (fuera de Git) o en GH_SAVE_DIR. Conservar esa carpeta al actualizar. Si hay varias instancias, compartir almacenamiento. Al configurar Redis, todos los nuevos guardados y cargas usan Redis; los archivos locales no se migran automáticamente.

## Verificación

Ejecutar node tests/saved-games.cjs y node tests/saved-games-redis.cjs. La segunda prueba simula la API Redis y el entorno Vercel; la comprobación real requiere la base conectada y el despliegue actualizado. No se ha publicado automáticamente.
