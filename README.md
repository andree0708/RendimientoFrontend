# WorkSense AI — Frontend

Interfaz web del sistema inteligente de análisis y predicción de fatiga y rendimiento laboral.

## Stack

- **Angular 19** + **TypeScript**
- **Angular Material 19**
- **Apache ECharts** (gráficas)
- **WebSockets** (tiempo real)
- **Poppins** (tipografía)

## Estructura

```
src/app/
├── core/           # Auth service, interceptor, guard, WebSocket service
├── services/       # Servicios de dominio (session, task, self-report, AI, etc.)
├── models/         # Interfaces de datos (coinciden con el backend)
├── shared/         # Directiva ECharts
├── layout/         # Layout principal con sidebar
└── pages/          # Pantallas: auth, dashboard, tasks, self-reports,
                    #   analysis, recommendations, sessions, settings, admin
```

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm start
# o
ng serve
```

La aplicación estará disponible en `http://localhost:4200`

## Build

```bash
npm run build
```

## Pantallas

1. **Login / Registro** — Autenticación con JWT
2. **Dashboard** — Resumen en tiempo real con métricas, fatiga y predicciones
3. **Tareas** — Crear, completar y registrar resultados
4. **Autorreportes** — Check-in rápido de bienestar con sliders
5. **Análisis IA** — Predicciones, factores influyentes, anomalías
6. **Recomendaciones** — Sugerencias personalizadas con explicaciones
7. **Sesiones** — Historial de sesiones de trabajo
8. **Configuración** — Perfil, privacidad, consentimiento, agente
9. **Admin** — Gestión de modelos IA, estadísticas agregadas

## WebSocket

El frontend se conecta automáticamente al WebSocket al iniciar sesión.
Los eventos actualizan el dashboard en tiempo real sin recargar la página:
- `session.started` / `session.stopped`
- `metrics.batch_received`
- `fatigue.risk_updated`
- `performance.forecast_updated`
- `recommendation.created`
- `notification.created`

Reconexión automática con backoff exponencial y heartbeat cada 30s.
