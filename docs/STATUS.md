# Estado del proyecto

Registro honesto frente a los 31 criterios de aceptación. ✅ hecho y verificado · 🟡 implementado, falta verificación en entorno real · ❌ pendiente.

| # | Criterio | Estado | Notas |
|---|---|---|---|
| 1 | App React Native ejecutable | ✅ | Expo SDK 58 / RN 0.88; typecheck y build web OK |
| 2 | Identidad Titanium | ✅ | `docs/02`, tokens, icono provisional “Split” |
| 3 | Pestañas funcionales | ✅ | Juegos (inicio), Ranking, Perfil (Social retirado en la ronda 8 a petición) |
| 4 | 14 juegos implementados | ✅ | Todos jugables (verificado en navegador); hoy son 23 juegos + 3 mesas en directo + apuestas deportivas |
| 5 | Reglas correctas | ✅ | 98 pruebas de motor |
| 6 | Tutorial propio por juego | ✅ | 14 tutoriales interactivos |
| 7 | Tutoriales recuerdan finalización | ✅ | `<juego>_tutorial_completed`, local + sync |
| 8 | Modo offline | ✅ | Invitado completo, práctica |
| 9 | Multijugador online | 🟡 | Póker online (cash, privadas, Sit & Go) con Realtime y servidor autoritativo; type-checked, **no probado contra un Supabase vivo** |
| 10 | Bots de distintas dificultades | ✅ | 3 dificultades × 4 estilos, etiquetados BOT |
| 11 | Economía virtual | ✅ | Simulada (`docs/06`) |
| 12 | Recompensas gratuitas | ✅ | Diario, recargas, misiones (local y servidor) |
| 13 | Progresión | ✅ | Niveles, XP con topes, logros, misiones, temporadas |
| 14 | Rankings | 🟡 | Vistas SQL y UI; datos reales requieren backend desplegado (vista previa local offline) |
| 15 | Perfiles y amigos | 🟡 | Implementado con RLS probada en Postgres; falta prueba con backend vivo |
| 16 | Salas privadas y torneos | 🟡 | Código de sala, invitaciones, Sit & Go; idem |
| 17 | Academy | ✅ | 42 lecciones, cuestionarios, insignias, niveles |
| 18 | Contenido de los 14 juegos | ✅ | Mínimo 2 lecciones por juego |
| 19 | Simuladores | ✅ | 8 simuladores |
| 20 | Personalización | ✅ | Avatar, nombre, favoritos, privacidad |
| 21 | Oscuro y claro | ✅ | Verificado visualmente |
| 22 | Español e inglés | ✅ | i18next, paridad de claves probada |
| 23 | Ajustes de sonido y animaciones | ✅ | Efectos/música/hápticos/volúmenes, animaciones, reducir movimiento y efectos, calidad |
| 24 | Estadísticas | ✅ | Por juego y generales, historial |
| 25 | Accesibilidad básica | 🟡 | Roles/labels, Dynamic Type con tope, reduce motion, color + texto; falta auditoría con VoiceOver real |
| 26 | Animaciones funcionan | 🟡 | Verificadas en web; falta perfilado en iPhone |
| 27 | Backend y persistencia | 🟡 | Persistencia local ✅; esquema y funciones listos, no desplegados |
| 28 | Operaciones críticas seguras | ✅ | Probado en Postgres (`docs/07`) |
| 29 | Pruebas ejecutadas y documentadas | ✅ | `docs/10` |
| 30 | Repositorio preparado | ✅ | Subido a `Reenillaa/Cashino` con CI y despliegue a GitHub Pages |
| 31 | Procedimiento de instalación en iPhone | ✅ | Web app instalable vía GitHub Pages (Safari → Añadir a pantalla de inicio); EAS/TestFlight opcional en `docs/09` |

## Cambios de la ronda 2
- Saldo inicial **1.000 Ti** y economía reescalada (simulada de nuevo, `docs/06`).
- **Salas por juego** (Práctica, 20–100, 200–1.000, 2.000–10.000) con carrusel animado al abrir cada juego; límites validados en cliente y servidor; póker con ciegas y entrada por sala.
- Movimiento según la skill **Taste**: curvas ease-out sin rebote, pulsación 0,985 + 1 px en 90 ms, una entrada por pantalla, solo transform/opacidad; 5 archivos de fuente (antes 7).
- Skill **RE** (`github.com/morluto/re`): el repositorio devuelve 404 / no accesible, no se pudo usar.
- Publicación como **PWA en GitHub Pages** (`.github/workflows/pages.yml`).

