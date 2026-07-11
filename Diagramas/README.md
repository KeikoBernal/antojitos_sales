# Diagramas — Módulo de Ventas y Promociones

Esta carpeta contiene 6 diagramas del módulo, escritos en **Mermaid** (texto que se
renderiza como diagrama). Cada uno existe como archivo `.mmd` independiente
(para exportar) y también está embebido más abajo en este `README.md` (para
verlo directamente en GitHub o en el preview de VS Code).

| Archivo | Contenido |
|---|---|
| `diagrama_clases.mmd` | Diagrama de clases UML (entidades del módulo, atributos y relaciones) |
| `diagrama_er.mmd` | Diagrama Entidad-Relación (modelo de datos tipo tablas, incluye cédula del cliente y overrides de precio) |
| `diagrama_almacenamiento.mmd` | Estructura de la "base de datos": qué se guarda en `localStorage` vs `sessionStorage` vs catálogo estático en código, y el flujo de respaldo/restauración manual |
| `diagrama_flujo_procesos.mmd` | Diagrama de flujo del proceso operativo: inicio de sesión, proceso de venta y procesos exclusivos del administrador |
| `diagrama_caso_uso.mmd` | Diagrama de casos de uso: actores (Cajero, Administrador) y las acciones que puede realizar cada uno |
| `diagrama_flujo_datos.mmd` | Diagrama de Flujo de Datos (DFD) Nivel 1: entidades externas, 7 procesos numerados y los 8 almacenes de datos que consumen/producen |

> **Nota:** el diagrama ER y el de casos de uso reflejan los permisos reales
> de `js/auth.js` (`ROLES_PERMISOS`): el rol `cajero` puede operar ventas y
> clientes (crear, editar y eliminar), y solo `administrador` tiene acceso a
> precios, promociones, historial, reportes y respaldo.

> **Nota importante:** este módulo no usa una base de datos SQL real. Por la
> restricción académica de usar solo HTML/CSS/JS sin backend, todo se persiste
> como JSON en `localStorage` del navegador (ver `js/store.js`, `STORE_KEYS`).
> El diagrama ER modela esos datos *como si fueran tablas* para fines de
> documentación, y el diagrama de almacenamiento muestra la estructura real.
>
> Desde la pestaña **💾 Respaldo** (solo visible para el rol `administrador`)
> se puede descargar un archivo `.json` con una copia de todo lo anterior
> (excepto la sesión activa) y restaurarlo más tarde — ver `js/backup.js` y
> `respaldo.html`. El diagrama de almacenamiento incluye ahora ese archivo de
> respaldo y las funciones `exportarRespaldo()` / `restaurarRespaldo()` que lo
> conectan con `localStorage`.

---

## 1. Diagrama de clases (UML)

```mermaid
classDiagram
    class Usuario {
        +String username
        +String nombre
        +String rol
        +String passwordHash
    }

    class Sesion {
        +String username
        +String nombre
        +String rol
        +Number ts
    }

    class Cliente {
        +String id
        +String nombre
        +String telefono
        +String email
    }

    class Venta {
        +String id
        +String fecha
        +String cajero
        +String clienteId
        +Number total
    }

    class ItemVenta {
        +String productId
        +String name
        +String variante
        +Number precio
        +Number qty
        +Boolean gratis
    }

    class Producto {
        +String id
        +String cat
        +String name
        +String img
        +String badgeColor
    }

    class VarianteProducto {
        +String label
        +Number price
    }

    class Categoria {
        +String cat
        +String label
    }

    class ReglaPromocion {
        +String id
        +Boolean active
        +String triggerProductId
        +String triggerProductName
        +Number buyQty
        +String rewardProductId
        +Number rewardQty
    }

    class Banner {
        +Boolean active
        +String title
        +String subtitle
        +String theme
    }

    Usuario "1" --> "0..1" Sesion : inicia
    Usuario "1" --> "0..*" Venta : registra (cajero)
    Cliente "1" --> "0..*" Venta : realiza
    Venta "1" *-- "1..*" ItemVenta : contiene
    ItemVenta "0..*" --> "1" Producto : referencia
    Producto "1" *-- "1..*" VarianteProducto : ofrece
    Producto "0..*" --> "1" Categoria : pertenece a
    ReglaPromocion "0..*" --> "1" Producto : activador (trigger)
    ReglaPromocion "0..*" --> "1" Producto : regalo (reward)
```

