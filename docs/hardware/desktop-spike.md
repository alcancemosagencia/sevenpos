# SevenPOS — Spike de Hardware de Escritorio (AG-03)

Este documento registra los resultados técnicos de los spikes de hardware (Lector de Códigos de Barra e Impresora Térmica) implementados en la fase **AG-03**.

---

## 1. Lector de Códigos de Barra (Barcode Scanner)

### Arquitectura Técnica
- **Modo**: USB HID / Keyboard Wedge.
- **Servicio**: `KeyboardWedgeScanner` (`src/infrastructure/hardware/scanner/KeyboardWedgeScanner.ts`).
- **Mecanismo de Detección**:
  - Escucha eventos `keydown` en la ventana global.
  - Verifica el intervalo entre caracteres consecutivos: un escáner comercial envía ráfagas ultrarrápidas con intervalos de $<60\text{ms}$ por dígito, mientras que la escritura humana promedia $>120\text{ms}$.
  - Requiere terminador `Enter` para cerrar el buffer.
  - Longitud mínima de código: 3 caracteres.
- **Herramienta de Diagnóstico**: `ScannerSimulatorModal` integrado en el modal DEV Core para simular ráfagas de prueba (EAN-13, Chile, Colombia).

### Estado de Validación
- **Scanner Software Parser**: **PASS** (100% verificado mediante pruebas unitarias y simulador interactivo).
- **Physical USB Scanner**: **NOT TESTED** (Pendiente de validación física con hardware comercial conectado).

---

## 2. Impresora Térmica de Tickets (Thermal Printer)

### Arquitectura Técnica
- **Abstracción**: `PrintPort` (`src/infrastructure/hardware/printing/PrintPort.ts`).
- **Adaptador Spike**: `WindowsPrintSpikeAdapter` (`src/infrastructure/hardware/printing/WindowsPrintSpikeAdapter.ts`).
- **Formatos Soportados**:
  - `80mm` (ancho ~32-48 caracteres)
  - `58mm` (ancho ~24-32 caracteres)
- **Ruta de Salida Validada**:
  - Generación de comprobante técnico en formato texto monoespaciado.
  - Invocación de cuadro de diálogo de impresión de Windows (`window.print()` / spooler nativo / Microsoft Print to PDF).

### Contenido del Ticket Técnico
```text
================================
           SEVENPOS
     PRUEBA DE IMPRESIÓN
================================
Fecha: [Fecha y hora actual]
Sistema: Windows Desktop
Formato Objetivo: 80mm
--------------------------------
SevenPOS Technical Core
Tauri 2 + SQLite Local-First
--------------------------------
   GRACIAS POR SU COMPRA
================================
```

### Estado de Validación
- **Windows Print Path (Software & System Dialog / PDF)**: **PASS** (100% verificado en entorno de ejecución).
- **Thermal 80mm/58mm Hardware**: **NOT TESTED** (Pendiente de prueba física en impresora térmica ESC/POS USB/Red).
