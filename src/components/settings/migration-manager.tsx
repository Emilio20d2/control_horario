'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PlusCircle, Trash2, Edit, Loader2, Users, Check, X, Building, BotMessageSquare } from 'lucide-react';
import { format, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataProvider } from '@/hooks/use-data-provider';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { HolidayForm } from '@/components/settings/holiday-form';
import { DataCleanupManager } from '@/components/settings/data-cleanup-manager';
import { RetroactiveAuditManager } from '@/components/settings/retroactive-audit-manager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { EmployeeGroup } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VacationCampaignManager } from '@/components/settings/vacation-campaign-manager';
import { MessageSyncManager } from './message-sync-manager';
import { EmployeeViewManager } from './employee-view-manager';


export default function SettingsPageContent() {
    const { 
        holidays, 
        absenceTypes, 
        contractTypes, 
        annualConfigs, 
        loading, 
        deleteAbsenceType, 
        deleteAnnualConfig, 
        deleteHoliday, 
        deleteContractType 
    } = useDataProvider();
    const { toast } = useToast();
    const { reauthenticateWithPassword } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get('tab') || 'holidays';
    
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedHolidayYear, setSelectedHolidayYear] = useState(getYear(new Date()));

    const holidayYears = useMemo(() => {
        const years = new Set(holidays.map(h => getYear(h.date as Date)));
        const currentYear = getYear(new Date());
        years.add(currentYear);
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a, b) => b - a);
    }, [holidays]);


    const handleTabChange = (value: string) => {
        router.push(`/settings?tab=${value}`);
    };

    const performDelete = async (deleteFn: () => Promise<void>, successTitle: string, successDesc: string, errorDesc: string) => {
        if (!password) {
            toast({ title: 'Contraseña requerida', description: 'Por favor, introduce tu contraseña para confirmar.', variant: 'destructive' });
            return;
        }
        setIsDeleting(true);

        const isAuthenticated = await reauthenticateWithPassword(password);
        if (!isAuthenticated) {
            toast({ title: 'Error de autenticación', description: 'La contraseña no es correcta.', variant: 'destructive' });
            setIsDeleting(false);
            return;
        }
        
        try {
            await deleteFn();
            toast({ title: successTitle, description: successDesc, variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Error al eliminar', description: errorDesc, variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setPassword('');
        }
    };

    

  const renderSkeleton = () => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
  );

  const YesNoBadge = ({ value }: { value: boolean }) => (
    <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Sí' : 'No'}</Badge>
  )
  
  const DeleteDialog = ({ trigger, title, description, onConfirm }: { trigger: React.ReactNode, title: string, description: string, onConfirm: () => void }) => {
    return (
        <AlertDialog onOpenChange={(open) => !open && setPassword('')}>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Introduce tu contraseña para confirmar"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Configuración
        </h1>
      </div>

      <div className="px-4 md:px-6 pb-4">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full justify-start h-auto sm:h-10 grid sm:w-full grid-cols-3 md:grid-cols-6 overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="holidays">Días Festivos</TabsTrigger>
                <TabsTrigger value="annual">Conf. Anual</TabsTrigger>
                <TabsTrigger value="absences">Tipos Ausencia</TabsTrigger>
                <TabsTrigger value="contracts">Tipos Contrato</TabsTrigger>
                <TabsTrigger value="campaigns">Campañas</TabsTrigger>
                <TabsTrigger value="utils">Utilidades</TabsTrigger>
            </TabsList>

            <TabsContent value="holidays">
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Añadir Festivo o Apertura</CardTitle>
                                <CardDescription>Crea un nuevo día no laborable o de apertura especial.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <HolidayForm />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <div>
                                        <CardTitle>Calendario de Festivos y Aperturas</CardTitle>
                                        <CardDescription>Gestionar los días festivos y aperturas especiales.</CardDescription>
                                    </div>
                                    <Select value={String(selectedHolidayYear)} onValueChange={v => setSelectedHolidayYear(Number(v))}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Año" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {holidayYears.map(year => (
                                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? renderSkeleton() : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {holidays
                                            .filter(holiday => getYear(holiday.date as Date) === selectedHolidayYear)
                                            .map(holiday => (
                                            <TableRow key={holiday.id}>
                                                <TableCell className="font-medium">{holiday.name}</TableCell>
                                                <TableCell>{format(holiday.date as Date, 'dd/MM/yyyy', { locale: es })}</TableCell>
                                                <TableCell>{holiday.type}</TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/settings/holidays/${holiday.id}/edit`} passHref>
                                                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                                                    </Link>
                                                    <DeleteDialog 
                                                        trigger={
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        }
                                                        title="¿Estás seguro de que quieres eliminar este festivo?"
                                                        description="Esta acción no se puede deshacer."
                                                        onConfirm={() => performDelete(
                                                            () => deleteHoliday(holiday.id),
                                                            'Festivo Eliminado',
                                                            'El festivo se ha eliminado correctamente.',
                                                            'No se pudo eliminar el festivo.'
                                                        )}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="annual">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle>Configuración Anual por Convenio</CardTitle>
                                <CardDescription>Gestionar las horas anuales máximas por convenio para cada año.</CardDescription>
                            </div>
                            <Link href="/settings/annual/new" passHref>
                                <Button><PlusCircle className="mr-2 h-4 w-4"/>Añadir Configuración</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? renderSkeleton() : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Año</TableHead>
                                    <TableHead className="text-center">Jornada Anual Máxima</TableHead>
                                    <TableHead className="text-center">Jornada Semanal Referencia</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {annualConfigs.map(config => (
                                    <TableRow key={config.id}>
                                        <TableCell className="font-medium">{config.year}</TableCell>
                                        <TableCell className="text-center font-mono">{config.maxAnnualHours}h</TableCell>
                                        <TableCell className="text-center font-mono">{config.referenceWeeklyHours}h</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/settings/annual/${config.id}/edit`} passHref>
                                                <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                                            </Link>
                                            <DeleteDialog 
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                }
                                                title="¿Estás seguro de que quieres eliminar esta configuración?"
                                                description="Esta acción no se puede deshacer."
                                                onConfirm={() => performDelete(
                                                    () => deleteAnnualConfig(config.id),
                                                    'Configuración Anual Eliminada',
                                                    'La configuración anual se ha eliminado correctamente.',
                                                    'No se pudo eliminar la configuración anual.'
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="absences">
            <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle>Tipos de Ausencia</CardTitle>
                                <CardDescription>Definir los tipos de permisos y ausencias y cómo afectan a la jornada.</CardDescription>
                            </div>
                            <Link href="/settings/absences/new" passHref>
                                <Button><PlusCircle className="mr-2 h-4 w-4"/>Añadir Tipo de Ausencia</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                    {loading ? renderSkeleton() : (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[150px]">Nombre</TableHead>
                                    <TableHead className="text-center">Computa Semanal</TableHead>
                                    <TableHead className="text-center">Computa Anual</TableHead>
                                    <TableHead className="text-center">Suspende Contrato</TableHead>
                                    <TableHead className="text-center">Límite Anual</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {absenceTypes.map(absence => (
                                    <TableRow key={absence.id}>
                                        <TableCell className="font-medium">{absence.name} <span className="text-muted-foreground">({absence.abbreviation})</span></TableCell>
                                        <TableCell className="text-center"><YesNoBadge value={absence.computesToWeeklyHours} /></TableCell>
                                        <TableCell className="text-center"><YesNoBadge value={absence.computesToAnnualHours} /></TableCell>
                                        <TableCell className="text-center"><YesNoBadge value={absence.suspendsContract} /></TableCell>
                                        <TableCell className="text-center">{absence.annualHourLimit ? `${absence.annualHourLimit}h` : 'No'}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/settings/absences/${absence.id}/edit`} passHref>
                                                <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                                            </Link>
                                            <DeleteDialog 
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                }
                                                title="¿Estás seguro de que quieres eliminar este tipo de ausencia?"
                                                description="Esta acción no se puede deshacer. Se eliminará permanentemente."
                                                onConfirm={() => performDelete(
                                                    () => deleteAbsenceType(absence.id),
                                                    'Tipo de Ausencia Eliminado',
                                                    'El tipo de ausencia se ha eliminado correctamente.',
                                                    'No se pudo eliminar el tipo de ausencia.'
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="contracts">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle>Tipos de Contrato</CardTitle>
                                <CardDescription>Gestionar los tipos de contrato y sus reglas de cómputo de bolsas de horas.</CardDescription>
                            </div>
                            <Link href="/settings/contracts/new" passHref>
                                <Button><PlusCircle className="mr-2 h-4 w-4"/>Añadir Tipo de Contrato</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                    {loading ? renderSkeleton() : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="text-center">B. Ordinaria</TableHead>
                                    <TableHead className="text-center">B. Festivos</TableHead>
                                    <TableHead className="text-center">B. Libranza</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contractTypes.map(contract => (
                                    <TableRow key={contract.id}>
                                        <TableCell className="font-medium">{contract.name}</TableCell>
                                        <TableCell className="text-center"><YesNoBadge value={contract.computesOrdinaryBag} /></TableCell>
                                        <TableCell className="text-center"><YesNoBadge value={contract.computesHolidayBag} /></TableCell>
                                        <TableCell className="text-center"><YesNoBadge value={contract.computesOffDayBag} /></TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/settings/contracts/${contract.id}/edit`} passHref>
                                                <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                                            </Link>
                                            <DeleteDialog
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                }
                                                title="¿Estás seguro de que quieres eliminar este tipo de contrato?"
                                                description="Esta acción no se puede deshacer. Se eliminará permanentemente."
                                                onConfirm={() => performDelete(
                                                    () => deleteContractType(contract.id),
                                                    'Tipo de Contrato Eliminado',
                                                    'El tipo de contrato se ha eliminado correctamente.',
                                                    'No se pudo eliminar el tipo de contrato.'
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="campaigns">
                <VacationCampaignManager />
            </TabsContent>

            <TabsContent value="utils">
                <div className='grid gap-6'>
                    <EmployeeViewManager />
                    <DataCleanupManager />
                    <MessageSyncManager />
                    <RetroactiveAuditManager />
                </div>
            </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}