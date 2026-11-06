// Imagen para compartir de una nota (1200×630, assets/notas/<slug>.png): etiqueta «Notas · Mes Año»,
// título en Newsreader, campo de líneas a la derecha y logo abajo. Es la que muestran LinkedIn y WhatsApp.
// Uso: node herramientas/imagen-nota.mjs <slug>    (necesita Google Chrome o Chromium instalado)
//      CHROME=/ruta/al/navegador node herramientas/imagen-nota.mjs <slug>   si no lo encuentra solo
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const slug = process.argv[2];
if (!slug || !existsSync(join(RAIZ, "notas", `${slug}.html`))) {
  console.error(`Uso: node herramientas/imagen-nota.mjs <slug>  (no encuentro notas/${slug || "<slug>"}.html)`);
  process.exit(1);
}

function buscarChrome() {
  const candidatos = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);
  const encontrado = candidatos.find((c) => existsSync(c));
  if (encontrado) return encontrado;
  for (const nombre of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try { return execFileSync("which", [nombre], { encoding: "utf8" }).trim(); } catch { /* sigue buscando */ }
  }
  console.error("No encuentro Google Chrome ni Chromium. Instalá uno o indicá la ruta con CHROME=/ruta/al/navegador.");
  process.exit(1);
}

// Campo de líneas de la marca: líneas que nacen dispersas y convergen a la derecha (mismo trazado que el
// informe del diagnóstico). Siempre igual: la semilla es fija.
function trazosCampo(w, h) {
  let s = 7; const R = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const lineas = [], puntos = [];
  const en = (p, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]); };
  const f = (n) => Number(n.toFixed(2));
  for (let i = 0; i < 52; i++) {
    const y0 = h * (0.02 + R() * 0.98), ye = h * (0.74 + (R() - 0.5) * 0.05);
    const p = [[-2, y0], [w * (0.22 + R() * 0.2), y0 + (R() - 0.5) * h * 0.45], [w * (0.58 + R() * 0.16), ye + (R() - 0.5) * h * 0.06], [w + 2, ye]].map((q) => q.map(f));
    lineas.push({ d: `M${p[0].join(" ")} C${p[1].join(" ")} ${p[2].join(" ")} ${p[3].join(" ")}`, opacidad: f(0.1 + R() * 0.3), ancho: f(0.12 + R() * 0.22) });
    if (i % 5 === 0) { const [cx, cy] = en(p, 0.15 + R() * 0.6); puntos.push({ cx: f(cx), cy: f(cy), r: f(0.5 + R() * 0.5), llega: false }); }
    if (i % 13 === 0) { const [cx, cy] = en(p, 0.9 + R() * 0.08); puntos.push({ cx: f(cx), cy: f(cy), r: 0.9, llega: true }); }
  }
  return { lineas, puntos };
}

const nota = readFileSync(join(RAIZ, "notas", `${slug}.html`), "utf8");
const titulo = nota.match(/<h1>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, "").trim();
const [, anio, mes] = nota.match(/"datePublished": "(\d{4})-(\d{2})/);
const tam = titulo.length > 72 ? 54 : titulo.length > 48 ? 62 : 72;
const { lineas, puntos } = trazosCampo(1200, 630);
const campo = `<svg viewBox="0 0 1200 630" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;-webkit-mask-image:linear-gradient(to right,transparent 30%,#000 72%);mask-image:linear-gradient(to right,transparent 30%,#000 72%)">${
  lineas.map((l) => `<path d="${l.d}" stroke="#0B6470" stroke-opacity="${Math.min(1, l.opacidad * 3.4)}" stroke-width="${l.ancho * 1.9}" fill="none"/>`).join("")}${
  puntos.map((p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r * 2.3}" fill="${p.llega ? "#F08C1A" : "#0B6470"}" fill-opacity="${p.llega ? 1 : 0.7}"/>`).join("")}</svg>`;
// URLs file:// válidas también en Windows (C:\… → file:///C:/…).
const archivoUrl = (...partes) => pathToFileURL(join(RAIZ, ...partes)).href;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Schibsted Grotesk";src:url(${archivoUrl("assets", "fonts", "schibsted-grotesk.woff2")});font-weight:400 700}
@font-face{font-family:"Newsreader";src:url(${archivoUrl("assets", "fonts", "newsreader.woff2")});font-weight:400}
*{margin:0;box-sizing:border-box}html,body{width:1200px;height:630px;overflow:hidden;background:#fff}
body{position:relative;font-family:"Schibsted Grotesk",sans-serif;color:#0A2329}
.t{position:absolute;left:80px;top:78px;width:760px}
.et{font-size:18px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#4D6166}
h1{font-family:Newsreader,serif;font-weight:400;font-size:${tam}px;line-height:1.08;letter-spacing:-.015em;margin-top:22px;text-wrap:balance}
.logo{position:absolute;left:80px;bottom:62px;height:54px}
</style></head><body>${campo}<div class="t"><div class="et">Notas · ${MESES[Number(mes) - 1]} ${anio}</div><h1>${titulo}</h1></div><img class="logo" src="${archivoUrl("assets", "campus-latina.svg")}"></body></html>`;

const tmp = mkdtempSync(join(tmpdir(), "imagen-nota-"));
try {
  const archivo = join(tmp, "imagen.html");
  writeFileSync(archivo, html);
  const salida = join(RAIZ, "assets", "notas", `${slug}.png`);
  execFileSync(buscarChrome(), ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--allow-file-access-from-files",
    "--force-device-scale-factor=1", "--window-size=1200,630", "--virtual-time-budget=3000", `--screenshot=${salida}`, pathToFileURL(archivo).href], { stdio: "ignore" });
  if (!existsSync(salida)) throw new Error("Chrome no generó la imagen.");
  console.log(`Listo: assets/notas/${slug}.png (${titulo.length} caracteres de título, ${MESES[Number(mes) - 1]} ${anio})`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
