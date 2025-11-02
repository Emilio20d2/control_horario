
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { WeeklyScheduleEditor } from '@/components/employees/weekly-schedule-editor';
import { useRouter, useParams, notFound } from 'next/navigation';
import { addEmploymentPeriod } from '@/lib/services/employeeService';
import { useDataProvider } from '@/hooks/use-data-provider';
import { InputStepper } from '@/components/ui/input-stepper';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';


const dayScheduleSchema = z.object({
    hours: z.coerce.number().min(0).max(24),
    isWorkDay: z.boolean(),
});

const weeklyScheduleSchema = z.object({
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe estar en formato AAAA-MM-DD.' }),
    shifts: z.object({
        turn1: z.record(dayScheduleSchema),
        turn2: z.record(dayScheduleSchema),
        turn3: z.record(dayScheduleSchema),
        turn4: z.record(dayScheduleSchema),
    })
});

const formSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe estar en formato AAAA-MM-DD.' }),
  contractType: z.string().min(1, { message: 'Debe seleccionar un tipo de contrato.' }),
  initialWeeklyWorkHours: z.coerce.number().positive({ message: 'La jornada semanal debe ser un número positivo.'}),
  annualComputedHours: z.coerce.number().default(0),
  initialOrdinaryHours: z.coerce.number().optional(),
  initialHolidayHours: z.coerce.number().optional(),
  initialLeaveHours: z.coerce.number().optional(),
  weeklySchedules: z.array(weeklyScheduleSchema).min(1, 'Debe haber al menos un calendario.')
});

const generateDefaultShift = (hours: number, days: string[]) => {
    const shift: Record<string, { hours: number, isWorkDay: boolean }> = {};
    const weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    weekDays.forEach(day => {
        if (days.includes(day)) {
            shift[day] = { hours, isWorkDay: true };
        } else {
            shift[day] = { hours: 0, isWorkDay: false };
        }
    });
    return shift;
};

export default function NewContractPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { getEmployeeById, contractTypes, loading } = useDataProvider();
    const employee = getEmployeeById(id);

    const defaultValues = {
        startDate: new Date().toISOString().split('T')[0],
        contractType: '',
        initialWeeklyWorkHours: 40,
        annualComputedHours: 0,
        initialOrdinaryHours: 0,
        initialHolidayHours: 0,
        initialLeaveHours: 0,
        weeklySchedules: [{
            effectiveDate: new Date().toISOString().split('T')[0],
            shifts: {
                turn1: generateDefaultShift(8, ['mon', 'tue', 'wed', 'thu', 'fri']),
                turn2: generateDefaultShift(8, ['mon', 'tue', 'wed', 'thu', 'fri']),
                turn3: generateDefaultShift(0, []),
                turn4: generateDefaultShift(0, []),
            }
        }],
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!employee) return;
        try {
            await addEmploymentPeriod(employee.id, employee, values as any);
            toast({
                title: "Nuevo Contrato Creado",
                description: `Se ha añadido un nuevo periodo laboral para ${employee.name}.`,
            });
            router.push(`/employees/${employee.id}`);
            router.refresh();
        } catch (error) {
            console.error("Error creating new contract:", error);
            toast({
                title: "Error al crear contrato",
                description: "No se pudieron guardar los datos. Inténtalo de nuevo.",
                variant: "destructive"
            });
        }
    }
    
    if (loading) {
         return (
             <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center gap-4">
                     <Skeleton className="h-10 w-10 rounded-md" />
                     <Skeleton className="h-7 w-64" />
                </div>
                <Skeleton className="h-[800px] w-full" />
            </div>
        )
    }

    if (!employee) {
        notFound();
    }


    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 px-4 md:px-6 pt-4">
                <Link href={`/employees/${id}`} passHref>
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Nuevo Contrato para {employee.name}
                </h1>
            </div>

            <div className="px-4 md:px-6 pb-4">
                <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
                    <CardHeader>
                        <CardTitle>Crear Nuevo Periodo Laboral</CardTitle>
                        <CardDescription>
                            Completa el formulario para añadir un nuevo contrato a este empleado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Datos del Contrato</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fecha de Inicio del Contrato</FormLabel>
                                            <FormControl>
                                            <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="contractType"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Contrato</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un tipo de contrato" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {contractTypes.map(ct => (
                                                    <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Jornada y Cómputo Anual</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="initialWeeklyWorkHours"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Jornada Semanal Inicial</FormLabel>
                                                <FormControl>
                                                    <InputStepper {...field} step={0.25} min={0} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="annualComputedHours"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Horas Computadas Anuales</FormLabel>
                                            <FormControl>
                                                <InputStepper {...field} step={0.25} value={field.value ?? 0} />
                                            </FormControl>
                                            <FormDescription>Horas ya trabajadas si el contrato empezó a mitad de año.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Saldos Iniciales para el Nuevo Periodo</h3>
                                 <FormDescription>Define las horas con las que el empleado comenzará este nuevo contrato.</FormDescription>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                                    <FormField
                                        control={form.control}
                                        name="initialOrdinaryHours"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bolsa Ordinaria Inicial</FormLabel>
                                                <FormControl>
                                                    <InputStepper {...field} value={field.value} step={0.25} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="initialHolidayHours"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bolsa Festivos Inicial</FormLabel>
                                                <FormControl>
                                                    <InputStepper {...field} value={field.value} step={0.25} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="initialLeaveHours"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bolsa Libranza Inicial</FormLabel>
                                                <FormControl>
                                                    <InputStepper {...field} value={field.value} step={0.25} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium">Calendario Laboral Rotativo (4 Semanas)</h3>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="weeklySchedules.0.effectiveDate"
                                        render={({ field }) => (
                                            <FormItem className="w-48">
                                                <FormLabel>Fecha de Vigencia</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="weeklySchedules.0"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <WeeklyScheduleEditor {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit">Crear Contrato</Button>
                            </div>

                        </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    