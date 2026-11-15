# 07 · Seguridad y aleatoriedad

## Aleatoriedad
- **Online**: el servidor genera la semilla con `crypto.getRandomValues` (32 bytes) y la guarda en `user_seeds` (RLS sin acceso de cliente). Cada ronda usa `HMAC-SHA256(serverSeed, clientSeed:nonce:cursor)`; el cliente ve el hash SHA-256 de la semilla por adelantado y la semilla real tras rotarla (operación `rotate`, solo sin rondas activas).
- **Offline**: misma construcción con semilla local de `expo-crypto`. Verificación en la hoja “Juego verificable” de cada juego.
- **Póker online**: barajado Fisher–Yates con RNG criptográfico del servidor (`cryptoRng`), mazo y cartas privadas solo en `poker_private`.
- Enteros sin sesgo (muestreo por rechazo). Pruebas χ² de uniformidad en RNG, ruleta, Plinko, minas y monedas.
- `seededRng` (mulberry32) solo se usa en bots, simuladores y tests — nunca para resultados.

## Autoridad del servidor
| Riesgo | Mitigación |
|---|---|
| Cliente envía resultados falsos | Los clientes solo envían operación + parámetros; el resultado lo calcula `runOp` en la Edge Function |
| Manipular saldo | `wallets`/`coin_ledger` sin políticas de escritura; `wallet_apply`/`game_commit` son `SECURITY DEFINER`, ejecutables solo por `service_role`; `CHECK (balance >= 0)` |
| Duplicar pagos reintentando | `processed_requests` (clave única por petición) + claves idempotentes en el libro mayor |
| Carreras entre peticiones | Bloqueo `FOR UPDATE` de la cartera + versión de sesión (`conflict`) |
| Reclamar recompensas dos veces | PK `(user_id, kind, period)` en `reward_claims`; misiones verificadas contra `game_rounds` |
| Duplicar monedas al migrar | `guest_migrations` PK por usuario + tope |
| Turnos de póker falsos | El servidor comprueba `toAct`, legalidad y versión; tiempos agotados con `action_deadline` del servidor |
| Ver cartas ajenas | `poker_hole_cards` con RLS `user_id = auth.uid()`; `public_state` generado con `viewFor(t, null)` |
| Spam en mesas | Sin chat; reacciones de un catálogo cerrado (`CHECK`), límite 1 cada 2 s (trigger), solo jugadores sentados |
| Acoso | Bloqueos (ocultan en búsqueda y bloquean solicitudes), silenciar/denunciar (`reports`) |
| Editar XP/nivel | Privilegios por columna: el cliente solo puede actualizar campos cosméticos/privacidad del perfil |

## Claves
- La app solo lleva la clave **publishable** de Supabase (`EXPO_PUBLIC_…`). La `service_role` existe únicamente como secreto de las Edge Functions (inyectada por la plataforma).
- `.env` está en `.gitignore`; `.env.example` no contiene valores.

## Verificado
`supabase/tests/10_behaviour.sql` comprueba en Postgres 16: aislamiento RLS, imposibilidad de acuñar monedas o editar XP desde el cliente, idempotencia, rollback por saldo insuficiente, conflictos de versión, recompensas únicas, tope de migración, topes diarios de XP, amistades/bloqueos y reacciones.

## No verificado aún
- Despliegue real en un proyecto Supabase (faltan credenciales) → las Edge Functions están type-checked con Deno pero no ejecutadas contra un proyecto vivo.
- Pruebas de carga de mesas concurrentes.
