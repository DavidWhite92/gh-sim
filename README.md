# Simulador Gran Hermano (Next.js + TypeScript) — MVP

Este paquete contiene los **archivos del simulador** listos para copiarlos dentro de un proyecto Next.js (App Router).

## 1) Crear el proyecto (recomendado)
```bash
npx create-next-app@latest gh-sim --ts --app
cd gh-sim
```

## 2) Copiar los archivos
Copia el contenido de este ZIP **encima** del proyecto que acabas de crear (mantiene `package.json` original).

Estructura que se añade/reemplaza:
- `app/page.tsx`
- `app/simulator/page.tsx`
- `components/*`
- `lib/*`
- `styles/globals.css` (si ya lo tienes, fusiona o reemplaza)
- Asegúrate de importar `styles/globals.css` en `app/layout.tsx`

## 3) Ejecutar
```bash
npm run dev
```

Abrir: http://localhost:3000

## 4) Deploy en Vercel
- Sube el repo a GitHub
- En Vercel: New Project → Import → Deploy (detecta Next.js automáticamente)

---

### Nota sobre CSS
Si creaste el proyecto con Tailwind, puedes seguir usándolo; este MVP usa estilos inline + `styles/globals.css`.
