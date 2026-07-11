# Módulo de Ventas y Promociones — Antojito's Cakes

Módulo independiente (HTML, CSS y JavaScript puro, sin backend) para registrar
ventas en caja, administrar promociones y llevar un registro de compradores.
Toda la información se guarda en el `localStorage` del navegador donde se abre
el módulo — no depende de Google Sheets ni de los servidores Python del resto
del sistema.

## Tecnologías utilizadas

Este módulo se construyó **100% con tecnologías nativas del navegador**, sin
frameworks ni pasos de compilación (no hay `npm install`, `build`, ni
dependencias que descargar para que el módulo funcione). Esto fue una decisión
deliberada: cualquier navegador moderno puede ejecutarlo abriendo un archivo
`.html`, sin instalar nada.

### Frontend (lenguaje base)
- **HTML5** — estructura semántica de las 12 páginas del módulo (`login.html`,
  `index.html`, `ventas.html`, `clientes.html`, `precios.html`,
  `inventario.html`, `promociones.html`, `pedidos.html`, `historial.html`,
  `reportes.html`, `auditoria.html`, `respaldo.html`).
- **CSS3** — una única hoja de estilos (`css/style.css`) con variables CSS
  (`:root { --pink, --gold, --radius, --shadow, ... }`), `flexbox` y `grid`
  para los layouts, gradientes, `border-radius`, `box-shadow` y transiciones
  para las animaciones de botones/tarjetas. Sin Bootstrap, Tailwind ni ningún
  framework de CSS — todo el diseño (paleta rosa/dorado, tarjetas, badges,
  tabs de navegación) está escrito a mano y reutiliza la identidad visual del
  catálogo público (`antojitos-deploy/catalogo.html`).
- **JavaScript (ES6, "vanilla")** — sin frameworks (no React/Vue/Angular) ni
  librerías externas (no jQuery). Cada página tiene su propio script
  controlador que se ejecuta dentro de una IIFE (`(function () { ... })()`)
  para no contaminar el ámbito global. Se usa `Array.prototype` (`map`,
  `filter`, `forEach`, `find`, `reduce`) para manipular datos y
  `document.querySelector(All)` + `addEventListener` para interactuar con el
  DOM directamente (sin virtual DOM).

### APIs del navegador (Web APIs nativas)
- **`localStorage`** — persistencia de usuarios, clientes, ventas, banner y
  reglas de promoción entre sesiones (ver `js/store.js`, objeto `STORE_KEYS`).
- **`sessionStorage`** — la sesión de inicio de sesión activa y el carrito de
  compra en curso, que se borran solos al cerrar la pestaña/navegador (o al
  cerrar sesión) — pensado para un equipo de caja compartido.
- **Web Crypto API (`crypto.subtle.digest`, SHA-256)** — hash de contraseñas
  antes de guardarlas, con una función `hashPassword()` en `js/store.js` que
  cae a un hash FNV-1a manual si el navegador bloquea `SubtleCrypto` (esto
  ocurre al abrir el archivo directamente con `file://` sin contexto seguro).
- **`Blob` + `URL.createObjectURL()`** — generación del archivo `.json` de
  respaldo descargable, sin necesidad de un servidor (`js/backup.js`,
  función `exportarRespaldo()`).
- **`File` API (`<input type="file">` + `File.text()`)** — lectura del
  archivo `.json` seleccionado por el usuario para restaurar un respaldo
  (`js/backup.js`, función `leerArchivoRespaldo()`), con `JSON.parse()` y
  manejo de errores si el archivo no es válido.
- **`URLSearchParams`** — lectura de parámetros de la URL para precargar una
  promoción sugerida desde Reportes hacia Promociones (`js/promociones.js`,
  función `prellenarDesdeQueryParams()`).
- **`Date` / `Intl` (vía `toLocaleString`)** — formateo de fechas legibles en
  español (respaldo, historial, reportes).

### Tipografías (Google Fonts / CDN)
- **Poppins** — tipografía de texto general (cuerpos, botones, formularios).
- **Bodoni Moda** — tipografía secundaria de acento serif.
- **Dancing Script** — tipografía cursiva decorativa.
- **Angel Club** (vía `fonts.cdnfonts.com`) — tipografía del logotipo/título
  de marca en el encabezado.