## Cambios de la ronda 3 (Cashino, estilo Offsuit)
- **Nombre: Cashino** (app, PWA, icono nuevo de ficha pastel, `app.cashino.game`). La moneda pasa de “Ti” a **fichas**.
- **Rediseño visual** siguiendo las capturas oficiales de Offsuit (doc 01): negro puro, superficies sin bordes, tarjetas pastel con emoji grande, saldo como número protagonista, avatares emoji, botones en píldora. Se quitan los “recuadritos” (chips de acciones, cajas de estadísticas, bordes).
- **Inicio = vestíbulo**: se elimina la pestaña Juegos (4 pestañas: Inicio, Ranking, Social, Perfil). Un toque en un juego → elegir sala → jugar.
- **Pensado para cualquier persona**: nombres en castellano (Dados, Minas, Cohete, Cara o cruz…), frases cortas, apuesta con botones − / + grandes y accesos a Mín/Máx.
- **Salas con personalidad**: 🏠 Práctica, ☕️ El Bar, 🎩 El Club y 💎 Sala VIP, como tarjetas pastel en el carrusel.
- **Tutorial → salas**: al terminar o saltar el tutorial se muestra el selector de salas (antes entraba directo en la sala Inicial).
- **Animaciones**: entrada suave de cada pantalla al ganar el foco (cambio de pestaña, volver de un juego), tarjetas con entrada escalonada, resultado que sube y se desvanece sin rebote, iconos de la barra que se asientan.
- **Sonidos nuevos** (`scripts/generate-sounds.mjs` v2): síntesis modal y ruido filtrado con reverb ligera — fichas de arcilla, cartas sobre tapete, marimba para ganar, monedas al retirar, dados de madera; nada de pitidos.
- Skill **REA** (`github.com/morluto/rea`): leída. Es una herramienta MCP de ingeniería inversa de binarios (Ghidra/IDA/Hopper), no una guía de diseño. No se ha usado: aplicarla a Offsuit exigiría descifrar su app de la App Store (DRM) y copiar software propietario, cosas que su propio aviso legal excluye. El estilo se ha tomado de las capturas públicas.

## Cambios de la ronda 4 (probado en iPhone real)
- **Franja negra abajo en el iPhone** (app añadida a la pantalla de inicio): Safari mide mal la altura con la barra de estado translúcida; en modo app se usa la altura real de la pantalla. También sin destello gris al tocar ni menú al mantener pulsado.
- **Tutorial opcional**: ya no salta solo. Botón **«?»** arriba a la derecha → «Enséñame paso a paso», reglas y comprobación de resultados. Un punto verde avisa hasta que lo ves una vez.
- **Guía que señala**: oscurece la pantalla y rodea con un anillo el control exacto que hay que tocar en cada paso (Repartir, Pedir/Plantarse, la barra del Dados, la cuadrícula de Minas…), con una burbuja pequeña. Funciona en los 14 juegos.
- **Panel de abajo más ligero en todos los juegos**: apuesta en una sola fila (− cantidad +), ajustes secundarios (riesgo, minas, filas, objetivo, retiro automático…) plegados en una línea «⚙️ 3 minas · Cambiar», datos más pequeños y solo durante la ronda. Blackjack con las 4 acciones y el consejo en dos filas; cartas más pequeñas en pantallas bajas.
- **Logo animado**: animación de arranque (la ficha rueda y aparece «cashino») y una cortinilla con la ficha girando al entrar en cada juego.
- **Saldo** del inicio en verde y más grueso; logo en la cabecera.
- **Academy**: cada juego tiene ahora su página con *la idea*, *lo que puede pasar* (probabilidad exacta y lo que devuelve, en barras), *de cada 100 fichas* (cuántas vuelven y cuántas se queda la casa), *cómo se calcula*, *un ejemplo con 20 fichas* y un **simulador que juega miles de rondas de verdad** con el mismo motor del juego (varios jugadores, línea teórica y conclusión en palabras sencillas). Todos los números salen del motor o de valores publicados ya verificados en los tests.
- **Ganchos sanos**: racha de días 🔥, «te faltan X XP para el nivel N y su regalo», colección de los 14 juegos y celebración con confeti al subir de nivel. Se ha corregido que **el regalo por subir de nivel (25 × nivel) nunca se pagaba**.
- **Lo que no se ha hecho a propósito**: casi-aciertos simulados, pérdidas disfrazadas de premio, cuentas atrás de presión o celebrar las rachas de pérdidas. Son trucos de enganche de casino y van contra el encargo original (economía sin mecánicas compulsivas), y más pensando en personas mayores.

## Cambios de la ronda 5 (más espectáculo, menos botones)
- **Intro de ruleta**: la rueda entra girando, la bola corre en sentido contrario, cae en una casilla arriba y la cámara se mete en la bola para pasar a la app (~2,6 s, se salta tocando).
- **Logo al cambiar de pestaña**: la ficha aparece girando en el centro y se disuelve.
- **Color y personalidad**: paleta de marca violeta → rosa → ámbar; cada juego con su **degradado vivo** y **logo ilustrado propio** (14 dibujos originales en SVG); fondos **aurora** animados en inicio, pantallas y juegos; tipografía de display **Unbounded** para marca, saldo, títulos y botones.
- **Botones con carácter**: el botón de acción usa el degradado del juego, brillo que lo cruza y sombra de color; el «+» de la apuesta también.
- **Menos botones, más juego**: apuesta y botón de jugar en **una sola fila** en los 10 juegos con apuesta.
- **Tarjetas de juego** con el logo flotando, discos de luz y destello; **barra de pestañas** flotante con burbuja de degradado que se desliza.
- **Ganar se nota**: explosión de fichas de colores y cartel con los colores del juego.

