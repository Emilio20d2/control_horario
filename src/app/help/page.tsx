
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MailQuestion, Info, PlaneTakeoff, User, CalendarCheck } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight font-headline">
        Página de Ayuda
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <div className="flex items-start gap-4">
                    <User className="h-8 w-8 text-primary mt-1" />
                    <div>
                        <CardTitle>Mi Ficha</CardTitle>
                        <CardDescription>Tu perfil y resumen de balances.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Esta sección centraliza toda tu información personal y laboral:
                </p>
                <ul className="list-disc list-inside space-y-2 mt-3 text-sm">
                    <li><strong>Balances de Horas:</strong> Consulta en tiempo real el estado de tus bolsas de horas (Ordinaria, Festivos, Libranza) y tu balance total.</li>
                    <li><strong>Datos del Contrato:</strong> Revisa tu tipo de contrato y tu jornada semanal vigente.</li>
                    <li><strong>Vacaciones:</strong> Visualiza un resumen de tus días de vacaciones disponibles y consumidos.</li>
                </ul>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex items-start gap-4">
                    <Info className="h-8 w-8 text-primary mt-1" />
                    <div>
                        <CardTitle>Entender el Cálculo de Vacaciones</CardTitle>
                        <CardDescription>Cómo ver el desglose de tus días de vacaciones.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Para saber cómo se ha calculado el total de tus días de vacaciones disponibles, sigue estos pasos:
                </p>
                <ol className="list-decimal list-inside space-y-2 mt-3 text-sm">
                    <li>Ve a la sección <span className="font-semibold text-primary">"Mi Ficha"</span>.</li>
                    <li>Localiza la tarjeta que muestra tus días de vacaciones.</li>
                    <li>
                        <strong>Haz clic o pulsa</strong> sobre esa tarjeta.
                    </li>
                    <li>Aparecerá una ventana emergente con el desglose detallado: días base, días arrastrados del año anterior, descuentos por suspensiones, etc.</li>
                </ol>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <div className="flex items-start gap-4">
                    <CalendarCheck className="h-8 w-8 text-primary mt-1" />
                    <div>
                        <CardTitle>Mis Presencias</CardTitle>
                        <CardDescription>Tu histórico de semanas confirmadas.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Aquí puedes consultar un registro de solo lectura de todas tus semanas laborales que ya han sido revisadas y confirmadas por un administrador.
                </p>
                <ul className="list-disc list-inside space-y-2 mt-3 text-sm">
                    <li>Revisa el detalle de horas trabajadas y ausencias de semanas pasadas.</li>
                    <li>Consulta el impacto exacto que tuvo cada semana en tus balances de horas.</li>
                </ul>
            </CardContent>
        </Card>

        <Card>
              <CardHeader>
                  <div className="flex items-start gap-4">
                      <MailQuestion className="h-8 w-8 text-primary mt-1" />
                      <div>
                          <CardTitle>Comunicar una Incidencia (Diferencia de Horas)</CardTitle>
                          <CardDescription>Cómo reportar una posible incidencia en tu cómputo de horas a través de la mensajería.</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Si crees que puede haber una diferencia en tus horas computadas, por favor, sigue estos pasos:
                </p>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                      <li>
                          <strong>Verifica en "INET":</strong> Antes de nada, comprueba la información a través de la plataforma "INET" para asegurar que la diferencia no se deba a un dato pendiente de actualizar.
                      </li>
                      <li>
                          <strong>Usa la Mensajería:</strong> Si tras comprobarlo sigues detectando una incidencia, dirígete a la sección <span className="font-semibold text-primary">"Mis Mensajes"</span>.
                      </li>
                      <li>
                          <strong>Deja tu Mensaje:</strong> Explica detalladamente la diferencia que has encontrado. Tu mensaje será recibido por la dirección.
                      </li>
                      <li>
                          <strong>Espera la Respuesta:</strong> Se revisará tu caso y se te responderá a través de la misma sección de mensajes.
                      </li>
                  </ol>
              </CardContent>
          </Card>

         <Card>
            <CardHeader>
                <div className="flex items-start gap-4">
                    <PlaneTakeoff className="h-8 w-8 text-primary mt-1" />
                    <div>
                        <CardTitle>Solicitar Vacaciones</CardTitle>
                        <CardDescription>Cómo funcionan los periodos de petición.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    Las vacaciones y otros permisos largos se solicitan durante "campañas" o periodos específicos que abre la empresa.
                </p>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>
                        <strong>Anuncio de Campaña:</strong> Cuando se abre un periodo de solicitud, verás un aviso especial en la página <span className="font-semibold text-primary">"Mis Mensajes"</span>.
                    </li>
                    <li>
                        <strong>Realiza tu Petición:</strong> Dentro de esa sección, aparecerá un botón para "Hacer Solicitud". Sigue los pasos para elegir el tipo de ausencia y las fechas que deseas.
                    </li>
                     <li>
                        <strong>Petición Enviada:</strong> Una vez enviada, tu solicitud quedará registrada y pendiente de revisión por parte de la dirección.
                    </li>
                </ol>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Añadir a Pantalla de Inicio (iOS)</CardTitle>
                    <CardDescription>Añade un acceso directo desde Safari en tu iPhone/iPad.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Abre esta aplicación en el navegador <strong>Safari</strong>.</li>
                    <li>Pulsa el botón de <strong>Compartir</strong> (un cuadrado con una flecha hacia arriba).</li>
                    <li>Desliza hacia abajo y selecciona la opción <strong>"Añadir a pantalla de inicio"</strong>.</li>
                    <li>¡Listo! El icono aparecerá en tu pantalla.</li>
                </ol>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Añadir a Pantalla de Inicio (Android)</CardTitle>
                    <CardDescription>Instala la aplicación desde Chrome.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                 <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Abre esta aplicación en el navegador <strong>Chrome</strong>.</li>
                    <li>Pulsa el <strong>menú de los tres puntos</strong> en la esquina superior derecha.</li>
                    <li>Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
                    <li>Confirma la acción y el icono aparecerá en tu pantalla.</li>
                </ol>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
