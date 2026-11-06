# campuslatina.com

Sitio estático de Campus Latina. No tiene build: Netlify publica la raíz del repo cada vez que un cambio llega a `main` (`netlify.toml`).

## Cómo trabajar acá

- **Nunca commitear ni hacer push a `main`.** Todo cambio va en una rama y por pull request contra `main`. Netlify deja en cada PR un link de vista previa (Deploy Preview) y publica cuando se fusiona.
- Para publicar o corregir una nota, seguir la skill `publicar-nota` (`.claude/skills/publicar-nota/SKILL.md`).
- No tocar sin que lo pidan: `netlify.toml` (headers de seguridad y CSP), Google Analytics, `_redirects`, `robots.txt` ni la carpeta `realcup/` (páginas de eventos).
- Estilos y tipografías en `assets/marca.css` y `assets/fonts/`. Usar las clases que ya existen en lugar de estilos nuevos.

## Estructura

- `index.html`, `quienes-somos.html`, `como-trabajamos.html`: páginas principales.
- `notas/`: una página por nota y `notas/index.html` con la lista.
- `assets/notas/<slug>.png`: imagen para compartir de cada nota (1200×630).
- `sitemap.xml`, `llms.txt`, `llms-full.txt`: para buscadores y modelos de lenguaje. La lista de notas de estos archivos la actualiza `node herramientas/notas.mjs`.
- `herramientas/`: scripts de mantenimiento, sin dependencias (Node 18 o más nuevo).

## Revisar en local

```bash
npx --yes serve@14 . -l 4321
```