## Cambios de la ronda 6 (los juegos, más juego y menos botones)
- **Rueda de fichas** para apostar en todos los juegos: deslizas o tocas y la ficha del centro es tu apuesta (cantidades redondas entre el mínimo de la sala y el máximo/tu saldo). Adiós al − / +.
- **Entrada de cada juego**: su degradado, rayos de luz girando, el logo del juego entrando en giro con su nombre y zoom hacia la mesa.
- **Fondo de color en toda la pantalla** (sin el corte negro a media altura).
- **Dados**: dos dados que ruedan y botan al tirar y aterrizan; barra verde (ganas) / roja (pierdes).
- **Cohete**: trayectoria en línea recta, cohete grande con llama y estrellas pasando.
- **Limbo**: velocímetro con zona roja/verde, marca en tu objetivo y aguja que sube hasta el resultado.
- **Blackjack** y **Bacará** sobre un tapete con borde dorado y fichas apostadas; **Póker** con mesa ovalada, entrada simplificada (un botón y ajustes plegados) y acciones con color e icono propios (retirarse / pasar-igualar / subir); la subida se elige con la rueda de fichas.
- **Minas** con casillas en relieve y **Keno** con números en forma de bola.

## Cambios de la ronda 7 (los 6 juegos que faltaban, fluidez y recibimiento de casino)
- **Fluidez**: las animaciones de fondo y los brillos se pausan cuando su pantalla no se ve; en el inicio solo se mueven las tarjetas grandes; el fondo aurora usa 2 luces animadas en vez de 4.
- **Sin raya negra**: el fondo de colores ya no lleva ningún degradado a negro ni recorte de caja.
- **Recibimiento de casino** en el inicio: cartel «BIENVENIDO A CASHINO» con marco dorado y bombillas que se encienden en cadena, con tu saldo dentro.
- **Ruleta** rehecha, sin bajar: rueda dorada donde **tocas un número para apostarle** (la ficha aparece en la casilla), apuestas grandes de color (Rojo, 0, Negro, Par, Impar, 1–18, 19–36 y docenas), número ganador grande en el centro, Repetir/Deshacer/Borrar como iconos y la ficha con la rueda de fichas. Se adapta a pantallas pequeñas.
- **Plinko**: puedes soltar bolas seguidas (se ponen en cola), animación de una sola pieza por bola (mucho más ligera), clavos que brillan, bolas rosas con reflejo y cubetas de colores que botan al recibir la bola.
- **Cara o cruz**: moneda detallada (canto estriado, borde en relieve, anillo de puntos, corona y cara / cruz con laurel, nombre grabado), con grosor, lanzamiento alto con giro, rebote al caer y sombra en el suelo.
- **Mayor o menor**: carta grande que sale del mazo y se voltea, brillo verde/rojo según aciertes y probabilidades ▲ ▼ a la vista.
- **Cruza la calle**: asfalto, acera con bordillo, salto de verdad del pollito (se encoge y se estira) y coches circulando por los carriles de delante.
- **Sic Bo**: tres dados que ruedan sobre un tapete, apuestas principales grandes (Pequeño / Grande, Par, Impar, Cualquier trío) y el resto en «Más apuestas».
- **Limbo**: eliges el objetivo arrastrando directamente sobre el velocímetro.
- **Bacará y Sic Bo** apuestan también con la rueda de fichas.

## Cuentas de desarrollador (admin)
- Una cuenta marcada como admin lo tiene **todo desbloqueado** y ve un botón 👑 en el perfil con el **panel de admin**: buscar cualquier jugador y regalarle fichas en un toque (+1.000, +10.000, +100.000, +1M o la cantidad que quieras, con mensaje opcional). Al jugador le sale un aviso «🎁 ¡Te han regalado X fichas!».
- Ser admin **solo** lo puede poner el dueño del proyecto (tabla `admins` sin acceso para los jugadores). Para hacer admin a una cuenta: `insert into admins (user_id) select id from profiles where username = 'TU_USUARIO';` en el SQL de Supabase. Cada regalo queda registrado en `admin_gifts` y no se paga dos veces aunque se repita la petición (probado contra el servidor real).

