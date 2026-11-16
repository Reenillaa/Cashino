# Estado del proyecto

Registro honesto frente a los 31 criterios de aceptación. ✅ hecho y verificado · 🟡 implementado, falta verificación en entorno real · ❌ pendiente.

| # | Criterio | Estado | Notas |
|---|---|---|---|
| 1 | App React Native ejecutable | ✅ | Expo SDK 58 / RN 0.88; typecheck y build web OK |
| 2 | Identidad Titanium | ✅ | `docs/02`, tokens, icono provisional “Split” |
| 3 | Pestañas funcionales | ✅ | Juegos (inicio), Ranking, Perfil (Social retirado en la ronda 8 a petición) |
| 4 | 14 juegos implementados | ✅ | Todos jugables (verificado en navegador) |
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
- Saldo casual inflacionario (sin sumideros cosméticos aún).
- REA no aplica a diseño (es ingeniería inversa); Taste sí se aplica a movimiento.
- Los emojis se ven con el estilo del sistema (Apple en iPhone, Google/Noto en Android/Chrome).
- En la versión web del iPhone no hay vibración (Safari no lo permite).

## Próximos pasos
1. Crear proyecto Supabase, `db push`, desplegar funciones y probar online con dos dispositivos.
3. Build EAS de desarrollo en tu iPhone; perfilar animaciones y revisar VoiceOver.
4. Tienda cosmética con fichas, apuestas interiores completas en ruleta, Sign in with Apple nativo (`expo-apple-authentication`), push.
