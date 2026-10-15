#!/usr/bin/env node
/*
 * verificar.js — Revisión automática de proyectos web (React + Node.js) por versiones.
 * Curso: Desarrollo de aplicaciones web con React y Node.js.
 *
 * USO (en la carpeta principal del proyecto del estudiante, con Node 18 o superior):
 *   node verificar.js
 *   node verificar.js --api http://localhost:3000/api/productos
 *   node verificar.js --api https://api.midominio.com/api/productos --web https://midominio.com
 *   node verificar.js --build          (además compila el frontend con npm run build)
 *
 * No modifica nada del proyecto. Al final guarda el reporte en reporte-verificacion.txt
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : null; };
const API = arg('api');
const WEB = arg('web');
const BUILD = args.includes('--build');
const RAIZ = process.cwd();
const IGNORAR = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.vercel', '.netlify']);

const lineas = [];
const out = (t = '') => { lineas.push(t); console.log(t); };
const ok = (t) => out(`  [OK] ${t}`);
const mal = (t) => out(`  [X]  ${t}`);
const ojo = (t) => out(`  [!]  ${t}`);
const info = (t) => out(`       ${t}`);
const titulo = (t) => { out(''); out(t); out('-'.repeat(t.length)); };

function sh(cmd, cwd = RAIZ) {
  try { return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', timeout: 300000 }).trim(); }
  catch { return null; }
}

// Archivos del proyecto (sin node_modules ni compilados)
function listar(dir, prof = 0, res = []) {
  if (prof > 8) return res;
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return res; }
  for (const it of items) {
    if (IGNORAR.has(it.name)) continue;
    const p = path.join(dir, it.name);
    if (it.isDirectory()) listar(p, prof + 1, res); else res.push(p);
  }
  return res;
}
const archivos = listar(RAIZ);
const rel = (p) => path.relative(RAIZ, p).replace(/\\/g, '/');
const leer = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
// Código sin comentarios (para no confundir un comentario con código real)
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const leerCodigo = (p) => sinComentarios(leer(p));
const codigo = archivos.filter((f) => /\.(jsx?|tsx?|mjs|cjs)$/.test(f) && !/\.config\.|\.min\./.test(f));
const contar = (lista, re) => lista.reduce((n, f) => n + (leerCodigo(f).match(re) || []).length, 0);
const conCoincidencia = (lista, re) => lista.filter((f) => re.test(leerCodigo(f)));

// Proyectos Node (package.json) dentro de la carpeta
const paquetes = archivos.filter((f) => path.basename(f) === 'package.json').map((f) => {
  let j = {}; try { j = JSON.parse(leer(f)); } catch { /* json inválido */ }
  const deps = { ...(j.dependencies || {}), ...(j.devDependencies || {}) };
  return { dir: path.dirname(f), nombre: rel(path.dirname(f)) || '(raíz)', deps, scripts: j.scripts || {} };
});
const tiene = (dep) => paquetes.some((p) => p.deps[dep]);
const front = paquetes.find((p) => p.deps.react) || null;
const back = paquetes.find((p) => p.deps.express || p.deps.fastify || p.deps['@nestjs/core']) || null;
const codigoDe = (pkg) => (pkg ? codigo.filter((f) => f.startsWith(pkg.dir + path.sep)) : []);
// Si el backend está dentro de la carpeta del frontend (o al revés), cada uno se queda solo con lo suyo.
const dentroDe = (f, pkg) => pkg && f.startsWith(pkg.dir + path.sep);
const codFront = front ? codigoDe(front).filter((f) => !(back && back.dir !== front.dir && back.dir.startsWith(front.dir) && dentroDe(f, back))) : [];
const codBack = back ? codigoDe(back).filter((f) => !(front && front.dir !== back.dir && front.dir.startsWith(back.dir) && dentroDe(f, front))) : [];

out('REPORTE DE VERIFICACIÓN DEL PROYECTO');
out(`Carpeta: ${RAIZ}`);
out(`Fecha:   ${new Date().toLocaleString('es-PE')}`);
out(`Node:    ${process.version}`);