## Cambios de la ronda 15 (todo se desbloquea, 5 pestañas, portadas, perfil, medallas, ranking semanal con premios)
- **Desbloqueos**: al empezar solo se puede jugar al **blackjack y al póker**. Todo lo demás se compra con fichas: cada juego, cada mesa en directo, la sección de apuestas deportivas y cada deporte dentro (fútbol, NBA, NFL, NHL, tenis, UFC, F1). Precio único para todo: la 1ª compra 2.500, la 2ª 5.000 y a partir de ahí ×1,5 por compra **y nunca menos del 40 % de lo máximo que hayas llegado a tener** (redondeado: 7.500, 12.000, 17.000…). Con cuenta lo decide y lo cobra el servidor (`unlocks`, `unlock_buy`; el servidor rechaza jugar a lo no desbloqueado en `game`, `live` y `sports`). Probado contra el Supabase real: bloqueado → compra 2.500 → 5.000 → 7.500 → 12.000, sin dobles compras, sin comprar un deporte sin la sección, y si el precio cambia te lo enseña antes de cobrar.
- **Pestañas**: Inicio · Apuestas · Ranking (en medio) · Tienda · Perfil. La tienda sale del perfil y tiene primero la sección «Desbloquear». En Inicio se quitan «Novedades» y «Los más jugados», y «Aprende a jugar» pasa a ser un botón redondo con un libro arriba a la derecha.
- **Portadas**: cada juego y cada mesa en directo tiene su propia escena dibujada (estilo dibujo animado, hecha en SVG en la app, sin imágenes de terceros) con un degradado de su color abajo; los bloqueados llevan candado y precio.
- **Fichas y ruleta nuevas**: ficha de casino con cuerpo brillante, 6 insertos en el canto, anillo punteado e incrustación con el valor; pilas en 3D sobre el tapete; ruleta europea con cuenco de madera, pista con diamantes, anillo de números, casillas con separadores plateados, cono y torreta.
- **Perfil**: cabecera con anillo de nivel, saldo y botón redondo para **añadir amigos** (buscar por usuario, solicitudes, lista); estadísticas por juego eligiendo por **icono**; historial con iconos.
- **Logros**: medallas nuevas por dificultad (bronce, plata, oro, diamante) dibujadas en la app, y **15 logros difíciles** (10 victorias seguidas, ganar 100.000 en una ronda, ×100 en el cohete, ×1.000 en Limbo, ×500 en Dulce Cascada, escalera real, 10.000 rondas, nivel 50, apostar 1.000.000…).
- **Ranking semanal**: pestaña «Semanal» con dos categorías — **Puntos** (los de temporada de la semana, con tope diario) y **Máximo ganador** (fichas netas ganadas en la semana) — podio, lista legible, tu puesto y los campeones de la semana pasada. **Premios automáticos** para los 3 primeros de cada categoría (10.000 / 5.000 / 2.500): los paga el servidor al acabar la semana (con la tarea programada de cada 15 min y, por si acaso, en la primera visita); son idempotentes (probado: se pagó una vez y la segunda no hizo nada).
- **Saldo junto a la Dynamic Island**: probado y retirado (en el iPhone real quedaba feo). Una Live Activity de verdad necesita app nativa (ActivityKit) firmada con cuenta de Apple.

## Cambios de la ronda 14 (juegos nuevos, directo, ligas, pase, cash out y carreras en 3D)
- **Cohete en directo** (`/live/crash`): un cohete cada 45 s para todos a la vez. 12 s para subir (con retiro automático opcional), despega y el multiplicador sube igual en todos los móviles (reloj del servidor). El punto de explosión se sortea al cerrar las apuestas y se guarda **solo en el servidor** (`live_secrets`) hasta que explota; el botón Retirar lo decide el servidor con su reloj. Si llega a ×50 aterriza y paga ×50 a los que sigan dentro. Probado contra el Supabase real: resultado invisible en pleno vuelo, retiro antes de despegar rechazado, retiro a ×1,73 pagado, retiro tardío rechazado («ya había explotado»).
- **Dulce Cascada** (juego nuevo, tipo de las tragaperras «de cascada» que arrasan en internet, con diseño propio): 6×5 sin líneas, 8+ dulces iguales en cualquier sitio pagan, los ganadores explotan y caen otros; bombas ×2…×100 que se suman y multiplican la ganancia de la tirada; 4+ piruletas = 10 tiradas gratis con más bombas (+5 con 3 piruletas, máx. 50); premio máximo ×5000. **Retorno ≈96,5 %**, medido con 10 millones de tiradas simuladas (96,3–96,8 % según semilla; no se puede enumerar exacto, como en cualquier tragaperras de cascada); premio ≈30 % de las tiradas; tiradas gratis ≈1/440. Pruebas: coherencia de cada cascada y retorno con 300 000 tiradas. Turbo y «Saltar» para no esperar en las gratis.
- **Ligas con amigos** (`/leagues`): crea una liga (código de 6 letras sin caracteres confusos), tus amigos se unen con el código y hay clasificación semanal con podio. Cuentan los **puntos de temporada de la semana**, que ya tienen topes diarios: se gana jugando un poco cada día y aprendiendo, nunca apostando más. Máx. 30 por liga y 10 ligas por persona; solo los miembros ven la liga (todo pasa por funciones del servidor). Probado contra el servidor real (crear, nombre inválido, unirse, código inexistente, tabla, salir y traspaso de dueño).
- **Pase de temporada** (`/pass`): 30 niveles gratis (400 puntos cada uno) con fichas; cada 5 niveles uno gordo. Con cuenta, el servidor comprueba los puntos de la temporada antes de pagar y no deja cobrar dos veces (probado).
- **Apuestas deportivas**: **cash out** antes de que empiece el evento (apuesta × cuota cogida ÷ cuota actual − 3 %; el servidor lo recalcula y, si las cuotas se han movido en tu contra, te enseña el nuevo valor antes de cerrar). No hay cash out en directo porque no tenemos cuotas en vivo. **NHL** (cuotas de mercado con hándicap ±1,5) y **UFC** (ESPN no da cuotas de combates: se calculan con el récord de victorias y derrotas de cada luchador y la app lo dice). Probado con los datos reales de ESPN (52 partidos de NHL y 11 combates de UFC esta semana) y una apuesta real cerrada con cash out.
- **Carreras de caballos con cámara de televisión**: la pista es un plano 3D real inclinado en perspectiva (calles, vallas, carteles de distancia y la meta a cuadros encima), y los caballos se colocan con la misma proyección: los de las calles del fondo, más pequeños y arriba; los de delante, más grandes. No son modelos 3D poligonales (eso pediría un motor 3D y pesaría mucho en el móvil): son los mismos dibujos del galope sobre la pista en 3D.
- **Inicio**: carrusel de «Novedades» y fila «En directo» con las tres mesas y su reloj de ronda; Ranking con accesos al pase y a las ligas.

