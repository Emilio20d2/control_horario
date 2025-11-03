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

## 3. Guía para Administradores

A continuación, se detalla el propósito y uso de cada una de las secciones principales para los administradores.

### a. Inicio

Es la primera página que ves al iniciar sesión y actúa como un centro de notificaciones y tareas pendientes.

- **Semanas Pendientes**: Muestra la semana más antigua que tiene empleados sin confirmar. Indica el número de empleados pendientes y un botón para ir directamente a esa semana en el "Registro Horario".
- **Mensajes Sin Leer**: Presenta una lista de las últimas conversaciones con mensajes de empleados que aún no has leído.
- **Próximos Eventos**: Ofrece una vista rápida de las próximas ausencias programadas (bajas, excedencias, etc.) en las siguientes semanas.

### b. Panel de Control

Centro de operaciones para la generación de informes en PDF.

- **Informes por Empleado**:
  - **Resumen Anual**: Genera un PDF con el registro semanal de un empleado para un año específico, mostrando el desglose de horas y el impacto en las bolsas semana a semana.
  - **Jornada Anual**: Crea un informe que compara las horas teóricas vs. las realmente computadas para un empleado en un año.
  - **Ausencias**: Exporta un resumen de todas las ausencias de un empleado para un año, agrupadas por tipo.

- **Informe de Festivos**: Permite generar un listado de empleados para planificar quién trabajará en los festivos de apertura seleccionados.

- **Informes Generales (Semanales)**:
  - **H. Complem.**: Genera un PDF con los empleados que han realizado horas complementarias en una semana específica.
  - **Balances**: Crea un informe con el estado de las bolsas de horas de toda la plantilla al final de una semana seleccionada.

- **Top 10 Empleados por Balance**: Un gráfico de barras que muestra los empleados con el mayor balance total de horas, permitiendo una gestión proactiva.

### c. Registro Horario

La herramienta principal para la gestión diaria.

- **Vista Semanal (por defecto)**:
  - Muestra a todos los empleados activos para la semana seleccionada.
  - **Registro de Horas**: Puedes introducir horas trabajadas, tipos de ausencia, horas de libranza y complementarias para cada empleado y día.
  - **Impacto en Tiempo Real**: La aplicación calcula al instante cómo cada cambio afectará a las bolsas de horas del empleado.
  - **Confirmación**: Al pulsar "Confirmar", los datos de la semana se guardan de forma permanente y los balances se actualizan.

- **Vista Anual (seleccionando un empleado)**:
  - Muestra el calendario completo de un solo empleado para todo un año, permitiendo una visión y planificación a largo plazo.

### d. Empleados

Centro de gestión de la plantilla.

- **Listado de Empleados**:
  - **Activos**: Muestra empleados con contrato en vigor, con un resumen en tiempo real de sus balances y días de vacaciones consumidos.
  - **Inactivos**: Empleados cuyo contrato ha finalizado.

- **Crear/Editar Ficha de Empleado**:
  - **Datos Personales y de Contrato**: Define el nombre, DNI, email, tipo de contrato, jornada semanal, etc.
  - **Calendario Laboral**: Configura el sistema de 4 turnos rotativos para las horas teóricas.
  - **Modificaciones de Contrato**: Puedes programar cambios de jornada o de tipo de contrato a futuro sin necesidad de crear una nueva ficha.

### e. Ficha de Empleado

Visión de 360 grados de un trabajador.

- **Balances y Vacaciones**: Muestra las bolsas de horas, el total acumulado y los días de vacaciones disfrutados vs. disponibles.
- **Datos del Contrato**: Detalla el contrato vigente y el historial de cambios de jornada o de contrato.
- **Cómputo Anual**: Un resumen año por año que compara horas teóricas vs. computadas.
- **Gestión de Ausencias Programadas**: Permite registrar ausencias de larga duración (bajas, excedencias) que se aplicarán automáticamente en el calendario.

### f. Formularios Personalizados

Herramienta para crear PDFs a medida.

- **Formularios Personalizados**: Crea formularios con las columnas que necesites (texto, checkboxes) para generar un PDF con la lista de empleados activos, listo para imprimir y rellenar.
- **Datos Personales**: Genera un informe en PDF con los datos personales de la plantilla (DNI, teléfono, email, etc.) que elijas.
- **Empleados para Informes**: Gestiona una lista de empleados "eventuales" que no están en la plantilla principal pero que deben aparecer en ciertos informes, como el de planificación de festivos.

