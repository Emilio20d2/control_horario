
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { User, Wallet, Gift, Briefcase, Scale, HelpCircle, FileQuestion, PlaneTakeoff, MessageSquareWarning, Smartphone, Info, CalendarClock, Hourglass } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from 'next/image';

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center text-center gap-2 mb-6">
        <HelpCircle className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Guía para Empleados
        </h1>
        <p className="text-lg text-muted-foreground">
          Encuentra respuestas a las preguntas más comunes.
        </p>
      </div>

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
                La sección «Mi Ficha» es tu panel de control personal. Aquí te explicamos qué significa cada dato:
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
                    <p className="text-sm text-muted-foreground">Suma horas cuando trabajas en un festivo de apertura y no se te paga como «pago doble».</p>
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
                        <li>En la ventana que aparece, explica detalladamente la incidencia y pulsa «Enviar Solicitud».</li>
                        <li>Tu petición será enviada al administrador y quedará registrada en el chat para su seguimiento.</li>
                    </ol>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <PlaneTakeoff className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div>
                    <h4 className="font-semibold">¿Cómo solicito mis vacaciones o ausencias largas?</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                        Las vacaciones y otros permisos largos se solicitan durante «campañas» o periodos específicos que abre la empresa.
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
                        Para registrar un permiso de corta duración que ya has comunicado verbalmente a la dirección, utiliza la función de «Solicitudes».
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
                Según el «Acuerdo Gestión de la Madurez» del Grupo Inditex, los empleados a partir de los 55 años tienen derecho a un banco de horas anuales para reducir su jornada. Las horas disponibles varían según la edad y el tipo de jornada contratada.
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
                Puedes solicitar estas horas a través del formulario de «Solicitudes» en la página de «Mis Mensajes», seleccionando el tipo de ausencia «Reducción Jornada Senior».
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
                        <li>Selecciona <strong>«Añadir a pantalla de inicio»</strong>.</li>
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
                        <li>Selecciona <strong>«Instalar aplicación»</strong>.</li>
                    </ol>
                    </CardContent>
                </Card>
                </div>
            </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
}

    