## Cambios de la ronda 13 (siempre oscuro, sin zoom ni desplazamiento, fluidez medida juego a juego)
- **Siempre en oscuro**: todo el diseño (tapetes, juegos, tienda, apuestas) está pensado sobre fondo oscuro; en móviles en modo claro había textos blancos sobre blanco. La app ignora el modo del sistema (`userInterfaceStyle: 'dark'`) y desaparece el selector de tema.
- **La página no se mueve ni hace zoom** (versión web/PWA): viewport sin zoom, `html/body` fijos con `overscroll-behavior:none` y `touch-action` (sin zoom por doble toque, sin rebote), y bloqueo de los gestos de pellizco de Safari (iOS ignora `user-scalable=no` por diseño). Las listas siguen desplazándose dentro de la app.
- **Fluidez, medida en emulación de iPhone 15 Pro con la CPU frenada ×4** (Playwright + perfiles de Chrome) antes y después:
  - Guardado en lotes: los estados persistentes (monedero, progreso, ronda activa) se escribían enteros en cada cambio; ahora se agrupan cada 0,5 s y se guardan al ir a segundo plano o cerrar. Era la causa de los tirones al jugar.
  - Animaciones que nunca paraban: el anillo del tutorial latía siempre (aunque no se viera), el brillo de los botones mantenía una animación activa entre destellos, el punto del «?» latía infinito y los logos de Inicio flotaban sin parar. Ahora, con el juego quieto, ningún juego pide fotogramas (antes 1–10 animaciones por fotograma; Inicio 1800 → 76 peticiones en 3 s).
  - Cohete: el multiplicador se repinta ~30 veces/s y la consulta al motor es silenciosa y sin guardar: 48 → 59 fps.
  - Plinko: el tablero de ~230 clavos se dibuja una vez; bolas sin sombra: parones 12 → 2.
  - Marcos de bombillas: solo las bombillas se actualizan y sin sombras animadas. Caballos y elementos de pista memorizados.
  - Resultado (CPU ×4): todos los juegos 55–60 fps jugando; peores tirones: Video Póker 283 → 117 ms, Diamantes 200 → 100 ms, Torre 167 → 83 ms. Queda un tirón al arrancar la carrera de caballos (se montan los 32 dibujos del galope), puntual.
  - No probado en un iPhone físico: las cifras son de emulación en Chromium (Safari pinta distinto).

## Cambios de la ronda 12 (apuestas deportivas reales y botones del blackjack)
- **Blackjack**: botones de acción al estilo del póker: Pedir (verde, +), Plantarse (oro, ✋), Doblar (violeta, ×2), Dividir (rosa, ⇆); con la pista 💡 el movimiento recomendado brilla.
- **Apuestas deportivas** (nuevo menú, desde Inicio): partidos, horarios, marcadores en vivo, resultados, forma y balances **reales de ESPN** (datos públicos; no se usa Flashscore porque sus condiciones prohíben extraer datos). LaLiga, Premier, Serie A, Bundesliga, Ligue 1, Champions, Europa League, Nations League (Eurocopa/Mundial cuando haya), F1, ATP/WTA, NFL y NBA. MotoGP no: no hay fuente abierta y la temporada ha terminado.
  - Cuotas propias: con cuotas de mercado (DraftKings vía ESPN) se quita su margen, se ajusta un modelo y de él salen todos los mercados con margen propio (6 % principales, 12 % exóticos, 15 % ganador F1). Fútbol: Poisson (~23 mercados). NFL/NBA: normal (moneyline, hándicaps, totales, márgenes). Tenis: sets desde el ranking. F1: Plackett–Luce desde los puntos del Mundial. Sin mercado, fútbol usa la clasificación.
  - Boleto: sencillas o combinada (una selección por partido, máx. 10). El servidor recalcula la cuota (si cambió la rechaza con la nueva) y no acepta eventos empezados. Liquidación con el resultado oficial; anulados devuelven.
  - Probado: 207 eventos reales en ~3 s; sencilla y combinada; rechazos correctos; liquidación de un partido ya jugado. 9 tests con respuestas reales de ESPN.
  - Refresco automático: el workflow `sports-refresh.yml` pide cada 15 min a la función `sports` que traiga resultados y liquide apuestas (además de cuando alguien abre las apuestas). La acción `refresh` es pública (no mueve fichas, máx. una vez cada 90 s); `bet` exige cuenta.
  - La API de ESPN es pública pero no oficial: puede cambiar. Para uso comercial haría falta un proveedor con licencia.

