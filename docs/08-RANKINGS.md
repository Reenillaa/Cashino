# 08 · Rankings

**El saldo nunca es un criterio.** Todas las clasificaciones online usan solo eventos verificados por el servidor.

| Ranking | Métrica | Detalle |
|---|---|---|
| Global (temporada) | Puntos de temporada | Rondas +2 (tope 200/día), lección nueva +30, logro +50, Sit & Go 1º +120 / top 3 +50, misiones (+30…+400). Temporadas de 56 días desde el 5/1/2026 |
| Amigos | Igual que global | Filtrado a amistades aceptadas |
| Por juego · Póker | Rating Elo multijugador | Solo Sit & Go online, solo entre humanos (los bots nunca mueven ratings), mínimo 3 torneos |
| Por juego · Blackjack | Precisión | Límite inferior de Wilson (95 %) de decisiones correctas frente a la estrategia básica → penaliza muestras pequeñas |
| Por juego · azar (12 juegos) | Maestría 0–1000 | 400·min(1, log₁₀(1+rondas)/3) + 350·progreso Academy del juego + 50 tutorial (+ logros en la vista local) |

## Anti-manipulación
- Topes diarios en puntos por volumen; la participación es logarítmica (satura ≈ 1.000 rondas).
- Las mesas privadas no afectan al rating (solo Sit & Go), y los bots no cuentan.
- Recompensas y lecciones validadas en servidor (ids de lecciones con formato controlado, máx. 10 por sincronización).
- Las vistas `leaderboard_*` solo muestran perfiles públicos.

Implementación: `src/engine/meta/ranking.ts` (fórmulas compartidas), vistas SQL en `supabase/migrations/20261115000100_social_multiplayer.sql`.
