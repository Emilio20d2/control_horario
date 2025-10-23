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
import type { Employee, EmployeeFormData, WeeklyScheduleData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { WeeklyScheduleEditor } from './weekly-schedule-editor';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createEmployee, updateEmployee, deleteEmployee } from '@/lib/services/employeeService';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { InputStepper } from '../ui/input-stepper';
import { parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { getFinalBalancesForEmployee } from '@/lib/services/employee-data-service';
import { createUserAccount } from '@/lib/actions/userActions';


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
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  employeeNumber: z.string().min(1, { message: 'El Nº de Empleado es obligatorio.' }),
  dni: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Correo electrónico no válido." }).optional().or(z.literal('')),
  role: z.string().optional(),
  
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe estar en formato AAAA-MM-DD.' }),
  endDate: z.string().nullable().optional(),
  isTransfer: z.boolean().default(false),
  vacationDaysUsedInAnotherCenter: z.coerce.number().optional(),
  contractType: z.string().min(1, { message: 'Debe seleccionar un tipo de contrato.' }),
  
  newContractType: z.string().optional(),
  newContractTypeDate: z.string().optional(),
  
  initialWeeklyWorkHours: z.coerce.number().positive({ message: 'La jornada semanal debe ser un número positivo.'}),
  
  newWeeklyWorkHours: z.coerce.number().optional(),
  newWeeklyWorkHoursDate: z.string().optional(),

  annualComputedHours: z.coerce.number().default(0),
  
  initialOrdinaryHours: z.coerce.number().optional(),
  initialHolidayHours: z.coerce.number().optional(),
  initialLeaveHours: z.coerce.number().optional(),
  vacationDays2024: z.coerce.number().optional(),

  weeklySchedules: z.array(weeklyScheduleSchema).min(1, 'Debe haber al menos un calendario.'),
  
  newWeeklySchedule: weeklyScheduleSchema.optional(),

}).refine(data => {
    if(data.newWeeklyWorkHours && data.newWeeklyWorkHours > 0 && !data.newWeeklyWorkHoursDate) {
        return false;
    }
    return true;
}, {
    message: "Debe proporcionar una fecha de efectividad para la nueva jornada.",
    path: ["newWeeklyWorkHoursDate"]
}).refine(data => {
    if (data.newContractType && !data.newContractTypeDate) {
        return false;
    }
    return true;
}, {
    message: "Debe proporcionar una fecha de efectividad para el nuevo contrato.",
    path: ["newContractTypeDate"],
});

interface EmployeeFormProps {
  employee?: Employee;
}

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

