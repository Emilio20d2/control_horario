# Control Horario - Manual de Usuario

## 1. Introducción

`Control Horario` es una aplicación web integral para la gestión avanzada de turnos, horarios y cómputo de horas de empleados. Permite a los administradores llevar un registro detallado de las jornadas laborales, ausencias, festivos y balances de horas de cada trabajador.

El sistema está diseñado para manejar calendarios rotativos complejos, calcular automáticamente los balances de horas (ordinarias, de festivos, de libranza) y generar informes detallados para auditorías y gestión de personal.

## 2. Pila Tecnológica

- **Framework**: [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Componentes de UI**: [ShadCN/UI](https://ui.shadcn.com/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Base de Datos**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Autenticación**: [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Generación de PDF**: [jsPDF](https://github.com/parallax/jsPDF) y [jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)

---

## 3. Guía de Páginas y Funcionalidades

A continuación, se detalla el propósito y uso de cada una de las secciones principales de la aplicación.

### a. Panel de Control

Es la página principal y el centro de operaciones para la generación de informes. Desde aquí puedes exportar en PDF toda la información clave para la gestión y auditoría.

- **Informes Anuales por Empleado**:
  - **Resumen Anual**: Genera un PDF detallado con el registro semanal de un empleado para un año específico. Muestra el desglose de horas, ausencias y el impacto en las bolsas de horas semana a semana.
  - **Jornada Anual**: Crea un informe PDF que compara las horas teóricas que un empleado debía trabajar en un año (según convenio y ajustes de contrato) contra las horas realmente computadas. Ideal para balances anuales.

- **Informes Generales**:
  - **Informe de Ausencias**: Exporta un resumen de todas las ausencias de un empleado para un año, agrupadas por tipo, mostrando totales y excesos sobre los límites del convenio.
  - **Informe de Festivos**: Permite generar un listado de empleados para planificar quién trabajará en los festivos de apertura seleccionados.
  - **Informe de Horas Complementarias**: Genera un PDF con el listado de empleados que han realizado horas complementarias en una semana específica.
  - **Informe Semanal de Balances**: Crea un informe con el estado de las tres bolsas de horas (ordinaria, festivos, libranza) de todos los empleados al inicio de una semana seleccionada.

- **Gráfico de Balances**:
  - Muestra un gráfico de barras con los 10 empleados que tienen el mayor balance total de horas, permitiendo una rápida visualización de quién tiene más horas a favor.

### b. Registro Horario

Esta es la sección más importante para el trabajo diario. Permite registrar las horas trabajadas, ausencias y otros eventos de los empleados.

- **Vista Semanal (por defecto)**:
  - Muestra a todos los empleados activos para una semana concreta.
  - Puedes navegar entre semanas con las flechas o seleccionar una fecha en el calendario.
  - Para cada empleado y día, puedes registrar:
    - **Horas Trabajadas**: Las horas efectivamente trabajadas.
    - **Ausencias**: Seleccionando un tipo de ausencia del desplegable (baja, vacaciones, etc.).
    - **Horas de Libranza**: Horas que se devuelven al trabajador en un día festivo que le tocaba trabajar.
    - **Horas Complementarias**: Total de horas extra en la semana.
  - El sistema calcula en tiempo real el **impacto** que los cambios tendrán en las bolsas de horas del empleado.
  - Una vez los datos son correctos, debes **Confirmar** la semana para que los balances se actualicen de forma permanente.

- **Vista Anual (seleccionando un empleado)**:
  - Muestra el calendario completo de un solo empleado para todo un año.
  - Permite tener una visión global de la planificación y realizar modificaciones de la misma forma que en la vista semanal.

### c. Empleados

Centro de gestión de la plantilla. Aquí puedes ver, crear y modificar la información de tus empleados.

- **Listado de Empleados**:
  - Se divide en **Activos** e **Inactivos**.
  - La tabla de activos muestra un resumen en tiempo real de los balances de horas y los días de vacaciones consumidos.
  - Desde aquí puedes acceder a la ficha de cada empleado o crear uno nuevo.

- **Crear/Editar Ficha de Empleado**:
  - El formulario permite definir:
    - **Datos Personales**: Nombre.
    - **Contrato Inicial**: Fecha de inicio, tipo de contrato, jornada semanal y saldos iniciales de las bolsas.
    - **Calendario Laboral**: Un sistema de 4 turnos rotativos donde defines las horas teóricas para cada día en cada una de las 4 semanas del ciclo.
  - En un empleado existente, puedes **programar modificaciones de contrato**, como un cambio de jornada o de tipo de contrato a futuro.

### d. Ficha de Empleado

Muestra toda la información relevante de un empleado en un solo lugar.

- **Balances Actuales**: Visualización en tiempo real de las tres bolsas de horas y el balance total.
- **Datos del Contrato**: Muestra el tipo de contrato, la jornada semanal vigente y el historial de cambios de jornada o de contrato.
- **Cómputo Anual**: Un resumen año por año que compara las horas teóricas vs. las computadas y muestra el balance anual final.
- **Ausencias Programadas**: Permite registrar ausencias de larga duración (como bajas o excedencias) que se aplicarán automáticamente en el calendario.
- **Calendarios Laborales**: Muestra el historial de calendarios rotativos que ha tenido el empleado.

### e. Formularios Personalizados

Herramienta flexible para crear e imprimir formularios en PDF para cualquier necesidad.

- **Funcionamiento**:
  1.  **Define un Título y Descripción** para tu formulario (ej: "Control de Entrega de EPIs").
  2.  **Añade Columnas**: Puedes crear las columnas que necesites (ej: "Casco", "Botas", "Firma").
  3.  **Elige el Tipo de Contenido**: Cada columna puede ser un campo de texto libre o casillas de verificación (checkboxes), que a su vez pueden tener etiquetas personalizadas (ej: "Entregado, Devuelto").
  4.  **Genera el PDF**: La aplicación creará un documento con todos los empleados activos listados, listos para que rellenes el formulario.

### f. Programador de Vacaciones

Sección visual para planificar y gestionar las vacaciones y otras ausencias largas.

- **Cuadrante Anual**:
  - Muestra una vista de todo el año con los empleados agrupados por categorías.
  - Cada celda representa una semana, y dentro de ella aparecen los empleados que tienen una ausencia programada.
  - Permite identificar rápidamente solapamientos y semanas con alta o baja ocupación.
  - Desde aquí puedes generar dos informes:
    - **Imprimir Cuadrante**: Exporta la vista del cuadrante a un PDF.
    - **Listado para Firmas**: Genera un documento donde cada empleado tiene un espacio para firmar la conformidad de sus periodos vacacionales.

### g. Ajustes

Aquí se configuran las reglas de negocio que rigen toda la aplicación.

- **Días Festivos**: Añade, edita o elimina los festivos nacionales, regionales, locales y las aperturas comerciales.
- **Conf. Anual**: Define las horas máximas de convenio para cada año.
- **Tipos de Ausencia**: Crea o modifica los tipos de ausencia (baja, vacaciones, asuntos propios, etc.) y define sus reglas: si computan para la jornada, si descuentan horas, si tienen un límite anual, etc.
- **Tipos de Contrato**: Gestiona los tipos de contrato y define qué bolsas de horas se aplican a cada uno.
- **Utilidades**: Herramientas para administradores, como la auditoría retroactiva de comentarios.

---

## 4. Conceptos Clave

- **Bolsas de Horas**:
  - **B. Ordinaria**: Acumula la diferencia entre las horas computadas y las teóricas de cada semana.
  - **B. Festivos**: Suma horas cuando un empleado trabaja en un festivo de apertura (y no se le paga como "pago doble").
  - **B. Libranza**: Suma horas cuando a un empleado le corresponde librar en un día festivo que le tocaba trabajar.

- **Cómputo Semanal vs. Anual**:
  - El **cómputo semanal** se usa para calcular el impacto en la bolsa ordinaria cada semana.
  - El **cómputo anual** compara el total de horas trabajadas en el año contra el objetivo anual del convenio (ajustado por cambios de jornada y suspensiones) para obtener el balance final del año.
