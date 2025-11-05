'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BookUser, LayoutDashboard, CalendarDays, Users, UserSquare, ListChecks, Plane, Settings2, Home, MessageSquare, CalendarClock } from 'lucide-react';
import Image from 'next/image';


export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col items-center text-center gap-2 mb-6">
        <BookUser className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Guía y Documentación
        </h1>
        <p className="text-lg text-muted-foreground">
          Manual de usuario para administradores y normativa del convenio.
        </p>
      </div>

      <Tabs defaultValue="admin-guide" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin-guide">
            <BookUser className="mr-2 h-4 w-4" />
            Manual de Usuario (Admin)
          </TabsTrigger>
          <TabsTrigger value="convenio-guide">
            <FileText className="mr-2 h-4 w-4" />
            Convenio y Normativa
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="admin-guide" className="pt-6">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="Inicio">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <Home className="h-5 w-5 text-primary" />
                            <span>Inicio</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
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
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="Panel de Control">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <LayoutDashboard className="h-5 w-5 text-primary" />
                            <span>Panel de Control</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            <div className="space-y-4">
                                <p className="text-muted-foreground">
                                    Es la página principal y el centro de operaciones para la generación de informes. Desde aquí puedes exportar en PDF toda la información clave para la gestión y auditoría.
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-sm">
                                    <li>**Informes Anuales por Empleado:** Genera resúmenes semanales o comparativas de jornada teórica vs. real.</li>
                                    <li>**Informes Generales:** Exporta datos de ausencias, planificación de festivos, horas complementarias y balances semanales.</li>
                                    <li>**Gráfico de Balances:** Visualiza rápidamente los 10 empleados con mayor balance de horas.</li>
                                </ul>
                            </div>
                            <Image src="https://picsum.photos/seed/dashboard/600/400" alt="Captura de pantalla del Panel de Control" width={600} height={400} className="rounded-lg shadow-md w-full" data-ai-hint="dashboard graph" />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="Registro Horario">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            <span>Registro Horario</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
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
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="Empleados">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-primary" />
                            <span>Empleados</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
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
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="Ficha de Empleado">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <UserSquare className="h-5 w-5 text-primary" />
                            <span>Ficha de Empleado</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
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
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="Formularios Personalizados">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <ListChecks className="h-5 w-5 text-primary" />
                            <span>Formularios Personalizados</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
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
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="Programador de Vacaciones">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <Plane className="h-5 w-5 text-primary" />
                            <span>Programador de Vacaciones</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        <div className="space-y-4">
                                <p className="text-muted-foreground">
                                Vista de cuadrante anual para la planificación estratégica de ausencias largas (vacaciones, excedencias, etc.).
                            </p>
                            <ul className="list-disc list-inside space-y-3 text-sm">
                                <li><strong>Cuadrante Anual:</strong> Muestra una vista de todo el año con los empleados agrupados por categorías (que se definen en Ajustes). Las ausencias programadas se muestran en el color del grupo, permitiendo identificar rápidamente solapamientos y periodos de alta o baja ocupación.</li>
                                <li><strong>Informes:</strong> Desde aquí puedes exportar la vista del cuadrante a un PDF para imprimir, o generar un listado de firmas para que los empleados valides sus periodos de vacaciones.</li>
                            </ul>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="Calendario">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <CalendarClock className="h-5 w-5 text-primary" />
                            <span>Calendario</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                       <div className="space-y-4">
                                <p className="text-muted-foreground">
                                Visión global de todas las ausencias programadas en el sistema.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li><strong>Vista Semanal o Mensual:</strong> Muestra en un calendario quién está ausente cada día y por qué motivo, usando un código de colores por tipo de ausencia.</li>
                                <li><strong>Gestión de Ausencias:</strong> Permite añadir, modificar o eliminar ausencias de larga duración directamente desde el calendario, haciendo clic en un día o en un evento existente.</li>
                            </ul>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="Mensajes">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <span>Mensajes</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        <div className="space-y-4">
                                <p className="text-muted-foreground">
                                Canal de comunicación centralizado con los empleados.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li><strong>Chat Individual:</strong> Cada empleado tiene su propio chat para comunicar incidencias o recibir notificaciones. Las conversaciones no leídas se marcan para llamar tu atención.</li>
                                <li><strong>Solicitudes de Corrección:</strong> Aquí recibirás las peticiones de los empleados para corregir errores en semanas ya confirmadas. Estas solicitudes aparecen como mensajes en el chat del empleado correspondiente.</li>
                            </ul>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="Ajustes">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                            <Settings2 className="h-5 w-5 text-primary" />
                            <span>Ajustes</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
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
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </TabsContent>

        <TabsContent value="convenio-guide" className="pt-6 prose dark:prose-invert max-w-full">
            <div className="space-y-6">

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">1) Marco de aplicación y criterio de prevalencia</h3>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Orden de referencia práctica</strong>: Estatuto de los Trabajadores (mínimos), <strong>Plan de Igualdad Grupo Inditex</strong> (ámbito estatal y mejoras), <strong>Convenio Comercio Textil Zaragoza</strong> y pactos internos más favorables. En conflicto, aplica la <strong>condición más beneficiosa</strong> para la persona trabajadora.</li>
                    <li>Este dosier ya incorpora esa prevalencia: donde el Plan de Igualdad mejora al Convenio, <strong>se aplica la mejora del Plan</strong>.</li>
                </ul>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">2) Jornada, pausas, descansos y calendario</h3>
                <div className="space-y-4">
                    <h4 className="font-bold">Jornada anual</h4>
                    <p>1.794 horas/año durante toda la vigencia del convenio.</p>
                    <h4 className="font-bold">Semana y pausas</h4>
                    <ul className="list-disc list-inside space-y-2">
                        <li>40 horas semanales; 12 horas de descanso entre jornadas.</li>
                        <li><strong>Pausa retribuida</strong> en jornada continua > 6 h: 15 min y computa como trabajo efectivo.</li>
                        <li>Mejora Plan Igualdad tiendas: si la jornada continuada es:
                            <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li>hasta 4 h: 15 min; de 4 a 6 h: 20 min; > 6 h: 30 min. La pausa <strong>cuenta como tiempo de trabajo</strong>.</li>
                            </ul>
                        </li>
                    </ul>
                    <h4 className="font-bold">Flexibilización (distribución irregular)</h4>
                    <p>Hasta <strong>80 días/año</strong>; tope diario 9 h y semanal 45 h; compensación dentro de ±3 meses y en el año natural. Posible disfrute en <strong>jornadas completas elegidas por la persona</strong>. Preaviso mínimo 7 días.</p>
                    <h4 className="font-bold">Descanso semanal</h4>
                    <p>Día y medio semanal; sistemas para garantizar <strong>un fin de semana completo al mes</strong> en centros > 5 personas, con excepciones para contratos diseñados para fines de semana.</p>
                    <p>El Plan prevé un <strong>marco mínimo de “fines de semana de calidad”</strong> de implantación progresiva.</p>
                    <h4 className="font-bold">Calendario laboral</h4>
                    <p>Se acuerda en diciembre para el año siguiente en centros con RLT.</p>
                    <h4 className="font-bold">Turnos partidos</h4>
                    <p>El Plan fomenta <strong>eliminar el turno partido</strong> como régimen ordinario allí donde sea viable, priorizando jornada continuada.</p>
                </div>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">3) Vacaciones</h3>
                <p><strong>31 días naturales</strong>, en <strong>dos periodos</strong>: 21 días entre junio-septiembre y 10 días en otra época pactada. Inician en <strong>lunes</strong> salvo acuerdo distinto. <strong>Turno rotativo</strong> de elección; matrimonio en la empresa: <strong>coincidencia de vacaciones</strong>. No comienzan en domingos/festivos/descanso semanal. IT que impida disfrutarlas: <strong>se posponen</strong>.</p>
                
                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">4) Asuntos propios</h3>
                <p><strong>2 días al año</strong>, <strong>no computan contra la jornada anual</strong>. Uno puede <strong>fraccionarse en dos medias jornadas</strong> de mutuo acuerdo.</p>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">5) Permisos retribuidos del Convenio (y mejoras del Plan)</h3>
                <div className="space-y-4">
                    <h4 className="font-bold">Convenio Zaragoza (retribuidos, con aviso y justificación)</h4>
                     <ul className="list-disc list-inside space-y-2">
                        <li><strong>Matrimonio</strong>: 15 días naturales.</li>
                        <li><strong>Accidente, enfermedad grave u hospitalización</strong> de parientes hasta 2º grado: <strong>5 días</strong>.</li>
                        <li><strong>Fallecimiento cónyuge o hijos</strong>: <strong>5 días naturales</strong>.</li>
                        <li><strong>Traslado de domicilio</strong>: 1 día.</li>
                        <li><strong>Deber público y personal (incluye voto)</strong>: tiempo indispensable.</li>
                        <li><strong>Funciones sindicales</strong>: según norma.</li>
                        <li><strong>Exámenes prenatales y preparación al parto</strong>: tiempo indispensable.</li>
                        <li><strong>Horas médicas convenio</strong>:
                            <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li><strong>Hasta 12 h/año</strong> para tu <strong>atención médica</strong> o para acompañar al médico a <strong>hijos &lt;16</strong> o <strong>ascendientes 1º grado dependientes</strong>.</li>
                                <li><strong>Hasta 24 h/año</strong> para acompañar a <strong>familiares hasta 2º grado</strong> con <strong>enfermedad crónica o rara</strong>.</li>
                                <li><strong>1 día</strong> por boda de familiar hasta 2º grado.</li>
                                <li>Trámites y atención sanitaria para personas trans y sus hijos menores: <strong>tiempo necesario</strong>.</li>
                            </ul>
                        </li>
                    </ul>
                    <h4 className="font-bold">Mejoras del Plan de Igualdad (prevalecen cuando amplían)</h4>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Permiso sanitario retribuido general: hasta 20 h/año</strong> (Seguridad Social o privada; excluye fisio, psicología y odontología), para:
                            <ol className="list-decimal list-inside ml-4 mt-1">
                                <li>asistencia propia,</li>
                                <li>acompañar a menores a cargo,</li>
                                <li>acompañar a familiares de 1º grado.</li>
                            </ol>
                            <p className="ml-4 mt-1">+<strong>10 h/año adicionales</strong> para acompañamiento a menores en <strong>familias monoparentales/monomarentales</strong>.</p>
                        </li>
                        <li><strong>Consulta médica</strong> para descendientes con <strong>≥33% discapacidad</strong>, o progenitores dependientes <strong>Grado II/III</strong>: permiso específico retribuido.</li>
                        <li><strong>Reproducción asistida</strong>: <strong>hasta 8 h/año retribuidas</strong> (desde ahí, tiempo recuperable/no retribuido).</li>
                        <li><strong>Gestiones de adopción, acogimiento y reagrupación familiar internacional</strong>: se garantiza el art. 37.3.f ET y además <strong>16 h/año retribuidas</strong>; desde ahí, tiempo recuperable/no retribuido.</li>
                        <li><strong>Excedencia con reserva</strong> por trámites de <strong>adopción internacional o reagrupación</strong>: hasta <strong>4 meses</strong>.</li>
                    </ul>
                     <h4 className="font-bold">Licencias no retribuidas del Convenio (adicionales)</h4>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Hasta 8 h/año</strong> para acompañar al médico a hijos &lt;16 o ascendientes 1º grado dependientes.</li>
                        <li><strong>1 h/día</strong> para atender a hijos &lt;6 años hospitalizados.</li>
                        <li><strong>Tiempo necesario</strong> para atender a hijos/familiares dependientes <strong>hasta 1º grado</strong>.</li>
                    </ul>
                </div>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">6) Excedencias y reducciones</h3>
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Cuidado de hijos</strong>: <strong>Excedencia</strong> hasta <strong>3 años</strong> por cada hijo (nacimiento, adopción o acogimiento). Reincorporación automática al finalizar; solicita con 1 mes de antelación.</li>
                    <li><strong>Excedencia especial por duelo familiar</strong>: Por <strong>fallecimiento de familiar hasta 2º grado</strong>: hasta <strong>4 semanas</strong>, con <strong>reserva de puesto</strong>.</li>
                    <li><strong>Excedencia por estudios (Plan)</strong>: Hasta <strong>1 año con reserva</strong> si es <strong>formación oficial</strong>, con requisitos de asistencia y sin actividad laboral en el periodo.</li>
                    <li><strong>Reducciones y adaptaciones</strong>: Se mantienen las de ET (guarda legal, cuidados, etc.). El Plan incluye <strong>medidas de adaptación de jornada y eliminación del turno partido</strong> cuando sea viable.</li>
                </ul>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">7) Trabajo en domingos/festivos, nocturnidad y jornadas especiales</h3>
                 <ul className="list-disc list-inside space-y-2">
                    <li>
                        <strong>Festivos trabajados</strong>: Existen dos modalidades de compensación:
                        <ul className="list-['-_'] list-inside ml-4 mt-1">
                            <li><strong>Pago simple (96€):</strong> Se abona esta cantidad y además se devuelven las horas trabajadas en la bolsa de festivos para su posterior disfrute.</li>
                            <li><strong>Pago doble (192€):</strong> Se abona esta cantidad superior, pero en este caso, las horas trabajadas no se devuelven en la bolsa de festivos.</li>
                        </ul>
                    </li>
                    <li>Límite de trabajo en domingos y festivos: en centros > 5 personas y salvo contratos diseñados para ello, <strong>no obligados a más del 50%</strong> de aperturas anuales.</li>
                    <li><strong>Domingo/festivo no habilitado</strong>: <strong>+150%</strong>.</li>
                    <li><strong>Nocturnidad</strong>: Entre 22:00 y 06:00, <strong>+25%</strong> del salario hora.</li>
                    <li><strong>Jornadas especiales</strong>: Black Friday, víspera de Reyes, remontajes… <strong>voluntarias</strong> y con <strong>salario/hora superior</strong> al del convenio, a pactar previamente.</li>
                </ul>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">8) Retribución: tablas, pluses y pagas</h3>
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Tablas salariales</strong>: 2023: +2,5% sobre 2022; 2024: +2% sobre 2023. Tablas completas por grupos y categorías en anexos del Convenio.</li>
                    <li><strong>Pagas extraordinarias</strong>: <strong>Julio y Navidad</strong>: una mensualidad según tablas, más ad personam si procede; prorrateables por acuerdo.</li>
                    <li><strong>Paga de marzo (antigua de beneficios)</strong>: la empresa debe abonar **al menos una mensualidad** anual ligada a ventas/beneficios; liquidación cada primer trimestre del ejercicio siguiente o prorrateo.</li>
                    <li><strong>Pluses</strong>: **Transporte** por día trabajado y **Ropa de trabajo** mensual; importes en anexos (p. ej., 2024: transporte 3,64 €/día; ropa 24,85 €/mes).</li>
                    <li><strong>Plus salarial de fidelidad** (mayores de 61 años con ≥15 años de antigüedad, condicionado): mensual, no compensable/absorbible, con tope hasta los 66 años.</li>
                    <li><strong>Premios y seguros**: **Premio jubilación** por años de anticipo respecto a edad legal, con escala económica (referencias en anexos).</li>
                    <li>**Seguro** por invalidez o muerte: 16.500 €.</li>
                </ul>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">9) Promoción profesional y desconexión digital</h3>
                 <ul className="list-disc list-inside space-y-2">
                    <li>**Ascensos automáticos por permanencia efectiva** en categoría (ayudante → dependiente 2ª en 2 años; dependiente 2ª → 1ª en 3; 1ª → mayor en 5; etc.).</li>
                    <li>**Desconexión digital**: el convenio faculta protocolos para garantizarla (art. 20 bis ET).</li>
                </ul>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">10) Definiciones útiles: parentesco y grados</h3>
                 <ul className="list-disc list-inside space-y-2">
                    <li>**Consanguinidad**: relación por sangre. Grados: 1º: madre/padre, hijo/a. 2º: abuelo/a, nieto/a, hermano/a. 3º: bisabuelo/a, bisnieto/a, tío/a-sobrino/a. 4º: primos/as.</li>
                    <li>**Afinidad**: por matrimonio o pareja de hecho respecto de la familia del cónyuge/pareja. Grados análogos: suegro/a, yerno/nuera (1º); cuñado/a, abuelo/a político/a (2º), etc.</li>
                    <li>Salvo mejora, **los permisos del convenio referidos a grados** se computan con estas reglas.</li>
                </ul>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">11) Medidas del Plan de Igualdad que debes tener presentes (prevalecen)</h3>
                 <ul className="list-disc list-inside space-y-2">
                    <li>**Jornada y organización**: **Calendario anual** con 2 meses de antelación y cambios con 15 días salvo causa justificada; prioridad jornada continuada; medidas para **reducir parcialidad no deseada** y fijar **mínimos de horas** en parciales (definición vía Comisión de Seguimiento).</li>
                    <li>**Conciliación reforzada**: Todo el bloque de **horas médicas** y acompañamientos descrito en el punto 5 (20 h/año, etc.) **es del Plan** y se aplica en todo el territorio.</li>
                    <li>**Excedencia por estudios** con **reserva** (hasta 1 año) en condiciones del Plan.</li>
                </ul>

                <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">12) Beneficios y acuerdos comunicados por CCOO/empresa (2024-2025)</h3>
                <p className="text-muted-foreground">Nota: este bloque recoge **acuerdos y comunicaciones** corporativas de ámbito Inditex que has aportado. Cuando son mejoras ya activas, las he tratado como derecho; cuando están **en negociación**, quedan señaladas como tal.</p>
                <div className="space-y-4">
                    <h4 className="font-bold">Gestión de la Madurez (acuerdo estatal de homologación)</h4>
                    <ul className="list-disc list-inside space-y-2">
                        <li>**Premios de vinculación**:
                            <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li>**25 años**: **1.500 €** en un único pago.</li>
                                <li>**30 años**: **tarjeta regalo 500 €** (vía INET con **código QR** individual; si no hay INET por reserva/suspenso, se facilitará **tarjeta física** por canales alternativos).</li>
                            </ul>
                        </li>
                        <li>**Garantía mínima de vinculación anual (proporcional a jornada)**:
                             <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li>8-11 años: **850 €**; 12-15: **1.000 €**; 16-19: **1.200 €**; **≥20**: **1.400 €**.</li>
                             </ul>
                        </li>
                        <li>**Reducción de jornada por edad**: implantación **a partir de 2025**, con disfrute el año en que se **cumplan 10 años de antigüedad** (configuración detallada por tramos en las comunicaciones sindicales).</li>
                        <li>**Abonos**: se ha comunicado que **en nómina de agosto** se refleja antigüedad y premio de vinculación; **atrasos desde 1 de abril** en **septiembre**.</li>
                        <li>**Reconocimiento de antigüedad**:
                             <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li>En concatenación de **temporales** de la misma cadena, computa a efectos de vinculación si no hay interrupción > **6 meses + 1 día**; abono de pendientes en octubre.</li>
                                <li>**Excedencias con reserva** (Plan/Convenio): **se reconoce la antigüedad** a efectos de estos premios.</li>
                                <li>Situaciones con **reserva de puesto** sin nómina previa a abril 2024: pago de atrasos y premio si corresponde, en la primera semana de octubre.</li>
                                <li>Personas con **30 años**: activación del **QR de 500 €** a las 12:00 h del día comunicado por INET.</li>
                             </ul>
                        </li>
                    </ul>
                     <h4 className="font-bold">Trabajo en sábado tarde y comisiones: en negociación</h4>
                    <p>Se han planteado mejoras de **comisión** en sábados tarde, Black Friday y días de alta venta; y **subida del incentivo de dependientas** (ej.: 600→900 € en &lt;24 h/sem y 1.000→1.500 € en ≥24 h/sem), así como actualizar objetivos 2025. A la fecha de las piezas remitidas, **las cifras exactas estaban en mesa** (no cerradas).</p>
                    <h4 className="font-bold">App/visibilidad de comisiones</h4>
                    <p>Comunicación de empresa: desarrollo de **app** para que plantilla vea el **desglose diario de comisiones**; fase de pruebas y despliegue comunicado.</p>
                     <h4 className="font-bold">Permisos elecciones</h4>
                    <p>En jornadas electorales europeas se difundieron **horas retribuidas** según coincidencia de horarios. Aplica la normativa autonómica de cada proceso, con el **deber público retribuido** ya cubierto por el Convenio.</p>
                </div>
                
                 <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">13) Ruta práctica en INET (autoservicio)</h3>
                 <ul className="list-disc list-inside space-y-2">
                    <li>**Área Personal → Autoservicio del Empleado → Jornada / Permisos retribuidos / Excedencias**.</li>
                    <li>Formularios activos (según las piezas que enviaste): **necesidades de formación; adaptación de jornada por dependientes o discapacidad a cargo; adaptación por estudios; adaptación por hospitalización o tratamiento médico de cónyuge/pareja/hijos; extensión de reducción de jornada** hasta fecha indicada.</li>
                    <li>Para el **premio 30 años**, se activa **QR individual** en INET; si estás en reserva y sin INET, la empresa comunica alternativa física.</li>
                </ul>

                 <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">14) Resumen “qué me llevo puesto”</h3>
                 <ol className="list-decimal list-inside space-y-2">
                    <li>**Horas médicas**: tienes **20 h/año retribuidas** (propias, menores a cargo y 1º grado) + **10 h extra** si familia monoparental; además, por Convenio, **12 h/año** propias/menores&lt;16/ascendiente 1º grado dependiente y **24 h/año** para crónicos/raras hasta 2º grado. Usa siempre la **mejor combinación** (Plan + Convenio).</li>
                    <li>**Vacaciones**: 31 días, 21 en verano y 10 resto, en lunes, con turnos rotativos y reglas de coincidencia y no inicio en festivo.</li>
                    <li>**Asuntos propios**: 2 días y **no afectan** a la jornada anual; 1 día fraccionable.</li>
                    <li>**Domingos/festivos**: +75% (autorizados) y límite del 50% de aperturas obligatorias; **no habilitados** +150%.</li>
                    <li>**Pausas retribuidas** ampliadas por el Plan (hasta 30 min según duración).</li>
                    <li>**Pagas**: julio, Navidad y **paga de marzo** mínima de **una mensualidad** ligada a ventas/beneficios.</li>
                    <li>**Pluses**: transporte por día, ropa de trabajo mensual y **plus de fidelidad** (condicionado).</li>
                    <li>**Premios de vinculación** (25 y 30 años), **garantía mínima anual por tramos de antigüedad** y **reducción de jornada por edad**: activados a partir de los acuerdos estatales comunicados (bloque Madurez).</li>
                    <li>**Excedencias con reserva**: cuidado de hijos (hasta 3 años), estudios (Plan, hasta 1 año), adopción internacional/reagrupación (hasta 4 meses).</li>
                    <li>**Promoción** por permanencia efectiva en categoría; **desconexión digital** con protocolo.</li>
                </ol>

                <h4 className="font-bold pt-6">Notas finales de uso</h4>
                <ul className="list-disc list-inside space-y-2">
                    <li>Guarda justificantes y **avisa siempre** con la antelación exigida (7 días en flexibilización, 15 días en cambios de calendario del Plan).</li>
                    <li>En **permisos fraccionables** por hospitalización/enfermedad grave, el Convenio permite **disfrute en medios días** durante la duración del hecho causante.</li>
                    <li>Si algo no te encaja en tienda, este dosier te da base para exigir la **opción más favorable**.</li>
                </ul>

            </div>
          </TabsContent>
      </Tabs>
    </div>
  );
}