### Herramientas de desarrollo y documentación (no forman parte del runtime)
- **Mermaid** (`classDiagram`, `erDiagram`, `flowchart`) — los 6 diagramas de
  arquitectura y proceso en `Diagramas/` (clases UML, entidad-relación,
  almacenamiento, flujo de procesos, casos de uso y flujo de datos), escritos
  como texto plano en archivos `.mmd`.
- **Mermaid CLI** (`@mermaid-js/mermaid-cli`, ejecutado con `npx`) — usado
  únicamente para exportar esos diagramas a `.png`; no es una dependencia del
  módulo en sí.
- **Python** (`python -m http.server`) — servidor estático opcional para
  probar el módulo con rutas `http://` en vez de `file://` (necesario, por
  ejemplo, para que `SubtleCrypto` funcione sin restricciones). No es parte
  del código del módulo, solo una forma cómoda de servirlo en desarrollo.

### Lo que **no** se usó (a propósito)
- Sin backend/servidor de aplicación (no Node/Express, no PHP, no Python en
  producción) — todo corre en el cliente.
- Sin base de datos SQL/NoSQL real — los "datos" son JSON dentro de
  `localStorage` (ver `Diagramas/diagrama_almacenamiento.mmd`).
- Sin frameworks de frontend (React, Vue, Angular, Svelte) ni bundlers
  (Webpack, Vite) — cada página carga sus `<script>` directamente en orden.
- Sin librerías de UI (Bootstrap, Material UI) — todo el CSS es propio.

## Cómo ejecutarlo

Abre `login.html` (o `index.html`) directamente en el navegador con doble clic,
o sírvelo con cualquier servidor estático local, por ejemplo:

```bash
python -m http.server 8090
```

y entra a `http://localhost:8090/login.html`.

## Usuarios de prueba (se crean automáticamente la primera vez)

| Usuario     | Contraseña       | Rol                         |
|-------------|------------------|------------------------------|
| `admin`     | `admin123`       | Administrador general        |
| `cajero`    | `cajero123`      | Encargado de caja/ventas     |

Permisos por rol:
- **Administrador**: ventas, clientes, precios (editar el precio de venta de cualquier presentación), inventario (agregar/eliminar productos y controlar stock), promociones (banner, reglas "compra N, llévate M gratis" y descuentos por porcentaje), pedidos (calendario, alertas de entrega y reserva de stock), historial (con descarga de PDF por periodo), reportes (con descarga de PDF por periodo), auditoría (registro de todas las acciones de los usuarios) y respaldo (descargar/restaurar la base de datos).
- **Cajero**: puede procesar ventas, registrar/editar/eliminar clientes y gestionar pedidos; no tiene acceso a precios, inventario, promociones, historial, reportes, auditoría ni respaldo.

Las contraseñas no se guardan en texto plano: se hashean (SHA-256 vía
`crypto.subtle`, con un hash simple de respaldo si el navegador no permite
`SubtleCrypto` al abrir el archivo con `file://`). Esto es apropiado para un
prototipo académico 100% cliente — no reemplaza una autenticación real de
backend si el sistema evoluciona a producción.

## Estructura

