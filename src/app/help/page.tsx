import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight font-headline">
        Añadir a Pantalla de Inicio
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Para iOS (iPhone/iPad)</CardTitle>
                    <CardDescription>Añade un acceso directo desde Safari.</CardDescription>
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
                    <CardTitle>Para Android</CardTitle>
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