---

## 2. Diagrama Entidad-Relación (ER)

```mermaid
erDiagram
    USUARIOS {
        string username PK
        string nombre
        string rol
        string passwordHash
    }
    CLIENTES {
        string id PK
        string nombre
        string cedula UK
        string telefono
        string email
    }
    VENTAS {
        string id PK
        string fecha
        string cajero FK
        string clienteId FK
        number total
    }
    VENTA_ITEMS {
        string ventaId FK
        string productId FK
        string name
        string variante
        number precio
        number qty
        boolean gratis
    }
    PRODUCTOS {
        string id PK
        string cat FK
        string name
        string img
        string badgeColor
    }
    PRODUCTO_VARIANTES {
        string productId FK
        number variantIdx
        string label
        number price
    }
    PRECIO_OVERRIDES {
        string productId FK
        number variantIdx
        number precio
    }
    CATEGORIAS {
        string cat PK
        string label
    }
    PROMO_REGLAS {
        string id PK
        boolean active
        string triggerProductId FK
        number buyQty
        string rewardProductId FK
        number rewardQty
    }
    BANNER_CONFIG {
        boolean active
        string title
        string subtitle
        string theme
    }

    USUARIOS ||--o{ VENTAS : "registra"
    CLIENTES ||--o{ VENTAS : "realiza"
    VENTAS ||--|{ VENTA_ITEMS : "contiene"
    PRODUCTOS ||--o{ VENTA_ITEMS : "vendido_en"
    PRODUCTOS ||--|{ PRODUCTO_VARIANTES : "tiene"
    PRODUCTO_VARIANTES ||--o| PRECIO_OVERRIDES : "puede_tener"
    CATEGORIAS ||--o{ PRODUCTOS : "agrupa"
    PRODUCTOS ||--o{ PROMO_REGLAS : "es_activador"
    PRODUCTOS ||--o{ PROMO_REGLAS : "es_regalo"
```

---

## 3. Estructura de almacenamiento (localStorage / sessionStorage)

```mermaid
flowchart TB
    subgraph LS["localStorage (persistente en el navegador)"]
        direction TB
        U["anto_ventas_users<br/>Array de Usuario"]
        C["anto_ventas_clientes<br/>Array de Cliente (con cedula)"]
        V["anto_ventas_ventas<br/>Array de Venta"]
        B["anto_ventas_banner<br/>Banner (objeto unico)"]
        P["anto_ventas_promo_rules<br/>Array de ReglaPromocion"]
        O["anto_ventas_price_overrides<br/>Mapa productId_variantIdx -> precio"]
    end

    subgraph SS["sessionStorage (se borra al cerrar pestana o navegador)"]
        S["anto_ventas_session<br/>Sesion (objeto unico)"]
        CT["anto_ventas_carrito_actual<br/>Array del carrito en curso"]
    end

    subgraph CAT["Catalogo estatico (definido en codigo, no en storage)"]
        PR["PRODUCTOS []  -- js/productos.js"]
        CG["CATEGORIAS [] -- js/productos.js"]
    end

    subgraph BK["Respaldo manual (archivo .json fuera del navegador)"]
        F["antojitos_ventas_backup_AAAA-MM-DD_HHMM.json<br/>{ app, version, exportadoEn, data:{USERS,CUSTOMERS,SALES,BANNER,PROMO_RULES,PRICE_OVERRIDES} }<br/>guardado donde el usuario elija (ej. carpeta Backups/)"]
    end

    V -->|clienteId referencia a| C
    V -->|cajero referencia a| U
    V -->|items.productId referencia a| PR
    P -->|triggerProductId / rewardProductId| PR
    O -->|productId_variantIdx referencia a| PR
    PR -->|cat referencia a| CG
    S -.->|copia de sesion de| U
    CT -->|productId / variantIdx referencia a| PR

    LS -->|"exportarRespaldo() — respaldo.html"| F
    F -->|"restaurarRespaldo() — sobrescribe tras confirmacion"| LS
```

---

## 4. Diagrama de flujo de procesos

