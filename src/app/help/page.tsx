
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { User, Wallet, Gift, Briefcase, Scale, HelpCircle, FileQuestion, PlaneTakeoff, MessageSquareWarning, Smartphone, Info, CalendarClock, Hourglass, BookUser, Users2, FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import { BookUser as AdminGuideIcon, LayoutDashboard, CalendarDays, Users as AdminUsersIcon, UserSquare, ListChecks, Plane, Settings2 } from 'lucide-react';


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

const SectionTitle = ({ number, title }: { number: number, title: string }) => (
    <h3 className="text-xl font-bold tracking-tight font-headline pt-6 pb-2 border-b">{number}) {title}</h3>
);

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col items-center text-center gap-2 mb-6">
        <HelpCircle className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Centro de Ayuda
        </h1>
        <p className="text-lg text-muted-foreground">
          Encuentra respuestas a las preguntas más comunes y guías de uso.
        </p>
      </div>
      
      <Tabs defaultValue="employee-guide" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="employee-guide">
                  <Users2 className="mr-2 h-4 w-4" />
                  Guía para Empleados
              </TabsTrigger>
               <TabsTrigger value="convenio-guide">
                  <FileText className="mr-2 h-4 w-4" />
                  Convenio y Normativa
              </TabsTrigger>
              <TabsTrigger value="admin-guide">
                  <AdminGuideIcon className="mr-2 h-4 w-4" />
                  Guía para Administradores
              </TabsTrigger>
          </TabsList>
          
          <TabsContent value="employee-guide" className="pt-6">
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <span>Mi Información: Entender mis datos</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                    <p className="text-muted-foreground">
                    La sección "Mi Ficha" es tu panel de control personal. Aquí te explicamos qué significa cada dato:
                    </p>
                    <div className="space-y-2 pl-4">
                    <div className="flex items-start gap-3">
                        <Scale className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">Balance Total</h4>
                        <p className="text-sm text-muted-foreground">Es la suma de todas tus bolsas de horas. Un valor positivo significa que la empresa te debe horas; un valor negativo significa que debes horas a la empresa.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">Bolsa Ordinaria</h4>
                        <p className="text-sm text-muted-foreground">Acumula la diferencia entre las horas que trabajas cada semana y las que te corresponden por contrato.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Gift className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">Bolsa de Festivos</h4>
                        <p className="text-sm text-muted-foreground">Suma horas cuando trabajas en un festivo de apertura y no se te paga como "pago doble".</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Wallet className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">Bolsa de Libranza</h4>
                        <p className="text-sm text-muted-foreground">Suma horas cuando tu día de descanso coincide con un festivo en el que te tocaba trabajar.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <PlaneTakeoff className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">Cálculo de Vacaciones</h4>
                        <p className="text-sm text-muted-foreground">Para ver el desglose exacto de tus días de vacaciones disponibles (días del año, días arrastrados, descuentos, etc.), simplemente <strong className="text-primary">haz clic en la tarjeta de Vacaciones</strong> en tu ficha.</p>
                        </div>
                    </div>
                    </div>
                </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-3">
                    <FileQuestion className="h-5 w-5 text-primary" />
                    <span>Realizar Solicitudes</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <MessageSquareWarning className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">¿Cómo comunico una incidencia en mis horas? (Corrección)</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                            Si crees que hay un error en una semana ya confirmada, debes usar la herramienta específica para ello.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Ve a la sección <Badge variant="outline">Mis Presencias</Badge>.</li>
                            <li>Busca la semana que contiene el error y pulsa el botón <Badge variant="secondary">Solicitar Corrección</Badge>.</li>
                            <li>En la ventana que aparece, explica detalladamente la incidencia y pulsa "Enviar Solicitud".</li>
                            <li>Tu petición será enviada al administrador y quedará registrada en el chat para su seguimiento.</li>
                        </ol>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <PlaneTakeoff className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">¿Cómo solicito mis vacaciones o ausencias largas?</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                            Las vacaciones y otros permisos largos se solicitan durante "campañas" o periodos específicos que abre la empresa.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Cuando se abra un periodo, verás un aviso especial en la página <Badge variant="outline">Mis Mensajes</Badge>.</li>
                            <li>Pulsa el botón <Badge variant="secondary">Hacer Solicitud</Badge> que aparecerá en esa pantalla.</li>
                            <li>Sigue los pasos: elige el tipo de ausencia (Vacaciones, Excedencia, etc.) y selecciona los rangos de fechas que deseas.</li>
                            <li>Confirma tu solicitud. Quedará guardada y enviada para su revisión.</li>
                        </ol>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <CalendarClock className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                        <h4 className="font-semibold">¿Cómo registro permisos cortos (Asuntos Propios, Horas Médicas, etc.)?</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                            Para registrar un permiso de corta duración que ya has comunicado verbalmente a la dirección, utiliza la función de "Solicitudes".
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Ve a la página <Badge variant="outline">Mis Mensajes</Badge>.</li>
                            <li>Pulsa el botón <Badge variant="secondary">Solicitudes</Badge> en la esquina superior derecha.</li>
                            <li>**Importante:** Primero, confirma a quién de la dirección se lo has comunicado verbalmente.</li>
                            <li>Selecciona el tipo de permiso (Asuntos Propios, Horas Médicas, etc.).</li>
                            <li>Elige el/los día(s) en el calendario.</li>
                            <li>Añade el motivo o justificación (y la hora si es una consulta médica).</li>
                            <li>Envía la solicitud para que quede registrada formalmente.</li>
                        </ol>
                        </div>
                    </div>
                    </div>
                </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-senior">
                <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-3">
                    <Hourglass className="h-5 w-5 text-primary" />
                    <span>Reducción de Jornada Senior (Gestión de la Madurez)</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                    <p className="text-muted-foreground">
                    Según el "Acuerdo Gestión de la Madurez" del Grupo Inditex, los empleados a partir de los 55 años tienen derecho a un banco de horas anuales para reducir su jornada. Las horas disponibles varían según la edad y el tipo de jornada contratada.
                    </p>
                    <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold">EDAD</TableHead>
                            <TableHead className="font-bold text-center">IGUAL Y SUPERIOR A 20 HORAS DE JORNADA</TableHead>
                            <TableHead className="font-bold text-center">MENOS DE 20 HORAS DE JORNADA</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        <TableRow><TableCell>55 años</TableCell><TableCell className="text-center">60 h</TableCell><TableCell className="text-center">30 h</TableCell></TableRow>
                        <TableRow><TableCell>56 años</TableCell><TableCell className="text-center">76 h</TableCell><TableCell className="text-center">38 h</TableCell></TableRow>
                        <TableRow><TableCell>57 años</TableCell><TableCell className="text-center">92 h</TableCell><TableCell className="text-center">46 h</TableCell></TableRow>
                        <TableRow><TableCell>58 años</TableCell><TableCell className="text-center">108 h</TableCell><TableCell className="text-center">54 h</TableCell></TableRow>
                        <TableRow><TableCell>59 años</TableCell><TableCell className="text-center">124 h</TableCell><TableCell className="text-center">62 h</TableCell></TableRow>
                        <TableRow><TableCell>60 años</TableCell><TableCell className="text-center">156 h</TableCell><TableCell className="text-center">78 h</TableCell></TableRow>
                        <TableRow><TableCell>61 años</TableCell><TableCell className="text-center">172 h</TableCell><TableCell className="text-center">86 h</TableCell></TableRow>
                        <TableRow><TableCell>62 años</TableCell><TableCell className="text-center">188 h</TableCell><TableCell className="text-center">94 h</TableCell></TableRow>
                        <TableRow><TableCell>63 años</TableCell><TableCell className="text-center">204 h</TableCell><TableCell className="text-center">102 h</TableCell></TableRow>
                        <TableRow><TableCell>64 años</TableCell><TableCell className="text-center">220 h</TableCell><TableCell className="text-center">110 h</TableCell></TableRow>
                        <TableRow><TableCell>65 años</TableCell><TableCell className="text-center">252 h</TableCell><TableCell className="text-center">126 h</TableCell></TableRow>
                        <TableRow><TableCell>66 años</TableCell><TableCell className="text-center">268 h</TableCell><TableCell className="text-center">134 h</TableCell></TableRow>
                        <TableRow><TableCell>67 años</TableCell><TableCell className="text-center">284 h</TableCell><TableCell className="text-center">142 h</TableCell></TableRow>
                        </TableBody>
                    </Table>
                    </div>
                    <p className="text-sm text-muted-foreground">
                    Puedes solicitar estas horas a través del formulario de "Solicitudes" en la página de "Mis Mensajes", seleccionando el tipo de ausencia "Reducción Jornada Senior".
                    </p>
                </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-primary" />
                    <span>Consejos y Notas Importantes</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                    <Alert>
                    <FileQuestion className="h-4 w-4" />
                    <AlertTitle>Cómputo en Semanas de Vacaciones</AlertTitle>
                    <AlertDescription>
                        <strong className="font-semibold text-foreground">Nota aclaratoria:</strong> si un periodo de vacaciones no completa una semana laboral entera, el sistema podrá utilizar horas de cualquiera de tus bolsas de devolución (Libranza, Festivos) para completar las horas que faltan, siempre y cuando tengas un saldo de horas a tu favor.
                    </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
                        <CardHeader>
                        <div className="flex items-center gap-3">
                            <Smartphone className="h-5 w-5" />
                            <h4 className="font-semibold">Añadir a Pantalla de Inicio (iOS)</h4>
                        </div>
                        </CardHeader>
                        <CardContent>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Abre la app en <strong>Safari</strong>.</li>
                            <li>Pulsa el botón de <strong>Compartir</strong> (un cuadrado con una flecha).</li>
                            <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
                        </ol>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
                        <CardHeader>
                        <div className="flex items-center gap-3">
                            <Smartphone className="h-5 w-5" />
                            <h4 className="font-semibold">Añadir a Pantalla de Inicio (Android)</h4>
                        </div>
                        </CardHeader>
                        <CardContent>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Abre la app en <strong>Chrome</strong>.</li>
                            <li>Pulsa el <strong>menú de los tres puntos</strong> (⋮).</li>
                            <li>Selecciona <strong>"Instalar aplicación"</strong>.</li>
                        </ol>
                        </CardContent>
                    </Card>
                    </div>
                </AccordionContent>
                </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="convenio-guide" className="pt-6 prose dark:prose-invert max-w-full">
            <div className="space-y-6">
                <SectionTitle number={1} title="Marco de aplicación y criterio de prevalencia" />
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Orden de referencia práctica</strong>: Estatuto de los Trabajadores (mínimos), <strong>Plan de Igualdad Grupo Inditex</strong> (ámbito estatal y mejoras), <strong>Convenio Comercio Textil Zaragoza</strong> y pactos internos más favorables. En conflicto, aplica la <strong>condición más beneficiosa</strong> para la persona trabajadora.</li>
                    <li>Este dosier ya incorpora esa prevalencia: donde el Plan de Igualdad mejora al Convenio, <strong>se aplica la mejora del Plan</strong>.</li>
                </ul>

                <SectionTitle number={2} title="Jornada, pausas, descansos y calendario" />
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

                <SectionTitle number={3} title="Vacaciones" />
                <p><strong>31 días naturales</strong>, en <strong>dos periodos</strong>: 21 días entre junio-septiembre y 10 días en otra época pactada. Inician en <strong>lunes</strong> salvo acuerdo distinto. <strong>Turno rotativo</strong> de elección; matrimonio en la empresa: <strong>coincidencia de vacaciones</strong>. No comienzan en domingos/festivos/descanso semanal. IT que impida disfrutarlas: <strong>se posponen</strong>.</p>
                
                <SectionTitle number={4} title="Asuntos propios" />
                <p><strong>2 días al año</strong>, <strong>no computan contra la jornada anual</strong>. Uno puede <strong>fraccionarse en dos medias jornadas</strong> de mutuo acuerdo.</p>

                <SectionTitle number={5} title="Permisos retribuidos del Convenio (y mejoras del Plan)" />
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

                <SectionTitle number={6} title="Excedencias y reducciones" />
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Cuidado de hijos</strong>: <strong>Excedencia</strong> hasta <strong>3 años</strong> por cada hijo (nacimiento, adopción o acogimiento). Reincorporación automática al finalizar; solicita con 1 mes de antelación.</li>
                    <li><strong>Excedencia especial por duelo familiar</strong>: Por <strong>fallecimiento de familiar hasta 2º grado</strong>: hasta <strong>4 semanas</strong>, con <strong>reserva de puesto</strong>.</li>
                    <li><strong>Excedencia por estudios (Plan)</strong>: Hasta <strong>1 año con reserva</strong> si es <strong>formación oficial</strong>, con requisitos de asistencia y sin actividad laboral en el periodo.</li>
                    <li><strong>Reducciones y adaptaciones</strong>: Se mantienen las de ET (guarda legal, cuidados, etc.). El Plan incluye <strong>medidas de adaptación de jornada y eliminación del turno partido</strong> cuando sea viable.</li>
                </ul>

                <SectionTitle number={7} title="Trabajo en domingos/festivos, nocturnidad y jornadas especiales" />
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Domingos y festivos autorizados</strong>: <strong>Recargo +75%</strong> del día trabajado. Límite: en centros > 5 personas y salvo contratos diseñados para ello, <strong>no obligados a más del 50%</strong> de aperturas anuales.</li>
                    <li><strong>Domingo/festivo no habilitado</strong>: <strong>+150%</strong>.</li>
                    <li><strong>Nocturnidad</strong>: Entre 22:00 y 06:00, <strong>+25%</strong> del salario hora.</li>
                    <li><strong>Jornadas especiales</strong>: Black Friday, víspera de Reyes, remontajes… <strong>voluntarias</strong> y con <strong>salario/hora superior</strong> al del convenio, a pactar previamente.</li>
                </ul>

                <SectionTitle number={8} title="Retribución: tablas, pluses y pagas" />
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Tablas salariales</strong>: 2023: +2,5% sobre 2022; 2024: +2% sobre 2023. Tablas completas por grupos y categorías en anexos del Convenio.</li>
                    <li><strong>Pagas extraordinarias</strong>: <strong>Julio y Navidad</strong>: una mensualidad según tablas, más ad personam si procede; prorrateables por acuerdo.</li>
                    <li><strong>Paga de marzo (antigua de beneficios)</strong>: la empresa debe abonar <strong>al menos una mensualidad</strong> anual ligada a ventas/beneficios; liquidación cada primer trimestre del ejercicio siguiente o prorrateo.</li>
                    <li><strong>Pluses</strong>: <strong>Transporte</strong> por día trabajado y <strong>Ropa de trabajo</strong> mensual; importes en anexos (p. ej., 2024: transporte 3,64 €/día; ropa 24,85 €/mes).</li>
                    <li><strong>Plus salarial de fidelidad</strong> (mayores de 61 años con ≥15 años de antigüedad, condicionado): mensual, no compensable/absorbible, con tope hasta los 66 años.</li>
                    <li><strong>Premios y seguros</strong>: <strong>Premio jubilación</strong> por años de anticipo respecto a edad legal, con escala económica (referencias en anexos).</li>
                    <li><strong>Seguro</strong> por invalidez o muerte: 16.500 €.</li>
                </ul>

                <SectionTitle number={9} title="Promoción profesional y desconexión digital" />
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Ascensos automáticos por permanencia efectiva</strong> en categoría (ayudante → dependiente 2ª en 2 años; dependiente 2ª → 1ª en 3; 1ª → mayor en 5; etc.).</li>
                    <li><strong>Desconexión digital</strong>: el convenio faculta protocolos para garantizarla (art. 20 bis ET).</li>
                </ul>

                <SectionTitle number={10} title="Definiciones útiles: parentesco y grados" />
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Consanguinidad</strong>: relación por sangre. Grados: 1º: madre/padre, hijo/a. 2º: abuelo/a, nieto/a, hermano/a. 3º: bisabuelo/a, bisnieto/a, tío/a-sobrino/a. 4º: primos/as.</li>
                    <li><strong>Afinidad</strong>: por matrimonio o pareja de hecho respecto de la familia del cónyuge/pareja. Grados análogos: suegro/a, yerno/nuera (1º); cuñado/a, abuelo/a político/a (2º), etc.</li>
                    <li>Salvo mejora, <strong>los permisos del convenio referidos a grados</strong> se computan con estas reglas.</li>
                </ul>

                <SectionTitle number={11} title="Medidas del Plan de Igualdad que debes tener presentes (prevalecen)" />
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Jornada y organización</strong>: <strong>Calendario anual</strong> con 2 meses de antelación y cambios con 15 días salvo causa justificada; prioridad jornada continuada; medidas para <strong>reducir parcialidad no deseada</strong> y fijar <strong>mínimos de horas</strong> en parciales (definición vía Comisión de Seguimiento).</li>
                    <li><strong>Conciliación reforzada</strong>: Todo el bloque de <strong>horas médicas</strong> y acompañamientos descrito en el punto 5 (20 h/año, etc.) <strong>es del Plan</strong> y se aplica en todo el territorio.</li>
                    <li><strong>Excedencia por estudios</strong> con <strong>reserva</strong> (hasta 1 año) en condiciones del Plan.</li>
                </ul>

                <SectionTitle number={12} title="Beneficios y acuerdos comunicados por CCOO/empresa (2024-2025)" />
                <p className="text-muted-foreground">Nota: este bloque recoge <strong>acuerdos y comunicaciones</strong> corporativas de ámbito Inditex que has aportado. Cuando son mejoras ya activas, las he tratado como derecho; cuando están <strong>en negociación</strong>, quedan señaladas como tal.</p>
                <div className="space-y-4">
                    <h4 className="font-bold">Gestión de la Madurez (acuerdo estatal de homologación)</h4>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Premios de vinculación</strong>:
                            <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li><strong>25 años</strong>: <strong>1.500 €</strong> en un único pago.</li>
                                <li><strong>30 años</strong>: <strong>tarjeta regalo 500 €</strong> (vía INET con <strong>código QR</strong> individual; si no hay INET por reserva/suspenso, se facilitará <strong>tarjeta física</strong> por canales alternativos).</li>
                            </ul>
                        </li>
                        <li><strong>Garantía mínima de vinculación anual (proporcional a jornada)</strong>:
                             <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li>8-11 años: <strong>850 €</strong>; 12-15: <strong>1.000 €</strong>; 16-19: <strong>1.200 €</strong>; <strong>≥20</strong>: <strong>1.400 €</strong>.</li>
                             </ul>
                        </li>
                        <li><strong>Reducción de jornada por edad</strong>: implantación <strong>a partir de 2025</strong>, con disfrute el año en que se <strong>cumplan 10 años de antigüedad</strong> (configuración detallada por tramos en las comunicaciones sindicales).</li>
                        <li><strong>Abonos</strong>: se ha comunicado que <strong>en nómina de agosto</strong> se refleja antigüedad y premio de vinculación; <strong>atrasos desde 1 de abril</strong> en <strong>septiembre</strong>.</li>
                        <li><strong>Reconocimiento de antigüedad</strong>:
                             <ul className="list-['-_'] list-inside ml-4 mt-1">
                                <li>En concatenación de <strong>temporales</strong> de la misma cadena, computa a efectos de vinculación si no hay interrupción > <strong>6 meses + 1 día</strong>; abono de pendientes en octubre.</li>
                                <li><strong>Excedencias con reserva</strong> (Plan/Convenio): <strong>se reconoce la antigüedad</strong> a efectos de estos premios.</li>
                                <li>Situaciones con <strong>reserva de puesto</strong> sin nómina previa a abril 2024: pago de atrasos y premio si corresponde, en la primera semana de octubre.</li>
                                <li>Personas con <strong>30 años</strong>: activación del <strong>QR de 500 €</strong> a las 12:00 h del día comunicado por INET.</li>
                             </ul>
                        </li>
                    </ul>
                     <h4 className="font-bold">Trabajo en sábado tarde y comisiones: en negociación</h4>
                    <p>Se han planteado mejoras de <strong>comisión</strong> en sábados tarde, Black Friday y días de alta venta; y <strong>subida del incentivo de dependientas</strong> (ej.: 600→900 € en &lt;24 h/sem y 1.000→1.500 € en ≥24 h/sem), así como actualizar objetivos 2025. A la fecha de las piezas remitidas, <strong>las cifras exactas estaban en mesa</strong> (no cerradas).</p>
                    <h4 className="font-bold">App/visibilidad de comisiones</h4>
                    <p>Comunicación de empresa: desarrollo de <strong>app</strong> para que plantilla vea el <strong>desglose diario de comisiones</strong>; fase de pruebas y despliegue comunicado.</p>
                     <h4 className="font-bold">Permisos elecciones</h4>
                    <p>En jornadas electorales europeas se difundieron <strong>horas retribuidas</strong> según coincidencia de horarios. Aplica la normativa autonómica de cada proceso, con el <strong>deber público retribuido</strong> ya cubierto por el Convenio.</p>
                </div>
                
                 <SectionTitle number={13} title="Ruta práctica en INET (autoservicio)" />
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Área Personal → Autoservicio del Empleado → Jornada / Permisos retribuidos / Excedencias</strong>.</li>
                    <li>Formularios activos (según las piezas que enviaste): <strong>necesidades de formación; adaptación de jornada por dependientes o discapacidad a cargo; adaptación por estudios; adaptación por hospitalización o tratamiento médico de cónyuge/pareja/hijos; extensión de reducción de jornada</strong> hasta fecha indicada.</li>
                    <li>Para el <strong>premio 30 años</strong>, se activa <strong>QR individual</strong> en INET; si estás en reserva y sin INET, la empresa comunica alternativa física.</li>
                </ul>

                 <SectionTitle number={14} title="Resumen “qué me llevo puesto”" />
                 <ol className="list-decimal list-inside space-y-2">
                    <li><strong>Horas médicas</strong>: tienes <strong>20 h/año retribuidas</strong> (propias, menores a cargo y 1º grado) + <strong>10 h extra</strong> si familia monoparental; además, por Convenio, <strong>12 h/año</strong> propias/menores&lt;16/ascendiente 1º grado dependiente y <strong>24 h/año</strong> para crónicos/raras hasta 2º grado. Usa siempre la <strong>mejor combinación</strong> (Plan + Convenio).</li>
                    <li><strong>Vacaciones</strong>: 31 días, 21 en verano y 10 resto, en lunes, con turnos rotativos y reglas de coincidencia y no inicio en festivo.</li>
                    <li><strong>Asuntos propios</strong>: 2 días y <strong>no afectan</strong> a la jornada anual; 1 día fraccionable.</li>
                    <li><strong>Domingos/festivos</strong>: +75% (autorizados) y límite del 50% de aperturas obligatorias; <strong>no habilitados</strong> +150%.</li>
                    <li><strong>Pausas retribuidas</strong> ampliadas por el Plan (hasta 30 min según duración).</li>
                    <li><strong>Pagas</strong>: julio, Navidad y <strong>paga de marzo</strong> mínima de <strong>una mensualidad</strong> ligada a ventas/beneficios.</li>
                    <li><strong>Pluses</strong>: transporte por día, ropa de trabajo mensual y <strong>plus de fidelidad</strong> (condicionado).</li>
                    <li><strong>Premios de vinculación</strong> (25 y 30 años), <strong>garantía mínima anual por tramos de antigüedad</strong> y <strong>reducción de jornada por edad</strong>: activados a partir de los acuerdos estatales comunicados (bloque Madurez).</li>
                    <li><strong>Excedencias con reserva</strong>: cuidado de hijos (hasta 3 años), estudios (Plan, hasta 1 año), adopción internacional/reagrupación (hasta 4 meses).</li>
                    <li><strong>Promoción</strong> por permanencia efectiva en categoría; <strong>desconexión digital</strong> con protocolo.</li>
                </ol>

                <h4 className="font-bold pt-6">Notas finales de uso</h4>
                <ul className="list-disc list-inside space-y-2">
                    <li>Guarda justificantes y <strong>avisa siempre</strong> con la antelación exigida (7 días en flexibilización, 15 días en cambios de calendario del Plan).</li>
                    <li>En <strong>permisos fraccionables</strong> por hospitalización/enfermedad grave, el Convenio permite <strong>disfrute en medios días</strong> durante la duración del hecho causante.</li>
                    <li>Si algo no te encaja en tienda, este dosier te da base para exigir la <strong>opción más favorable</strong>.</li>
                </ul>

            </div>
          </TabsContent>

          <TabsContent value="admin-guide" className="pt-6">
            <Accordion type="single" collapsible className="w-full">
                <AdminGuideItem icon={LayoutDashboard} title="Panel de Control">
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

                <AdminGuideItem icon={CalendarDays} title="Registro Horario">
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
                
                <AdminGuideItem icon={AdminUsersIcon} title="Empleados">
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

                <AdminGuideItem icon={UserSquare} title="Ficha de Empleado">
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

                <AdminGuideItem icon={ListChecks} title="Formularios Personalizados">
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

                <AdminGuideItem icon={Plane} title="Programador de Vacaciones">
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
                
                <AdminGuideItem icon={Settings2} title="Ajustes">
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
          </TabsContent>
      </Tabs>
    </div>
  );

    