// ---------------------------------------------------------------- Git
titulo('0. Repositorio y autoría (Git)');
const esGit = sh('git rev-parse --is-inside-work-tree') === 'true';
if (!esGit) {
  mal('La carpeta no es un repositorio Git (no hay historial que revisar).');
} else {
  const commits = Number(sh('git rev-list --count HEAD') || 0);
  const dias = new Set((sh('git log --format=%ad --date=short') || '').split('\n').filter(Boolean));
  const fechas = (sh('git log --format=%ad --date=short') || '').split('\n').filter(Boolean);
  const primero = fechas[fechas.length - 1] || '';
  const ultimo = (sh('git log -1 --format=%ad --date=short') || '');
  (commits >= 10 ? ok : commits >= 4 ? ojo : mal)(`${commits} commits en ${dias.size} días distintos (del ${primero} al ${ultimo}).`);
  const autores = sh('git shortlog -sne HEAD');
  if (autores) { info('Autores:'); autores.split('\n').forEach((a) => info('  ' + a.trim())); }
  const tags = (sh('git tag --list') || '').split('\n').filter(Boolean);
  if (tags.length) { ok(`Etiquetas de versión: ${tags.join(', ')}`); tags.forEach((t) => info(`  ${t}: ${sh(`git log -1 --format=%ad --date=short ${t}`)}`)); }
  else ojo('No hay etiquetas de versión (git tag v1.0, v2.0...).');
  const remoto = sh('git remote get-url origin');
  remoto ? ok(`Repositorio remoto: ${remoto}`) : ojo('No tiene repositorio remoto (GitHub/GitLab).');
  const trackeados = (sh('git ls-files') || '').split('\n');
  const envSubidos = trackeados.filter((f) => /(^|\/)\.env(\.[a-z]+)?$/i.test(f) && !/\.example$|\.sample$/i.test(f));
  envSubidos.length ? mal(`Archivo .env subido al repositorio: ${envSubidos.join(', ')}`) : ok('Ningún .env subido al repositorio.');
  const envHistoria = sh('git log --all --format=%h --diff-filter=A -- "*.env" ".env" "**/.env"');
  if (envHistoria) mal(`Un .env estuvo en el historial (commit ${envHistoria.split('\n')[0]}): sus claves siguen expuestas aunque lo haya borrado.`);
  const nmSubido = trackeados.some((f) => f.includes('node_modules/'));
  nmSubido ? mal('node_modules está subido al repositorio.') : ok('node_modules no está en el repositorio.');
}
const gitignores = archivos.filter((f) => path.basename(f) === '.gitignore');
const gi = gitignores.map(leer).join('\n');
gitignores.length ? (/node_modules/.test(gi) && /\.env/.test(gi) ? ok('.gitignore incluye node_modules y .env.') : ojo('.gitignore existe pero no incluye node_modules y/o .env.')) : mal('No hay archivo .gitignore.');

// ---------------------------------------------------------------- Estructura
titulo('Estructura detectada');
if (!paquetes.length) mal('No se encontró ningún package.json.');
paquetes.forEach((p) => info(`package.json en ${p.nombre}: ${Object.keys(p.deps).filter((d) => /^(react|react-dom|react-router-dom|vite|next|express|cors|axios|mysql2|pg|mongoose|sequelize|prisma|@prisma\/client|bcrypt|bcryptjs|jsonwebtoken|dotenv|zod|joi|express-validator|helmet)$/.test(d)).join(', ') || '(sin dependencias relevantes)'}`));