Flujo operativo del módulo: inicio de sesión, el proceso de venta (compartido
por Cajero y Administrador) y los procesos exclusivos del rol `administrador`.

```mermaid
flowchart TD
    Inicio(["Inicio"]) --> Login["Ingresar usuario y contraseña"]
    Login --> ValidaCred{"¿Credenciales válidas?"}
    ValidaCred -->|"No"| ErrorLogin["Mostrar 'Usuario o contraseña incorrectos'"]
    ErrorLogin --> Login
    ValidaCred -->|"Sí"| VentaSub

    subgraph VentaSub["Proceso de venta (Cajero y Administrador)"]
        direction TB
        C1["Buscar y seleccionar productos del catálogo"]
        C2["Agregar producto al carrito"]
        C3{"¿Se cumple una regla<br/>'compra N, llévate M gratis'?"}
        C4["Agregar regalo automático al carrito"]
        C5{"¿Cliente ya registrado?"}
        C6["Buscar cliente en la lista"]
        C7["Registrar cliente nuevo<br/>(nombre, cédula, teléfono)"]
        C8["Seleccionar cliente en la venta<br/>o continuar sin cliente"]
        C9["Finalizar venta"]
        C10["Guardar venta en el historial<br/>con el precio vigente de cada ítem"]
        C11["Mostrar recibo en pantalla"]

        C1 --> C2 --> C3
        C3 -->|"Sí"| C4 --> C5
        C3 -->|"No"| C5
        C5 -->|"Sí"| C6 --> C8
        C5 -->|"No"| C7 --> C8
        C8 --> C9 --> C10 --> C11
    end

    VentaSub --> EsAdmin{"¿El usuario es Administrador?"}
    EsAdmin -->|"Sí"| AdminSub

    subgraph AdminSub["Procesos exclusivos del Administrador"]
        direction TB
        A1["Editar o restablecer el precio<br/>de una presentación de producto"]
        A2["Configurar banner promocional<br/>y reglas de promoción"]
        A3["Consultar historial de ventas<br/>y descargar PDF por periodo"]
        A4["Consultar ranking de productos<br/>y descargar PDF del reporte"]
        A5["Editar o eliminar un cliente registrado"]
        A6["Descargar respaldo .json<br/>o restaurar datos desde un archivo"]
    end

    EsAdmin -->|"No, es Cajero"| Logout["Cerrar sesión"]
    AdminSub --> Logout
    Logout --> Fin(["Fin"])
```

---

## 5. Diagrama de casos de uso

Actores: **Cajero** y **Administrador**. El Administrador hereda todos los
casos de uso del Cajero (ambos roles tienen acceso a Ventas y Clientes según
`ROLES_PERMISOS` en `js/auth.js`) y además tiene acceso exclusivo a Precios,
Promociones, Historial, Reportes y Respaldo.

```mermaid
flowchart LR
    Cajero(["Cajero"])
    Admin(["Administrador"])

    subgraph SESION["Sesión"]
        direction TB
        UC1(["Iniciar sesión"])
        UC2(["Cerrar sesión"])
    end

    subgraph VENTAS["Ventas"]
        direction TB
        UC3(["Buscar y filtrar<br/>productos del catálogo"])
        UC4(["Agregar producto al carrito"])
        UC5(["Aplicar promoción<br/>automática al carrito"])
        UC6(["Finalizar venta"])
        UC7(["Ver recibo de venta"])
    end

    subgraph CLIENTES["Clientes"]
        direction TB
        UC8(["Registrar cliente nuevo"])
        UC9(["Buscar cliente"])
        UC10(["Editar datos de un cliente"])
        UC11(["Eliminar cliente"])
    end

    subgraph PRECIOS["Precios (solo Administrador)"]
        direction TB
        UC12(["Editar precio de una presentación"])
        UC13(["Restablecer precio original"])
    end

    subgraph PROMOS["Promociones (solo Administrador)"]
        direction TB
        UC14(["Configurar banner promocional"])
        UC15(["Crear regla 'compra N, llévate M gratis'"])
        UC16(["Activar / desactivar regla"])
        UC17(["Eliminar regla de promoción"])
    end

    subgraph REPORTES["Historial y Reportes (solo Administrador)"]
        direction TB
        UC18(["Consultar historial de ventas<br/>por cliente / periodo"])
        UC19(["Descargar PDF de ventas del periodo"])
        UC20(["Consultar ranking de productos<br/>más y menos vendidos"])
        UC21(["Descargar PDF del reporte de productos"])
    end

    subgraph RESPALDO["Respaldo (solo Administrador)"]
        direction TB
        UC22(["Descargar respaldo .json"])
        UC23(["Restaurar datos desde un archivo"])
    end

    Cajero --> UC1
    Cajero --> UC2
    Cajero --> UC3
    Cajero --> UC4
    Cajero --> UC6
    Cajero --> UC7
    Cajero --> UC8
    Cajero --> UC9
    Cajero --> UC10
    Cajero --> UC11

    Admin -.->|"hereda todos los<br/>casos de uso de"| Cajero
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
    Admin --> UC16
    Admin --> UC17
    Admin --> UC18
    Admin --> UC19
    Admin --> UC20
    Admin --> UC21
    Admin --> UC22
    Admin --> UC23

    UC6 -.->|"«include»"| UC5
    UC19 -.->|"«extend»"| UC18
    UC21 -.->|"«extend»"| UC20
    UC13 -.->|"«extend»"| UC12
```

