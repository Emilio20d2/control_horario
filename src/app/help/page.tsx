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
      <path d="M16.224 9.385c.012-2.47-1.956-4.322-4.208-4.322-2.222 0-4.213 1.833-4.225 4.287 0 2.52 2.004 4.352 4.225 4.352 2.252 0 4.208-1.85 4.208-4.317m3.181-2.923c-1.39-1.575-3.52-2.583-5.836-2.583-1.636 0-3.22.56-4.524 1.636-1.353 1.125-2.201 2.7-2.316 4.34-.024.312-.024.624-.024.936 0 3.324 2.149 6.014 5.253 6.014 1.033 0 2.042-.324 2.87-.924.887-.636 1.5-1.464 1.834-2.376h-4.34a.75.75 0 0 1 0-1.5h6.375v-.012c.024-.264.036-.528.036-.792 0-2.232-.9-4.236-2.448-5.748m-5.848-4.145c-2.4 0-4.63.972-6.222 2.583-1.612 1.623-2.57 3.825-2.57 6.222s.96 4.6 2.57 6.222c1.593 1.612 3.824 2.583 6.222 2.583s4.63-.972 6.222-2.583c1.612-1.623 2.57-3.825 2.57-6.222s-.96-4.6-2.57-6.222C18.256 3.79 16.026 2.818 13.625 2.818" />
    </svg>
);

const AndroidLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19,10a1,1,0,0,0-1,1V15a1,1,0,0,0,1,1H19a1,1,0,0,0,1-1V11a1,1,0,0,0-1-1H19M5,10a1,1,0,0,0-1,1V15a1,1,0,0,0,1,1H5a1,1,0,0,0,1-1V11a1,1,0,0,0-1-1H5m11.5-2a1,1,0,0,0-1-1h-9a1,1,0,0,0,0,2h9a1,1,0,0,0,1-1M17.2,5.2a1,1,0,0,0-1.4-1.4L15,4.59,14.2,3.8a1,1,0,0,0-1.4,1.4L13.59,6,12.8,6.8a1,1,0,0,0,1.4,1.4L15,7.41l.8.8a1,1,0,0,0,1.4-1.4L16.41,6Z M8.2,3.8,7.41,4.59,6.6,3.8A1,1,0,0,0,5.2,5.2L6,6,5.2,6.8A1,1,0,0,0,6.6,8.2L7.41,7.41,8.2,8.2A1,1,0,0,0,9.6,6.8L8.8,6,9.6,5.2A1,1,0,0,0,8.2,3.8Z" />
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
