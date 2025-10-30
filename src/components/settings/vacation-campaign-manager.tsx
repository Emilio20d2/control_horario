

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import * as z from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from '../ui/checkbox';
import type { VacationCampaign } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';


const campaignSchema = z.object({
  title: z.string().min(1, "El título es obligatorio."),
  description: z.string().optional(),
  submissionStartDate: z.string().min(1, "La fecha es obligatoria."),
  submissionEndDate: z.string().min(1, "La fecha es obligatoria."),
  absenceStartDate: z.string().min(1, "La fecha es obligatoria."),
  absenceEndDate: z.string().min(1, "La fecha es obligatoria."),
  allowedAbsenceTypeIds: z.array(z.string()).min(1, "Debe seleccionar al menos un tipo de ausencia."),
});

export function VacationCampaignManager() {
  const { vacationCampaigns, absenceTypes, loading, createVacationCampaign, updateVacationCampaign, deleteVacationCampaign } = useDataProvider();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<VacationCampaign | null>(null);

  const form = useForm<z.infer<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      description: '',
      submissionStartDate: '',
      submissionEndDate: '',
      absenceStartDate: '',
      absenceEndDate: '',
      allowedAbsenceTypeIds: [],
    },
  });

  const handleOpenDialog = (campaign: VacationCampaign | null) => {
    setEditingCampaign(campaign);
    if (campaign) {
      const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);
      form.reset({
        title: campaign.title,
        description: campaign.description,
        submissionStartDate: format(toDate(campaign.submissionStartDate), 'yyyy-MM-dd'),
        submissionEndDate: format(toDate(campaign.submissionEndDate), 'yyyy-MM-dd'),
        absenceStartDate: format(toDate(campaign.absenceStartDate), 'yyyy-MM-dd'),
        absenceEndDate: format(toDate(campaign.absenceEndDate), 'yyyy-MM-dd'),
        allowedAbsenceTypeIds: campaign.allowedAbsenceTypeIds,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        submissionStartDate: '',
        submissionEndDate: '',
        absenceStartDate: '',
        absenceEndDate: '',
        allowedAbsenceTypeIds: [],
      });
    }
    setDialogOpen(true);
  };
  
  const handleToggleActive = async (campaign: VacationCampaign) => {
    try {
        await updateVacationCampaign(campaign.id, { isActive: !campaign.isActive });
        toast({ title: 'Estado de la campaña actualizado.' });
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo actualizar el estado de la campaña.', variant: 'destructive'});
    }
  }

  const handleDelete = async (id: string) => {
    try {
        await deleteVacationCampaign(id);
        toast({ title: 'Campaña eliminada.', variant: 'destructive' });
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la campaña.', variant: 'destructive'});
    }
  }

  const onSubmit = async (values: z.infer<typeof campaignSchema>) => {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...values,
        submissionStartDate: parseISO(values.submissionStartDate),
        submissionEndDate: parseISO(values.submissionEndDate),
        absenceStartDate: parseISO(values.absenceStartDate),
        absenceEndDate: parseISO(values.absenceEndDate),
      };

      if (editingCampaign) {
        await updateVacationCampaign(editingCampaign.id, dataToSave);
        toast({ title: 'Campaña actualizada correctamente.' });
      } else {
        await createVacationCampaign({ ...dataToSave, isActive: false });
        toast({ title: 'Campaña creada correctamente.' });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo guardar la campaña.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const schedulableAbsenceTypes = absenceTypes.filter(at => ['Vacaciones', 'Excedencia', 'Permiso no retribuido'].includes(at.name));
  
  const formatDate = (date: Date | Timestamp): string => {
    if (!date) return '';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return format(jsDate, 'dd/MM/yy');
  };

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <div>
          <CardTitle>Campañas de Solicitud de Ausencias</CardTitle>
          <CardDescription>
            Gestiona periodos para que los empleados soliciten ausencias a través del chat.
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Campaña
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Periodo Solicitud</TableHead>
              <TableHead>Periodo Ausencia</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : !vacationCampaigns || vacationCampaigns.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">No hay campañas creadas.</TableCell></TableRow>
            ) : (
              vacationCampaigns.map(campaign => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.title}</TableCell>
                  <TableCell>
                    {formatDate(campaign.submissionStartDate)} - {formatDate(campaign.submissionEndDate)}
                  </TableCell>
                  <TableCell>
                    {formatDate(campaign.absenceStartDate)} - {formatDate(campaign.absenceEndDate)}
                  </TableCell>
                  <TableCell>
                    <Switch checked={campaign.isActive} onCheckedChange={() => handleToggleActive(campaign)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(campaign)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(campaign.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Editar' : 'Crear'} Campaña de Solicitud</DialogTitle>
            <DialogDescription>
              Configura los detalles y periodos para la solicitud de ausencias.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Título de la Campaña</Label>
                    <Input id="title" {...form.register('title')} />
                    {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Tipos de Ausencia Permitidos</Label>
                    <div className="flex items-center space-x-4 pt-2">
                         <Controller
                            name="allowedAbsenceTypeIds"
                            control={form.control}
                            render={({ field }) => (
                                <>
                                    {schedulableAbsenceTypes.map(type => (
                                        <div key={type.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={type.id}
                                                checked={field.value?.includes(type.id)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...field.value, type.id])
                                                        : field.onChange(field.value?.filter(value => value !== type.id))
                                                }}
                                            />
                                            <label htmlFor={type.id} className="text-sm font-medium">{type.name}</label>
                                        </div>
                                    ))}
                                </>
                            )}
                         />
                    </div>
                     {form.formState.errors.allowedAbsenceTypeIds && <p className="text-sm text-destructive">{form.formState.errors.allowedAbsenceTypeIds.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea id="description" {...form.register('description')} placeholder="Explica brevemente de qué trata la campaña. Esto se mostrará en el chat." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium px-1">Periodo de Solicitud</legend>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="submissionStartDate">Desde</Label>
                    <Input id="submissionStartDate" type="date" {...form.register('submissionStartDate')} />
                     {form.formState.errors.submissionStartDate && <p className="text-sm text-destructive">{form.formState.errors.submissionStartDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submissionEndDate">Hasta</Label>
                    <Input id="submissionEndDate" type="date" {...form.register('submissionEndDate')} />
                     {form.formState.errors.submissionEndDate && <p className="text-sm text-destructive">{form.formState.errors.submissionEndDate.message}</p>}
                  </div>
                </div>
              </fieldset>
              <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium px-1">Periodo de Ausencia a Disfrutar</legend>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="absenceStartDate">Desde</Label>
                    <Input id="absenceStartDate" type="date" {...form.register('absenceStartDate')} />
                     {form.formState.errors.absenceStartDate && <p className="text-sm text-destructive">{form.formState.errors.absenceStartDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="absenceEndDate">Hasta</Label>
                    <Input id="absenceEndDate" type="date" {...form.register('absenceEndDate')} />
                     {form.formState.errors.absenceEndDate && <p className="text-sm text-destructive">{form.formState.errors.absenceEndDate.message}</p>}
                  </div>
                </div>
              </fieldset>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Campaña
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
