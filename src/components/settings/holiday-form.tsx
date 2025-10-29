

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDataProvider } from '@/hooks/use-data-provider';
import type { Holiday, HolidayFormData } from '@/lib/types';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha es obligatoria.' }),
  type: z.enum(['Nacional', 'Regional', 'Local', 'Apertura']),
});

interface HolidayFormProps {
    holiday?: HolidayFormData;
}

export function HolidayForm({ holiday }: HolidayFormProps) {
  const { createHoliday, updateHoliday, refreshData } = useDataProvider();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: holiday || {
      name: '',
      date: '',
      type: 'Nacional',
    },
  });

  async function onSubmit(values: HolidayFormData) {
    try {
      if (holiday?.id) {
        await updateHoliday(holiday.id, values);
        toast({ title: 'Festivo Actualizado', description: `Se ha guardado "${values.name}".` });
      } else {
        await createHoliday(values);
        toast({
          title: 'Festivo Creado',
          description: `Se ha añadido "${values.name}" al calendario.`,
        });
      }
      
      form.reset({ name: '', date: '', type: 'Nacional' });
      refreshData();
      router.push('/settings?tab=holidays');
      router.refresh();

    } catch (error) {
        console.error(error);
      toast({
        title: 'Error al guardar festivo',
        description: error instanceof Error ? error.message : 'No se pudo guardar. Revisa si la fecha ya existe.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Año Nuevo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={!!holiday} className="h-9" />
              </FormControl>
              {holiday && <FormMessage>La fecha de un festivo no se puede editar.</FormMessage>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Nacional">Nacional</SelectItem>
                  <SelectItem value="Regional">Regional</SelectItem>
                  <SelectItem value="Local">Local</SelectItem>
                  <SelectItem value="Apertura">Apertura Comercial</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Guardar Festivo
        </Button>
      </form>
    </Form>
  );
}