---

## 6. Diagrama de Flujo de Datos (DFD) — Nivel 1

Entidades externas (Cajero, Administrador), 7 procesos numerados y los 8
almacenes de datos que leen o escriben (`D1`-`D6` en `localStorage`, `D7` y
`D8` en `sessionStorage`). `D4` no existía cuando se hizo el diagrama ER
original — se agregó junto con el módulo de precios editables.

```mermaid
flowchart LR
    CAJ["Cajero"]
    ADM["Administrador"]

    P1((("1.0<br/>Autenticar<br/>usuario")))
    P2((("2.0<br/>Gestionar<br/>clientes")))
    P3((("3.0<br/>Procesar<br/>venta")))
    P4((("4.0<br/>Aplicar promociones<br/>y banner")))
    P5((("5.0<br/>Administrar<br/>precios")))
    P6((("6.0<br/>Generar historial<br/>y reportes")))
    P7((("7.0<br/>Respaldar y<br/>restaurar datos")))

    D1[["D1  Usuarios"]]
    D2[["D2  Clientes"]]
    D3[["D3  Ventas"]]
    D4[["D4  Precios (overrides)"]]
    D5[["D5  Reglas de promoción"]]
    D6[["D6  Banner"]]
    D7[["D7  Sesión activa"]]
    D8[["D8  Carrito actual"]]

    CAJ -->|"usuario, contraseña"| P1
    ADM -->|"usuario, contraseña"| P1
    P1 -->|"sesión iniciada / error"| CAJ
    P1 -->|"sesión iniciada / error"| ADM
    D1 -->|"credenciales"| P1
    P1 <-->|"guarda / lee sesión"| D7

    CAJ -->|"datos de cliente<br/>nuevo o editado"| P2
    ADM -->|"edición o eliminación<br/>de cliente"| P2
    P2 -->|"lista y ficha<br/>del cliente"| CAJ
    P2 <-->|"lee / escribe"| D2

    CAJ -->|"productos elegidos,<br/>cliente de la venta"| P3
    P3 -->|"recibo de venta"| CAJ
    P3 <-->|"guarda / recupera carrito"| D8
    P3 -->|"registra venta"| D3
    D2 -.->|"datos del cliente<br/>elegido"| P3
    D4 -.->|"precio vigente"| P3
    P3 -->|"líneas del carrito"| P4
    P4 -->|"regalos aplicables"| P3

    ADM -->|"nuevo precio<br/>por presentación"| P5
    P5 <-->|"lee / escribe"| D4

    ADM -->|"reglas de promoción,<br/>configuración del banner"| P4
    P4 <-->|"lee / escribe"| D5
    P4 <-->|"lee / escribe"| D6

    ADM -->|"filtro de periodo<br/>(desde / hasta)"| P6
    D3 -.->|"ventas del periodo"| P6
    D2 -.->|"nombre y cédula<br/>del cliente"| P6
    P6 -->|"PDF de historial<br/>o de reporte"| ADM

    ADM -->|"solicitud de respaldo<br/>o restauración"| P7
    P7 -->|"archivo .json<br/>de respaldo"| ADM
    P7 <-->|"lee / escribe"| D1
    P7 <-->|"lee / escribe"| D2
    P7 <-->|"lee / escribe"| D3
    P7 <-->|"lee / escribe"| D4
    P7 <-->|"lee / escribe"| D5
    P7 <-->|"lee / escribe"| D6
```

