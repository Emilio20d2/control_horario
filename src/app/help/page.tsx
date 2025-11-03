
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { User, Wallet, Gift, Briefcase, Scale, HelpCircle, FileQuestion, PlaneTakeoff, MessageSquareWarning, Smartphone, Info, CalendarClock, Hourglass, BookUser, Users2 } from 'lucide-react';
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
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee-guide">
                  <Users2 className="mr-2 h-4 w-4" />
                  Guía para Empleados
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
}
