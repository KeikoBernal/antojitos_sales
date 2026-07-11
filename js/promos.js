// ── MOTOR DE PROMOCIONES: "compra N de [producto], llévate M de [regalo] gratis" ──

function getPromoRules() {
  return storeGet(STORE_KEYS.PROMO_RULES, []);
}

function savePromoRules(rules) {
  storeSet(STORE_KEYS.PROMO_RULES, rules);
}

function getBanner() {
  return storeGet(STORE_KEYS.BANNER, { active:false, theme:'rosa', title:'', subtitle:'' });
}

function saveBanner(banner) {
  storeSet(STORE_KEYS.BANNER, banner);
}

// Las reglas guardadas antes de existir "tipo" son todas de tipo "regalo".
function tipoRegla(rule) {
  return rule.tipo || 'regalo';
}

// Dado el carrito actual (líneas manuales, sin las líneas de regalo previas),
// calcula cuántas unidades gratis corresponden por cada regla activa.
// cart: array de { productId, qty } (líneas manuales, no incluye regalos)
function calcularRegalosPromos(cartManual) {
  var rules = getPromoRules().filter(function (r) { return r.active && tipoRegla(r) === 'regalo'; });
  var regalos = [];

  rules.forEach(function (rule) {
    var unidadesCompradas = cartManual
      .filter(function (item) { return item.productId === rule.triggerProductId; })
      .reduce(function (sum, item) { return sum + item.qty; }, 0);

    var vecesCumplidas = Math.floor(unidadesCompradas / rule.buyQty);
    if (vecesCumplidas <= 0) return;

    var cantidadGratis = vecesCumplidas * rule.rewardQty;
    var productoRegalo = buscarProducto(rule.rewardProductId);
    if (!productoRegalo) return;

    regalos.push({
      ruleId: rule.id,
      productId: rule.rewardProductId,
      productName: productoRegalo.name,
      qty: cantidadGratis,
      label: '🎁 Gratis · Promo ' + rule.buyQty + 'x' + rule.triggerProductName,
    });
  });

  return regalos;
}

function describirRegla(rule) {
  if (tipoRegla(rule) === 'descuento') {
    var producto = buscarProducto(rule.productId);
    var nombre = producto ? producto.name : rule.productName;
    return '<b>' + rule.porcentaje + '%</b> de descuento en <b>' + nombre + '</b>';
  }
  var trigger = buscarProducto(rule.triggerProductId);
  var reward = buscarProducto(rule.rewardProductId);
  var triggerName = trigger ? trigger.name : rule.triggerProductName;
  var rewardName = reward ? reward.name : rule.rewardProductId;
  return 'Compra ' + rule.buyQty + ' de <b>' + triggerName + '</b> y llévate ' +
    (rule.rewardQty > 1 ? rule.rewardQty + ' ' : '') + '<b>' + rewardName + '</b> gratis';
}

// Porcentaje de descuento activo para un producto (0 si no tiene ninguno).
// Si hay más de una regla activa para el mismo producto, se usa la primera.
function getDescuentoProducto(productId) {
  var regla = getPromoRules().find(function (r) {
    return r.active && tipoRegla(r) === 'descuento' && r.productId === productId;
  });
  return regla ? regla.porcentaje : 0;
}

// Aplica el descuento activo (si existe) sobre un precio base.
function aplicarDescuento(precioBase, productId) {
  var pct = getDescuentoProducto(productId);
  return pct ? Math.round(precioBase * (1 - pct / 100) * 100) / 100 : precioBase;
}
