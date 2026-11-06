---
name: publicar-nota
description: Publicar una nota nueva en campuslatina.com/notas, o corregir una ya publicada. Usar cuando pidan subir, publicar, cargar o actualizar un artículo o una nota en la web de Campus Latina.
---

# Publicar una nota en campuslatina.com

Cada nota es un archivo `notas/<slug>.html`. Netlify publica la web sola cuando un cambio llega a `main`, así que **todo pasa por un pull request**: la nota se arma en una rama, Netlify deja una vista previa en el PR y recién al fusionarlo queda publicada.

## 1. Juntar lo que hace falta

- El texto completo: título, bajada (una o dos oraciones) y cuerpo, con sus subtítulos.
- Autor y fecha de publicación (si no la dicen, hoy).
- Si falta algo, preguntarlo. No inventar datos, cifras, fuentes ni citas.
- El texto es del autor: respetarlo. Corregir solo errores evidentes (tipeo, puntuación, acentos) y avisar cuáles se corrigieron. Si algo choca con las reglas de marca de abajo, proponer el cambio y esperar el OK.

### Autores conocidos

| Autor | Firma (cargo en la nota) | `jobTitle` en los datos estructurados | LinkedIn |
|---|---|---|---|
| Sebastián Ledesma | cofundador de Campus Latina | Co-founder, Campus Latina | https://www.linkedin.com/in/sebastianledesma/ |
| Marcelo Seoane | cofundador de Campus Latina | Co-founder, Campus Latina | https://www.linkedin.com/in/marcelo-seoane-/ |
| Jimena Dominguez | diseñadora conversacional | Diseñadora conversacional | https://www.linkedin.com/in/jimenadominguez/ |

Para un autor nuevo, pedir nombre, cargo y LinkedIn.

## 2. Rama y slug

- Partir de `main` actualizado: `git checkout main && git pull`, después `git checkout -b nota/<slug>`. **Nunca commitear ni hacer push a `main`.**
- El slug va en minúsculas, sin acentos ni signos, con guiones y con las palabras que alguien buscaría, en 3 a 7 palabras (ej. `ia-en-admisiones-para-que`). Nunca cambiar el slug de una nota ya publicada.

## 3. Crear `notas/<slug>.html`

Copiar la nota más reciente de `notas/` como plantilla y reemplazar **solo** el contenido. Navegación, pie, scripts, Google Analytics y estilos quedan igual.

En el `<head>`:
- `<title>`: `Título — Campus Latina`.
- `meta name="description"`, `og:description` y `twitter:description`: la bajada, hasta unos 160 caracteres.
- `og:title` y `twitter:title`: el título.
- `canonical`, `og:url`, `og:image` y `twitter:image`: con el slug nuevo (la imagen es `/assets/notas/<slug>.png`).
- Datos estructurados (`application/ld+json`). El `Organization` no se toca. En el `BlogPosting`: `@id`, `headline`, `description`, `datePublished` y `dateModified` (siempre fecha completa `AAAA-MM-DD`), `url`, `mainEntityOfPage`, `image` y `author` (`name`, `jobTitle`, `sameAs` con el LinkedIn). En el `BreadcrumbList`, el tercer ítem: título y URL de la nota.

En la cabecera del artículo:
- `<h1>`: el título, en texto plano.
- `<p class="bajada">`: la bajada.
- `<p class="firma">`: `Por <b><a href="LINKEDIN" rel="author noopener" style="color:inherit;text-decoration:none">Autor</a></b>, cargo`, el mes y año (`Noviembre 2026`) y `N min de lectura`, cada uno en su `<span>`. N = palabras del cuerpo ÷ 200, redondeado hacia arriba.

En el cuerpo (`<div class="cuerpo">`):
- Párrafos en `<p>`, subtítulos en `<h2>`, listas en `<ul>` u `<ol>` con `<li>` (si cada ítem tiene un título corto, va en `<strong>`).
- Como máximo una frase destacada: `<div class="pullquote">…</div>`.
- Al final, si suma, un `<div class="callout">` con `<span class="callout-label">Para llevar</span>` y la idea para quedarse.
- Siempre un callout `Para profundizar` con 1 o 2 etapas de la guía del diagnóstico que tengan que ver con la nota (`https://diagnostico.campuslatina.com/guia/<etapa>/`: descubrimiento, exploracion, activacion, acompanamiento, decision, inscripcion, retencion) y una nota relacionada del sitio.

En el llamado final (`<section class="sec alt">` antes de `</main>`):
- El `<h2>` es una pregunta corta al rector o al equipo directivo, sobre el tema de la nota, con una palabra en `<em class="hi">`.
- La bajada explica en una oración qué mide el diagnóstico gratuito en relación con ese tema. El botón queda igual.

## 4. Imagen para compartir

```bash
node herramientas/imagen-nota.mjs <slug>
```

Crea `assets/notas/<slug>.png`, que es lo que muestran LinkedIn y WhatsApp. Necesita Google Chrome o Chromium instalado. Abrir la imagen y revisar que el título entre completo y se lea bien.

## 5. Índices, portada, sitemap y textos para IA

```bash
node herramientas/notas.mjs
```

Actualiza el índice de notas, las 3 notas de la portada, `sitemap.xml`, `llms.txt` y `llms-full.txt`. Revisar que la nota nueva aparezca primera en la lista que imprime. Si el script se queja de un archivo, leer el mensaje: casi siempre falta un dato en la nota (fecha completa, autor o «min de lectura»).

## 6. Revisar en el navegador

```bash
npx --yes serve@14 . -l 4321
```

Abrir `http://localhost:4321/notas/<slug>`, `http://localhost:4321/notas/` y `http://localhost:4321/`. Mirar la nota en computadora y en celular (unos 390 px de ancho): título, firma, listas, frase destacada, links y llamado final.

## 7. Pull request

- Commit con el mensaje `Nota nueva: <título>, de <autor>`.
- `git push -u origin nota/<slug>`, después `gh pr create --base main` con un resumen: título, autor, link a la nota en la vista previa.
- Netlify comenta en el PR un link **Deploy Preview** en uno o dos minutos. Pasárselo a quien pidió la nota para que la revise.
- Al fusionar el PR, la nota queda publicada en `https://campuslatina.com/notas/<slug>` en uno o dos minutos. Confirmarlo abriendo esa dirección.

## Corregir una nota ya publicada

Rama `nota/<slug>-ajuste`. Editar el HTML y actualizar `dateModified`. Si cambió el título, rehacer la imagen (paso 4). Correr `node herramientas/notas.mjs --texto=<slug>`, que también rehace su texto en `llms-full.txt`, y abrir el PR como en el paso 7.

## Reglas de marca para el texto

- Español neutro y trato de usted (`su universidad`), sin tuteo ni voseo.
- Sin emojis.
- En los títulos no se usa raya (—) para un inciso: reformular, o separar con dos puntos o con coma.
- No citar cuántas universidades ni cuántos países trabajan con Campus Latina.
- No caracterizar a los aspirantes con situaciones o dudas puntuales (económicas, familiares, de ciudades): hablar de ellos en general y del recorrido.
- La cifra oficial es «más de 200.000 estudiantes».
