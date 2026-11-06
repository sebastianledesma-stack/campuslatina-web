// Mantiene al día todo lo que lista las notas, a partir de los archivos notas/<slug>.html:
//   · notas/index.html (lista y datos estructurados del blog)
//   · index.html (las 3 notas más recientes en la portada)
//   · sitemap.xml, llms.txt y llms-full.txt
// Uso: node herramientas/notas.mjs                → actualiza los archivos
//      node herramientas/notas.mjs --revisar      → solo muestra qué cambiaría (no escribe nada)
//      node herramientas/notas.mjs --texto=<slug> → además rehace el texto de esa nota en llms-full.txt
//                                                    (hace falta si se corrigió una nota ya publicada)
// De cada nota se leen el título (h1), la descripción (meta description), la fecha y el autor
// (datos estructurados BlogPosting) y los minutos de lectura (línea de la firma).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITIO = "https://campuslatina.com";
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const hoy = new Date().toISOString().slice(0, 10);
const revisar = process.argv.includes("--revisar");
const rehacer = new Set(process.argv.filter((a) => a.startsWith("--texto=")).map((a) => a.slice(8)));

const leer = (f) => readFileSync(join(RAIZ, f), "utf8");
const sinEtiquetas = (s) => s.replace(/<[^>]+>/g, "");
const entidades = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const escapar = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── LAS NOTAS ─────────────────────────────────────────────
function leerNota(archivo) {
  const s = leer(join("notas", archivo));
  const falta = (que) => { throw new Error(`notas/${archivo}: no encuentro ${que}`); };
  const ld = JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || falta("los datos estructurados"));
  const post = ld["@graph"].find((x) => x["@type"] === "BlogPosting") || falta("el BlogPosting en los datos estructurados");
  const nota = {
    slug: archivo.replace(/\.html$/, ""),
    titulo: entidades(sinEtiquetas(s.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] || falta("el <h1>")).trim()),
    descripcion: entidades(s.match(/<meta name="description" content="([^"]*)"/)?.[1] || falta("la meta description")),
    fecha: post.datePublished || falta("datePublished"),
    autor: post.author?.name || falta("el autor"),
    lectura: Number(s.match(/(\d+) min de lectura/)?.[1] || falta("los «min de lectura» de la firma")),
    html: s,
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nota.fecha)) falta(`una fecha completa (AAAA-MM-DD) en datePublished, hay «${nota.fecha}»`);
  return nota;
}

const notas = readdirSync(join(RAIZ, "notas"))
  .filter((f) => f.endsWith(".html") && f !== "index.html")
  .map(leerNota)
  .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.slug.localeCompare(b.slug));

const mes = (n) => `${MESES[Number(n.fecha.slice(5, 7)) - 1]} ${n.fecha.slice(0, 4)}`;
const url = (n) => `${SITIO}/notas/${n.slug}`;
const fila = (n, conAutor) => `<li><a class="nota-fila" href="/notas/${n.slug}"><span class="fecha">${mes(n)}</span><div><h3>${escapar(n.titulo)}</h3><p>${escapar(n.descripcion)}</p>${conAutor ? `<span class="autor">${n.autor} · ${n.lectura} min de lectura</span>` : ""}</div><span class="flecha" aria-hidden="true">→</span></a></li>`;

// ── CADA ARCHIVO ──────────────────────────────────────────
// Reemplaza exactamente una coincidencia; si no la encuentra, el archivo cambió de forma y hay que revisar.
function reemplazar(texto, patron, nuevo, donde) {
  const n = (texto.match(new RegExp(patron.source, patron.flags.includes("g") ? patron.flags : patron.flags + "g")) || []).length;
  if (n !== 1) throw new Error(`${donde}: esperaba encontrar 1 bloque y encontré ${n}. Revisar el archivo a mano.`);
  return texto.replace(patron, nuevo);
}

function indiceNotas(s) {
  s = reemplazar(s, /(<section class="sec" style="padding-top:0">\s*<div class="wrap"><ul class="lista">)[\s\S]*?(<\/ul><\/div>)/,
    (_, a, b) => a + notas.map((n) => fila(n, true)).join("") + b, "notas/index.html (lista)");
  return reemplazar(s, /("blogPost": )\[[^\]]*\]/,
    (_, a) => a + JSON.stringify(notas.map((n) => ({ "@type": "BlogPosting", headline: n.titulo, url: url(n), datePublished: n.fecha.slice(0, 7) }))).replace(/":/g, '": ').replace(/,"/g, ', "'),
    "notas/index.html (datos estructurados)");
}