## Cambios de la ronda 11 (carreras de caballos, directo multijugador, tienda y mesa caliente en el servidor)
- **Carreras de caballos** (nuevo): programa de 8 caballos con velocidad, fondo, arranque, jockey, estilo (escapista / persigue / remata), forma de las últimas 5 carreras, terreno y distancia preferidos; terreno del día (firme, bueno, blando, pesado) y distancia (1200–2400 m). Apuestas de hipódromo con cuota fija: **Ganador, Colocado (top 3), Gemela, Gemela exacta, Trío y Trío reversa**, varias por carrera. Carrera animada: tribuna con público, césped a franjas, vallas, marcadores de metros, meta a cuadros, caballos galopando con casaca y número, cámara que sigue al líder, posiciones y narrador en directo, y podio final.
  - Modelo honesto y «tryhardeable»: la casa calcula las cuotas simulando 20 000 carreras con los datos de los caballos, pero solo tiene en cuenta el 75 % del efecto del terreno y la distancia. Margen 15 % ganador, 18 % colocado, 20–25 % exóticas. Simulado: ganador al azar ≈ 79 %, siempre al favorito ≈ 88 % (el favorito gana ≈ 43 %; la casa decía ≈ 41 %), trío al azar ≈ 34 %, y apostar a caballos a los que les gustan el terreno y la distancia del día ≈ 110 % (pocas carreras simuladas: margen de error amplio). La Academy lo explica; no tiene simulador en vivo porque cada carrera cuesta 20 000 simulaciones.
- **Multijugador en directo** (con cuenta): **Carreras en directo** (una cada 2 min: 90 s para apostar) y **Ruleta en directo** (cada 45 s). Todos ven la misma ronda, las apuestas de los demás y el mismo resultado. El resultado se crea en el servidor con una semilla nueva solo cuando cierran las apuestas (no existe antes); el pago es idempotente. Acceso desde Inicio y desde Mesas online.
- **Tienda con cuenta**: el catálogo y los precios viven en el motor compartido; la función `shop` cobra del saldo de la cuenta de forma atómica (`shop_buy`), guarda lo comprado y lo equipado en el servidor y no deja comprar dos veces ni equipar lo que no tienes.
- **Mesa caliente en el servidor**: la función `game` mira las rondas de hoy del jugador en ese juego (regla compartida `engine/meta/hot.ts`) y rechaza stakes por encima del límite (`hot_table:<máx>`); las carreras guardan el límite al abrir el programa.
- Probado contra el servidor real: compra sin saldo / con saldo / repetida / objeto falso; mesa caliente (rechaza 60, deja 20, no afecta a otro jugador); ruleta en directo con 2 jugadores (resultado nulo antes del cierre, pago correcto, apuesta tardía rechazada, reintento sin doble cobro); carrera en directo completa en el navegador (apuesta ganadora cobrada).

## Servidor online (Supabase) — activado
- Proyecto Supabase **Cashino** (región eu-central-1, Postgres 17). Esquema aplicado: 33 tablas con RLS, saldos solo modificables por funciones del servidor, ranking, póker multijugador y torneos. Migración `20261116000000_hardening.sql` tras el revisor de seguridad (los avisos restantes son intencionados: vistas de ranking que solo exponen nombre/avatar/puntos y tablas internas sin políticas que solo usa el servidor).
- Edge Functions desplegadas: `game` (los 20 juegos con RNG del servidor; el estado oculto, como los huevos de la Torre o el mazo, nunca llega al móvil), `rewards`, `account`, `poker`. Solo usan las claves que inyecta la plataforma.
- Auth: correo + contraseña (mínimo 8). **Confirmación por correo desactivada**, porque el correo gratuito de Supabase solo envía a los miembros del equipo; para activarla hay que configurar un SMTP propio (Authentication → SMTP) y desmarcar *autoconfirm*. URL del sitio y de vuelta: la web de GitHub Pages y `cashino://`.
- Apple y Google ocultos hasta activarlos en Supabase → Providers y añadir `EXPO_PUBLIC_OAUTH_PROVIDERS=google,apple` al build.
- La web publicada se compila con la URL y la clave **publishable** (pública por diseño) en `.github/workflows/pages.yml`. La clave secreta nunca sale de Supabase.
- Probado de verdad: registro, saldo inicial 1 000, 4 juegos con saldo correcto, Torre (2 pasos), ranking por juego y de temporada, y una mesa de póker con 2 usuarios reales (cada uno solo ve sus cartas). Los usuarios de prueba se borraron.
- Tienda y mesa caliente funcionan también con cuenta (ronda 11).