export function EmployeeForm({ employee }: EmployeeFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { contractTypes, users, appUser, refreshUsers, employeeGroups } = useDataProvider();
  const { reauthenticateWithPassword } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState('');

  const getInitialValues = () => {
    const userForEmployee = employee?.authId ? users.find(u => u.id === employee.authId) : undefined;
    
    const role = employee?.email === 'emiliogp@inditex.com' ? 'admin' : userForEmployee?.role || 'employee';

    if (employee && employee.employmentPeriods?.length > 0) {
        const period = [...employee.employmentPeriods].sort((a,b) => parseISO(b.startDate as string).getTime() - parseISO(a.startDate as string).getTime())[0];
        
        return {
            name: employee.name,
            employeeNumber: employee.employeeNumber,
            dni: employee.dni,
            phone: employee.phone,
            email: employee.email,
            role: role,
            startDate: period.startDate as string,
            endDate: period.endDate as string | null,
            isTransfer: period.isTransfer || false,
            vacationDaysUsedInAnotherCenter: period.vacationDaysUsedInAnotherCenter,
            contractType: period.contractType,
            initialWeeklyWorkHours: period.workHoursHistory?.[0]?.weeklyHours || 0,
            annualComputedHours: period.annualComputedHours,
            initialOrdinaryHours: period.initialOrdinaryHours,
            initialHolidayHours: period.initialHolidayHours,
            initialLeaveHours: period.initialLeaveHours,
            vacationDays2024: period.vacationDays2024,
            weeklySchedules: period.weeklySchedulesHistory ? [...period.weeklySchedulesHistory].sort((a, b) => parseISO(b.effectiveDate).getTime() - parseISO(a.effectiveDate).getTime()) : [],
            newWeeklyWorkHours: undefined,
            newWeeklyWorkHoursDate: undefined,
            newContractType: undefined,
            newContractTypeDate: undefined,
            newWeeklySchedule: undefined,
        };
    }
    return {
        name: '',
        employeeNumber: '',
        dni: '',
        phone: '',
        email: '',
        role: 'employee',
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        isTransfer: false,
        vacationDaysUsedInAnotherCenter: undefined,
        contractType: '',
        initialWeeklyWorkHours: 40,
        annualComputedHours: 0,
        initialOrdinaryHours: undefined,
        initialHolidayHours: undefined,
        initialLeaveHours: undefined,
        vacationDays2024: undefined,
        weeklySchedules: [{
            effectiveDate: new Date().toISOString().split('T')[0],
            shifts: {
                turn1: generateDefaultShift(8, ['mon', 'tue', 'wed', 'thu', 'fri']),
                turn2: generateDefaultShift(8, ['mon', 'tue', 'wed', 'thu', 'fri']),
                turn3: generateDefaultShift(0, []),
                turn4: generateDefaultShift(0, []),
            }
        }],
        newWeeklyWorkHours: undefined,
        newWeeklyWorkHoursDate: undefined,
        newContractType: undefined,
        newContractTypeDate: undefined,
        newWeeklySchedule: undefined,
    };
  };

  const defaultValues = getInitialValues();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const isTransfer = form.watch('isTransfer');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        if (employee) {
            // Update existing employee
            const finalBalances = await getFinalBalancesForEmployee(employee.id);
            await updateEmployee(employee.id, employee, values, finalBalances);
            toast({
                title: "Empleado Actualizado",
                description: `Los datos de ${values.name} han sido guardados.`,
            });
            await refreshUsers();
            router.push(`/employees/${employee.id}`);
        } else {
            // Create new employee
            let authId: string | null = null;
            if (values.email) {
                const userResult = await createUserAccount({ email: values.email });
                if (userResult.success && userResult.uid) {
                    authId = userResult.uid;
                } else {
                    throw new Error(userResult.error || 'Failed to create authentication user.');
                }
            }

            const dataToSave: EmployeeFormData & { authId: string | null } = {
                ...values,
                authId: authId,
                initialOrdinaryHours: values.initialOrdinaryHours ?? 0,
                initialHolidayHours: values.initialHolidayHours ?? 0,
                initialLeaveHours: values.initialLeaveHours ?? 0,
                vacationDays2024: values.vacationDays2024 ?? 0,
                vacationDaysUsedInAnotherCenter: values.vacationDaysUsedInAnotherCenter ?? 0,
            };

            await createEmployee(dataToSave);
            toast({
                title: "Empleado Creado",
                description: `Se ha creado el empleado ${values.name}.`,
            });
            router.push(`/employees`);
        }
        router.refresh();
    } catch (error) {
        console.error("Error saving employee:", error);
        toast({
            title: "Error al guardar",
            description: error instanceof Error ? error.message : "No se pudieron guardar los datos. Inténtalo de nuevo.",
            variant: "destructive"
        });
    }
  }

  async function onDelete() {
    if (!employee) return;
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
        await deleteEmployee(employee.id);
        toast({
            title: "Empleado Eliminado",
            description: `El empleado ${employee.name} ha sido eliminado permanentemente.`,
            variant: "destructive"
        });
        router.push('/employees');
    } catch (error) {
        console.error("Error deleting employee:", error);
        toast({
            title: "Error al eliminar",
            description: "No se pudo eliminar el empleado. Inténtalo de nuevo.",
            variant: "destructive"
        });
    } finally {
        setIsDeleting(false);
        setPassword('');
    }
  }
  
  const isFirstPeriod = !employee || employee.employmentPeriods.length <= 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{employee ? 'Editar Empleado' : 'Crear Empleado y Primer Periodo Laboral'}</CardTitle>
        <CardDescription>
            {employee ? 'Actualiza los detalles del empleado y su periodo laboral.' : 'Completa el formulario para añadir un nuevo empleado y su primer periodo laboral.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Datos del Empleado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre Completo</FormLabel>
                            <FormControl>
                            <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="employeeNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nº Empleado (ID)</FormLabel>
                            <FormControl>
                            <Input placeholder="12345" {...field} value={field.value ?? ''} disabled={!!employee} />
                            </FormControl>
                            {!!employee && <FormDescription>El Nº de empleado no se puede cambiar.</FormDescription>}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="dni"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>DNI</FormLabel>
                            <FormControl>
                            <Input placeholder="12345678A" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                            <Input placeholder="600123456" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Correo Electrónico</FormLabel>
                            <FormControl>
                            <Input placeholder="juan.perez@email.com" {...field} value={field.value ?? ''} />
                            </FormControl>
                             <FormDescription>Usado para el inicio de sesión del empleado.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rol del Usuario</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona un rol" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="employee">Empleado</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormDescription>Define los permisos del usuario en la aplicación.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Datos del Contrato</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha de Inicio del Contrato</FormLabel>
                            <FormControl>
                            <Input type="date" {...field} disabled={!!employee} />
                            </FormControl>
                             {!!employee && <FormDescription>No se puede modificar la fecha de inicio de un contrato existente.</FormDescription>}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha Fin de Contrato (Opcional)</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormDescription>Dejar en blanco si el contrato está activo.</FormDescription>
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
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    <FormField
                        control={form.control}
                        name="initialWeeklyWorkHours"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Jornada Semanal Inicial</FormLabel>
                                <FormControl>
                                    <InputStepper {...field} value={field.value} step={0.25} disabled={!!employee} />
                                </FormControl>
                                {!!employee && <FormDescription>La jornada se gestiona en las modificaciones de contrato.</FormDescription>}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="initialOrdinaryHours"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bolsa Ordinaria Inicial</FormLabel>
                                <FormControl>
                                    <InputStepper {...field} value={field.value} step={0.25} disabled={!!employee} />
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
                                    <InputStepper {...field} value={field.value} step={0.25} disabled={!!employee} />
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
                                    <InputStepper {...field} value={field.value} step={0.25} disabled={!!employee} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="vacationDays2024"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Vacaciones Pendientes 2024</FormLabel>
                                <FormControl>
                                    <InputStepper {...field} value={field.value} step={1} disabled={!isFirstPeriod && !!employee} />
                                </FormControl>
                                <FormDescription>Días de 2024 que se suman a 2025.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
                 <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="isTransfer"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Viene de otro centro (traslado)</FormLabel>
                                <FormDescription>
                                    Si se marca, no se prorratean las vacaciones por fecha de inicio.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!isFirstPeriod && !!employee}
                                />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                    {isTransfer && (
                         <FormField
                            control={form.control}
                            name="vacationDaysUsedInAnotherCenter"
                            render={({ field }) => (
                                <FormItem className="rounded-lg border p-3 shadow-sm">
                                    <FormLabel>Vacaciones Disfrutadas (Otro Centro)</FormLabel>
                                    <FormControl>
                                        <InputStepper {...field} value={field.value} step={1} disabled={!isFirstPeriod && !!employee} />
                                    </FormControl>
                                    <FormDescription>Días ya consumidos en el centro de origen.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                 </div>
                {!!employee && <FormDescription className="pt-2">Los saldos iniciales y el estado de traslado solo se pueden establecer al crear el primer contrato.</FormDescription>}
            </div>

            <Accordion type="single" collapsible className="w-full">
                {employee && (
                     <AccordionItem value="item-0">
                        <AccordionTrigger>
                             <h3 className="text-lg font-medium">Modificaciones de Contrato</h3>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-medium mb-2">Cambiar Tipo de Contrato (Opcional)</h4>
                                    <p className="text-sm text-muted-foreground mb-4">Esto finalizará el periodo actual y creará uno nuevo con los balances de horas actuales.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FormField
                                            control={form.control}
                                            name="newContractType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nuevo Tipo de Contrato</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                        <SelectContent>{contractTypes.map(ct => (<SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="newContractTypeDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Fecha de Inicio del Nuevo Contrato</FormLabel>
                                                    <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-medium mb-2">Programar Cambio de Jornada (Opcional)</h4>
                                    <p className="text-sm text-muted-foreground mb-4">Añade un nuevo registro en el historial de jornadas semanales del periodo actual.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FormField
                                            control={form.control}
                                            name="newWeeklyWorkHours"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nueva Jornada Semanal</FormLabel>
                                                    <FormControl><InputStepper {...field} value={field.value} step={0.25} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="newWeeklyWorkHoursDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Fecha de Efectividad</FormLabel>
                                                    <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                         <h3 className="text-lg font-medium">Calendario Laboral Vigente</h3>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="weeklySchedules.0.effectiveDate"
                                render={({ field }) => (
                                    <FormItem className="max-w-xs">
                                        <FormLabel>Fecha de Vigencia</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormDescription>Fecha a partir de la cual se aplica este calendario.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                    </AccordionContent>
                </AccordionItem>
                {employee && (
                    <AccordionItem value="item-2">
                        <AccordionTrigger>
                            <h3 className="text-lg font-medium">Añadir Nuevo Calendario Laboral (Opcional)</h3>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                             <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="newWeeklySchedule.effectiveDate"
                                    render={({ field }) => (
                                        <FormItem className="max-w-xs">
                                            <FormLabel>Fecha de Vigencia del Nuevo Calendario</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>Dejar en blanco si no se quiere añadir un nuevo calendario.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="newWeeklySchedule"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <WeeklyScheduleEditor 
                                                    value={field.value}
                                                    onChange={field.onChange} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}
                 {!employee && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Calendario Laboral Rotativo</h3>
                        <FormField
                            control={form.control}
                            name={"weeklySchedules.0.effectiveDate"}
                            render={({ field }) => (
                                <FormItem className="max-w-xs">
                                    <FormLabel>Fecha de Vigencia</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Fecha a partir de la cual se aplicará este calendario.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                            <FormField
                            control={form.control}
                            name={"weeklySchedules.0"}
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
                 )}
            </Accordion>
            
            <div className="flex justify-between items-center mt-8">
                <Button type="submit">{employee ? 'Guardar Cambios' : 'Crear Empleado'}</Button>
                
                {employee && (
                    <AlertDialog onOpenChange={(open) => !open && setPassword('')}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Empleado
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente al empleado
                                y todos sus datos asociados del sistema.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2 py-2">
                                <Label htmlFor="password-delete">Contraseña</Label>
                                <Input
                                    id="password-delete"
                                    type="password"
                                    placeholder="Introduce tu contraseña para confirmar"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar empleado'}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
    