// ---------------------------------------------------------------- V1
titulo('1. Versión 1 — Frontend en React');
if (!front) mal('No se encontró un proyecto React (dependencia "react").');
else {
  ok(`Proyecto React en ${front.nombre}`);
  const comps = codFront.filter((f) => /\.(jsx|tsx)$/.test(f));
  (comps.length >= 6 ? ok : comps.length >= 3 ? ojo : mal)(`${comps.length} archivos de componentes (.jsx/.tsx).`);
  const grandes = comps.map((f) => [rel(f), leer(f).split('\n').length]).filter(([, n]) => n > 300);
  grandes.forEach(([f, n]) => ojo(`Archivo muy grande (${n} líneas): ${f}. Probablemente debería dividirse.`));
  const us = contar(codFront, /\buseState\s*\(/g), ue = contar(codFront, /\buseEffect\s*\(/g);
  (us > 0 ? ok : mal)(`useState usado ${us} veces.`);
  (ue > 0 ? ok : ojo)(`useEffect usado ${ue} veces.`);
  tiene('react-router-dom') ? ok(`React Router instalado; ${contar(codFront, /<Route\b/g)} rutas <Route> encontradas.`) : mal('React Router (react-router-dom) no está instalado.');
  const forms = contar(codFront, /<form\b/gi);
  (forms > 0 ? ok : ojo)(`${forms} formularios <form>.`);
  const resp = contar(archivos.filter((f) => /\.(css|scss)$/.test(f)), /@media/g) + contar(codFront, /\b(sm|md|lg|xl):/g);
  (resp > 0 ? ok : ojo)(resp > 0 ? 'Hay reglas responsive (@media o clases sm:/md:/lg:).' : 'No se encontraron reglas responsive (@media). Revisar en modo celular.');
  if (BUILD && front.scripts.build) {
    info('Compilando el frontend (npm run build)...');
    const r = sh('npm run build', front.dir);
    r !== null ? ok('npm run build terminó sin errores.') : mal('npm run build falló. El proyecto no compila para producción.');
  } else if (!BUILD) info('Para compilar el frontend agregue --build (requiere haber hecho npm install).');
}

// ---------------------------------------------------------------- V2
titulo('2. Versión 2 — Backend con API REST');
if (!back) mal('No se encontró un backend Node.js (dependencia "express").');
else {
  ok(`Backend en ${back.nombre}`);
  const verbos = { GET: /\.(get)\s*\(\s*['"`]/g, POST: /\.(post)\s*\(\s*['"`]/g, PUT: /\.(put|patch)\s*\(\s*['"`]/g, DELETE: /\.(delete)\s*\(\s*['"`]/g };
  const cuenta = Object.fromEntries(Object.entries(verbos).map(([k, re]) => [k, contar(codBack, re)]));
  const total = Object.values(cuenta).reduce((a, b) => a + b, 0);
  (total >= 4 ? ok : total > 0 ? ojo : mal)(`Rutas: GET ${cuenta.GET} · POST ${cuenta.POST} · PUT/PATCH ${cuenta.PUT} · DELETE ${cuenta.DELETE}`);
  tiene('cors') || contar(codBack, /Access-Control-Allow-Origin/g) ? ok('CORS configurado (paquete cors o cabecera manual).') : mal('No se encontró configuración de CORS.');
  const consumo = front ? conCoincidencia(codFront, /\bfetch\s*\(|\baxios\b/).length : 0;
  (consumo > 0 ? ok : mal)(`${consumo} archivos del frontend consumen la API (fetch/axios).`);
  const routers = codBack.filter((f) => /routes?|router|controller/i.test(rel(f))).length;
  (routers > 0 ? ok : ojo)(routers > 0 ? `Backend organizado: ${routers} archivos de rutas/controladores.` : 'Todo el backend parece estar en un solo archivo.');
  const puertoEnv = contar(codBack, /process\.env\.PORT/g);
  (puertoEnv ? ok : ojo)(puertoEnv ? 'El puerto se toma de process.env.PORT.' : 'El puerto está fijo en el código (en hosting debe venir de process.env.PORT).');
}

// ---------------------------------------------------------------- V3
titulo('3. Versión 3 — Base de datos, login y seguridad');
const bd = ['mysql2', 'mysql', 'pg', 'mongoose', 'mongodb', 'sequelize', 'prisma', '@prisma/client', 'sqlite3', 'better-sqlite3'].filter(tiene);
bd.length ? ok(`Base de datos: ${bd.join(', ')}`) : mal('No se encontró librería de base de datos (mysql2, pg, mongoose, sequelize, prisma...).');
tiene('bcrypt') || tiene('bcryptjs') || tiene('argon2') ? ok('Contraseñas con hash (bcrypt/bcryptjs/argon2).') : mal('No hay librería de hash de contraseñas: probablemente se guardan en texto plano.');
tiene('jsonwebtoken') || tiene('express-session') || tiene('passport') ? ok('Autenticación con token o sesión (jsonwebtoken/express-session/passport).') : ojo('No se encontró jsonwebtoken, express-session ni passport.');
const roles = contar(codBack, /\brol(e|es)?\b/gi);
(roles ? ok : ojo)(roles ? `El backend menciona roles ${roles} veces.` : 'No se encontraron referencias a roles en el backend.');
tiene('zod') || tiene('joi') || tiene('express-validator') || tiene('yup') ? ok('Validación de datos con librería (zod/joi/express-validator/yup).') : ojo('Sin librería de validación: revisar que el backend valide los datos a mano.');
// Consulta SQL que mete directamente lo que envía el usuario (req.body, req.query, req.params) o concatena texto con +
const sqlConcat = codBack.filter((f) => {
  const t = leerCodigo(f);
  return /(SELECT|INSERT|UPDATE|DELETE)[^;]{0,400}?\$\{\s*req\.(body|query|params)/i.test(t)
    || /(SELECT|INSERT|UPDATE|DELETE)[^;\n]{0,200}?['"]\s*\+\s*(req\.)?[A-Za-z_][\w.]*\s*\+\s*['"]/i.test(t);
});
sqlConcat.length ? mal(`Posible inyección SQL (consulta armada con texto del usuario) en: ${sqlConcat.map(rel).join(', ')}`) : ok('No se detectaron consultas SQL armadas concatenando texto.');

// ---------------------------------------------------------------- V4
titulo('4. Versión 4 — Despliegue y secretos');
const todoCodigo = codigo.concat(archivos.filter((f) => /\.(json|env\.example|ya?ml)$/.test(f)));
const secretos = [];
for (const f of todoCodigo) {
  const t = leer(f);
  if (/mongodb(\+srv)?:\/\/[^:\s'"]+:[^@\s'"]+@/.test(t)) secretos.push(`${rel(f)} (cadena de MongoDB con contraseña)`);
  if (/(password|passwd|secret|api[_-]?key)\s*[:=]\s*['"][^'"\s]{6,}['"]/i.test(t) && !/process\.env/.test(t.match(/(password|passwd|secret|api[_-]?key)\s*[:=]\s*['"][^'"\s]{6,}['"]/i)?.[0] || '')) secretos.push(`${rel(f)} (clave escrita en el código)`);
}
secretos.length ? secretos.forEach((s) => mal(`Posible secreto en el código: ${s}`)) : ok('No se detectaron contraseñas ni claves escritas en el código.');
const localhost = front ? conCoincidencia(codFront, /https?:\/\/(localhost|127\.0\.0\.1)/).map(rel) : [];
localhost.length ? ojo(`El frontend tiene "localhost" fijo en: ${localhost.join(', ')}. En producción debe usar una variable (import.meta.env / process.env).`) : ok('El frontend no tiene localhost escrito de forma fija.');
const leeme = archivos.find((f) => /^readme\.md$/i.test(path.basename(f)) && path.dirname(f) === RAIZ) || archivos.find((f) => /^readme\.md$/i.test(path.basename(f)));
if (!leeme) mal('No hay README.md.');
else { const n = leer(leeme).trim().split(/\s+/).length; (n >= 150 ? ok : ojo)(`README.md con ${n} palabras${n < 150 ? ' (muy corto para documentación técnica)' : ''}.`); }
archivos.some((f) => /vercel\.json|netlify\.toml|_redirects|render\.yaml|railway\.json|Procfile|Dockerfile/i.test(path.basename(f)))
  ? ok('Hay archivos de configuración de despliegue (vercel.json, netlify.toml, _redirects, Dockerfile...).')
  : ojo('No hay archivos de configuración de despliegue (en Vercel/Netlify sin _redirects o vercel.json, F5 en una ruta da 404).');

// ---------------------------------------------------------------- Pruebas en vivo
async function probar() {
  if (API) {
    titulo(`Prueba de la API: ${API}`);
    try {
      const t0 = Date.now();
      const r = await fetch(API, { headers: { Origin: 'http://ejemplo-de-origen.com' } });
      const ms = Date.now() - t0;
      const tipo = r.headers.get('content-type') || '';
      (r.ok ? ok : mal)(`Responde ${r.status} en ${ms} ms.`);
      /json/.test(tipo) ? ok('Devuelve JSON.') : mal(`No devuelve JSON (content-type: ${tipo || 'ninguno'}).`);
      r.headers.get('access-control-allow-origin') ? ok(`CORS activo: Access-Control-Allow-Origin = ${r.headers.get('access-control-allow-origin')}`) : ojo('La respuesta no trae Access-Control-Allow-Origin para otros orígenes (puede estar limitado a su dominio: correcto en producción).');
      const vacio = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
      if (vacio) ([400, 401, 403, 404, 405, 422].includes(vacio.status) ? ok : mal)(`POST con datos vacíos responde ${vacio.status}${[200, 201].includes(vacio.status) ? ' (aceptó datos vacíos: falta validación)' : ''}.`);
    } catch (e) { mal(`No responde: ${e.cause?.code || e.message}. ¿Está encendido el backend?`); }
  }
  if (WEB) {
    titulo(`Prueba del sitio publicado: ${WEB}`);
    const url = new URL(WEB);
    try {
      const r = await fetch(WEB);
      (r.ok ? ok : mal)(`El sitio responde ${r.status}.`);
      url.protocol === 'https:' ? ok('Usa HTTPS.') : mal('No usa HTTPS.');
      const html = await r.text();
      /localhost|127\.0\.0\.1/.test(html) ? ojo('El HTML publicado menciona localhost.') : ok('El HTML publicado no menciona localhost.');
      const js = (html.match(/src="([^"]+\.js)"/g) || []).map((s) => s.slice(5, -1)).slice(0, 3);
      for (const s of js) {
        const cod = await fetch(new URL(s, WEB)).then((x) => x.text()).catch(() => '');
        if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(cod)) mal(`El código publicado (${s}) llama a localhost: el login y los datos fallarán fuera de su laptop.`);
      }
      if (js.length) info(`Revisados ${js.length} archivos JavaScript publicados.`);
    } catch (e) { mal(`El sitio no responde: ${e.cause?.code || e.message}`); }
    try {
      const h = await fetch(`http://${url.host}/`, { redirect: 'manual' });
      [301, 302, 307, 308].includes(h.status) && /^https:/.test(h.headers.get('location') || '') ? ok('http:// redirige a https://.') : ojo(`http:// no redirige a https:// (responde ${h.status}).`);
    } catch { ojo('No se pudo probar la redirección de http a https.'); }
    try {
      const sub = await fetch(new URL('/ruta-de-prueba-del-docente', WEB));
      sub.ok ? ok('Recargar dentro de una ruta funciona (no da 404).') : mal(`Recargar dentro de una ruta da ${sub.status}: falta configurar las rutas de React en el hosting.`);
    } catch { /* sin red */ }
  }
  titulo('Resumen');
  const okN = lineas.filter((l) => l.startsWith('  [OK]')).length;
  const xN = lineas.filter((l) => l.startsWith('  [X]')).length;
  const aN = lineas.filter((l) => l.startsWith('  [!]')).length;
  out(`  ${okN} correctos · ${aN} para revisar · ${xN} problemas`);
  out('  Este reporte orienta la revisión; la nota se decide viendo el sistema funcionar y con la defensa del estudiante.');
  try { fs.writeFileSync(path.join(RAIZ, 'reporte-verificacion.txt'), lineas.join('\n'), 'utf8'); out(''); out('Reporte guardado en reporte-verificacion.txt'); } catch { /* sin permisos */ }
}
probar();
