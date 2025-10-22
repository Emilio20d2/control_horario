
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
  import { Separator } from '@/components/ui/separator';
  
  export default function HelpPage() {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Manual de Usuario
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Control Horario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-2">1. Introducción</h2>
              <p className="text-muted-foreground">
                `Control Horario` es una aplicación web integral para la gestión avanzada de turnos, horarios y cómputo de horas de empleados. Permite a los administradores llevar un registro detallado de las jornadas laborales, ausencias, festivos y balances de horas de cada trabajador.
              </p>
              <p className="text-muted-foreground mt-2">
                El sistema está diseñado para manejar calendarios rotativos complejos, calcular automáticamente los balances de horas (ordinarias, de festivos, de libranza) y generar informes detallados para auditorías y gestión de personal.
              </p>
            </section>
  
            <Separator />
  
            <section>
              <h2 className="text-xl font-semibold mb-2">2. Guía de Páginas y Funcionalidades</h2>
              <p className="text-muted-foreground mb-4">
                A continuación, se detalla el propósito y uso de cada una de las secciones principales de la aplicación.
              </p>
  
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">a. Mi Ficha (`/my-profile`)</h3>
                  <p className="text-muted-foreground text-sm">
                    Es tu página principal. Aquí puedes consultar toda tu información relevante en un solo lugar: balances de horas, datos de tu contrato, cómputo anual de horas y ausencias programadas.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">b. Mis Horarios (`/my-schedule`)</h3>
                  <p className="text-muted-foreground text-sm">
                    En esta sección puedes consultar el detalle de todas tus semanas de trabajo que ya han sido confirmadas por un administrador. Podrás ver las horas trabajadas, ausencias y el impacto que cada semana tuvo en tus bolsas de horas.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">c. Vacaciones (`/my-vacations`)</h3>
                  <p className="text-muted-foreground text-sm">
                    Aquí puedes ver el cuadrante anual de vacaciones y ausencias de todo el equipo, lo que te permite planificar mejor tus solicitudes. También puedes ver un resumen de tus días de vacaciones disponibles y consumidos.
                  </p>
                </div>
              </div>
            </section>
  
            <Separator />
  
            <section>
                <h2 className="text-xl font-semibold mb-2">3. Conceptos Clave</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Bolsas de Horas</h3>
                        <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1 mt-2">
                            <li><strong>B. Ordinaria:</strong> Acumula la diferencia entre las horas que computas cada semana y las horas teóricas que deberías hacer según tu jornada.</li>
                            <li><strong>B. Festivos:</strong> Suma horas cuando trabajas en un festivo de apertura y no se te abona como "pago doble".</li>
                            <li><strong>B. Libranza:</strong> Suma horas cuando te corresponde librar en un día festivo que la tienda está cerrada.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold">Cómputo Semanal vs. Anual</h3>
                         <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1 mt-2">
                            <li>El <strong>cómputo semanal</strong> se usa para calcular el impacto en la bolsa ordinaria cada semana.</li>
                            <li>El <strong>cómputo anual</strong> compara el total de horas que has trabajado en el año contra tu objetivo anual de convenio para obtener el balance final del año.</li>
                        </ul>
                    </div>
                </div>
            </section>
          </CardContent>
        </Card>
      </div>
    );
  }
  