```
Modulo_Ventas_Promociones/
├── index.html            Redirección automática según sesión activa (a ventas/clientes o a login)
├── login.html            Pantalla de acceso (usuario + contraseña)
├── ventas.html           Punto de venta: catálogo (con stock), carrito (persistente + vaciar), modal "Agregar cliente" con autocompletado por cédula, descuentos, promoción automática, checkout
├── clientes.html         Registro de compradores (nombre, cédula, teléfono) + búsqueda por nombre/cédula/teléfono + editar/eliminar
├── precios.html          Edición del precio de venta de cada presentación, mayor a $0 (solo admin)
├── inventario.html       Alta y eliminación de productos + control de stock por presentación (solo admin)
├── promociones.html      Banner, reglas "compra N, llévate M gratis" y descuentos por porcentaje (solo admin)
├── pedidos.html          Calendario mensual de pedidos especiales + alertas de entrega en 48h + producto de catálogo (reserva stock) o personalizado (cajero y admin)
├── historial.html        Historial de ventas registradas, con búsqueda por cliente/cédula/teléfono y descarga de PDF por periodo (solo admin)
├── reportes.html         Ranking de productos más/menos vendidos, sugerencias de promoción, barra Desde/Hasta y descarga de PDF con fechas en formato día/mes/año (solo admin)
├── auditoria.html        Registro de todas las acciones de los usuarios (login, ventas, cambios de precio/stock, clientes, pedidos, respaldo...) (solo admin)
├── respaldo.html         Descarga y restauración del respaldo .json de todos los datos (solo admin)
├── css/style.css         Identidad visual tomada de antojitos-deploy/catalogo.html + estilos de impresión (#printArea), calendario y modales
├── js/
│   ├── store.js          Acceso a localStorage/sessionStorage + hash de contraseñas (SHA-256) + datos semilla + registrarAuditoria()
│   ├── auth.js            Sesión, matriz de permisos por rol, control de navegación y registro de logout
│   ├── productos.js       Catálogo estático + catálogo combinado con productos de Inventario (getCatalogoCompleto) + precios efectivos + stock (getStock/setStock/descontarStock/restaurarStock/hayStockSuficiente)
│   ├── promos.js          Motor de promociones: "compra N, llévate M gratis" y descuentos por porcentaje + banner
│   ├── backup.js          Exportar/validar/restaurar el respaldo .json (sin backend)
│   ├── login.js, ventas.js, clientes.js, precios.js, inventario.js, promociones.js, pedidos.js
│   ├── historial.js, reportes.js, auditoria.js, respaldo.js
│   └── demo.js            Datos de ejemplo para pruebas/demostraciones (solo respaldo.html) — aislado, se puede borrar sin tocar nada más
├── Diagramas/             Diagramas Mermaid (procesos, casos de uso, flujo de datos, clases UML, entidad-relación, almacenamiento) + PNG exportados
└── imagenes/              Logo + fotos de los productos incluidos en el punto de venta
```

## Notas importantes

- **Cliente inline desde el carrito (modal)**: en `ventas.html` ya no hay un
  desplegable con todos los clientes — "+ Agregar cliente" abre una ventana
  modal (no un panel dentro del carrito) con el campo de cédula. Si ya existe
  un cliente con esa cédula se autocompletan nombre y teléfono (solo lectura)
  y basta con "Usar este cliente en la venta"; si no existe, se registra ahí
  mismo y queda agregado a la venta. Una vez agregado, se muestra su nombre
  con un botón "Quitar" para deshacerlo.
- **Ventas condicionadas al stock**: si una presentación tiene stock
  controlado (puesto desde `inventario.html`), `ventas.html` no deja agregar
  al carrito (ni incrementar cantidad) más unidades de las disponibles — el
  botón "+" se deshabilita y muestra "Agotado" cuando llega a 0. Al finalizar
  la venta se descuenta el stock vendido; las presentaciones sin stock
  asignado ("sin controlar") no tienen límite.
- **Cliente por cédula en Pedidos**: `pedidos.html` tiene el mismo campo de
  cédula con autocompletado (en vez del desplegable de clientes que tenía
  antes) — el nombre y teléfono se llenan solos si el cliente ya está
  registrado, o quedan libres para escribirlos si es alguien nuevo. La cédula
  es solo un atajo para llenar el formulario; el pedido guarda nombre y
  teléfono como texto, no una referencia al cliente.
- **Pedidos: producto del catálogo (reserva stock) o personalizado**: al
  crear/editar un pedido se elige entre "Personalizado" (fuera de catálogo,
  no toca stock — para encargos que no están en el menú) o "Del catálogo"
  (se elige producto, presentación y cantidad; esa cantidad se descuenta del
  stock de inmediato, como una reserva, para que `ventas.html` no vuelva a
  vender algo ya apartado). Editar la cantidad o el producto ajusta la
  reserva (libera la anterior y aplica la nueva); eliminar el pedido devuelve
  el stock reservado. Marcar un pedido como "Completado" no cambia el stock
  — ya estaba reservado desde que se creó.
- **Pedidos: aviso de producción en vez de bloqueo**: si al pedir una
  cantidad no alcanza el stock disponible, el pedido **no se rechaza** — se
  reserva lo que haya (`cantidadReservada`, puede ser menor que
  `cantidadProducto`) y el resto queda marcado como pendiente de producir.
  Se avisa en tres lugares: un mensaje en tiempo real al elegir producto y
  cantidad ("faltarían N por producir"), un toast al guardar, y una insignia
  roja "⚠️ Producir N" que queda visible en la tabla de pedidos, en la
  sección de alertas (48h) y en el tooltip del punto del calendario mientras
  el pedido siga sin cubrirse por completo. Volver a editar el pedido
  recalcula la reserva contra el stock actual (por ejemplo, después de que
  Inventario reciba producción nueva).