## Cambios de la ronda 10 (5 juegos web, entradas propias, tienda grande, mesa caliente)
- **5 juegos nuevos de los casinos web**: **Rueda** (30 casillas, 3 riesgos, 99 %), **Torre del Dragón** (8 pisos, 4 dificultades, 99 %), **Diamantes** (5 gemas de 7 colores; retorno exacto 99,0 % contando las 16 807 combinaciones), **Globo/Pump** (4 dificultades, 99 %) y **Dragon Tiger** (reglas reales con 8 barajas: Dragón/Tigre 96,27 %, Empate 11:1 89,64 %). Motores con 13 tests, protocolo y servidor sincronizados, logos, reglas, tutoriales, Academy y simulador. Ahora hay 20 juegos en el menú.
- **Entrada propia para cada juego** (en lugar del logo girando): la ruleta gira con su bola, la tragaperras aterriza los tres rodillos en 7-7-7 mientras hace zoom, se reparte A+K con «21» en blackjack, escalera real en Video Póker, ases y fichas en póker, 9 natural en bacará, dragón contra tigre, dados que caen en 6-6, cohete despegando, aguja del limbo, tablero de minas que se voltea, bolas de plinko, moneda girando, pollito cruzando entre coches, velas de bolsa subiendo, rueda girando, torre que se apila con su dragón, diamantes cayendo y globo inflándose.
- **Tienda ampliada y más cara**: 5 secciones (dorsos, tapetes, avatares, **marcos** para tu avatar y **títulos** bajo tu nombre), unos 40 objetos y precios de 3 000 a 500 000 fichas.
- **Mesa caliente 🔥** (en lugar de cambiar probabilidades): si hoy ganas ≥ 2 000 fichas netas o 8 rondas seguidas en un mismo juego, su apuesta máxima baja a ~¼ hasta el día siguiente y el juego lo avisa. **Las probabilidades no cambian nunca**: cambiarlas a escondidas rompería la verificación «provably fair», los RTP publicados y lo que enseña la Academy. Se aplica en el cliente (modo invitado); con cuentas online habría que replicarlo en el servidor.

## Cambios de la ronda 9 (repaso de juegos, tienda, Video Póker, retos semanales)
- **Video Póker** (nuevo, «Jacks or Better» 9/6): 5 cartas, tocas las que quieres guardar (suben y se marcan «GUARDADA»), cambias el resto de la misma baraja y la tabla de premios ilumina tu jugada. Botón 💡 *Pista* con la estrategia simplificada conocida para esta tabla. Retorno publicado con juego perfecto: 99,54 %; con la pista, simulación propia de 1,2 M de manos ≈ 99,5–100 % (margen de ±0,4 % por lo rara que es la escalera real) y 45,5 % de manos con premio. Motor con 5 tests, Academy con frecuencias simuladas y simulador Monte Carlo («con pista» vs «sin guardar nada»).
- **Tienda** (solo estética, con fichas de juego): 6 dorsos de cartas, 5 tapetes y 6 avatares especiales. Se compra con dos toques (para no gastar sin querer); lo equipado se aplica de verdad: el dorso en todas las cartas, el tapete en blackjack y póker, y el avatar en Inicio, Perfil y la mesa de póker. Tests del almacén (cobra una vez, no deja comprar sin fichas ni equipar lo que no tienes). Acceso desde Inicio y Perfil.
- **Retos de la semana**: ya existían en el motor pero no se veían; ahora salen en Inicio con cuenta atrás («Quedan N días») y hay retos nuevos de Tragaperras, Video Póker y Bolsa.
- **Repaso visual**: moneda de Cara o cruz (en web se veía como un círculo liso por un SVG tapado: arreglado), Cohete con ciudad y plataforma de lanzamiento que se hunden al despegar, planeta con anillo, estela de humo y explosión, Minas con tablero tipo cámara acorazada, casillas con diamante grabado, gema tallada y chispazo al reventar, Bacará con huecos de cartas, «VS», totales grandes y apuestas principales ovaladas, Blackjack con huecos de cartas y círculo de apuesta cuando la mesa está vacía, Cruza la calle con coches circulando ya antes de apostar, y **lluvia de monedas + «¡GRAN PREMIO!»** en cualquier juego al ganar ×5 o más.

