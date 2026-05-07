# Fluxor

Aplicación moderna de finanzas personales offline-first desarrollada con Electron, React y SQLite.

Fluxor está diseñada para ayudarte a llevar un control claro, rápido y organizado de tus finanzas personales desde una experiencia moderna de escritorio, manteniendo siempre tus datos locales y bajo tu control.

---

# Vista general

Fluxor permite registrar y administrar:

* Gastos
* Ingresos
* Pendientes
* Transferencias
* Tarjetas de crédito y débito
* Pagos a meses (MSI)
* Gastos recurrentes
* Balance financiero mensual
* Resúmenes anuales
* Multi-moneda
* Exportación de datos

Todo esto desde una arquitectura offline-first rápida y estable.

---

# Características principales

## Gestión financiera completa

* Registro de gastos e ingresos
* Manejo de pendientes y préstamos
* Transferencias entre cuentas
* Edición y eliminación de movimientos
* Sistema de periodos financieros con día de corte configurable

---

## Tarjetas de crédito y débito

* Registro de múltiples tarjetas
* Límite de crédito configurable
* Barra visual de uso
* Estado de pago (pagado / pendiente)
* Recordatorios de vencimiento
* Historial completo por tarjeta

---

## Pagos a meses (MSI)

* MSI con o sin intereses
* Distribución automática por meses
* Progreso visual de mensualidades
* Relación entre pagos mediante grupos

---

## Movimientos recurrentes

* Generación automática mensual
* Configuración de recurrencias
* Edición de monto y fecha
* Eliminación con excepciones por periodo

---

## Multi-moneda

* Soporte para MXN, USD y otras monedas
* Conversión manual mediante tipo de cambio
* Conservación del valor histórico original
* Equivalente automático en MXN

---

## Dashboard financiero

* Balance del periodo
* Total de ingresos
* Total de gastos
* Pendientes activos
* Gráficas comparativas

---

## Exportación de datos

* Exportación a CSV
* Exportación a PDF
* Reportes financieros completos

---

# Filosofía de Fluxor

Fluxor sigue una filosofía offline-first.

Tus datos permanecen:

* locales
* rápidos
* privados
* bajo tu control

La aplicación está diseñada para funcionar incluso sin conexión a internet.

---

# Arquitectura

## Frontend

* React

## Desktop

* Electron

## Base de datos local

* SQLite
* better-sqlite3

## Comunicación interna

* IPC (ipcMain + contextBridge)

## Futuro sistema de sincronización

* Supabase

---

# Roadmap

## Versión actual

* [x] Gestión de movimientos
* [x] Tarjetas de crédito y débito
* [x] MSI
* [x] Recurrencias
* [x] Dashboard financiero
* [x] Exportaciones
* [x] Multi-moneda

---

## Próximamente

* [ ] Sincronización en nube
* [ ] Sistema multiusuario
* [ ] PWA móvil
* [ ] Auto updates
* [ ] Backup automático
* [ ] Insights financieros inteligentes

---

# Instalación

## Clonar repositorio

```bash
git clone https://github.com/TU-USUARIO/fluxor.git
```

---

## Instalar dependencias

```bash
npm install
```

---

## Ejecutar en desarrollo

```bash
npm run dev
```

---

# Build de producción

```bash
npm run build
```

Los instaladores generados aparecerán en la carpeta:

```txt
/dist
```

---

# Seguridad

Fluxor está diseñada con enfoque en seguridad y privacidad:

* Datos almacenados localmente
* Arquitectura aislada de Electron
* Validación de entradas
* Preparada para autenticación segura con Supabase
* Preparada para sincronización cifrada

---

# Objetivo del proyecto

Fluxor busca ofrecer una experiencia moderna y práctica para el control financiero personal, combinando:

* velocidad
* claridad
* diseño moderno
* control local de datos
* escalabilidad futura

---

# Licencia

MIT License

---

# Autor

Desarrollado por Axel Ponce.
