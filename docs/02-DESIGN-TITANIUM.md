# 02 · Dirección artística — TITANIUM

> Guía de diseño viva. La fuente de verdad en código es `src/design/tokens.ts`; este documento explica el *porqué*.
> Herramientas: las skills **REA** y **Taste** solicitadas **no están disponibles** en este entorno (búsqueda de skills sin resultados). La dirección se ha construido con investigación propia (doc 01), Apple HIG y revisión visual iterativa renderizando propuestas con Playwright.

## 1. Concepto

**"Precisión anodizada."** El titanio es un metal sobrio, gris, frío y exacto… hasta que se anodiza: entonces aparece una gama de colores (bronce, violeta, azul, oro, verde azulado) generada solo por la luz en una capa de óxido. Esa es la regla de la app:

- La **interfaz** es titanio en bruto: obsidiana, grafito, plata y marfil. Cero colores decorativos.
- Cada **juego** tiene un único color *anodizado* propio que aparece solo dentro del juego (acento del botón principal en ese juego, resplandor, partículas). El catálogo de juegos se convierte en una carta de colores de titanio anodizado.
- El **significado** (ganar/perder/aviso) usa colores semánticos contenidos y siempre va acompañado de icono, signo o texto (nunca solo color).

## 2. Paleta

### Neutros (modo oscuro, predeterminado)
| Token | Hex | Uso |
|---|---|---|
| `obsidian` | `#08090B` | Fondo de la app |
| `basalt` | `#0E1013` | Fondo elevado (hojas) |
| `graphite1` | `#15171B` | Superficie 1 (tarjetas) |
| `graphite2` | `#1C1F24` | Superficie 2 (controles) |
| `graphite3` | `#262A30` | Superficie 3 (pulsado, chips activos) |
| `titanium` | `#8E959F` | Texto terciario, iconos inactivos |
| `silver` | `#C5CAD1` | Texto secundario |
| `ivory` | `#F3F4F6` | Texto principal, botón primario |
| `hairline` | `rgba(255,255,255,0.08)` | Bordes 0.5–1 pt |

### Neutros (modo claro)
`porcelain #F4F5F7` (fondo) · `white #FFFFFF` (superficie 1) · `mist #ECEEF1` (superficie 2) · `fog #E2E5E9` (superficie 3) · texto `#0B0C0E / #4A4F57 / #737A84` · hairline `rgba(0,0,0,0.08)`.

### Semánticos
`win #6FD3A0` · `loss #F0716B` · `warn #E9B65C` · `info #8FB8F0` (en claro se oscurecen un 25 % para cumplir 4.5:1).

### Anodizado por juego
| Juego | Color | | Juego | Color |
|---|---|---|---|---|
| Poker | Platino `#D9DCE1` | | Roulette | Rosa `#E2668F` |
| Blackjack | Oro `#D8B56A` | | Limbo | Hielo `#7FC8F8` |
| Crash | Azul `#5B8CFF` | | Coinflip | Champán `#E6C98A` |
| Dice | Turquesa `#3FC1B0` | | Baccarat | Cobre `#C27E62` |
| Mines | Verde `#63C98A` | | Hi-Lo | Índigo `#8A93FF` |
| Plinko | Violeta `#9B7BFF` | | Keno | Cian `#4FD1E0` |
| Cruce (Chicken) | Bronce `#D08F55` | | Sic Bo | Orquídea `#C77DDB` |

## 3. Tipografía

- **Geist** (OFL, Vercel) para toda la interfaz: grotesca geométrica precisa, con cifras limpias. Pesos: 300 (números héroe), 400, 500, 600.
- **Geist Mono** para cifras tabulares que cambian (multiplicadores, saldo animado, semillas *provably fair*).
- Escala (pt): `hero 56/300` · `display 40/300` · `title 28/500` · `headline 20/600` · `body 16/400` · `callout 15/500` · `footnote 13/400` · `caption 11/500 (tracking +0.4)`.
- Regla Offsuit adaptada: **los números son el gráfico**. Saldo, multiplicadores y probabilidades se componen grandes y ligeros; las etiquetas, pequeñas y en mayúsculas espaciadas.
- Soporte de Dynamic Type: los textos usan `allowFontScaling` con límite (`maxFontSizeMultiplier` 1.6) para no romper mesas de juego.

## 4. Espaciado, radios y retícula