- **Vaciar carrito**: botón junto a "Finalizar venta" en `ventas.html`, con
  confirmación antes de borrar todos los ítems del carrito en curso.
- **Descuentos por porcentaje**: `promociones.html` permite crear reglas de
  "X% de descuento" sobre un producto específico (independientes de las
  reglas "compra N, llévate M gratis"). Se aplican automáticamente en
  `ventas.html` — el catálogo y el carrito muestran el precio original
  tachado, el precio con descuento y una insignia "-X%"; el precio ya
  descontado es el que queda registrado en la venta.
- **Inventario (agregar productos + stock)**: `inventario.html` (solo admin)
  permite crear productos nuevos (nombre, categoría, imagen, una o más
  presentaciones con su precio) sin tocar `js/productos.js` — se guardan en
  `localStorage` y `getCatalogoCompleto()` los combina con el catálogo
  estático para que aparezcan en Ventas, Reportes, Promociones y Precios como
  cualquier otro producto. También permite ponerle una cantidad de stock a
  cualquier presentación (estática o nueva); mientras no se le asigne una
  cantidad se muestra como "sin controlar" (sin límite de venta). El precio de
  cada presentación nueva debe ser mayor a $0 (igual que en `precios.html`,
  que tampoco permite bajar un precio a $0). Cualquier producto se puede
  eliminar (con confirmación): los agregados aquí se borran por completo; los
  del catálogo base (definidos en `js/productos.js`) no se pueden borrar del
  código, así que se ocultan guardando su id en `STORE_KEYS.PRODUCTOS_OCULTOS`
  — desaparecen de Ventas, Reportes, Promociones y Precios igual que si se
  hubieran borrado.
- **Pedidos (calendario + alertas)**: `pedidos.html` (cajero y admin) registra
  encargos especiales con fecha/hora de entrega, monto y abono. Incluye un
  calendario mensual (construido en JS puro, sin librerías) que resalta el
  día actual según la fecha del sistema (`new Date()`) y marca con puntos de
  color los días con pedidos, y una sección de alertas que lista los pedidos
  pendientes cuya entrega esté a 48 horas o menos (o ya vencida).
- **Reportes en formato día/mes/año**: el periodo seleccionado se muestra
  como "8 de julio de 2026" tanto en pantalla como en el PDF, en vez de la
  fecha ISO cruda.
- **Barra Desde/Hasta en Reportes**: `reportes.html` ya no tiene un botón
  "Personalizado" — la barra Desde/Hasta (igual que en `historial.html`,
  incluye "Generar reporte" y "Limpiar filtros") está siempre visible y es la
  única fuente del periodo. Los botones Hoy / Últimos 7 días / Últimos 30
  días / Todo el historial solo rellenan esa barra y generan el reporte de
  inmediato; si se editan las fechas a mano, esos botones se desmarcan porque
  ya no reflejan lo que se está mostrando.
- **Carrito persistente**: el carrito de `ventas.html` se guarda en
  `sessionStorage` (clave `STORE_KEYS.CART`) cada vez que cambia. Como el
  módulo no es una SPA (cada pestaña del menú es una página distinta), sin
  esto el carrito se perdía al navegar a otra sección y volver. Se limpia
  sola al cerrar sesión (`logout()` en `auth.js`) o al cerrar el navegador —
  igual que la sesión de login, para que un cajero no herede el carrito de
  otro en un equipo compartido.
- **Descarga de reportes en PDF**: los botones "Descargar PDF" de `historial.html`
  y `reportes.html` no generan el archivo con una librería externa — arman un
  `#printArea` con el contenido del periodo filtrado y llaman a `window.print()`
  (API nativa del navegador). El usuario elige "Guardar como PDF" en el diálogo
  de impresión. Es la misma filosofía 100% nativa del resto del módulo.
- **Cédula obligatoria**: `clientes.html` exige cédula al registrar un
  comprador y no permite registrar dos clientes con la misma cédula. Los
  campos de cédula y teléfono solo aceptan dígitos — cualquier letra u otro
  carácter se filtra mientras se escribe (o se pega texto).