const portada = (s) => reemplazar(s, /(aria-labelledby="notas-t">[\s\S]*?<ul class="lista">)[\s\S]*?(<\/ul>)/,
  (_, a, b) => a + notas.slice(0, 3).map((n) => fila(n, false)).join("") + b, "index.html (notas de la portada)");

function llms(s) {
  const lineas = notas.map((n) => `- [${n.titulo}](${url(n)}) (${n.fecha.slice(0, 7)}), por ${n.autor}`).join("\n");
  return reemplazar(s, /(## Notas\n)[\s\S]*?(\n\n## )/, (_, a, b) => a + lineas + b, "llms.txt (## Notas)");
}

// Versión en texto de una página: el título, la URL y el contenido de <main>, con los títulos como ##/###.
function textoPagina(html) {
  const titulo = entidades(html.match(/<title>([\s\S]*?)<\/title>/)[1].trim());
  const canonica = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
  const cuerpo = html.match(/<main>([\s\S]*?)<\/main>/)[1]
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, "")
    .replace(/<\/span>\s*<span/g, "</span> <span")
    .replace(/<li[^>]*>/g, "\n\n- ")
    .replace(/<h1[^>]*>/g, "\n\n## ").replace(/<h2[^>]*>/g, "\n\n### ").replace(/<h3[^>]*>/g, "\n\n#### ")
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|section|header|article|blockquote|figure|figcaption|table|tr)\b[^>]*>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "");
  const parrafos = entidades(cuerpo).split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  return `# ${titulo}\nURL: ${canonica}\n\n${parrafos.join("\n\n")}\n`;
}

// Las páginas que no son notas quedan como están; después van todas las notas, por orden alfabético del archivo.
// El texto de una nota que ya estaba se conserva (salvo --texto=<slug>); el de una nota nueva se genera del HTML.
function llmsCompleto(s) {
  const [cabecera, ...resto] = s.split("\n---\n");
  const limpio = (p) => p.replace(/^\n+/, "").replace(/\n+$/, "");
  const urlDe = (p) => p.match(/\nURL: (https:\/\/campuslatina\.com\/notas\/[^/\s]+)\n/)?.[1];
  const previos = Object.fromEntries(resto.filter(urlDe).map((p) => [urlDe(`\n${limpio(p)}`) || urlDe(p), limpio(p)]));
  const bloques = [
    ...resto.filter((p) => !urlDe(p)).map(limpio),
    ...[...notas].sort((a, b) => a.slug.localeCompare(b.slug)).map((n) => (!rehacer.has(n.slug) && previos[url(n)]) || limpio(textoPagina(n.html))),
  ];
  return `${cabecera}\n---\n${bloques.map((b, i) => `\n${b}\n${i < bloques.length - 1 ? "\n" : ""}`).join("\n---\n")}`;
}

function sitemap(s, cambioLaLista) {
  const previas = Object.fromEntries([...s.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
  const lineas = notas.map((n) => `  <url><loc>${url(n)}</loc><lastmod>${previas[url(n)] || hoy}</lastmod><priority>0.7</priority></url>`);
  s = s.replace(/\n {2}<url><loc>https:\/\/campuslatina\.com\/notas\/[^<]+<\/loc>.*<\/url>/g, "");
  s = reemplazar(s, /(\n {2}<url><loc>https:\/\/campuslatina\.com\/notas\/<\/loc>.*<\/url>)/, (_, a) => `${a}\n${lineas.join("\n")}`, "sitemap.xml (/notas/)");
  if (cambioLaLista) s = s.replace(/(<loc>https:\/\/campuslatina\.com\/(?:notas\/)?<\/loc><lastmod>)[^<]+/g, `$1${hoy}`);
  return s;
}

// ── APLICAR ───────────────────────────────────────────────
const cambios = [];
const aplicar = (archivo, nuevo) => {
  const viejo = leer(archivo);
  if (nuevo === viejo) return false;
  cambios.push(archivo);
  if (!revisar) writeFileSync(join(RAIZ, archivo), nuevo);
  return true;
};
const lista1 = aplicar("notas/index.html", indiceNotas(leer("notas/index.html")));
const lista2 = aplicar("index.html", portada(leer("index.html")));
aplicar("llms.txt", llms(leer("llms.txt")));
aplicar("llms-full.txt", llmsCompleto(leer("llms-full.txt")));
aplicar("sitemap.xml", sitemap(leer("sitemap.xml"), lista1 || lista2));

console.log(`${notas.length} notas, de la más nueva a la más vieja:`);
notas.forEach((n) => console.log(`  ${n.fecha}  ${n.slug}  (${n.autor}, ${n.lectura} min)`));
console.log(cambios.length ? `${revisar ? "Cambiaría" : "Actualicé"}: ${cambios.join(", ")}` : "Todo estaba al día.");
