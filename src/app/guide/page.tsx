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
          <TabsTrigger value="admin-manual">Manual de Usuario (Admin)</TabsTrigger>
          <TabsTrigger value="agreement">Convenio y Normativa</TabsTrigger>
        </TabsList>
        <TabsContent value="admin-manual">
          <Card>
            <CardHeader>
              <CardTitle>Guía para Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AdminGuideItem title="Inicio">
                  <p>
                    Es la primera página que ves al iniciar sesión y actúa como un centro de notificaciones y tareas pendientes.
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Semanas Pendientes</strong>: Muestra la semana más antigua que tiene empleados sin confirmar.</li>
                    <li><strong>Mensajes Sin Leer</strong>: Presenta una lista de las últimas conversaciones con mensajes de empleados que aún no has leído.</li>
                    <li><strong>Próximos Eventos</strong>: Ofrece una vista rápida de las próximas ausencias programadas.</li>
                  </ul>
                </AdminGuideItem>
                <AdminGuideItem title="Panel de Control">
                   <p>Centro de operaciones para la generación de informes en PDF.</p>
                   <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Informes por Empleado</strong>: Resumen Anual, Jornada Anual y Ausencias.</li>
                    <li><strong>Informe de Festivos</strong>: Planificación de quién trabajará en festivos.</li>
                    <li><strong>Informes Generales (Semanales)</strong>: Horas complementarias y estado de balances.</li>
                   </ul>
                </AdminGuideItem>
                <AdminGuideItem title="Registro Horario">
                  <p>La herramienta principal para la gestión diaria. Permite introducir horas, ausencias y ver el impacto en tiempo real en las bolsas de horas antes de confirmar.</p>
                </AdminGuideItem>
                <AdminGuideItem title="Empleados">
                  <p>Centro de gestión de la plantilla. Permite ver empleados activos e inactivos, y crear o editar sus fichas, incluyendo datos personales, de contrato y calendario laboral.</p>
                </AdminGuideItem>
                 <AdminGuideItem title="Ficha de Empleado">
                  <p>Visión de 360 grados de un trabajador, mostrando balances, vacaciones, datos del contrato, cómputo anual y gestión de ausencias programadas.</p>
                </AdminGuideItem>
                <AdminGuideItem title="Formularios Personalizados">
                  <p>Herramienta para crear PDFs a medida, como listados para entrega de material o informes con datos personales específicos de la plantilla.</p>
                </AdminGuideItem>
                <AdminGuideItem title="Programador de Vacaciones">
                    <p>Vista de cuadrante anual para la planificación de ausencias largas, permitiendo identificar solapamientos.</p>
                </AdminGuideItem>
                <AdminGuideItem title="Calendario">
                  <p>Visión global de todas las ausencias programadas en el sistema, con vistas semanales o mensuales.</p>
                </AdminGuideItem>
                <AdminGuideItem title="Mensajes">
                  <p>Canal de comunicación centralizado con los empleados para gestionar incidencias y solicitudes de corrección.</p>
                </AdminGuideItem>
                <AdminGuideItem title="Ajustes">
                  <p>El cerebro de la aplicación, donde se definen las reglas de negocio como días festivos, horas de convenio, tipos de ausencia y contrato, y campañas de solicitud de vacaciones.</p>
                </AdminGuideItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="agreement">
          <Card>
            <CardHeader>
              <CardTitle>Convenio y Normativa Interna</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <h4 className="font-bold">DOSIER ÚNICO DE DERECHOS Y BENEFICIOS – INDITEX (TIENDAS) · 2025</h4>
                <p><strong>Ámbito:</strong> toda España (Plan de Igualdad de Grupo Inditex). Para Zaragoza, además, lo indicado en el Convenio de Comercio Textil cuando no esté superado por el Plan.</p>
                <p><strong>Criterio de prevalencia:</strong> Estatuto de los Trabajadores (mínimos) → Plan de Igualdad (estatal, mejora y prevalece) → Convenio de Zaragoza y pactos internos más favorables.</p>
                
                <h5 className="font-semibold mt-4">0) Estatuto de los Trabajadores (mínimos legales que siempre aplican)</h5>
                <h6>0.1 Contrato, categoría y nómina</h6>
                <ul>
                    <li>Derecho a copia del contrato y de sus anexos/prórrogas; registro en el servicio público de empleo.</li>
                    <li>Clasificación profesional y funciones conforme al grupo/nivel.</li>
                    <li>Derecho a recibir nómina con desglose de conceptos y descuentos.</li>
                </ul>
                <h6>0.2 Tiempo de trabajo (límites generales)</h6>
                <ul>
                    <li>Jornada máxima ordinaria: 40 horas semanales de trabajo efectivo en cómputo anual.</li>
                    <li>Descanso mínimo diario: 12 horas entre jornadas.</li>
                    <li>Descanso semanal: 1 día y medio ininterrumpido, con compensaciones legales.</li>
                    <li>Registro horario obligatorio.</li>
                </ul>
                <h6>0.3 Horas extraordinarias y nocturnidad</h6>
                <ul>
                    <li>Horas extra voluntarias salvo pacto; se compensan con pago o descanso.</li>
                    <li>Trabajo nocturno (aprox. 22:00–06:00): condiciones y protección específicas, con complemento según convenio/empresa.</li>
                </ul>
                <h6>0.4 Vacaciones y festivos</h6>
                <ul>
                    <li>Vacaciones anuales: mínimo legal 30 días naturales (o equivalente en laborables).</li>
                    <li>Fiestas laborales: 14 al año (nacionales, autonómicas y locales).</li>
                </ul>
                <h6>0.5 Permisos retribuidos (marco legal)</h6>
                <ul>
                    <li>Matrimonio: 15 días naturales.</li>
                    <li>Fallecimiento, accidente o enfermedad graves, hospitalización o cirugía sin ingreso con reposo de parientes hasta 2.º grado: permiso retribuido.</li>
                    <li>Mudanza del domicilio habitual: permiso retribuido.</li>
                    <li>Deber inexcusable de carácter público y personal (votar, jurado): tiempo indispensable.</li>
                    <li>Exámenes prenatales y preparación al parto: dentro de jornada.</li>
                    <li>Lactancia: 1 hora diaria (acumulable o fraccionable) según ley y/o convenio.</li>
                    <li>Pareja de hecho: equiparación en permisos cuando lo reconozcan normas o acuerdos aplicables.</li>
                </ul>
                <h6>0.6 Conciliación (derechos básicos)</h6>
                <ul>
                    <li>Adaptación de jornada por conciliación (solicitud motivada; negociación y respuesta escrita).</li>
                    <li>Reducción de jornada por cuidado de menor, persona con discapacidad o dependiente a cargo.</li>
                    <li>Permiso parental: hasta 8 semanas para cuidado de hijo menor (según normativa vigente).</li>
                    <li>Protección especial en embarazo, lactancia, riesgo y violencia de género.</li>
                </ul>
                <h6>0.7 Excedencias y suspensión</h6>
                <ul>
                    <li>Excedencia por cuidado de hijo: hasta 3 años por cada menor.</li>
                    <li>Excedencia por cuidado de familiar: hasta 2 años.</li>
                    <li>Reserva de puesto y garantías según tipo y tramo temporal.</li>
                </ul>
                <h6>0.8 Representación y garantías</h6>
                <ul>
                    <li>Derecho a representación legal, libertad sindical y negociación colectiva.</li>
                    <li>Derecho a no discriminación e igualdad de trato en acceso, formación, promoción y retribución.</li>
                </ul>
                <h6>0.9 Prevalencia con este dosier</h6>
                <p>Este bloque es el suelo legal. Donde el Plan de Igualdad o el Convenio mejoren, se aplica la mejora (ya incorporada en los apartados siguientes).</p>

                <h5 className="font-semibold mt-4">1) Jornada, pausas, descansos y calendario</h5>
                <ul>
                    <li><strong>Jornada anual:</strong> 1.794 horas/año.</li>
                    <li><strong>Semana y pausas:</strong> 40 horas semanales; 12 horas de descanso entre jornadas.</li>
                    <li>Pausa retribuida en jornada continuada de más de 6 horas: 15 minutos, computa como trabajo efectivo.</li>
                    <li><strong>Mejora Plan (tiendas):</strong> si la jornada continuada es hasta 4 h → 15 min; de 4 a 6 h → 20 min; más de 6 h → 30 min. La pausa computa como tiempo de trabajo.</li>
                    <li><strong>Flexibilización (distribución irregular):</strong> Hasta 80 días/año; tope 9 h/día y 45 h/semana; compensación dentro del año. Preaviso mínimo 7 días.</li>
                    <li><strong>Descanso semanal:</strong> Día y medio ininterrumpido.</li>
                    <li><strong>Calendario laboral:</strong> Comunicación con 2 meses de antelación; cambios ordinarios con 15 días de aviso.</li>
                    <li><strong>Turnos partidos:</strong> El Plan prioriza jornada continuada.</li>
                </ul>

                <h5 className="font-semibold mt-4">2) Vacaciones</h5>
                <ul>
                    <li>31 días naturales (equivalente 23 laborables).</li>
                    <li>Distribución: 21 días entre junio y septiembre + 10 días en otra fecha por acuerdo.</li>
                    <li>Inicio en lunes.</li>
                    <li>Festivos coincidentes con vacaciones se disfrutan en otra fecha.</li>
                    <li>IT, nacimiento/adopción/acogimiento o lactancia acumulada interrumpen y reprograman el disfrute.</li>
                </ul>

                <h5 className="font-semibold mt-4">3) Asuntos propios</h5>
                <ul>
                    <li>2 días al año, no computan contra la jornada anual.</li>
                    <li>Uno de los días puede fraccionarse en dos medias jornadas por acuerdo.</li>
                </ul>

                <h5 className="font-semibold mt-4">4) Permisos retribuidos (Convenio y Plan)</h5>
                <h6>Convenio (retribuidos, con aviso y justificación)</h6>
                <ul>
                    <li>Matrimonio o pareja de hecho registrada: 15 días naturales.</li>
                    <li>Accidente, enfermedad grave u hospitalización de familiares hasta 2.º grado: 5 días.</li>
                    <li>Fallecimiento de cónyuge o hijos: 5 días naturales.</li>
                    <li>Traslado de domicilio habitual: 1 día.</li>
                </ul>

                <h5 className="font-semibold mt-4">6) Festivos trabajados: sistema de compensación económica</h5>
                <p>Opciones aplicables en festivos de apertura autorizada:</p>
                <ul>
                    <li><strong>Pago simple:</strong> 96 € brutos + devolución en descanso de las horas trabajadas.</li>
                    <li><strong>Pago doble:</strong> 192 € brutos sin devolución de horas.</li>
                </ul>

                <h5 className="font-semibold mt-4">11) Gestión de la Madurez, antigüedad y reconocimientos</h5>
                <h6>11.1 Reducción anual de jornada por edad</h6>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
