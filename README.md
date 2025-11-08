# Control Horario - Manual de Usuario

## 1. Introducción

`Control Horario` es una aplicación web integral para la gestión avanzada de turnos, horarios y cómputo de horas de empleados. Permite a los administradores llevar un registro detallado de las jornadas laborales, ausencias, festivos y balances de horas de cada trabajador.

El sistema está diseñado para manejar calendarios rotativos complejos, calcular automáticamente los balances de horas (ordinarias, de festivos, de libranza) y generar informes detallados para auditorías y gestión de personal.

> **Importante:** esta distribución no incluye una base de datos ni un proveedor de autenticación preconfigurados. La aplicación expone una capa de adaptadores (`src/lib/database`) y proveedores (`src/hooks/useAuth.tsx`) para que puedas conectar tus propios servicios de manera controlada.

## 2. Pila Tecnológica

- **Framework**: [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Componentes de UI**: [ShadCN/UI](https://ui.shadcn.com/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Base de Datos**: Adaptador personalizable (consulta `src/lib/database/README.md`)
- **Autenticación**: Proveedor configurable por el integrador
- **Generación de PDF**: [jsPDF](https://github.com/parallax/jsPDF) y [jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)

---

## Instalación y Configuración Técnica

> ⚠️ **Este repositorio se entrega sin dependencias instaladas ni proveedores externos configurados.**
> Necesitarás preparar el proyecto manualmente para que la aplicación quede operativa en tu entorno.

### 1. Requisitos previos

- Node.js **18.x** o superior y un gestor de paquetes (`npm`, `pnpm` o `yarn`).
- Cuenta en [Firebase](https://firebase.google.com/) (o el servicio equivalente que prefieras) con permisos para crear proyectos, activar Authentication y Firestore.
- Acceso a Git para clonar el repositorio.

### 2. Clonar el proyecto e instalar dependencias

```bash
git clone https://github.com/<tu-organizacion>/control_horario.git
cd control_horario
```

El `.gitignore` ignora cualquier `package.json` por políticas internas, así que tendrás que crearlo a mano (o copiar el que utilices en producción). Un ejemplo de configuración mínima es el siguiente:

```json
{
  "name": "control-horario",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.5",
    "@radix-ui/react-collapsible": "^1.0.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "cmdk": "^0.10.0",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.1.0",
    "firebase": "^10.11.0",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "lucide-react": "^0.368.0",
    "next": "^14.2.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.51.4",
    "recharts": "^2.7.2",
    "tailwind-merge": "^2.2.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "@types/react": "^18.2.61",
    "@types/react-dom": "^18.2.19",
    "autoprefixer": "^10.4.18",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.3",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.3",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.4.3"
  }
}
```

Después instala las dependencias con tu gestor preferido:

```bash
npm install
```

### 3. Variables de entorno y configuración local

1. Copia el archivo `.env.example` a `.env.local`.
2. Añade las claves necesarias para tu implementación (por ejemplo, credenciales de Firebase o URLs de APIs internas).
3. Si vas a externalizar la configuración de Firebase, declara variables como `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, etc., y léelas dentro de `src/lib/firebase.ts`.

### 4. Crear el proyecto de Firebase y la base de datos

1. En la consola de Firebase crea un nuevo proyecto.
2. Registra una **app web** para obtener el bloque de configuración (`apiKey`, `authDomain`, etc.).
3. Activa **Authentication → Email/Password** (la aplicación asume este proveedor por defecto en `useAuth`).
4. Abre **Firestore Database** en modo _Native_ y crea una base de datos en la región que prefieras. Si usas un nombre distinto al que aparece en `getFirestore(app, 'basedatos1224')`, actualiza ese parámetro o elimínalo para usar la instancia por defecto.
5. Crea al menos un usuario administrador desde Firebase Authentication y guarda su `uid`. Necesitarás enlazarlo con un documento en la colección `users`.

Actualiza `src/lib/firebase.ts` con el bloque de configuración que te proporciona Firebase, o refactorízalo para leer las variables desde el `.env.local` antes de compilar.

### 5. Estructura mínima de Firestore

La aplicación espera ciertas colecciones y documentos. Puedes crear las colecciones vacías desde la consola o mediante scripts.

| Colección | Propósito | Documento inicial recomendado |
| --- | --- | --- |
| `users` | Metadatos del usuario autenticado. | Documento con `id = <uid firebase>` y campos `email`, `employeeId`, `role`. |
| `employees` | Fichas de empleado con periodos laborales y balances. | Crea al menos un empleado y enlázalo con el `uid` anterior (`authId`). |
| `weeklyRecords` | Registro semanal de horas por empleado. | Puedes comenzar vacío; la app crea/actualiza documentos con id `YYYY-MM-DD`. |
| `absenceTypes`, `contractTypes`, `annualConfigurations` | Catálogos de configuraciones. | Inserta registros básicos para poder usar los formularios. |
| `holidays`, `holidayEmployees`, `holidayReports`, `employeeGroups` | Módulos de festivos y cuadrantes. | Opcionalmente crea documentos de ejemplo para probar la UI. |
| `vacationCampaigns`, `conversations`, `correctionRequests` | Funcionalidades avanzadas (campañas, chat interno, revisiones). | Inicialmente vacías; se rellenan desde la interfaz. |
| `app_config` (documento `features`) | Flags de funcionalidades. | Añade un doc `features` con `{ isEmployeeViewEnabled: true }` para habilitar la vista de empleado. |

> 💡 Si necesitas importar datos masivos, prepara scripts que usen el SDK de Admin o las APIs REST de tu proveedor.

### 6. Conectar la aplicación con Firestore mediante un adaptador

1. Crea un archivo como `src/lib/database/adapters/firebase.ts` que implemente la interfaz `DatabaseAdapterDefinition` usando el SDK de Firestore:

```ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  Firestore,
} from 'firebase/firestore';
import type { DatabaseAdapterDefinition } from '@/lib/database';

export const createFirestoreAdapter = (db: Firestore): DatabaseAdapterDefinition => ({
  async getCollection(collectionName) {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async getDocumentById(collectionName, id) {
    const snapshot = await getDoc(doc(db, collectionName, id));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },
  onCollectionUpdate(collectionName, callback) {
    const unsubscribe = onSnapshot(collection(db, collectionName), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any);
    });
    return { ready: Promise.resolve(), unsubscribe };
  },
  onDocumentUpdate(collectionName, id, callback) {
    const unsubscribe = onSnapshot(doc(db, collectionName, id), (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null);
    });
    return { unsubscribe };
  },
  addDocument(collectionName, data) {
    return addDoc(collection(db, collectionName), data);
  },
  updateDocument(collectionName, docId, data) {
    return updateDoc(doc(db, collectionName, docId), data);
  },
  deleteDocument(collectionName, docId) {
    return deleteDoc(doc(db, collectionName, docId));
  },
  setDocument(collectionName, docId, data, options) {
    return setDoc(doc(db, collectionName, docId), data, options);
  },
});
```

2. En `src/components/layout/app-providers.tsx` importa tu adaptador y ejecútalo antes de renderizar la app:

```ts
import { useEffect } from 'react';
import { configureDatabaseAdapter } from '@/lib/database';
import { createFirestoreAdapter } from '@/lib/database/adapters/firebase';
import { db } from '@/lib/firebase';

useEffect(() => {
  configureDatabaseAdapter(createFirestoreAdapter(db));
}, []);
```

3. Si utilizas otro backend, crea un adaptador equivalente que satisfaga la interfaz.

### 7. Enlazar usuarios y roles

- Crea documentos en `users` con el mismo `uid` que devuelve Firebase Authentication y un campo `role: "admin"` para los administradores iniciales.
- Vincula cada usuario con un empleado mediante `employeeId` para que la aplicación pueda resolver permisos y mostrar la información personal.

### 8. Ejecutar la aplicación

Una vez configurado todo, levanta el entorno de desarrollo:

```bash
npm run dev
```

Visita `http://localhost:3000`, inicia sesión con el usuario administrador y verifica que los datos se cargan correctamente. Usa `npm run build` y `npm run start` para probar la compilación de producción.

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

- **Navegación Libre**: Puedes navegar a cualquier semana del año usando las flechas o el selector de calendario, lo que te permite planificar y consultar con total libertad.

- **Vista Semanal (por defecto)**:
  - Muestra a todos los empleados activos para la semana seleccionada.
  - **Registro de Horas**: En el modo de edición (semanas no confirmadas), puedes introducir horas trabajadas, tipos de ausencia, horas de libranza y complementarias para cada empleado.
  - **Gestión de Ausencias Programadas**: Al editar la semana de un empleado, el botón **"Ausencias"** abre una ventana para gestionar sus ausencias largas (bajas, excedencias, etc.) sin necesidad de ir a la ficha del empleado.
  - **Impacto en Tiempo Real**: La aplicación calcula al instante cómo cada cambio afectará a las bolsas de horas del empleado.
  - **Confirmación**: Al pulsar "Confirmar", los datos de la semana se guardan de forma permanente y los balances se actualizan. La fila del empleado pasa a modo de solo lectura.
  - **Habilitar Corrección**: En las semanas ya confirmadas, puedes pulsar este botón para volver a poner la fila en modo de edición y hacer ajustes.

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