### g. Programador de Vacaciones

Vista de cuadrante anual para la planificación de ausencias largas.

- **Cuadrante Anual**: Muestra una vista de todo el año con los empleados (agrupados por categorías) que tienen ausencias largas, permitiendo identificar solapamientos.
- **Informes**: Desde aquí puedes imprimir el cuadrante o generar un listado para la firma de vacaciones.

### h. Calendario

Visión global de todas las ausencias programadas en el sistema.

- **Vista Semanal o Mensual**: Muestra en un calendario quién está ausente cada día y por qué motivo.
- **Gestión de Ausencias**: Permite añadir, modificar o eliminar ausencias de larga duración directamente desde el calendario.

### i. Mensajes

Canal de comunicación centralizado con los empleados.

- **Chat Individual**: Cada empleado tiene su propio chat para comunicar incidencias o recibir notificaciones.
- **Solicitudes de Corrección**: Aquí recibirás las peticiones de los empleados para corregir errores en semanas ya confirmadas.

### j. Ajustes

El cerebro de la aplicación, donde se definen las reglas de negocio.

- **Días Festivos**: Gestiona los festivos y aperturas comerciales.
- **Conf. Anual**: Define las horas de convenio para cada año.
- **Tipos de Ausencia**: Crea y configura los tipos de ausencia y sus reglas de cómputo.
- **Tipos de Contrato**: Gestiona los tipos de contrato.
- **Campañas de Solicitud**: Abre periodos específicos para que los empleados puedan solicitar sus vacaciones.
- **Utilidades**: Herramientas de administrador para limpieza o auditoría de datos.

### k. Guía

Acceso a este mismo manual de usuario directamente desde la aplicación.

---

## 4. Guía para Empleados

### a. Mi Ficha

Tu panel de control personal donde puedes consultar toda tu información laboral.

- **Balances de Horas**: Muestra en tiempo real el estado de tus bolsas de horas (Ordinaria, Festivos, Libranza) y tu balance total.
- **Vacaciones**: Indica los días de vacaciones que has disfrutado frente a los que tienes disponibles para el año en curso. Puedes hacer clic en la tarjeta para ver un desglose detallado.
- **Resumen de Ausencias**: Una tabla con el total de horas o días que has consumido por cada tipo de ausencia durante el año.
- **Mis Vacaciones Programadas**: Un listado de tus próximos periodos de vacaciones confirmados.
- **Datos del Contrato**: Información sobre tu contrato actual y tu jornada semanal.

### b. Mis Presencias

Tu historial de trabajo.

- **Resumen Semanal**: Muestra un desglose detallado de cada semana laboral que ya ha sido confirmada por la administración.
- **Solicitar Corrección**: Si detectas un error en una semana, puedes usar el botón "Solicitar Corrección". Se abrirá un formulario para que expliques la incidencia, y tu petición se enviará al administrador a través del chat de "Mis Mensajes".

### c. Mis Mensajes

Tu canal de comunicación directo con la administración.

- **Chat**: Un espacio para registrar formalmente tus solicitudes y recibir notificaciones.
- **Hacer Solicitud (Campañas)**: Cuando la empresa abra un periodo para solicitar vacaciones, verás un aviso y un botón para iniciar tu petición.
- **Solicitudes (Permisos Cortos)**: Usa el botón "Solicitudes" para registrar formalmente permisos que ya has comunicado verbalmente, como una visita médica o un día de asuntos propios.

### d. Ayuda

Una guía rápida para resolver las dudas más comunes, como el significado de las bolsas de horas o cómo añadir la aplicación a la pantalla de inicio de tu móvil.

---

## 5. Conceptos Clave

- **Bolsas de Horas**:
  - **B. Ordinaria**: Acumula la diferencia entre las horas computadas y las teóricas de cada semana.
  - **B. Festivos**: Suma horas cuando un empleado trabaja en un festivo de apertura (y no se le paga como "pago doble").
  - **B. Libranza**: Suma horas cuando a un empleado le corresponde librar en un día festivo que le tocaba trabajar.

- **Cómputo Semanal vs. Anual**:
  - El **cómputo semanal** se usa para calcular el impacto en la bolsa ordinaria cada semana.
  - El **cómputo anual** compara el total de horas trabajadas en el año contra el objetivo anual del convenio (ajustado por cambios de jornada y suspensiones) para obtener el balance final del año.
