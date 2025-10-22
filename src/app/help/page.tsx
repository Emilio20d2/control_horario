import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const AppleLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.015 6.435c.957 0 1.859.33 2.62.99 1.139.989 1.637 2.454 1.637 3.755 0 .225-.015.44-.045.659h-8.498c.03-.224.045-.448.045-.674.015-2.008 1.638-3.735 4.241-3.735zM19.349 14.155c-.765 1.259-1.928 2.013-3.232 2.013-1.095 0-2.032-.599-2.737-1.573-.78-1.079-1.638-2.698-1.638-4.212 0-2.324 1.623-3.957 3.497-3.957.972 0 1.933.375 2.652 1.065.12-.134.225-.284.315-.434a5.166 5.166 0 00-3.032-1.289c-2.882 0-5.134 2.053-5.134 4.887 0 2.219.987 4.108 2.237 5.383.987 1.019 2.222 1.588 3.557 1.588 1.215 0 2.267-.449 3.092-1.274a.434.434 0 00.225-.36l-.045-1.783zM13.88 3.002c1.215-.045 2.372.434 3.167 1.259l-1.096.884c-.615-.599-1.5-.944-2.432-.884-1.921.135-3.332 1.768-3.437 3.597h-2.02c.165-2.833 2.417-4.813 5.82-4.856z" />
    </svg>
);

const AndroidLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M15.58,16.5H18v2H15.58A5.25,5.25,0,0,1,6,16.5v-5h12v5a5.25,5.25,0,0,1-2.42,4.5Z" opacity="0.4"/>
      <path d="M6,11.5v5a5.25,5.25,0,0,0,9.58,0v-5Z"/>
      <path d="M12.5,9.25a.75.75,0,1,0-1.5,0v-5a.75.75,0,1,0-1.5,0v5a.75.75,0,1,0-1.5,0v-5a.75.75,0,1,0-1.5,0v5a.75.75,0,1,0-1.5,0v-5a3.75,3.75,0,0,1,7.5,0Z" opacity="0.4"/>
      <path d="M15.25,4.75a.75.75,0,0,1-.75-.75V2.5a.75.75,0,0,1,1.5,0V4A.75.75,0,0,1,15.25,4.75Z"/>
      <path d="M8.75,4.75a.75.75,0,0,1-.75-.75V2.5a.75.75,0,0,1,1.5,0V4A.75.75,0,0,1,8.75,4.75Z"/>
      <path d="M16.5,8A1.5,1.5,0,1,1,18,6.5,1.5,1.5,0,0,1,16.5,8Z"/>
      <path d="M6,8A1.5,1.5,0,1,1,7.5,6.5,1.5,1.5,0,0,1,6,8Z"/>
    </svg>
);


export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight font-headline">
        Añadir a Pantalla de Inicio
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <AppleLogo className="h-10 w-10" />
                    <div>
                        <CardTitle>Para iOS (iPhone/iPad)</CardTitle>
                        <CardDescription>Añade un acceso directo desde Safari.</CardDescription>
                    </div>
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
                <div className="flex items-center gap-4">
                    <AndroidLogo className="h-10 w-10 text-green-500" />
                    <div>
                        <CardTitle>Para Android</CardTitle>
                        <CardDescription>Instala la aplicación desde Chrome.</CardDescription>
                    </div>
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