---

## Cómo exportar estos diagramas a PNG

Tienes 3 opciones, de la más fácil (sin instalar nada) a la más automatizable.

### Opción A — Mermaid Live Editor (recomendada, no requiere instalar nada)

1. Abre https://mermaid.live en el navegador.
2. Abre uno de los archivos `.mmd` de esta carpeta (p. ej. `diagrama_clases.mmd`)
   con el Bloc de notas o VS Code, selecciona todo el contenido (`Ctrl+A`) y
   cópialo (`Ctrl+C`).
3. Pega el contenido (`Ctrl+V`) en el panel izquierdo ("Code") de mermaid.live.
   El diagrama se dibuja automáticamente en el panel derecho.
4. Ve al menú **Actions** (arriba) → **Export as PNG** (o el ícono de descarga).
   Se descarga el archivo `.png` a tu carpeta de Descargas.
5. Repite para los otros 5 archivos (`diagrama_er.mmd`,
   `diagrama_almacenamiento.mmd`, `diagrama_flujo_procesos.mmd`,
   `diagrama_caso_uso.mmd`, `diagrama_flujo_datos.mmd`).

### Opción B — Extensión de Mermaid en VS Code

1. Instala la extensión **"Markdown Preview Mermaid Support"** (autor: `bierner`)
   desde el panel de Extensiones de VS Code.
2. Abre este archivo `README.md` en VS Code.
3. Presiona `Ctrl+Shift+V` para abrir la vista previa de Markdown — los 6
   diagramas se renderizarán directamente ahí.
4. Para exportar como imagen: haz clic derecho sobre el diagrama renderizado
   en la vista previa → **"Save image as..."** (o usa una extensión adicional
   como **"Markdown PDF"**, que también puede exportar los diagramas
   embebidos a PNG/PDF).

### Opción C — Línea de comandos con `mmdc` (Mermaid CLI, ideal para generar los 6 de una vez)

Requiere tener **Node.js** instalado (https://nodejs.org).

```bash
# 1. Instalar el CLI de Mermaid (una sola vez)
npm install -g @mermaid-js/mermaid-cli

# 2. Pararse en esta carpeta de diagramas
cd "Modulo_Ventas_Promociones/Diagramas"

# 3. Exportar cada diagrama a PNG (-s 3 = triple resolución, para que se
#    lea bien en Word/PowerPoint/impreso; el layout no cambia, solo la nitidez)
mmdc -i diagrama_clases.mmd -o diagrama_clases.png -b white -s 3
mmdc -i diagrama_er.mmd -o diagrama_er.png -b white -s 3
mmdc -i diagrama_almacenamiento.mmd -o diagrama_almacenamiento.png -b white -s 3
mmdc -i diagrama_flujo_procesos.mmd -o diagrama_flujo_procesos.png -b white -s 3
mmdc -i diagrama_caso_uso.mmd -o diagrama_caso_uso.png -b white -s 3
mmdc -i diagrama_flujo_datos.mmd -o diagrama_flujo_datos.png -b white -s 3
```

Esto genera los 6 archivos `.png` correspondientes en la misma carpeta
(ya están generados a esta resolución; solo necesitas repetir este comando
si editas un `.mmd` y quieres regenerar su PNG). El flag `-b white` fuerza
fondo blanco (por defecto es transparente, lo cual puede verse mal si luego
pegas la imagen en Word/PowerPoint sobre fondo blanco). El flag `-s 3`
(factor de escala de Puppeteer, como una pantalla retina) triplica la
densidad de píxeles del PNG exportado sin cambiar el layout — es lo que hace
que el texto se vea nítido incluso haciendo zoom o imprimiendo en grande. Si
aun así lo necesitas más grande, puedes subir a `-s 4` o `-s 5`.
