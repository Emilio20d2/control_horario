
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MailQuestion } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight font-headline">
        Página de Ayuda
      </h1>

       <Card>
            <CardHeader>
                <div className="flex items-start gap-4">
                    <MailQuestion className="h-8 w-8 text-primary mt-1" />
                    <div>
                        <CardTitle>Comunicación y Diferencias de Horas</CardTitle>
                        <CardDescription>Cómo reportar una posible incidencia en tu cómputo de horas.</CardDescription>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
