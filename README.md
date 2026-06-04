<div align="center">
  <img src="assets/logo-fluxor.png" width="96" height="96" style="border-radius: 22px" />
  <h1>FluXor</h1>
  <p><strong>Control total de tus finanzas personales</strong></p>

  ![Version](https://img.shields.io/badge/version-2.6.17-blue?style=flat-square)
  ![Platform](https://img.shields.io/badge/platform-Windows-informational?style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
  ![Status](https://img.shields.io/badge/estado-estable-brightgreen?style=flat-square)

  <br/>

  [⬇️ Descargar para Windows](https://github.com/axelpg19/FluXor/releases/latest) · [📋 Ver cambios](#changelog) · [🐛 Reportar un bug](https://github.com/axelpg19/FluXor/issues)

</div>

---

## ¿Qué es FluXor?

FluXor es una app de escritorio para Windows que te permite llevar el control de tus finanzas personales de forma privada, rápida y sin depender de internet. Tus datos se guardan localmente y se sincronizan en la nube cuando hay conexión.

---

## Características principales

- **Chat financiero inteligente** — registra gastos, ingresos, transferencias y pendientes con lenguaje natural
- **Multi-moneda** — soporte para MXN, USD, EUR y más, con tipos de cambio en tiempo real
- **Tarjetas de crédito** — gestión de cortes, MSI y periodos automáticos
- **Presupuestos** — define límites globales o por categoría con alertas visuales
- **Gastos recurrentes** — cargos fijos generados automáticamente cada mes
- **Cobros pendientes** — registra y liquida parcial o totalmente lo que te deben
- **Metas de ahorro** — crea y sigue el progreso de tus objetivos financieros
- **Gráficas del periodo** — ingresos vs gastos, tendencia y gastos por categoría
- **Sincronización en la nube** — respaldo automático con Supabase
- **Offline-first** — funciona sin internet, sincroniza cuando hay conexión
- **Auto-actualizaciones** — detecta e instala nuevas versiones automáticamente

---

## Instalación

### Windows

1. Ve a [**Releases**](https://github.com/axelpg19/FluXor/releases/latest)
2. Descarga el archivo `FluXor-Setup-x.x.x.exe`
3. Ejecuta el instalador
   > Si Windows muestra una advertencia de SmartScreen, haz clic en **Más información** → **Ejecutar de todas formas**. Esto ocurre porque la app aún no tiene firma digital de código.
4. Sigue los pasos del instalador
5. Abre FluXor desde el acceso directo en el escritorio o el menú inicio

---

## Primeros pasos

1. **Crea una cuenta** o inicia sesión con Google o GitHub
2. **Configura tu día de corte** — define el inicio de tu periodo financiero mensual
3. **Registra tus movimientos** — escribe en el chat o usa los botones de acción rápida
4. **Sincroniza** — tus datos se respaldan automáticamente en la nube

---

## Tecnología

| Componente | Tecnología |
|---|---|
| Desktop | Electron 39 |
| UI | React 19 + Vite 7 |
| Base de datos | SQLite (better-sqlite3) |
| Sincronización | Supabase |
| PWA | Vercel |
| Instalador | electron-builder + NSIS |
| Auto-update | electron-updater + GitHub Releases |

---

## Desarrollo local

```bash
# Clonar el repositorio
git clone https://github.com/axelpg19/FluXor.git
cd FluXor

# Instalar dependencias
pnpm install

# Iniciar en modo desarrollo
pnpm start
```

### Generar instalador

```bash
# Recompilar nativos y generar .exe
.\node_modules\.bin\electron-builder install-app-deps
.\node_modules\.bin\electron-builder --win
```

El instalador se genera en la carpeta `release/`.

---

## Changelog

### v2.6.17 — 2026-06-04
- Día de corte inteligente por mes (respeta febrero, meses de 30 días, etc.)
- Menú nativo de la app en español con opciones funcionales
- Branding actualizado a Fluxorfinance
- Copyright actualizado

### v2.6.14 — 2026-06-04
- Fix en el input del día de corte — ahora permite edición libre con borrar/suprimir
- Eliminado Microsoft como método de autenticación

### v2.6.9 — 2026-06-04
- Auto-actualizaciones con electron-updater + GitHub Releases
- Splash screen al iniciar con estados de carga animados
- Instalador profesional NSIS para Windows
- Fix de encoding UTF-8 en mensajes del chat

### v2.6.2 — 2026-06-03
- Rediseño del dashboard: Chat + Pendientes arriba, 3 gráficas abajo
- Paneles de altura fija para una presentación consistente
- Tutorial actualizado para reflejar el estado actual de la app

---

## Autor

Desarrollado por **Axel Ponce** · [fluxorfinance@gmail.com](mailto:fluxorfinance@gmail.com)

---

<div align="center">
  <sub>© 2026 Fluxor · Todos los derechos reservados</sub>
</div>
