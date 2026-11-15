# 01 · Investigación de referencias

> Documento de la Fase 1. Todo lo marcado como **verificado** procede de fuentes públicas consultadas el 15/11/2026.
> Lo que no se ha podido comprobar se indica explícitamente en la sección 8. No se ha inventado ninguna funcionalidad de Offsuit.

## 1. Referencias consultadas

| # | Fuente | Qué aporta |
|---|--------|-----------|
| R1 | [App Store · Offsuit: Texas Holdem Poker (id6446099491)](https://apps.apple.com/us/app/offsuit-texas-holdem-poker/id6446099491) | Descripción, historial de versiones, compras, privacidad, reseñas |
| R2 | [iTunes Lookup API · id6446099491](https://itunes.apple.com/lookup?id=6446099491) | Metadatos técnicos y las 6 capturas oficiales del App Store |
| R3 | [offsuit.app](https://www.offsuit.app) | Web oficial: posicionamiento ("Dead simple, deliberately designed."), catálogo |
| R4 | [Product Hunt · Offsuit Poker](https://www.producthunt.com/products/offsuit-poker) y [post de lanzamiento](https://www.producthunt.com/posts/offsuit-poker) | Filosofía de diseño explicada por su diseñador |
| R5 | [AppGoblin · Offsuit](https://appgoblin.info/apps/6446099491) | SDKs detectados, fechas, estimaciones de instalaciones |
| R6 | [Game Solver · reseñas de Offsuit](https://game-solver.com/offsuit-texas-holdem-poker/) | Recopilación de reseñas de usuarios |
| R7 | [Google Play · com.offsuit.offline](https://play.google.com/store/apps/details?id=com.offsuit.offline) | Existencia en Android (el contenido de la ficha no se pudo extraer) |
| R8 | [Apple HIG · Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Liquid Glass, materiales estándar, vibrancy, legibilidad |
| R9 | [Expo docs (SDK 58)](https://docs.expo.dev/llms.txt) | Estado actual del stack (tabs, audio, haptics, blur, glass, Supabase, iconos `.icon`) |
| R10 | Búsqueda sobre Stake Originals ([pokerlistings](https://www.pokerlistings.com/software/stake-originals), [insider-gaming](https://insider-gaming.com/stake-com/plinko/)) | Patrones de interacción de juegos "originals" (Plinko, Mines, Dice, Limbo) |

## 2. Características verificadas de Offsuit

**Producto**
- Nombre: *Offsuit: Texas Holdem Poker*, de Offsuit Games, Inc. Publicada el 29/03/2023; versión 2.7.1 (12/09/2025). Solo iPhone, iOS 15+, 128,7 MB. (R1, R2)
- Valoración 4,6/5 con ~3.600 valoraciones en EE. UU. (R2). Categoría Casino/Card. Clasificación 17+/18+ según país por "simulated gambling". (R1)
- Gratuita con compras integradas: paquetes de *chips* y *gems* (0,99 $–19,99 $) y suscripción *Offsuit Premium*. Declara que no hay apuestas con dinero real. (R1)
- Construida con **Flutter**; incluye Firebase, Mixpanel, RevenueCat y redes publicitarias (Google, Facebook, AppLovin, Vungle). (R5)

**Funcionalidades confirmadas en el historial de versiones (R1)**
- 2.0.3 (01/2024): multijugador abierto a todos. 2.0.4: borrado de cuenta.
- 2.1.0 (02/2024): amigos e invitaciones directas a partidas *cash*.
- 2.2.0 (05/2024): partidas privadas y chuleta de ranking de manos.
- 2.3.0 (09/2024): modo *AI Arena*, *emotes*, dorsos de cartas, avatares, mejoras de animación, estadísticas, revelado de manos y *rebuys* en torneos.
- 2.6.0 (05/2025): temporadas mensuales, cofres, ruleta de la fortuna, monedas rediseñadas y redistribución de XP.
- 2.7.0 (09/2025): 11 métricas de estadísticas de póker, filtro por modo de juego, compartir estadísticas, perfiles renovados.
- La web oficial lista **Poker** y **Blackjack (marcado "New")**, y pide votar los siguientes juegos (Solitaire, Baccarat, Roulette, Slots). (R3)

**Filosofía declarada (R4)** — el diseñador (Sam Giambalvo) explica que los apps gratuitos de póker obligan a "cerrar pop-ups más que jugar", usan "fake felt, leather and neon" y tratan el póker "like a scam casino game". Offsuit se define por **no pop-ups forzados, no cuenta obligatoria, no esperas, no tapete falso ni neón**. Lema web: *"Dead simple, deliberately designed."* (R3)

## 3. Capturas públicas analizadas

Se descargaron las 6 capturas oficiales del App Store (R2) **solo como referencia interna** (no se incluyen en el repositorio). Lo observado:

1. **Mesa de póker (captura 1 y 6)**: fondo negro puro; sin tapete. Los rivales son una fila de avatares 3D estilo emoji en la parte superior, con el stack en número pequeño debajo. Cartas comunitarias grandes, blancas, con índice enorme (rango + palo) y sin ilustraciones; dorsos con rayado diagonal. Bote como número aislado alineado a la derecha. Abajo: las dos cartas del jugador a la izquierda y una "tarjeta de jugador" gris oscura a la derecha con avatar, mano actual ("Pair") y stack.
2. **Acciones**: píldoras gris grafito ("Call 4", "Raise 8") y un botón cuadrado pequeño con flecha para ajustar la subida. Solo aparecen las acciones válidas.
3. **Inicio (captura 2)**: el saldo es el protagonista: número enorme en peso *light* arriba a la izquierda ("11,250"). Carrusel horizontal de torneos con tarjeta de **degradado pastel** (rosa-lavanda), emoji grande como icono, título y una línea de metadatos ("250 buy-in · 400k prize · 1500 XP"). Debajo, "Weekly leaderboard" en lista. Barra inferior con **solo dos destinos** (Home, Profile).
4. **Estadísticas en partida (captura 3)**: panel gris oscuro centrado: "Win **71%**" en verde y "2 Pair 26%". Números grandes, peso ligero, etiqueta pequeña encima.
5. **Ranking (captura 4)**: lista limpia con medalla, avatar, usuario y XP. La fila del usuario "flota" como tarjeta elevada sobre la lista.
6. **Marketing**: fondos con degradados pastel desenfocados y una línea tipo gráfico de bolsa; titulares en grotesca de peso medio ("Simple. Modern. Poker."). Logotipo en minúsculas.

## 4. Análisis visual

- **Reducción radical**: negro, blanco y 1–2 grises. El color se reserva para *significado* (verde = probabilidad favorable, rojo = palos rojos) o para *contenido destacado* (tarjetas de torneo pastel).
- **Tipografía como interfaz**: los números (saldo, bote, %) son el elemento gráfico principal. Peso ligero + gran tamaño = elegancia; las etiquetas son pequeñas y secundarias.
- **Cartas como objetos tipográficos**: legibles a cualquier tamaño porque el índice ocupa casi toda la carta.
- **Profundidad mínima**: superficies grafito planas con radios generosos (~16–20 pt); casi sin sombras. La elevación se usa solo para "tú" (fila propia en el ranking, tarjeta del jugador).
- **Personalidad vía avatares**: el producto es sobrio, pero los avatares 3D aportan calidez y humor.

## 5. Análisis funcional

- Partida inmediata: se juega offline sin registro (confirmado por reseñas y por el propio diseñador).
- Multijugador, amigos y mesas privadas llegaron más tarde y se apoyan en cuentas opcionales.
- La progresión (XP, temporadas, cofres) se añadió en 2025; las reseñas piden logros, torneos entre jugadores y variantes.
- Críticas repetidas (R1, R6): bots predecibles o "inbluffables", *slider* de subida impreciso, temporizador que expira antes de tiempo, torneos que no se restauran al reiniciar la app, resaltado de cartas ganadoras incorrecto.

## 6. Análisis de experiencia de usuario

- **Tiempo a la primera mano ≈ 0**: abrir y jugar. Sin muros de registro ni pop-ups.
- **Una pantalla, una decisión**: en la mesa solo existen las acciones válidas del momento.
- **Información bajo demanda**: probabilidades y estadísticas en un panel que aparece al deslizar, no fijas.
- **Retención sin agresividad** en su origen; las versiones 2.6+ incorporan mecánicas de casino (ruletas, cofres, anuncios recompensados) que la propia filosofía inicial criticaba. *Nosotros nos quedamos con la filosofía inicial.*

## 7. Patrones que merece la pena adaptar

| Patrón | Cómo lo adaptamos |
|--------|-------------------|
| Saldo como héroe tipográfico | Inicio abre con el saldo en tipografía grande *light* + cifra animada |
| Cartas tipográficas | Cartas Ivory con índice gigante, palos dibujados en SVG propios; rojo + forma del palo (no solo color) |
| Acciones contextuales en píldoras | Barra de acciones que solo muestra lo válido; slider con muescas (½ bote, bote, all-in) para corregir la queja de imprecisión |
| Elevación solo para "tú" | Tu fila en rankings y tu asiento en la mesa usan material de cristal; el resto es plano |
| Paneles de datos bajo demanda | Hoja deslizable de probabilidades/EV en cada juego |
| Sin pop-ups, sin cuenta obligatoria | Juego offline como invitado; la cuenta se pide solo al entrar en funciones online |
| Restauración de partidas (queja) | Estado de mesa persistido localmente y reconexión online por versión de estado |

**Apple (R8)**: usar Liquid Glass/cristal **solo en la capa de controles y navegación** (tab bar, barra de apuestas, hojas), nunca en el contenido; materiales estándar para separar contenido; colores "vibrantes" sobre materiales para mantener contraste; respetar *Reduce Transparency* y *Reduce Motion*.

**Stake Originals (R10)**: panel de apuesta consistente en todos los juegos (importe con ½ y 2×, botón principal grande), juegos minimalistas con una sola visualización protagonista (multiplicador enorme en Limbo, slider 0–100 en Dice, cuadrícula 5×5 en Mines, triángulo de clavijas en Plinko) y resultados verificables (*provably fair*). Adoptamos la **consistencia del panel** y la **verificabilidad**, no su paleta ni sus recursos.

## 8. Aspectos que NO se han podido comprobar

- Tipografía exacta, paleta exacta, espaciados y radios de Offsuit (no hay fuente pública; las medidas anteriores son estimaciones visuales a partir de capturas de 392×696 px).
- Animaciones, transiciones, sonidos y hápticos reales (no se ha podido ejecutar la app; solo hay reseñas que las elogian).
- Flujo de onboarding, pantallas de perfil y de amigos, comportamiento en distintos tamaños de pantalla.
- Si el Blackjack de Offsuit es un modo dentro de la misma app o una app aparte (la web lo lista como "New"; no se encontró ficha propia en el App Store).
- El contenido de la ficha de Google Play (la página no devolvió contenido legible).
- La paleta exacta de Stake (no hay fuente pública fiable; no la necesitamos porque no la copiamos).

## 9. De los aprendizajes a una identidad original

1. **Material, no color**: donde Offsuit usa negro plano + pastel, nosotros usamos **metal y cristal** (Titanium): grafito cepillado, plata, reflejos controlados. Otra emoción: Offsuit es *amable*; Titanium es *preciso*.
2. **Un único acento con significado**: en lugar de pasteles, el acento es la *luz* sobre el titanio (degradado plata → marfil). Los colores semánticos (ganar/perder) son contenidos y siempre acompañados de icono/texto.
3. **Catálogo de 14 juegos** con iconografía geométrica propia (no emoji), dibujada en el mismo trazo.
4. **Educación como pilar** (Academy) — algo que Offsuit anunciaba como deseo en su lanzamiento y que aquí es central, con rigor matemático y sin promesas de ganancias.
5. **Social sin chat**: solo reacciones de un catálogo cerrado (moderación por diseño).
6. **Nada de mecánicas de casino de retención** (ruletas diarias de premio, cofres aleatorios pagados, anuncios recompensados): recompensas deterministas y transparentes.
