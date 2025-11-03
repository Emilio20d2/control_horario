
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
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Es la primera página que ves al iniciar sesión y actúa como un centro de notificaciones y tareas pendientes.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Semanas Pendientes</strong>: Muestra la semana más antigua que tiene empleados sin confirmar. Indica el número de empleados pendientes y un botón para ir directamente a esa semana en el "Registro Horario".</li>
                        <li><strong>Mensajes Sin Leer</strong>: Presenta una lista de las últimas conversaciones con mensajes de empleados que aún no has leído.</li>
                        <li><strong>Próximos Eventos</strong>: Ofrece una vista rápida de las próximas ausencias programadas (bajas, excedencias, etc.) en las siguientes semanas.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/home/600/400" alt="Captura de pantalla de la página de Inicio" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="home screen widgets" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={LayoutDashboard} title="Panel de Control">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Centro de operaciones para la generación de informes en PDF.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Informes por Empleado:</strong> Genera resúmenes anuales, comparativas de jornada y reportes de ausencias para un empleado y año específicos.</li>
                        <li><strong>Informe de Festivos:</strong> Crea un listado para planificar quién trabajará en los festivos de apertura seleccionados.</li>
                        <li><strong>Informes Generales (Semanales):</strong> Exporta informes de horas complementarias y el estado de las bolsas de horas de toda la plantilla para una semana concreta.</li>
                        <li><strong>Top 10 Empleados por Balance:</strong> Un gráfico de barras que muestra los empleados con el mayor balance total de horas.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/dashboard/600/400" alt="Captura de pantalla del Panel de Control" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="dashboard graph" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={CalendarDays} title="Registro Horario">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        La herramienta principal para la gestión diaria.
                    </p>
                     <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Vista Semanal y Anual:</strong> Alterna entre una vista de todos los empleados para una semana o el calendario completo de un año para un solo empleado.</li>
                        <li><strong>Registro Detallado:</strong> Introduce horas trabajadas, ausencias, horas de libranza y complementarias para cada empleado y día.</li>
                        <li><strong>Impacto en Tiempo Real:</strong> El sistema calcula y muestra al instante cómo afectará cada cambio a las bolsas de horas.</li>
                        <li><strong>Confirmación:</strong> Al pulsar "Confirmar", los datos de la semana se guardan de forma permanente y los balances se actualizan.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/schedule/600/400" alt="Captura de pantalla del Registro Horario" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="schedule calendar" />
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={Users} title="Empleados">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Centro de gestión de la plantilla.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Listado de Empleados:</strong> Dividido en "Activos" e "Inactivos", con un resumen en tiempo real de balances y vacaciones.</li>
                        <li><strong>Crear/Editar Ficha:</strong> Define datos personales, detalles del contrato y el calendario laboral rotativo.</li>
                        <li><strong>Modificaciones de Contrato:</strong> Programa cambios de jornada o de tipo de contrato a futuro.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/employees/600/400" alt="Captura de pantalla de la lista de Empleados" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="employee list" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={UserSquare} title="Ficha de Empleado">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Visión de 360 grados de un trabajador.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Balances y Vacaciones:</strong> Muestra las bolsas de horas, el total acumulado y los días de vacaciones.</li>
                        <li><strong>Datos del Contrato:</strong> Detalla el contrato vigente y el historial de cambios.</li>
                        <li><strong>Cómputo Anual:</strong> Un resumen año por año que compara horas teóricas vs. computadas.</li>
                        <li><strong>Gestión de Ausencias Programadas:</strong> Permite registrar ausencias de larga duración (bajas, excedencias).</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/employeedetail/600/400" alt="Captura de pantalla de la ficha de un empleado" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="profile page" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={ListChecks} title="Formularios Personalizados">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Herramienta para crear PDFs a medida.
                    </p>
                     <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Formularios Personalizados:</strong> Crea formularios con las columnas que necesites para generar un PDF con la lista de empleados activos.</li>
                        <li><strong>Datos Personales:</strong> Genera un informe en PDF con los datos personales de la plantilla que elijas.</li>
                        <li><strong>Empleados para Informes:</strong> Gestiona una lista de empleados "eventuales" que no están en la plantilla principal pero que deben aparecer en ciertos informes.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/listings/600/400" alt="Captura de pantalla de la creación de formularios" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="form builder" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={Plane} title="Programador de Vacaciones">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                     <p className="text-muted-foreground">
                        Vista de cuadrante anual para la planificación de ausencias largas.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Cuadrante Anual:</strong> Muestra una vista de todo el año con los empleados agrupados por categorías, permitiendo identificar solapamientos de ausencias.</li>
                        <li><strong>Informes:</strong> Desde aquí puedes imprimir el cuadrante o generar un listado para la firma de vacaciones.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/vacations/600/400" alt="Captura de pantalla del programador de vacaciones" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="vacation planner" />
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={CalendarClock} title="Calendario">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                     <p className="text-muted-foreground">
                        Visión global de todas las ausencias programadas en el sistema.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Vista Semanal o Mensual:</strong> Muestra en un calendario quién está ausente cada día y por qué motivo.</li>
                        <li><strong>Gestión de Ausencias:</strong> Permite añadir, modificar o eliminar ausencias de larga duración directamente desde el calendario.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/calendar/600/400" alt="Captura de pantalla del calendario global" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="team calendar" />
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={MessageSquare} title="Mensajes">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                     <p className="text-muted-foreground">
                        Canal de comunicación centralizado con los empleados.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Chat Individual:</strong> Cada empleado tiene su propio chat para comunicar incidencias o recibir notificaciones.</li>
                        <li><strong>Solicitudes de Corrección:</strong> Aquí recibirás las peticiones de los empleados para corregir errores en semanas ya confirmadas.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/messages/600/400" alt="Captura de pantalla de la mensajería" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="chat interface" />
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={Settings2} title="Ajustes">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        El cerebro de la aplicación, donde se definen las reglas de negocio.
                    </p>
                     <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Días Festivos:</strong> Gestiona los festivos y aperturas comerciales.</li>
                        <li><strong>Conf. Anual:</strong> Define las horas de convenio para cada año.</li>
                        <li><strong>Tipos de Ausencia:</strong> Crea y configura los tipos de ausencia y sus reglas de cómputo.</li>
                        <li><strong>Tipos de Contrato:</strong> Gestiona los tipos de contrato.</li>
                        <li><strong>Campañas de Solicitud:</strong> Abre periodos para que los empleados puedan solicitar sus vacaciones.</li>
                        <li><strong>Utilidades:</strong> Herramientas de administrador para limpieza o auditoría de datos.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/settings/600/400" alt="Captura de pantalla de la página de ajustes" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="settings page" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={BookUser} title="Guía">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Esta misma sección. Un manual de usuario completo para que puedas consultar cualquier duda sobre el funcionamiento de la aplicación en cualquier momento.
                    </p>
                </div>
                 <Image src="https://picsum.photos/seed/guide/600/400" alt="Icono de un libro de guía" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="user manual" />
            </div>
        </AdminGuideItem>

      </Accordion>
    </div>
  );
}
