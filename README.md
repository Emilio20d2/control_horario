# Control Horario

## Descripción

`Control Horario` es una aplicación web completa diseñada para la gestión avanzada de turnos, horarios y cómputo de horas de empleados. Construida con tecnologías modernas, esta herramienta permite a los administradores llevar un registro detallado de las jornadas laborales, ausencias, festivos y balances de horas de cada trabajador.

El sistema está diseñado para manejar calendarios rotativos complejos, calcular automáticamente los balances de horas (ordinarias, de festivos, de libranza) y generar informes detallados para auditorías y gestión de personal.

### Funcionalidades Principales

- **Gestión de Empleados**: Fichas detalladas por empleado, con historial de contratos y calendarios laborales.
- **Registro Horario Interactivo**: Un calendario semanal y anual para registrar y modificar las horas trabajadas, ausencias y otros eventos.
- **Cálculo de Balances en Tiempo Real**: Visualización inmediata del impacto de cada registro en las bolsas de horas del empleado.
- **Generación de Informes PDF**: Informes personalizables, incluyendo resúmenes anuales, informes de ausencias, balances semanales y más.
- **Configuración Flexible**: Permite definir tipos de contrato, tipos de ausencia, festivos y reglas de cómputo anual para adaptarse a las necesidades del convenio.
- **Autenticación Segura**: Sistema de inicio de sesión para proteger el acceso a los datos.

## Pila Tecnológica

- **Framework**: [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Componentes de UI**: [ShadCN/UI](https://ui.shadcn.com/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Base de Datos**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Autenticación**: [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Generación de PDF**: [jsPDF](https://github.com/parallax/jsPDF) y [jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)

## Cómo Empezar

Para ejecutar este proyecto en un entorno de desarrollo local, sigue estos pasos.

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18.x o superior)
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/Emilio20d2/control_horario.git
    cd control_horario
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```
    *Nota: Si utilizas `yarn`, ejecuta `yarn`.*

3.  **Configura las credenciales de Firebase:**
    Este proyecto requiere dos archivos de configuración de Firebase que no están incluidos en el repositorio por seguridad:
    - **Credenciales del SDK de Admin**: Consigue el archivo JSON de tu cuenta de servicio desde la consola de Firebase y guárdalo en la raíz del proyecto.
    - **Configuración del cliente**: Asegúrate de que el objeto `firebaseConfig` en `src/lib/firebase.ts` contiene las credenciales de tu aplicación web de Firebase.

### Ejecutar el Servidor de Desarrollo

Una vez completada la instalación, puedes iniciar el servidor de desarrollo local:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación en funcionamiento.

## Cómo Sincronizar Cambios con GitHub

Cuando realices cambios en el código (ya sea manualmente o con la ayuda de la IA), puedes subirlos a tu repositorio de GitHub siguiendo estos pasos desde la terminal de tu ordenador:

1.  **Revisa el estado de tus archivos:**
    Este comando te mostrará todos los archivos que han sido modificados.
    ```bash
    git status
    ```

2.  **Prepara todos los cambios para subirlos:**
    Con este comando, añades todos los archivos modificados y nuevos al "área de preparación" (staging).
    ```bash
    git add .
    ```

3.  **Confirma los cambios con un mensaje:**
    Crea un "paquete" (commit) con tus cambios. Es una buena práctica escribir un mensaje claro y descriptivo.
    ```bash
    git commit -m "Describe aquí los cambios que has hecho, por ejemplo: Mejoras en la interfaz para móviles"
    ```

4.  **Sube los cambios a GitHub:**
    Finalmente, envía tu paquete de cambios al repositorio remoto en GitHub. Si tu rama principal se llama `main` (lo más común), usa ese nombre.
    ```bash
    git push origin main
    ```
    *Nota: Si tu rama principal se llama de otra forma (como `master`), reemplaza `main` por el nombre correcto.*
