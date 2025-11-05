
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookUser, ChevronRight } from 'lucide-react';
import React from 'react';

type AdminGuideItemProps = {
  title: string;
  children: React.ReactNode;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-6 mb-2 text-xl font-semibold tracking-tight border-b pb-2">
    {children}
  </h3>
);

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
            <CardContent>
              <p className="text-muted-foreground">
                Esta sección está reservada para el documento del convenio colectivo y otras normativas internas de la empresa. El contenido se añadirá próximamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
