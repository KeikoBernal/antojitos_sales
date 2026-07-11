// ── CATÁLOGO DE PRODUCTOS PARA VENTA EN CAJA ────────────────────────────────
// Precios de tortas/raciones tomados de antojitos-deploy/catalogo.html.
// La categoría "bebida" no existe en el catálogo web público (es solo para
// pedidos de delivery) — se agregó con precios de referencia para poder
// operar la caja y probar la promoción "2x1 café". Ajusta esos precios a
// los reales del punto de venta antes de usar el módulo en producción.
// Las fotos de producto están copiadas dentro de este módulo (imagenes/) en
// vez de referenciarse con "../antojitos-deploy/imagenes/" porque un servidor
// estático acotado a esta carpeta (o el modo file://) bloquea ese traversal.

var IMG_BASE = 'imagenes/';

var PRODUCTOS = [

  // ── TORTAS ENTERAS (precio según tamaño) ──
  { id:'torta_imposible', cat:'torta', name:'Imposible / Choque', img:IMG_BASE+'imposible_choque.png', badgeColor:'#E91E8C',
    variantes:[ {label:'15 porciones', price:39}, {label:'15 porc. c/Fresas', price:47} ] },
  { id:'torta_oreolate', cat:'torta', name:'Oreolate', img:IMG_BASE+'oreolate_torta.png', badgeColor:'#E91E8C',
    variantes:[ {label:'8 porciones', price:36}, {label:'15 porciones', price:48} ] },
  { id:'torta_chocolatico', cat:'torta', name:'Chocolatico', img:IMG_BASE+'chocolatico_torta.png', badgeColor:'#E91E8C',
    variantes:[ {label:'4 porciones', price:18}, {label:'8 porciones', price:28}, {label:'12 porciones', price:33}, {label:'20 porciones', price:61}, {label:'30 porciones', price:89}, {label:'40 porciones', price:122} ] },
  { id:'torta_flor_otono', cat:'torta', name:'Flor de Otoño', img:IMG_BASE+'flor_otono_torta.png', badgeColor:'#E91E8C',
    variantes:[ {label:'8 porciones', price:28}, {label:'15 porciones', price:44} ] },
  { id:'torta_chocofresa', cat:'torta', name:'Chocofresa / Arequipefresa', img:IMG_BASE+'chocofresa.png', badgeColor:'#E91E8C',
    variantes:[ {label:'8 porciones', price:39}, {label:'15 porciones', price:64} ] },
  { id:'torta_beso_angel', cat:'torta', name:'Beso de Ángel', img:IMG_BASE+'beso_angel.png', badgeColor:'#E91E8C',
    variantes:[ {label:'8 porciones', price:39}, {label:'15 porciones', price:64} ] },
  { id:'torta_3leches_frutal', cat:'torta', name:'3 Leches Frutales', img:IMG_BASE+'tres_leches_frutales.png', badgeColor:'#E91E8C',
    variantes:[ {label:'12 porc. c/fresa', price:54} ] },
  { id:'torta_3leches_natural', cat:'torta', name:'3 Leches Natural', img:IMG_BASE+'tres_leches_natural.png', badgeColor:'#E91E8C',
    variantes:[ {label:'12 porciones', price:41} ] },
  { id:'torta_frutal_chantilly', cat:'torta', name:'Frutal de Chantilly', img:IMG_BASE+'frutal_chantilly.png', badgeColor:'#E91E8C',
    variantes:[ {label:'8 porciones', price:39}, {label:'15 porciones', price:64} ] },
  { id:'torta_vain_choc_ques', cat:'torta', name:'Vainilla, Chocolate y Quesillo', img:IMG_BASE+'vainilla_choc_quesillo_torta.png', badgeColor:'#E91E8C',
    variantes:[ {label:'Presentación única', price:28} ] },
  { id:'torta_tiramisu', cat:'torta', name:'Tiramisú', img:IMG_BASE+'tiramisu.png', badgeColor:'#E91E8C',
    variantes:[ {label:'8 porciones', price:39}, {label:'15 porciones', price:64} ] },
  { id:'torta_red_velvet', cat:'torta', name:'Red Velvet', img:IMG_BASE+'red_velvet.png', badgeColor:'#E91E8C',
    variantes:[ {label:'10 porciones', price:50}, {label:'20 porciones', price:75} ] },
  { id:'torta_marmoleaditas', cat:'torta', name:'Marmoleaditas', img:IMG_BASE+'marmoleaditas.png', badgeColor:'#E91E8C',
    variantes:[ {label:'8 porciones', price:23}, {label:'12 porc. rellena', price:31}, {label:'20 porc. rellena', price:48}, {label:'30 porc. rellena', price:68}, {label:'40 porc. rellena', price:89} ] },
  { id:'torta_pie_limon', cat:'torta', name:'Pie de Limón / Parchita', img:IMG_BASE+'pie_limon_torta.png', badgeColor:'#E91E8C',
    variantes:[ {label:'Mediano', price:39}, {label:'Grande', price:44} ] },
  { id:'torta_tartaleta', cat:'torta', name:'Tartaleta de Frutas', img:IMG_BASE+'tartaleta_frutas.png', badgeColor:'#E91E8C',
    variantes:[ {label:'Mediano', price:39}, {label:'Grande', price:51} ] },
  { id:'torta_quesillo', cat:'torta', name:'Quesillo', img:IMG_BASE+'quesillo_torta.png', badgeColor:'#E91E8C',
    variantes:[ {label:'15 porciones', price:43} ] },
  { id:'torta_profiteroles', cat:'torta', name:'Torta de Profiteroles', img:IMG_BASE+'torta_profiteroles.png', badgeColor:'#E91E8C',
    variantes:[ {label:'15 profiteroles', price:35}, {label:'30 profiteroles', price:69} ] },
  { id:'torta_brownie', cat:'torta', name:'Torta de Brownie', img:IMG_BASE+'torta_brownie.png', badgeColor:'#E91E8C',
    variantes:[ {label:'20 porciones', price:95} ] },

  // ── RACIONES (precio único) ──
  { id:'racion_flor_otono', cat:'racion', name:'Flor de Otoño', img:IMG_BASE+'flor_otono_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:5} ] },
  { id:'racion_oreolate', cat:'racion', name:'Oreolate', img:IMG_BASE+'oreolate_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:6} ] },
  { id:'racion_arequipe_quesillo', cat:'racion', name:'Arequipe con Quesillo', img:IMG_BASE+'arequipe_quesillo_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:5} ] },
  { id:'racion_vain_choc_ques', cat:'racion', name:'Vainilla, Chocolate y Quesillo', img:IMG_BASE+'vainilla_choc_quesillo_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:5} ] },
  { id:'racion_kitkat', cat:'racion', name:'KitKat', img:IMG_BASE+'kitkat_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:5} ] },
  { id:'racion_brownie', cat:'racion', name:'Brownie', img:IMG_BASE+'brownie_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:7} ] },
  { id:'racion_quesillo', cat:'racion', name:'Quesillo', img:IMG_BASE+'quesillo_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:5} ] },
  { id:'racion_imposible', cat:'racion', name:'Imposible / Choque', img:IMG_BASE+'imposible_choque.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:6} ] },
  { id:'racion_pie_limon', cat:'racion', name:'Pie de Limón / Parchita', img:IMG_BASE+'pie_limon_racion.png', badgeColor:'#9B59B6', variantes:[ {label:'Ración', price:7} ] },
  { id:'racion_galletones', cat:'racion', name:'Galletones', img:IMG_BASE+'galletones.png', badgeColor:'#9B59B6', variantes:[ {label:'Unidad', price:3} ] },

  // ── OTROS (con precio fijo) ──
  { id:'otro_cheesecake', cat:'otro', name:'Cheesecake', img:IMG_BASE+'cheesecake.png', badgeColor:'#27AE60', variantes:[ {label:'Presentación única', price:50} ] },
  { id:'otro_ponque', cat:'otro', name:'Ponque', img:IMG_BASE+'ponque.png', badgeColor:'#27AE60', variantes:[ {label:'Unidad', price:2.2} ] },

  // ── BEBIDAS (precios de referencia — no vienen del catálogo web) ──
  { id:'bebida_cafe', cat:'bebida', name:'Café', img:null, badgeColor:'#6D4C41', variantes:[ {label:'Vaso', price:2} ] },
  { id:'bebida_refresco', cat:'bebida', name:'Refresco', img:null, badgeColor:'#6D4C41', variantes:[ {label:'Vaso', price:1.5} ] },
  { id:'bebida_jugo', cat:'bebida', name:'Jugo Natural', img:null, badgeColor:'#6D4C41', variantes:[ {label:'Vaso', price:2.5} ] },
];

var CATEGORIAS = [
  { cat:'torta',  label:'🎂 Tortas Enteras' },
  { cat:'racion', label:'🍰 Raciones' },
  { cat:'otro',   label:'🌸 Otros' },
  { cat:'bebida', label:'☕ Bebidas' },
];

// ── CATÁLOGO COMBINADO (estático + agregado desde Inventario) ──────────────
// inventario.html permite crear productos nuevos sin tocar este archivo; se
// guardan en localStorage y se combinan aquí con el catálogo estático para
// que aparezcan en Ventas, Reportes, Promociones y Precios como cualquier otro.
// Los productos del catálogo base no se pueden borrar del array (están en
// código), así que "eliminarlos" desde inventario.html en realidad los oculta
// guardando su id en STORE_KEYS.PRODUCTOS_OCULTOS; ese filtro se aplica aquí.
function getCatalogoCompleto() {
  var ocultos = storeGet(STORE_KEYS.PRODUCTOS_OCULTOS, []);
  return PRODUCTOS.concat(storeGet(STORE_KEYS.PRODUCTOS_EXTRA, [])).filter(function (p) {
    return ocultos.indexOf(p.id) === -1;
  });
}

function buscarProducto(id) {
  return getCatalogoCompleto().find(function (p) { return p.id === id; });
}

// Clave "productId_variantIdx" compartida por los overrides de precio y de stock.
function claveOverridePrecio(productId, variantIdx) {
  return productId + '_' + variantIdx;
}

// ── PRECIOS EDITABLES (admin) ────────────────────────────────────────────────
// Los precios de PRODUCTOS son el valor de referencia original. El administrador
// puede sobrescribirlos desde precios.html; los overrides se guardan en
// localStorage (clave productId_variantIdx -> precio) y no modifican el código.
function getPrecioEfectivo(productId, variantIdx) {
  var p = buscarProducto(productId);
  var v = p && p.variantes[variantIdx];
  if (!v) return 0;
  var overrides = storeGet(STORE_KEYS.PRICE_OVERRIDES, {});
  var override = overrides[claveOverridePrecio(productId, variantIdx)];
  return typeof override === 'number' ? override : v.price;
}

// ── STOCK (admin, desde inventario.html) ────────────────────────────────────
// null = presentación sin control de stock activado (no se le ha puesto cantidad).
function getStock(productId, variantIdx) {
  var niveles = storeGet(STORE_KEYS.STOCK_LEVELS, {});
  var valor = niveles[claveOverridePrecio(productId, variantIdx)];
  return typeof valor === 'number' ? valor : null;
}

function setStock(productId, variantIdx, cantidad) {
  var niveles = storeGet(STORE_KEYS.STOCK_LEVELS, {});
  niveles[claveOverridePrecio(productId, variantIdx)] = cantidad;
  storeSet(STORE_KEYS.STOCK_LEVELS, niveles);
}

// Sin control de stock (null) = siempre hay suficiente (no limita la venta).
function hayStockSuficiente(productId, variantIdx, cantidadNecesaria) {
  var stock = getStock(productId, variantIdx);
  return stock === null || stock >= cantidadNecesaria;
}

// Descuenta stock al vender/reservar (ventas.js, pedidos.js). No hace nada si
// la presentación no tiene stock controlado. Nunca baja de 0.
function descontarStock(productId, variantIdx, cantidad) {
  var stock = getStock(productId, variantIdx);
  if (stock === null) return;
  setStock(productId, variantIdx, Math.max(0, stock - cantidad));
}

// Devuelve stock (cancelar venta/pedido). No hace nada si ya no está controlado.
function restaurarStock(productId, variantIdx, cantidad) {
  var stock = getStock(productId, variantIdx);
  if (stock === null) return;
  setStock(productId, variantIdx, stock + cantidad);
}