## Cambios de la ronda 8 (juegos nuevos, menos colores, inicio de sesión)
- **Tragaperras** (nuevo): máquina «CASHINO 777» con marquesina de bombillas, 3 rodillos que bajan y frenan uno detrás de otro con rebote, línea de premio que brilla al ganar y palanca que puedes tocar. Símbolos propios en SVG (cereza, limón, campana, BAR, 7, diamante). Tabla de premios fija y **RTP exacto 97,4 %** calculado en `slotsStats()` y comprobado en tests (hit rate ≈ 46,7 %).
- **Bolsa** (nuevo, juego de invertir): eliges **Sube** o **Baja**; el precio de «CSH/EUR» hace 40 ticks (paseo aleatorio lognormal decidido antes de animar) y se dibuja en directo con área de color. Paga ×1,98 (RTP 99 %).
- **Keno y Sic Bo** retirados de menús, ranking, perfil, Academy y colección (siguen en el motor por si alguien tenía historial). Los logros «coleccionista/explorador» ya no los cuentan; sus dos logros se sustituyen por «Triple siete» y «Inversor».
- **Paleta**: solo 4 familias de color (violeta, rosa, oro y verde) para todos los juegos, en lugar de un color distinto por juego.
- **Social eliminado**: quedan 3 pestañas (Juegos, Ranking, Perfil).
- **Blackjack**: el total de cada mano es una ficha grande junto a las cartas (blanca normal, dorada al 21, roja si te pasas, «7/17» con as blando) y el de la banca se ve arriba («10+» mientras la carta tapada no se muestra).
- **Póker**: **desliza tus cartas hacia arriba para retirarte** (con aviso debajo de las cartas); un deslizamiento corto vuelve a su sitio.
- **Inicio de sesión**: botones «Continuar con Apple» y «Continuar con Google» (Supabase OAuth; redirección en web, `expo-web-browser` en nativo) y correo + contraseña / enlace mágico. Ver «Activar Apple y Google» abajo.
- **Fluidez**: sonidos en web con Web Audio API (el `<audio>` de iOS era pesado y bloqueaba con muchas bolas de Plinko), limitación de sonidos repetidos (clavos, ticks) y fondo aurora estático en web.

### Activar Apple y Google (lo tiene que hacer el dueño del proyecto)
Sin estas cuentas los botones se ven pero avisan de que el servidor no está configurado; **no hay claves en el repositorio**.
1. Supabase → *Authentication → URL Configuration*: añadir `https://reenillaa.github.io/Cashino/` y `cashino://auth` a *Redirect URLs*.
2. Google: Google Cloud Console → credenciales OAuth (tipo *Web*), redirect `https://<proyecto>.supabase.co/auth/v1/callback`; pegar Client ID y Secret en Supabase → *Providers → Google*.
3. Apple: cuenta Apple Developer (de pago) → *Services ID* + clave *Sign in with Apple*, return URL la misma callback de Supabase; rellenar Supabase → *Providers → Apple*.
4. Rellenar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`) en el build.

## Decisiones técnicas registradas
- Motor puro compartido app ↔ Edge Functions (`npm run sync:engine`).
- Sin Skia en v1 (SVG + Reanimated bastan y funcionan en web/CI).
- Tab bar propia de cristal en lugar de native tabs (identidad igual en iOS 17–26).
- Iconos SVG propios en lugar de SF Symbols (consistencia y verificación en web).
- “Chicken Road” → **Cruce** (marca de terceros; mecánica genérica con arte original).
- Usuarios con cuenta juegan contra bots en práctica local; las monedas en juego online van por mesas del servidor.

## Limitaciones conocidas
- Push remotas no configuradas (requiere clave APNs); hay notificaciones locales opcionales e in-app.
- Apple y Google tienen botón y código, pero no funcionan hasta configurar Supabase y las cuentas de Apple Developer / Google Cloud. En la PWA instalada en iPhone el login con Google/Apple puede abrirse en Safari y no volver a la app instalada (limitación de las PWA de iOS); el correo funciona siempre.
- La fluidez con muchas bolas de Plinko se ha medido en Chromium de escritorio, no en un iPhone real.
- En ruleta, la UI permite plenos y apuestas exteriores; caballos/calles/cuadros/seisenas están en el motor y el servidor pero no en el tapete móvil.
- La tienda gasta las fichas del monedero local (invitado). Con cuenta online habría que mover compras y objetos al servidor.
- REA no aplica a diseño (es ingeniería inversa); Taste sí se aplica a movimiento.
- Los emojis se ven con el estilo del sistema (Apple en iPhone, Google/Noto en Android/Chrome).
- En la versión web del iPhone no hay vibración (Safari no lo permite).

## Próximos pasos
0. Lo que necesita tus cuentas (no se puede hacer sin ti): build nativa con tu cuenta de Expo/EAS, correo SMTP propio para recuperar contraseña, activar Google/Apple en Supabase. Cuotas en vivo para cash out en directo requieren un proveedor de datos con licencia (de pago).
3. Build EAS de desarrollo en tu iPhone; perfilar animaciones y revisar VoiceOver.
4. Apuestas interiores completas en ruleta, Sign in with Apple nativo (`expo-apple-authentication`), push, torneos semanales con ranking (necesitan Supabase).
