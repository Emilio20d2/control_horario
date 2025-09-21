

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
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { AbsenceType } from '@/lib/types';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  abbreviation: z.string().min(1, { message: 'La abreviatura es obligatoria.' }).max(5, { message: 'Máximo 5 caracteres.' }),
  
  // Columna 1
  computesToWeeklyHours: z.boolean().default(false),
  computesToAnnualHours: z.boolean().default(false),
  suspendsContract: z.boolean().default(false),

  // Columna 2
  annualHourLimit: z.coerce.number().optional(),
  deductsHours: z.boolean().default(true),
  computesFullDay: z.boolean().default(false),
  affectedBag: z.enum(['ordinaria', 'festivos', 'libranza', 'ninguna']).default('ninguna'),
  isAbsenceSplittable: z.boolean().default(false),
});


interface AbsenceTypeFormProps {
  absenceType?: AbsenceType;
}

export function AbsenceTypeForm({ absenceType }: AbsenceTypeFormProps) {
  const { toast } = useToast();
  const { createAbsenceType, updateAbsenceType, refreshData } = useDataProvider();
  const router = useRouter();

  const defaultValues = absenceType || {
    name: 'Recuperación de Horas',
    abbreviation: 'RHA',
    computesToWeeklyHours: false,
    computesToAnnualHours: true,
    suspendsContract: false,
    annualHourLimit: undefined,
    deductsHours: true,
    computesFullDay: true,
    affectedBag: 'ninguna' as const,
    isAbsenceSplittable: false,
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const dataToSave = { ...values, annualHourLimit: values.annualHourLimit ?? null };
      if (absenceType?.id) {
        await updateAbsenceType(absenceType.id, dataToSave);
        toast({ title: 'Tipo de Ausencia Actualizado', description: `Se ha guardado "${values.name}".` });
      } else {
        await createAbsenceType(dataToSave as Omit<AbsenceType, 'id'>);
        toast({ title: 'Tipo de Ausencia Creado', description: `Se ha creado "${values.name}".` });
      }
      refreshData();
      router.push('/settings?tab=absences');
      router.refresh();

    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: 'No se pudieron guardar los datos. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          
          {/* Columna 1: Identificación y Cómputo Principal */}
          <div className="space-y-6 flex flex-col">
            <h3 className="text-lg font-medium border-b pb-2">Identificación y Cómputo Principal</h3>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Nombre de la Ausencia</FormLabel>
                  <FormControl>
                      <Input placeholder="Ej: Baja Médica" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="abbreviation"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Abreviatura</FormLabel>
                  <FormControl>
                      <Input placeholder="Ej: B" {...field} />
                  </FormControl>
                   <FormDescription>Código corto para importaciones y vistas rápidas.</FormDescription>
                  <FormMessage />
                  </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="computesToWeeklyHours"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                       <div className="space-y-0.5">
                            <FormLabel>¿Computa para Horas Semanales?</FormLabel>
                            <FormDescription>Si es Sí, protege el saldo de la bolsa ordinaria en esa semana.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
            )}/>
             <FormField
                control={form.control}
                name="computesToAnnualHours"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                       <div className="space-y-0.5">
                            <FormLabel>¿Computa para Horas Anuales?</FormLabel>
                            <FormDescription>Si es Sí, las horas de ausencia se sumarán al total de horas trabajadas en el año.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
            )}/>
            <FormField
                control={form.control}
                name="suspendsContract"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                       <div className="space-y-0.5">
                            <FormLabel>¿Suspende el Contrato?</FormLabel>
                            <FormDescription>Pausa la relación laboral y reduce proporcionalmente el objetivo de horas anuales.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
            )}/>
          </div>

          {/* Columna 2: Límites y Lógica Avanzada */}
          <div className="space-y-6 flex flex-col">
             <h3 className="text-lg font-medium border-b pb-2">Límites y Lógica Avanzada</h3>
            <FormField
              control={form.control}
              name="annualHourLimit"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Límite Anual de Horas</FormLabel>
                  <FormControl>
                      <Input type="number" placeholder="Dejar en blanco si no hay límite" {...field} value={field.value ?? ''}/>
                  </FormControl>
                   <FormDescription>Presupuesto anual de horas para este tipo de ausencia (ej: 16).</FormDescription>
                  <FormMessage />
                  </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="deductsHours"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>¿Descuenta de la Jornada?</FormLabel>
                            <FormDescription>Si es Sí, las horas de ausencia se restan de las horas teóricas del día.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
            )}/>
             <FormField
                control={form.control}
                name="computesFullDay"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                       <div className="space-y-0.5">
                            <FormLabel>¿Computa Jornada Completa?</FormLabel>
                            <FormDescription>Regla especial que trata el día como si se hubiera trabajado por completo.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
            )}/>
             <FormField
                control={form.control}
                name="affectedBag"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>¿Afecta Directamente a una Bolsa?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una bolsa" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="ninguna">No afecta a ninguna bolsa</SelectItem>
                            <SelectItem value="ordinaria">Bolsa Ordinaria</SelectItem>
                            <SelectItem value="festivos">Bolsa de Festivos</SelectItem>
                            <SelectItem value="libranza">Bolsa de Libranza</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormDescription>Para casos especiales como "Devolución de Horas".</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="isAbsenceSplittable"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                       <div className="space-y-0.5">
                            <FormLabel>¿Permite Horas Parciales?</FormLabel>
                            <FormDescription>Permite registrar una ausencia por un número de horas inferior a la jornada del día.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
            )}/>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Form>
  );
}

    