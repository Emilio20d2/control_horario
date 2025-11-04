
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { BookUser, LayoutDashboard, CalendarDays, Users, UserSquare, ListChecks, Plane, Settings2, Home, MessageSquare, CalendarClock } from 'lucide-react';
import Image from 'next/image';

const AdminGuideItem = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <AccordionItem value={title}>
        <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <span>{title}</span>
            </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
            {children}
        </AccordionContent>
    </AccordionItem>
);

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center text-center gap-2 mb-6">
        <BookUser className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Guía del Administrador
        </h1>
        <p className="text-lg text-muted-foreground">
          Un recorrido completo por todas las funcionalidades de la aplicación.
        </p>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        
        <AdminGuideItem icon={Home} title="Inicio">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Es la primera página que ves al iniciar sesión y actúa como un centro de notificaciones y tareas pendientes.
                </p>
                <ul className="list-disc list-inside space-y-3 text-sm">
                    <li><strong>Semanas Pendientes</strong>: Esta tarjeta te avisa de la semana más antigua que tiene empleados sin confirmar. Muestra un contador con el número de empleados pendientes y un botón para ir directamente a esa semana en el "Registro Horario" y finalizar la tarea.</li>
                    <li><strong>Mensajes Sin Leer</strong>: Aquí aparecen las últimas conversaciones con mensajes de empleados que aún no has leído. Actúa como un acceso directo a la sección de "Mensajes" para que puedas responder rápidamente.</li>
                    <li><strong>Próximos Eventos</strong>: Ofrece una vista rápida de las próximas ausencias programadas (bajas, excedencias, vacaciones, etc.) en las siguientes semanas, permitiéndote anticipar las necesidades de personal.</li>
                </ul>
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={LayoutDashboard} title="Panel de Control">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Centro de operaciones para la generación de informes en PDF, esencial para auditorías y gestión de personal.
                </p>
                <ul className="list-disc list-inside space-y-3 text-sm">
                    <li><strong>Informes por Empleado:</strong>
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>Selecciona un empleado y un año.</li>
                            <li>**Resumen Anual:** Genera un PDF con el registro semanal completo del empleado, mostrando el desglose de horas y el impacto en sus bolsas semana a semana.</li>
                            <li>**Jornada Anual:** Crea un informe que compara las horas teóricas vs. las realmente computadas para ese empleado en el año.</li>
                            <li>**Ausencias:** Exporta un resumen de todas las ausencias del empleado para un año, agrupadas por tipo.</li>
                        </ul>
                    </li>
                    <li><strong>Informe de Festivos:</strong>
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>Permite generar un listado de empleados para planificar quién trabajará en los festivos de apertura que selecciones.</li>
                        </ul>
                    </li>
                    <li><strong>Informes Generales (Semanales):</strong>
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>Selecciona una semana específica.</li>
                            <li>**H. Complem.:** Genera un PDF con los empleados que han realizado horas complementarias en esa semana.</li>
                            <li>**Balances:** Crea un informe con el estado de las bolsas de horas de toda la plantilla al final de la semana seleccionada.</li>
                        </ul>
                    </li>
                    <li><strong>Top 10 Empleados por Balance:</strong> Un gráfico de barras que muestra los empleados con el mayor balance total de horas, permitiendo una gestión proactiva.</li>
                </ul>
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={CalendarDays} title="Registro Horario">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Esta es la herramienta principal para la gestión diaria del tiempo. Aquí se registran las horas trabajadas, ausencias y otros eventos de cada empleado para cada semana.
                </p>
                <ul className="list-disc list-inside space-y-3 text-sm">
                    <li>
                        <strong>Navegación y Vistas:</strong>
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>Usa las flechas y el calendario en la parte superior para moverte entre semanas.</li>
                            <li>Para cambiar a una vista anual de un solo empleado, selecciónalo en el menú desplegable de la cabecera.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Fila de Empleado:</strong> Cada fila representa a un empleado para la semana seleccionada.
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>A la izquierda, verás el nombre, el tipo de turno asignado (T1, T2, etc.) y campos para modificar la <strong>Jornada Semanal</strong> (si necesitas ajustar las horas teóricas para esa semana específica) y para añadir <strong>H. Complementarias</strong>.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Celdas de Día:</strong> Cada celda diaria contiene varios campos:
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li><strong>Teóricas:</strong> Muestra las horas que le corresponden trabajar ese día según su calendario. No es editable.</li>
                            <li><strong>Campo numérico principal:</strong> Aquí introduces las <strong>horas trabajadas</strong>.</li>
                            <li><strong>Campo H. Libranza:</strong> Solo aparece en festivos si el empleado libra. Aquí puedes registrar las horas que acumula por librar en festivo. Es editable.</li>
                        </ul>
                    </li>
                        <li>
                        <strong>Gestión de Ausencias:</strong>
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>Haz clic en el icono <code className="font-bold">+</code> en una celda para abrir el menú de ausencias.</li>
                            <li>Selecciona un tipo de ausencia de la lista (Baja, Asuntos Propios, etc.).</li>
                            <li>Si la ausencia permite horas parciales (ej. "Horas Médicas"), aparecerá un nuevo campo para que introduzcas las horas exactas de ausencia. El sistema calculará las horas trabajadas restantes.</li>
                            <li>Para quitar una ausencia, vuelve a abrir el menú y selecciona "Sin ausencia".</li>
                        </ul>
                    </li>
                        <li>
                        <strong>Impacto Semanal y Confirmación:</strong>
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>Debajo de cada empleado, una tabla muestra el <strong>impacto en tiempo real</strong> de tus cambios sobre las bolsas de horas (Ordinaria, Festivos, Libranza).</li>
                            <li>Una vez que todos los datos de la semana para ese empleado son correctos, pulsa el botón <strong>"Confirmar"</strong>. Los datos se guardarán de forma permanente y sus balances de horas se actualizarán oficialmente.</li>
                        </ul>
                    </li>
                </ul>
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={Users} title="Empleados">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Centro de gestión de la plantilla. Aquí puedes ver, crear y modificar la información de tus empleados.
                </p>
                <ul className="list-disc list-inside space-y-3 text-sm">
                    <li><strong>Pestañas "Activos" e "Inactivos":</strong> Te permite filtrar entre empleados con contrato en vigor y aquellos cuyo contrato ha finalizado.</li>
                    <li><strong>Listado de Empleados:</strong> Muestra un resumen de cada empleado. En "Activos", verás sus balances de horas y días de vacaciones en tiempo real.</li>
                    <li><strong>Botón "Añadir Empleado":</strong> Te lleva a un formulario para crear una nueva ficha de empleado desde cero.</li>
                    <li><strong>Botón "Ver Ficha":</strong> En cada fila, este botón te lleva a la "Ficha de Empleado" individual para ver y gestionar todos sus detalles.</li>
                </ul>
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={UserSquare} title="Ficha de Empleado">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Visión de 360 grados de un trabajador, donde se centraliza toda su información laboral y personal.
                </p>
                <ul className="list-disc list-inside space-y-3 text-sm">
                    <li><strong>Tarjetas de Resumen:</strong> Muestran una vista rápida de las bolsas de horas, el balance total y el estado de sus vacaciones.</li>
                    <li><strong>Detalles del Contrato:</strong> Muestra la información del contrato vigente, el historial de cambios de jornada y el calendario laboral rotativo.</li>
                    <li><strong>Cómputo Anual:</strong> Una tabla que resume, año por año, la comparativa entre horas teóricas y computadas, y el balance anual resultante.</li>
                    <li><strong>Gestión de Ausencias Programadas:</strong> Un formulario para registrar ausencias de larga duración como bajas, excedencias o permisos de maternidad/paternidad. Estas ausencias se aplicarán automáticamente en el "Registro Horario".</li>
                    <li><strong>Botones de Acción:</strong> Permiten "Editar Ficha", "Generar Informes" específicos para ese empleado, o "Recontratar" si está inactivo.</li>
                </ul>
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={ListChecks} title="Formularios Personalizados">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Herramienta para crear e imprimir PDFs a medida para cualquier necesidad (controles de EPIs, formaciones, etc.).
                </p>
                    <ul className="list-disc list-inside space-y-3 text-sm">
                    <li><strong>Formularios Personalizados:</strong>
                        <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                            <li>Define un título y descripción.</li>
                            <li>Añade columnas personalizadas, eligiendo si el contenido será un campo de texto libre o casillas de verificación (ej: "Entregado", "Devuelto").</li>
                            <li>Al generar el PDF, la aplicación creará un documento con todos los empleados activos listados, listo para imprimir y rellenar.</li>
                        </ul>
                    </li>
                    <li><strong>Datos Personales:</strong> Genera un informe en PDF con los datos personales de la plantilla (DNI, teléfono, email, etc.) que elijas.</li>
                    <li><strong>Empleados para Informes:</strong> Gestiona una lista de empleados "eventuales" que no están en la plantilla principal pero que deben aparecer en ciertos informes, como el de planificación de festivos.</li>
                </ul>
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={Plane} title="Programador de Vacaciones">
            <div className="space-y-4">
                    <p className="text-muted-foreground">
                    Vista de cuadrante anual para la planificación estratégica de ausencias largas (vacaciones, excedencias, etc.).
                </p>
                <ul className="list-disc list-inside space-y-3 text-sm">
                    <li><strong>Cuadrante Anual:</strong> Muestra una vista de todo el año con los empleados agrupados por categorías (que se definen en Ajustes). Las ausencias programadas se muestran en el color del grupo, permitiendo identificar rápidamente solapamientos y periodos de alta o baja ocupación.</li>
                    <li><strong>Informes:</strong> Desde aquí puedes exportar la vista del cuadrante a un PDF para imprimir, o generar un listado de firmas para que los empleados validen sus periodos de vacaciones.</li>
                </ul>
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={CalendarClock} title="Calendario">
            <div className="space-y-4">
                    <p className="text-muted-foreground">
                    Visión global de todas las ausencias programadas en el sistema.
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>Vista Semanal o Mensual:</strong> Muestra en un calendario quién está ausente cada día y por qué motivo, usando un código de colores por tipo de ausencia.</li>
                    <li><strong>Gestión de Ausencias:</strong> Permite añadir, modificar o eliminar ausencias de larga duración directamente desde el calendario, haciendo clic en un día o en un evento existente.</li>
                </ul>
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={MessageSquare} title="Mensajes">
            <div className="space-y-4">
                    <p className="text-muted-foreground">
                    Canal de comunicación centralizado con los empleados.
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>Chat Individual:</strong> Cada empleado tiene su propio chat para comunicar incidencias o recibir notificaciones. Las conversaciones no leídas se marcan para llamar tu atención.</li>
                    <li><strong>Solicitudes de Corrección:</strong> Aquí recibirás las peticiones de los empleados para corregir errores en semanas ya confirmadas. Estas solicitudes aparecen como mensajes en el chat del empleado correspondiente.</li>
                </ul>
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={Settings2} title="Ajustes">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    El cerebro de la aplicación, donde se definen las reglas de negocio que afectan a todos los cálculos.
                </p>
                    <ul className="list-disc list-inside space-y-3 text-sm">
                    <li><strong>Días Festivos:</strong> Añade, edita o elimina los festivos nacionales, regionales, locales y las aperturas comerciales para cada año.</li>
                    <li><strong>Conf. Anual:</strong> Define las horas máximas de convenio para cada año, que se usarán como base para el cómputo anual.</li>
                    <li><strong>Tipos de Ausencia:</strong> Crea o modifica los tipos de ausencia y sus reglas (si computan para la jornada semanal/anual, si descuentan horas, si suspenden el contrato, etc.).</li>
                    <li><strong>Tipos de Contrato:</strong> Gestiona los tipos de contrato y define qué bolsas de horas se aplican a cada uno.</li>
                    <li><strong>Campañas de Solicitud:</strong> Abre y cierra periodos específicos para que los empleados puedan solicitar sus vacaciones o ausencias largas.</li>
                    <li><strong>Utilidades:</strong> Herramientas avanzadas para administradores, como la limpieza de datos o la ejecución de auditorías retroactivas.</li>
                </ul>
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={BookUser} title="Guía">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Esta misma sección. Un manual de usuario completo para que puedas consultar cualquier duda sobre el funcionamiento de la aplicación en cualquier momento.
                </p>
            </div>
        </AdminGuideItem>

      </Accordion>
    </div>
  );
}
