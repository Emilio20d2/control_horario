

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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { AnnualConfiguration } from '@/lib/types';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useRouter } from 'next/navigation';
import { InputStepper } from '../ui/input-stepper';

const formSchema = z.object({
  year: z.coerce.number().min(2020, { message: 'El año debe ser 2020 o posterior.' }),
  maxAnnualHours: z.coerce.number().positive({ message: 'Las horas anuales deben ser un número positivo.' }),
  referenceWeeklyHours: z.coerce.number().positive({ message: 'Las horas semanales de referencia deben ser un número positivo.' }),
});

interface AnnualConfigFormProps {
  config?: AnnualConfiguration;
}

export function AnnualConfigForm({ config }: AnnualConfigFormProps) {
  const { toast } = useToast();
  const { createAnnualConfig, updateAnnualConfig, refreshData } = useDataProvider();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: config || {
      year: new Date().getFullYear() + 1,
      maxAnnualHours: 1792,
      referenceWeeklyHours: 40,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (config?.id) {
        await updateAnnualConfig(config.id, values);
        toast({ title: 'Configuración Actualizada', description: `Se ha guardado la configuración para el año ${values.year}.` });
      } else {
        await createAnnualConfig(values);
        toast({ title: 'Configuración Creada', description: `Se ha creado la configuración para el año ${values.year}.` });
      }
      refreshData();
      router.push('/settings?tab=annual');
      router.refresh();

    } catch (error) {
      console.error(error)
      toast({
        title: 'Error al guardar',
        description: error instanceof Error ? error.message : 'No se pudieron guardar los datos. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Año</FormLabel>
                <FormControl>
                    <InputStepper {...field} step={1} disabled={!!config} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxAnnualHours"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Jornada Anual Máxima</FormLabel>
                <FormControl>
                    <InputStepper {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referenceWeeklyHours"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Jornada Semanal de Referencia</FormLabel>
                <FormControl>
                    <InputStepper {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Form>
  );
}