- **Editar y eliminar clientes**: cada fila de la tabla de `clientes.html`
  tiene botones "Editar" (precarga el formulario para modificar nombre,
  cédula, teléfono o correo) y "Eliminar" (pide confirmación; si el cliente
  tiene ventas asociadas, la venta no se borra pero queda como "Sin
  registrar").
- **Precios editables**: `precios.html` (solo admin) permite sobrescribir el
  precio de cualquier presentación sin tocar `js/productos.js`; el cambio se
  guarda en `localStorage` y se refleja de inmediato en `ventas.html`. Las
  ventas ya registradas conservan el precio que tenían al momento de la venta.
- **Precios de bebidas**: la categoría "Bebidas" (Café, Refresco, Jugo Natural)
  no existe en el catálogo web público — se agregó con precios de referencia
  ($2.00, $1.50, $2.50) para poder operar la caja y probar la promoción tipo
  "2x1 café". Ajusta esos precios en `js/productos.js` a los reales del punto
  de venta antes de usarlo con clientes reales.
- **Auditoría**: `auditoria.html` (solo admin) lista cada acción que hace
  cualquier usuario — login/login fallido/logout, ventas, carrito vaciado,
  clientes creados/editados/eliminados, precios editados/restablecidos,
  productos/stock de inventario, banner/reglas/descuentos de promociones,
  pedidos creados/editados/completados/eliminados, y respaldo exportado o
  restaurado — con fecha/hora, usuario, rol y un detalle en texto. Se llena
  con `registrarAuditoria()` (`js/store.js`) desde cada punto de mutación de
  datos del resto de los módulos. Es de solo lectura y no se incluye en el
  respaldo/restauración: es un historial independiente que no debería poder
  "rebobinarse" restaurando un respaldo viejo.
- **Respaldo ampliado**: `respaldo.html` ahora también incluye los productos
  agregados desde Inventario, los niveles de stock y los pedidos (antes solo
  cubría usuarios, clientes, ventas, banner, reglas de promoción y precios).
  Los respaldos generados antes de este cambio se siguen pudiendo restaurar
  sin problema — esas colecciones nuevas simplemente quedan vacías.
- **Datos de ejemplo para demostración**: al final de `respaldo.html` hay un
  panel "🎬 Datos de ejemplo para demostración" con dos botones: "Cargar
  datos de ejemplo" (le pone 5 unidades de stock a **todas** las
  presentaciones que ya existen en el catálogo — base y agregadas en
  Inventario — y agrega 2 clientes y 2 pedidos marcados "(demo)", uno de
  ellos con reserva de stock y entrega mañana para mostrar la alerta de 48h)
  y "Quitar datos de ejemplo" (borra esos clientes/pedidos y devuelve el
  stock **exactamente** a como estaba antes de cargarlo — si un producto ya
  tenía una cantidad real asignada, la recupera tal cual; no se guarda como
  "5" a la fuerza). Pensado para facilitar pruebas y presentaciones — todo
  el código vive aislado en `js/demo.js`, cargado solo desde `respaldo.html`.
  Para quitar esta funcionalidad del proyecto: borra `js/demo.js`, el bloque
  `<div class="panel" id="demoPanel">...</div>` y la línea
  `<script src="js/demo.js"></script>` en `respaldo.html` (los tres puntos
  están marcados con comentarios `BLOQUE DE DATOS DE DEMOSTRACIÓN` en el
  archivo). Ningún otro archivo depende de `js/demo.js`.
- Los encargos "a consultar" (buttercream personalizada, temática,
  corporativos, gelatina) no tienen un precio fijo para cobrar al instante,
  así que no se incluyeron en el punto de venta — se gestionan como pedidos
  especiales desde `pedidos.html` (con su propio monto acordado y fecha de
  entrega) en vez de como una venta de caja.
- Este módulo es autocontenido: las fotos de producto están copiadas en su
  propia carpeta `imagenes/`, así que se puede mover a cualquier ubicación sin
  romper nada.
- Para reiniciar todos los datos de prueba (usuarios, ventas, clientes,
  promociones), borra el `localStorage` del sitio desde las herramientas de
  desarrollador del navegador.
#   a n t o j i t o s _ s a l e s  
 