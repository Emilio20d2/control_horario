
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { BookUser, LayoutDashboard, CalendarDays, Users, UserSquare, ListChecks, Plane, Settings2 } from 'lucide-react';
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
        
        <AdminGuideItem icon={LayoutDashboard} title="Panel de Control (/dashboard)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Es la página principal y el centro de operaciones para la generación de informes. Desde aquí puedes exportar en PDF toda la información clave para la gestión y auditoría.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Informes Anuales por Empleado:</strong> Genera resúmenes semanales o comparativas de jornada teórica vs. real.</li>
                        <li><strong>Informes Generales:</strong> Exporta datos de ausencias, planificación de festivos, horas complementarias y balances semanales.</li>
                        <li><strong>Gráfico de Balances:</strong> Visualiza rápidamente los 10 empleados con mayor balance de horas.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/dashboard/600/400" alt="Captura de pantalla del Panel de Control" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="dashboard graph" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={CalendarDays} title="Registro Horario (/schedule)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        La sección más importante para el trabajo diario. Permite registrar las horas trabajadas, ausencias y otros eventos de los empleados.
                    </p>
                     <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Vista Semanal y Anual:</strong> Alterna entre una vista de todos los empleados para una semana o el calendario completo de un año para un solo empleado.</li>
                        <li><strong>Registro Detallado:</strong> Para cada día, puedes introducir horas trabajadas, ausencias, horas de libranza y complementarias.</li>
                        <li><strong>Impacto en Tiempo Real:</strong> El sistema calcula y muestra al instante cómo afectará cada cambio a las bolsas de horas del empleado.</li>
                        <li><strong>Confirmación:</strong> Una vez los datos son correctos, debes pulsar "Confirmar" para que los balances se actualicen de forma permanente.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/schedule/600/400" alt="Captura de pantalla del Registro Horario" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="schedule calendar" />
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={Users} title="Empleados (/employees)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Centro de gestión de la plantilla. Aquí puedes ver, crear y modificar la información de tus empleados.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Listado de Empleados:</strong> Se divide en "Activos" e "Inactivos", con un resumen en tiempo real de los balances y vacaciones consumidas.</li>
                        <li><strong>Crear/Editar Ficha:</strong> Permite definir datos personales, detalles del contrato y el calendario laboral rotativo (4 turnos).</li>
                        <li><strong>Programar Modificaciones:</strong> Puedes programar cambios de jornada o de tipo de contrato a futuro para un empleado existente.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/employees/600/400" alt="Captura de pantalla de la lista de Empleados" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="employee list" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={UserSquare} title="Ficha de Empleado (/employees/[id])">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Muestra toda la información relevante de un empleado en un solo lugar.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Balances y Contrato:</strong> Visualización en tiempo real de las bolsas de horas y los detalles del contrato vigente.</li>
                        <li><strong>Cómputo Anual:</strong> Un resumen año por año que compara horas teóricas vs. computadas y muestra el balance anual final.</li>
                        <li><strong>Ausencias Programadas:</strong> Permite registrar ausencias de larga duración (como bajas o excedencias) que se aplicarán automáticamente.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/employeedetail/600/400" alt="Captura de pantalla de la ficha de un empleado" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="profile page" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={ListChecks} title="Formularios Personalizados (/listings)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Herramienta flexible para crear e imprimir formularios en PDF para cualquier necesidad.
                    </p>
                     <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Crea tu Formulario:</strong> Define un título, descripción y añade las columnas que necesites (ej: "Casco", "Botas", "Firma").</li>
                        <li><strong>Tipos de Contenido:</strong> Cada columna puede ser un campo de texto libre o casillas de verificación con etiquetas personalizadas (ej: "Entregado, Devuelto").</li>
                        <li><strong>Genera el PDF:</strong> La aplicación creará un documento con todos los empleados activos listados, listo para rellenar.</li>
                    </ul>
                </div>
                <Image src="https://picsum.photos/seed/listings/600/400" alt="Captura de pantalla de la creación de formularios" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="form builder" />
            </div>
        </AdminGuideItem>

        <AdminGuideItem icon={Plane} title="Programador de Vacaciones (/vacations)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                     <p className="text-muted-foreground">
                        Sección visual para planificar y gestionar las vacaciones y otras ausencias largas de forma estratégica.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Cuadrante Anual:</strong> Muestra una vista de todo el año con los empleados agrupados por categorías, permitiendo identificar rápidamente solapamientos.</li>
                        <li><strong>Informes Específicos:</strong> Desde aquí puedes exportar la vista del cuadrante a un PDF o generar un listado para que los empleados firmen la conformidad de sus vacaciones.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/vacations/600/400" alt="Captura de pantalla del programador de vacaciones" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="vacation planner" />
            </div>
        </AdminGuideItem>
        
        <AdminGuideItem icon={Settings2} title="Ajustes (/settings)">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Aquí se configuran las reglas de negocio que rigen toda la aplicación. Es el cerebro del sistema.
                    </p>
                     <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Días Festivos:</strong> Añade, edita o elimina los festivos nacionales, regionales, locales y las aperturas comerciales.</li>
                        <li><strong>Conf. Anual:</strong> Define las horas máximas de convenio para cada año.</li>
                        <li><strong>Tipos de Ausencia:</strong> Crea o modifica los tipos de ausencia y sus reglas (si computan, si descuentan, si tienen límite, etc.).</li>
                         <li><strong>Tipos de Contrato:</strong> Gestiona los tipos de contrato y define qué bolsas de horas se aplican a cada uno.</li>
                        <li><strong>Utilidades:</strong> Herramientas para administradores, como la auditoría retroactiva de comentarios.</li>
                    </ul>
                </div>
                 <Image src="https://picsum.photos/seed/settings/600/400" alt="Captura de pantalla de la página de ajustes" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="settings page" />
            </div>
        </AdminGuideItem>

      </Accordion>
    </div>
  );
}
