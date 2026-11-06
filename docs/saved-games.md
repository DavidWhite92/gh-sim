# Partidas guardadas

Guardar crea una instantánea inmutable: estado completo de la simulación y los pasos de revelado. Cada guardado recibe un nuevo código aleatorio de 8 caracteres; no sobrescribe otros códigos. Cargar no vuelve a simular ninguna gala.

Los endpoints de Next.js usan el runtime Node y conservan las partidas en `.data/saves` del servidor. No dependen del navegador: cualquier dispositivo que acceda a la misma instalación puede cargar el código. Los archivos quedan fuera de Git.

En producción, configurar `GH_SAVE_DIR` con una carpeta en un volumen persistente, compartido si hay varias instancias, con permisos de lectura y escritura del proceso Node. Mantener copias de seguridad de esa carpeta y conservarla al desplegar. Un disco efímero o una función serverless sin almacenamiento persistente NO sirve para guardar partidas. En Vercel sin GH_SAVE_DIR el guardado devuelve un error, nunca un éxito ficticio. No publicar la carpeta como archivos estáticos.

Quien tenga el código puede recuperar esa partida. El código identifica un guardado, no una cuenta. No hay publicación ni despliegue automático de esta funcionalidad.
