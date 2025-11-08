
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookUser } from 'lucide-react';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


type AdminGuideItemProps = {
  title: string;
  children: React.ReactNode;
};

const AdminGuideItem = ({ title, children }: AdminGuideItemProps) => (
  <AccordionItem value={title}>
    <AccordionTrigger>{title}</AccordionTrigger>
    <AccordionContent className="prose prose-sm max-w-none text-muted-foreground">
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
          Guía de Usuario y Documentación
        </h1>
        <p className="text-lg text-muted-foreground">
          Recursos para administradores y empleados.
        </p>
      </div>

      <Tabs defaultValue="admin-manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin-manual">Manual de Usuario</TabsTrigger>
          <TabsTrigger value="agreement">Convenio y Normativa</TabsTrigger>
        </TabsList>
        <TabsContent value="admin-manual">
          <Card>
            <CardHeader>
              <CardTitle>Guía para Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AdminGuideItem title="a. Inicio">
                    <p>Es la primera página que ves al iniciar sesión y actúa como un centro de notificaciones y tareas pendientes.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Semanas Pendientes</strong>: Muestra la semana más antigua que tiene empleados sin confirmar. Indica el número de empleados pendientes y un botón para ir directamente a esa semana en el "Registro Horario".</li>
                        <li><strong>Mensajes Sin Leer</strong>: Presenta una lista de las últimas conversaciones con mensajes de empleados que aún no has leído.</li>
                        <li><strong>Próximos Eventos</strong>: Ofrece una vista rápida de las próximas ausencias programadas (bajas, excedencias, etc.) en las siguientes semanas.</li>
                    </ul>
                </AdminGuideItem>
                <AdminGuideItem title="b. Panel de Control">
                    <p>Centro de operaciones para la generación de informes en PDF.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>
                            <strong>Informes por Empleado</strong>:
                            <ul className="list-disc pl-5 mt-1">
                                <li><strong>Resumen Anual</strong>: Genera un PDF con el registro semanal de un empleado para un año específico, mostrando el desglose de horas y el impacto en las bolsas semana a semana.</li>
                                <li><strong>Jornada Anual</strong>: Crea un informe que compara las horas teóricas vs. las realmente computadas para un empleado en un año.</li>
                                <li><strong>Ausencias</strong>: Exporta un resumen de todas las ausencias de un empleado para un año, agrupadas por tipo.</li>
                            </ul>
                        </li>
                        <li><strong>Informe de Festivos</strong>: Permite generar un listado de empleados para planificar quién trabajará en los festivos de apertura seleccionados.</li>
                        <li>
                            <strong>Informes Generales (Semanales)</strong>:
                             <ul className="list-disc pl-5 mt-1">
                                <li><strong>H. Complem.</strong>: Genera un PDF con los empleados que han realizado horas complementarias en una semana específica.</li>
                                <li><strong>Balances</strong>: Crea un informe con el estado de las bolsas de horas de toda la plantilla al final de una semana seleccionada.</li>
                            </ul>
                        </li>
                        <li><strong>Top 10 Empleados por Balance</strong>: Un gráfico de barras que muestra los empleados con el mayor balance total de horas, permitiendo una gestión proactiva.</li>
                    </ul>
                </AdminGuideItem>
                <AdminGuideItem title="c. Registro Horario">
                    <p>La herramienta principal para la gestión diaria.</p>
                     <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li><strong>Navegación Libre</strong>: Puedes navegar a cualquier semana del año usando las flechas o el selector de calendario, lo que te permite planificar y consultar con total libertad.</li>
                        <li>
                            <strong>Vista Semanal (por defecto)</strong>:
                             <ul className="list-disc pl-5 mt-1">
                                <li>Muestra a todos los empleados activos para la semana seleccionada.</li>
                                <li><strong>Registro de Horas</strong>: En el modo de edición (semanas no confirmadas), puedes introducir horas trabajadas, tipos de ausencia, horas de libranza y complementarias para cada empleado.</li>
                                <li><strong>Gestión de Ausencias Programadas</strong>: Al editar la semana de un empleado, el botón <strong>"Ausencias"</strong> abre una ventana para gestionar sus ausencias largas (bajas, excedencias, etc.) sin necesidad de ir a la ficha del empleado.</li>
                                <li><strong>Impacto en Tiempo Real</strong>: La aplicación calcula al instante cómo cada cambio afectará a las bolsas de horas del empleado.</li>
                                <li><strong>Confirmación</strong>: Al pulsar "Confirmar", los datos de la semana se guardan de forma permanente y los balances se actualizan. La fila del empleado pasa a modo de solo lectura.</li>
                                <li><strong>Habilitar Corrección</strong>: En las semanas ya confirmadas, puedes pulsar este botón para volver a poner la fila en modo de edición y hacer ajustes.</li>
                            </ul>
                        </li>
                        <li><strong>Vista Anual (seleccionando un empleado)</strong>: Muestra el calendario completo de un solo empleado para todo un año, permitiendo una visión y planificación a largo plazo.</li>
                    </ul>
                </AdminGuideItem>
                <AdminGuideItem title="d. Empleados">
                  <p>Centro de gestión de la plantilla.</p>
                   <ul className="list-disc pl-5 mt-2 space-y-2">
                       <li>
                           <strong>Listado de Empleados</strong>:
                           <ul className="list-disc pl-5 mt-1">
                               <li><strong>Activos</strong>: Muestra empleados con contrato en vigor, con un resumen en tiempo real de sus balances y días de vacaciones consumidos.</li>
                               <li><strong>Inactivos</strong>: Empleados cuyo contrato ha finalizado.</li>
                           </ul>
                       </li>
                       <li>
                           <strong>Crear/Editar Ficha de Empleado</strong>:
                           <ul className="list-disc pl-5 mt-1">
                               <li><strong>Datos Personales y de Contrato</strong>: Define el nombre, DNI, email, tipo de contrato, jornada semanal, etc.</li>
                               <li><strong>Calendario Laboral</strong>: Configura el sistema de 4 turnos rotativos para las horas teóricas.</li>
                               <li><strong>Modificaciones de Contrato</strong>: Puedes programar cambios de jornada o de tipo de contrato a futuro sin necesidad de crear una nueva ficha.</li>
                           </ul>
                       </li>
                   </ul>
                </AdminGuideItem>
                 <AdminGuideItem title="e. Ficha de Empleado">
                  <p>Visión de 360 grados de un trabajador.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Balances y Vacaciones</strong>: Muestra las bolsas de horas, el total acumulado y los días de vacaciones disfrutados vs. disponibles.</li>
                        <li><strong>Datos del Contrato</strong>: Detalla el contrato vigente y el historial de cambios de jornada o de contrato.</li>
                        <li><strong>Cómputo Anual</strong>: Un resumen año por año que compara horas teóricas vs. computadas.</li>
                        <li><strong>Gestión de Ausencias Programadas</strong>: Permite registrar ausencias de larga duración (bajas, excedencias) que se aplicarán automáticamente en el calendario.</li>
                    </ul>
                </AdminGuideItem>
                <AdminGuideItem title="f. Formularios Personalizados">
                  <p>Herramienta para crear PDFs a medida.</p>
                   <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Formularios Personalizados</strong>: Crea formularios con las columnas que necesites (texto, checkboxes) para generar un PDF con la lista de empleados activos, listo para imprimir y rellenar.</li>
                        <li><strong>Datos Personales</strong>: Genera un informe en PDF con los datos personales de la plantilla (DNI, teléfono, email, etc.) que elijas.</li>
                        <li><strong>Empleados para Informes</strong>: Gestiona una lista de empleados "eventuales" que no están en la plantilla principal pero que deben aparecer en ciertos informes, como el de planificación de festivos.</li>
                    </ul>
                </AdminGuideItem>
                <AdminGuideItem title="g. Programador de Vacaciones">
                    <p>Vista de cuadrante anual para la planificación de ausencias largas.</p>
                     <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Cuadrante Anual</strong>: Muestra una vista de todo el año con los empleados (agrupados por categorías) que tienen ausencias largas, permitiendo identificar solapamientos.</li>
                        <li><strong>Informes</strong>: Desde aquí puedes imprimir el cuadrante o generar un listado para la firma de vacaciones.</li>
                    </ul>
                </AdminGuideItem>
                <AdminGuideItem title="h. Calendario">
                  <p>Visión global de todas las ausencias programadas en el sistema.</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Vista Semanal o Mensual</strong>: Muestra en un calendario quién está ausente cada día y por qué motivo.</li>
                    <li><strong>Gestión de Ausencias</strong>: Permite añadir, modificar o eliminar ausencias de larga duración directamente desde el calendario.</li>
                  </ul>
                </AdminGuideItem>
                <AdminGuideItem title="i. Mensajes">
                  <p>Canal de comunicación centralizado con los empleados.</p>
                   <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Chat Individual</strong>: Cada empleado tiene su propio chat para comunicar incidencias o recibir notificaciones.</li>
                        <li><strong>Solicitudes de Corrección</strong>: Aquí recibirás las peticiones de los empleados para corregir errores en semanas ya confirmadas.</li>
                    </ul>
                </AdminGuideItem>
                <AdminGuideItem title="j. Ajustes">
                  <p>El cerebro de la aplicación, donde se definen las reglas de negocio.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Días Festivos</strong>: Gestiona los festivos y aperturas comerciales.</li>
                        <li><strong>Conf. Anual</strong>: Define las horas de convenio para cada año.</li>
                        <li><strong>Tipos de Ausencia</strong>: Crea y configura los tipos de ausencia y sus reglas de cómputo.</li>
                        <li><strong>Tipos de Contrato</strong>: Gestiona los tipos de contrato.</li>
                        <li><strong>Campañas de Solicitud</strong>: Abre periodos específicos para que los empleados puedan solicitar sus vacaciones.</li>
                        <li><strong>Utilidades</strong>: Herramientas de administrador para limpieza o auditoría de datos.</li>
                    </ul>
                </AdminGuideItem>
                 <AdminGuideItem title="k. Guía">
                    <p>Acceso a este mismo manual de usuario directamente desde la aplicación.</p>
                </AdminGuideItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="agreement">
          <Card>
            <CardHeader>
              <CardTitle>DOSIER ÚNICO DE DERECHOS Y BENEFICIOS – INDITEX (TIENDAS)</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <p><strong>Ámbito:</strong> toda España (Plan de Igualdad de Grupo Inditex). Para Zaragoza, además, lo indicado en el Convenio de Comercio Textil cuando no esté superado por el Plan.</p>
                <p><strong>Criterio de prevalencia:</strong> Estatuto de los Trabajadores (mínimos) → Plan de Igualdad (estatal, mejora y prevalece) → Convenio de Zaragoza y pactos internos más favorables.</p>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-0">
                    <AccordionTrigger>0. ESTATUTO DE LOS TRABAJADORES (MÍNIMOS LEGALES QUE SIEMPRE APLICAN)</AccordionTrigger>
                    <AccordionContent>
                      <h5>0.1 Contrato, categoría y nómina</h5>
                      <ul>
                          <li>Derecho a copia del contrato y de sus anexos/prórrogas; registro en el servicio público de empleo.</li>
                          <li>Clasificación profesional y funciones conforme al grupo/nivel.</li>
                          <li>Derecho a recibir nómina con desglose de conceptos y descuentos.</li>
                      </ul>
                      <h5>0.2 Tiempo de trabajo (límites generales)</h5>
                      <ul>
                          <li>Jornada máxima ordinaria: 40 horas semanales de trabajo efectivo en cómputo anual.</li>
                          <li>Descanso mínimo diario: 12 horas entre jornadas.</li>
                          <li>Descanso semanal: 1 día y medio ininterrumpido, con compensaciones legales.</li>
                          <li>Registro horario obligatorio.</li>
                      </ul>
                      <h5>0.3 Horas extraordinarias y nocturnidad</h5>
                      <ul>
                          <li>Horas extra voluntarias salvo pacto; se compensan con pago o descanso.</li>
                          <li>Trabajo nocturno (aprox. 22:00–06:00): condiciones y protección específicas, con complemento según convenio/empresa.</li>
                      </ul>
                      <h5>0.4 Vacaciones y festivos</h5>
                      <ul>
                          <li>Vacaciones anuales: mínimo legal 30 días naturales (o equivalente en laborables).</li>
                          <li>Fiestas laborales: 14 al año (nacionales, autonómicas y locales).</li>
                      </ul>
                      <h5>0.5 Permisos retribuidos (marco legal)</h5>
                      <ul>
                          <li>Matrimonio: 15 días naturales.</li>
                          <li>Fallecimiento, accidente o enfermedad graves, hospitalización o cirugía sin ingreso con reposo de parientes hasta 2.º grado: permiso retribuido.</li>
                          <li>Mudanza del domicilio habitual: permiso retribuido.</li>
                          <li>Deber inexcusable de carácter público y personal (votar, jurado): tiempo indispensable.</li>
                          <li>Exámenes prenatales y preparación al parto: dentro de jornada.</li>
                          <li>Lactancia: 1 hora diaria (acumulable o fraccionable) según ley y/o convenio.</li>
                          <li>Pareja de hecho: equiparación en permisos cuando lo reconozcan normas o acuerdos aplicables.</li>
                      </ul>
                      <h5>0.6 Conciliación (derechos básicos)</h5>
                      <ul>
                          <li>Adaptación de jornada por conciliación (solicitud motivada; negociación y respuesta escrita).</li>
                          <li>Reducción de jornada por cuidado de menor, persona con discapacidad o dependiente a cargo.</li>
                          <li>Permiso parental: hasta 8 semanas para cuidado de hijo menor (según normativa vigente).</li>
                          <li>Protección especial en embarazo, lactancia, riesgo y violencia de género.</li>
                      </ul>
                      <h5>0.7 Excedencias y suspensión</h5>
                      <ul>
                          <li>Excedencia por cuidado de hijo: hasta 3 años por cada menor.</li>
                          <li>Excedencia por cuidado de familiar: hasta 2 años.</li>
                          <li>Reserva de puesto y garantías según tipo y tramo temporal.</li>
                      </ul>
                      <h5>0.8 Representación y garantías</h5>
                      <ul>
                          <li>Derecho a representación legal, libertad sindical y negociación colectiva.</li>
                          <li>Derecho a no discriminación e igualdad de trato en acceso, formación, promoción y retribución.</li>
                      </ul>
                      <h5>0.9 Prevalencia con este dosier</h5>
                      <p>Este bloque es el suelo legal. Donde el Plan de Igualdad o el Convenio mejoren, se aplica la mejora (ya incorporada en los apartados siguientes).</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>1. JORNADA, PAUSAS, DESCANSOS Y CALENDARIO</AccordionTrigger>
                    <AccordionContent>
                      <ul>
                          <li><strong>Jornada anual:</strong> 1.794 horas/año.</li>
                          <li><strong>Semana y pausas:</strong> 40 horas semanales; 12 horas de descanso entre jornadas; pausa retribuida en jornada continuada de más de 6 horas: 15 minutos, computa como trabajo efectivo.</li>
                          <li><strong>Mejora Plan (tiendas):</strong> si la jornada continuada es hasta 4 h → 15 min; de 4 a 6 h → 20 min; más de 6 h → 30 min. La pausa computa como tiempo de trabajo.</li>
                          <li><strong>Flexibilización (distribución irregular):</strong> hasta 80 días/año; tope 9 h/día y 45 h/semana; compensación dentro del año (posible en jornadas completas elegidas por la persona). Preaviso mínimo 7 días.</li>
                          <li><strong>Descanso semanal:</strong> día y medio ininterrumpido; organización para asegurar fines de semana de disfrute según centro.</li>
                          <li><strong>Calendario laboral:</strong> comunicación con 2 meses de antelación; cambios ordinarios con 15 días de aviso.</li>
                          <li><strong>Turnos partidos:</strong> el Plan prioriza jornada continuada y la eliminación del turno partido cuando sea viable.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>2. VACACIONES</AccordionTrigger>
                    <AccordionContent>
                      <ul>
                          <li>31 días naturales (equivalente 23 laborables).</li>
                          <li>Distribución: 21 días entre junio y septiembre + 10 días en otra fecha por acuerdo.</li>
                          <li>Inicio en lunes.</li>
                          <li>Festivos coincidentes con vacaciones se disfrutan en otra fecha si no estaban ya contemplados.</li>
                          <li>IT, nacimiento/adopción/acogimiento o lactancia acumulada interrumpen y reprograman el disfrute.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>3. ASUNTOS PROPIOS</AccordionTrigger>
                    <AccordionContent>
                      <ul>
                          <li>2 días al año, no computan contra la jornada anual.</li>
                          <li>Uno de los días puede fraccionarse en dos medias jornadas por acuerdo.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                    <AccordionTrigger>4. PERMISOS RETRIBUIDOS (CONVENIO Y PLAN)</AccordionTrigger>
                    <AccordionContent>
                      <h5>4.1 Convenio (retribuidos, con aviso y justificación)</h5>
                      <ul>
                          <li>Matrimonio o pareja de hecho registrada: 15 días naturales.</li>
                          <li>Accidente, enfermedad grave u hospitalización de familiares hasta 2.º grado: 5 días (fraccionables en medios días durante el hecho causante).</li>
                          <li>Fallecimiento de cónyuge o hijos: 5 días naturales.</li>
                          <li>Traslado de domicilio habitual: 1 día.</li>
                          <li>Deber público o personal (incluye voto): tiempo indispensable.</li>
                          <li>Funciones sindicales: el tiempo que corresponda.</li>
                          <li>Exámenes prenatales y preparación al parto: tiempo indispensable.</li>
                          <li>Horas médicas convenio:
                            <ul>
                              <li>Hasta 12 h/año para atención médica propia o acompañar a menores de 16 años o ascendientes de 1.º grado dependientes.</li>
                              <li>Hasta 24 h/año para acompañar a familiares hasta 2.º grado con enfermedades crónicas o raras.</li>
                              <li>1 día por boda de familiar hasta 2.º grado.</li>
                              <li>Trámites y atención sanitaria de personas trabajadoras trans y de hijos/as menores trans: tiempo necesario.</li>
                            </ul>
                          </li>
                      </ul>
                      <h5>4.2 Plan de Igualdad (prevalece cuando amplía)</h5>
                      <ul>
                          <li>Permiso sanitario retribuido general: hasta 20 h/año (sanidad pública o privada; excluye fisioterapia, psicología y odontología no urgentes), para: 1) asistencia propia, 2) acompañar a menores a cargo, 3) acompañar a familiares de 1.º grado.</li>
                          <li>+10 h/año adicionales para acompañamiento a menores en familias monoparentales/monomarentales.</li>
                          <li>Consulta médica retribuida para descendientes con ≥33 % de discapacidad o progenitores dependientes Grado II/III.</li>
                          <li>Reproducción asistida: hasta 8 h/año retribuidas; a partir de ahí, tiempo recuperable/no retribuido.</li>
                          <li>Adopción, acogimiento y reagrupación internacional: 16 h/año retribuidas además de lo previsto en la ley; excedencia con reserva de hasta 4 meses para trámites internacionales cuando proceda.</li>
                      </ul>
                      <h5>4.3 Licencias no retribuidas (convenio)</h5>
                      <ul>
                          <li>Hasta 8 h/año para acompañar al médico a hijos menores de 16 o ascendientes de 1.º grado dependientes.</li>
                          <li>1 h/día para atender a hijos menores de 6 años hospitalizados.</li>
                          <li>Tiempo necesario para atender a familiares dependientes de 1.º grado.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-5">
                    <AccordionTrigger>5. EXCEDENCIAS Y ADAPTACIONES/REDUCCIONES</AccordionTrigger>
                    <AccordionContent>
                      <ul>
                          <li>Excedencia por cuidado de hijos: hasta 3 años por cada hijo/a (nacimiento, adopción o acogimiento).</li>
                          <li>Excedencia especial por duelo familiar (hasta 2.º grado): hasta 4 semanas, con reserva de puesto, cuando esté regulada.</li>
                          <li>Excedencia por estudios oficiales (Plan): hasta 1 año con reserva, con requisitos de asistencia y sin actividad laboral en el periodo.</li>
                          <li>Adaptaciones y reducciones ET + Plan: guarda legal, dependientes, discapacidad a cargo, estudios oficiales, tratamientos médicos de cónyuge/pareja/hijos; prioridad de jornada continuada cuando sea viable.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-6">
                    <AccordionTrigger>6. FESTIVOS TRABAJADOS: SISTEMA DE COMPENSACIÓN ECONÓMICA</AccordionTrigger>
                    <AccordionContent>
                      <p>Opciones aplicables en festivos de apertura autorizada:</p>
                      <h5>Pago simple</h5>
                      <ul>
                        <li>96 € brutos por festivo trabajado.</li>
                        <li>Devolución en descanso de las horas efectivamente trabajadas ese día.</li>
                        <li>Compensación = dinero + descanso (se devuelven las horas).</li>
                      </ul>
                      <h5>Pago doble</h5>
                      <ul>
                        <li>192 € brutos por festivo trabajado.</li>
                        <li>Sin devolución de horas ni descanso compensatorio.</li>
                        <li>Compensación = solo dinero (no se devuelve el festivo).</li>
                      </ul>
                      <p>Nota: este sistema sustituye a cualquier referencia porcentual en festivos dentro de este dosier. La opción aplicable se comunicará según los criterios operativos del centro y la planificación publicada.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-7">
                    <AccordionTrigger>7. NOCTURNIDAD Y JORNADAS ESPECIALES</AccordionTrigger>
                    <AccordionContent>
                      <ul>
                        <li>Nocturnidad (22:00–06:00): +25 % del salario/hora.</li>
                        <li>Jornadas especiales (Black Friday, víspera de Reyes, remontajes): voluntarias y con salario/hora superior al de convenio, a pactar previamente.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-8">
                    <AccordionTrigger>8. RETRIBUCIÓN: TABLAS, PLUSES Y PAGAS</AccordionTrigger>
                    <AccordionContent>
                      <h5>8.1 Tablas</h5>
                      <ul>
                          <li>2024: tablas publicadas por grupos y categorías (base para cálculos).</li>
                          <li>2025–2027: se aplican porcentajes y/o cláusulas de revisión comunicadas.</li>
                      </ul>
                      <h5>8.2 Pagas extraordinarias</h5>
                      <ul>
                          <li>Julio y Navidad: una mensualidad cada una, prorrateables por acuerdo.</li>
                          <li>Paga de marzo (ligada a resultados): al menos una mensualidad anual; liquidación en el primer trimestre del ejercicio siguiente o prorrateo mensual.</li>
                      </ul>
                      <h5>8.3 Pluses</h5>
                      <ul>
                          <li>Plus de transporte por día de trabajo/presencia (según valores vigentes).</li>
                          <li>Plus de ropa/calzado mensual cuando sea obligatorio (o suministro por la empresa).</li>
                          <li>Plus salarial de fidelidad (mayores de 61 años con ≥15 años de antigüedad, en los términos establecidos): no compensable/absorbible, con tope de percepción hasta los 66 años.</li>
                          <li>Quebranto de moneda (personal de caja y cobros externos) según porcentaje vigente.</li>
                      </ul>
                      <h5>8.4 Seguros y premios</h5>
                      <ul>
                          <li>Seguro por invalidez o muerte: 16.500 € (según condiciones vigentes).</li>
                          <li>Premio de jubilación anticipada: escala económica según años de anticipo cuando esté regulada.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-9">
                    <AccordionTrigger>9. PROMOCIÓN PROFESIONAL Y DESCONEXIÓN DIGITAL</AccordionTrigger>
                    <AccordionContent>
                      <ul>
                        <li>Ascensos automáticos por permanencia efectiva en categoría (p. ej., ayudante → dependiente 2.ª; dependiente 2.ª → 1.ª; 1.ª → mayor).</li>
                        <li>Desconexión digital: respeto del tiempo de descanso, vacaciones y conciliación; no contestar comunicaciones fuera de jornada no conlleva perjuicio.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-10">
                    <AccordionTrigger>10. PARENTESCO Y GRADOS (APLICACIÓN EN PERMISOS)</AccordionTrigger>
                    <AccordionContent>
                      <h5>10.1 Consanguinidad</h5>
                      <ul>
                        <li>1.º grado: padre/madre, hijo/a.</li>
                        <li>2.º grado: abuelo/a, nieto/a, hermano/a.</li>
                        <li>3.º grado: tío/a, sobrino/a (y bisabuelos/as, bisnietos/as).</li>
                        <li>4.º grado: primos/as.</li>
                      </ul>
                      <h5>10.2 Afinidad (matrimonio o pareja registrada)</h5>
                      <ul>
                        <li>1.º grado: suegro/a, yerno/nuera, hijastro/a, padrastro/madrastra.</li>
                        <li>2.º grado: cuñado/a, abuelos/as y nietos/as del cónyuge o pareja.</li>
                      </ul>
                      <h5>10.3 Aplicación práctica</h5>
                      <p>Los permisos retribuidos por fallecimiento, enfermedad grave u hospitalización se reconocen hasta 2.º grado; para 3.º grado caben licencias no retribuidas o ajustes organizativos.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-11">
                    <AccordionTrigger>11. GESTIÓN DE LA MADUREZ, ANTIGÜEDAD Y RECONOCIMIENTOS</AccordionTrigger>
                    <AccordionContent>
                      <h5>11.1 Reducción anual de jornada por edad (desde 2025; proporcional a contrato)</h5>
                      <ul>
                        <li>Derecho a una bolsa anual de horas a partir de los 55 años, con disfrute desde el año en que se cumplen 10 años de antigüedad.</li>
                        <li>Tabla oficial de horas de Madurez:</li>
                      </ul>
                      <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Edad</TableHead>
                                      <TableHead>Jornada ≥ 20 h/sem</TableHead>
                                      <TableHead>Jornada &lt; 20 h/sem</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  <TableRow><TableCell>55</TableCell><TableCell>60 h</TableCell><TableCell>30 h</TableCell></TableRow>
                                  <TableRow><TableCell>56</TableCell><TableCell>76 h</TableCell><TableCell>38 h</TableCell></TableRow>
                                  <TableRow><TableCell>57</TableCell><TableCell>92 h</TableCell><TableCell>46 h</TableCell></TableRow>
                                  <TableRow><TableCell>58</TableCell><TableCell>108 h</TableCell><TableCell>54 h</TableCell></TableRow>
                                  <TableRow><TableCell>59</TableCell><TableCell>124 h</TableCell><TableCell>62 h</TableCell></TableRow>
                                  <TableRow><TableCell>60</TableCell><TableCell>156 h</TableCell><TableCell>78 h</TableCell></TableRow>
                                  <TableRow><TableCell>61</TableCell><TableCell>172 h</TableCell><TableCell>86 h</TableCell></TableRow>
                                  <TableRow><TableCell>62</TableCell><TableCell>188 h</TableCell><TableCell>94 h</TableCell></TableRow>
                                  <TableRow><TableCell>63</TableCell><TableCell>204 h</TableCell><TableCell>102 h</TableCell></TableRow>
                                  <TableRow><TableCell>64</TableCell><TableCell>220 h</TableCell><TableCell>110 h</TableCell></TableRow>
                                  <TableRow><TableCell>65</TableCell><TableCell>252 h</TableCell><TableCell>126 h</TableCell></TableRow>
                                  <TableRow><TableCell>66</TableCell><TableCell>268 h</TableCell><TableCell>134 h</TableCell></TableRow>
                                  <TableRow><TableCell>67</TableCell><TableCell>284 h</TableCell><TableCell>142 h</TableCell></TableRow>
                              </TableBody>
                          </Table>
                      </div>
                      <p>Criterios de uso: planificación anual con el centro; prioridad a la continuidad del servicio; posibilidad de agrupar horas por acuerdo operativo.</p>

                      <h5>11.2 Antigüedad reconocida</h5>
                      <ul>
                        <li>Se reconoce antigüedad en excedencias con reserva de puesto.</li>
                        <li>Se reconoce en concatenación de contratos de la misma cadena cuando la interrupción no supere 6 meses y 1 día.</li>
                      </ul>
                      <h5>11.3 Premios de vinculación y garantía anual (proporcional a jornada)</h5>
                      <ul>
                          <li>25 años: 1.500 € en un único pago.</li>
                          <li>30 años: tarjeta regalo de 500 € (gestión por código QR en INET o alternativa física).</li>
                          <li>Garantía anual de vinculación por tramos orientativos:
                            <ul>
                              <li>8–11 años → 850 €</li>
                              <li>12–15 años → 1.000 €</li>
                              <li>16–19 años → 1.200 €</li>
                              <li>≥20 años → 1.400 €</li>
                            </ul>
                          </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-12">
                    <AccordionTrigger>12. AYUDAS SOCIALES Y BIENESTAR (VÍA INET · AUTOSERVICIO)</AccordionTrigger>
                    <AccordionContent>
                       <ul>
                          <li>Material escolar (enseñanza obligatoria): 200 € brutos anuales por hijo/a.</li>
                          <li>Matrícula universitaria o FP Grado Superior (hijos/as): hasta 500 € brutos anuales.</li>
                          <li>Guardería (incluye comedor): hasta 170 € brutos mensuales por hijo/a.</li>
                          <li>Formación interna continua y planes de recualificación (incluye itinerarios 50+).</li>
                          <li>Bono de fisioterapia 50+: 10 sesiones/año de 50 min con copago de 20 €/sesión y el resto a cargo de la empresa (vinculado a reconocimiento médico).</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-13">
                    <AccordionTrigger>13. PROCEDIMIENTOS Y CANALES (INET)</AccordionTrigger>
                    <AccordionContent>
                      <p>INET → Área Personal → Autoservicio del Empleado</p>
                      <ul>
                        <li>Jornada: adaptaciones, reducciones, solicitudes por estudios, tratamientos médicos, dependientes.</li>
                        <li>Permisos retribuidos: solicitudes y justificantes.</li>
                        <li>Excedencias: registro y gestión (incluida excedencia por estudios con reserva).</li>
                        <li>Ayudas/anticipos: material escolar, guardería, matrícula y otras ayudas.</li>
                        <li>Nómina: consulta Mi Comisión, Nómina Express y certificados.</li>
                        <li>Premios 30 años: activación de código QR individual; alternativa física cuando no haya acceso a INET.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-14">
                    <AccordionTrigger>14. RESUMEN OPERATIVO</AccordionTrigger>
                    <AccordionContent>
                       <ul>
                          <li><strong>Horas médicas:</strong> 20 h/año retribuidas (Plan) + 10 h extra para familias monoparentales; además, por Convenio, 12 h/año propias/menores&lt;16/ascendiente 1.º dependiente y 24 h/año para crónicos/raras hasta 2.º grado.</li>
                          <li><strong>Vacaciones:</strong> 31 días; 21 en verano y 10 el resto; inicio en lunes; IT o permisos interrumpen y reprograman.</li>
                          <li><strong>Asuntos propios:</strong> 2 días al año; uno fraccionable.</li>
                          <li><strong>Festivos trabajados:</strong> pago simple 96 € + devolución de horas trabajadas; o pago doble 192 € sin devolución de horas.</li>
                          <li><strong>Nocturnidad:</strong> +25 %. Jornadas especiales: voluntarias y a salario/hora superior.</li>
                          <li><strong>Pagas:</strong> julio, Navidad y paga de marzo mínima de una mensualidad.</li>
                          <li><strong>Pluses:</strong> transporte por día, ropa/calzado mensual, fidelidad y quebranto de moneda según condiciones vigentes.</li>
                          <li><strong>Madurez y antigüedad:</strong> tabla completa de horas desde 55 años, premios 25 y 30, garantía anual por tramos.</li>
                          <li><strong>Excedencias con reserva:</strong> cuidado de hijos (hasta 3 años), estudios (hasta 1 año), trámites internacionales cuando proceda (hasta 4 meses).</li>
                          <li><strong>Promoción:</strong> ascensos por permanencia; desconexión digital garantizada.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