- Retícula de 4 pt: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`.
- Margen lateral de pantalla: 20 pt. Separación entre secciones: 32 pt.
- Radios **concéntricos** (regla Apple): `xs 8 · sm 12 · md 16 · lg 22 · xl 28 · pill 999`. Un elemento dentro de otro usa `radio_exterior − padding`.
- Objetivos táctiles ≥ 44×44 pt.

## 5. Materiales y profundidad

| Material | Implementación | Dónde |
|---|---|---|
| **Glass** (capa de control) | `BlurView` (iOS) + tinte + borde *hairline* superior más claro (reflejo) | Tab bar, panel de apuesta, hojas, tu asiento/tu fila |
| **Solid** (capa de contenido) | Grafito plano | Tarjetas, listas |
| **Brushed** | Degradado lineal de 3 paradas muy sutil (±3 % luminancia) | Tarjetas destacadas, saldo |
| **Sheen** | Degradado blanco 6 %→0 % en el borde superior | Botones primarios y fichas |

Reglas: cristal **solo** sobre contenido que se desplaza debajo (si no hay nada detrás, es una superficie sólida). Con *Reduce Transparency* el cristal pasa a sólido `graphite2`. Sombras casi inexistentes en oscuro; en claro, sombra `0 8 24 rgba(0,0,0,.08)`.

## 6. Iconografía

- Iconos de interfaz: set SVG propio (`src/design/components/Icon.tsx`, 60 iconos, trazo 1.75 pt) idéntico en iOS, Android y web — coherente con los glifos de juego y verificable en web. (SF Symbols queda como opción futura vía `expo-symbols`.)
- Iconos de juego: set propio de 14 glifos geométricos dibujados en SVG con trazo 1.75 pt sobre retícula 24, coherentes entre sí (no emoji, no clip-art de casino).
- Cartas: diseño tipográfico propio — índice grande en Geist 600, palos dibujados en SVG, palos rojos con forma distinta para no depender del color.

## 7. Movimiento

| Token | Valor | Uso |
|---|---|---|
| `spring.snappy` | damping 22, stiffness 320 | Pulsaciones, toggles |
| `spring.smooth` | damping 26, stiffness 180 | Paneles, hojas, transiciones |
| `spring.bouncy` | damping 12, stiffness 180 | Celebraciones, cartas al asentarse |
| `duration.fast/base/slow` | 140 / 240 / 420 ms | Fundidos |
| `easing.standard` | `cubic-bezier(.2,.8,.2,1)` | Todo lo no-spring |

- **Interfaz general**: suave, discreta, física (escala 0.97 al pulsar, *spring* al soltar).
- **Juegos**: expresivos (cohete con estela, bola de Plinko con rebotes, ruleta que desacelera), pero **el resultado se calcula antes** y la animación solo lo representa.
- *Reduce Motion* del sistema o el ajuste interno → animaciones sustituidas por fundidos y revelados directos.

## 8. Sonido y hápticos

- Sonidos **sintetizados a medida** (script `scripts/generate-sounds.mjs`): clics de vidrio, fichas, cartas, tics de multiplicador, campanas suaves de victoria. Nada de máquinas tragaperras.
- Música ambiental opcional (pad lento y grave) desactivada por defecto.
- Hápticos: `selection` en cambios de valor, `light` al pulsar, `success/warning` al resolver. Nunca vibración continua. Todo con ajustes independientes.

## 9. Logotipo / icono — propuestas

Fichero de propuestas: `brand/icon-concepts/*.svg` (comparativa a 16–220 px, fondo claro/oscuro y máscara circular para avatar/favicon).

| Propuesta | Idea | Valoración |
|---|---|---|
| **A · Facet** | Cristal hexagonal (estructura hexagonal compacta del titanio α) con dos caras de luz | Muy legible; puede leerse como "tuerca" industrial |
| **B · Orbit** | Anillo de titanio con una esfera de marfil en órbita | Silueta excelente; demasiado parecido a iconos genéricos de "cargando/notificación" |
| **C · Split** ⭐ | Losa redondeada partida en diagonal (luz/sombra) con un único *pip* invertido en el centro | **Recomendada**: única, funciona a 16 px, cuenta la historia (dos resultados, una probabilidad) sin símbolos de casino evidentes |
| D · Flip | Disco partido y desplazado (moneda girando) | Se confunde con la señal de "prohibido / Ø" |

La propuesta C se usa como **icono provisional** del proyecto. El nombre de la app sigue sin definirse: el identificador interno es `titanium` y vive centralizado en `src/config/brand.ts`.

## 10. Moneda virtual (propuesta de nombre)

Identificador interno: `coins`. Nombre provisional mostrado: **"Ti"** (símbolo químico del titanio). Alternativas: *Alloy*, *Ingot*, *Shard*, *Facet*. Se cambia en un único lugar (`src/config/brand.ts`).
