

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
import type { ContractType } from '@/lib/types';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  computesOrdinaryBag: z.boolean().default(true),
  computesHolidayBag: z.boolean().default(true),
  computesOffDayBag: z.boolean().default(true),
});

interface ContractTypeFormProps {
  contractType?: ContractType;
}

export function ContractTypeForm({ contractType }: ContractTypeFormProps) {
  const { toast } = useToast();
  const { createContractType, updateContractType, refreshData } = useDataProvider();
  const router = useRouter();

  const defaultValues = {
    name: '',
    computesOrdinaryBag: true,
    computesHolidayBag: true,
    computesOffDayBag: true,
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: contractType || defaultValues,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (contractType?.id) {
        await updateContractType(contractType.id, values);
        toast({ title: 'Tipo de Contrato Actualizado', description: `Se ha guardado "${values.name}".` });
      } else {
        await createContractType(values as Omit<ContractType, 'id'>);
        toast({ title: 'Tipo de Contrato Creado', description: `Se ha creado "${values.name}".` });
      }
      refreshData();
      router.push('/settings?tab=contracts');
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Contrato</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Indefinido" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Reglas de Cómputo de Bolsas</h3>
            <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="computesOrdinaryBag"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Habilitar Bolsa Ordinaria</FormLabel>
                                <FormDescription>Permite que el contrato acumule o reste horas de la bolsa principal.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                )}/>
                <FormField
                    control={form.control}
                    name="computesHolidayBag"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Habilitar Bolsa de Festivos</FormLabel>
                                <FormDescription>Permite que el contrato acumule horas por trabajar en festivos de apertura.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                )}/>
                <FormField
                    control={form.control}
                    name="computesOffDayBag"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Habilitar Bolsa de Libranza</FormLabel>
                                <FormDescription>Permite que el contrato acumule horas por librar en festivos.</FormDescription>
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
