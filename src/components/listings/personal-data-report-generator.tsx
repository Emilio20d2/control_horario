
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical, FileDown, Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';

const availableFields = [
    { id: 'employeeNumber', label: 'Nº Empleado' },
    { id: 'dni', label: 'DNI' },
    { id: 'phone', label: 'Teléfono' },
    { id: 'email', label: 'Email' },
    { id: 'contractType', label: 'Tipo Contrato' },
    { id: 'weeklyHours', label: 'Jornada Semanal' },
] as const;

type FieldId = typeof availableFields[number]['id'];

const formSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio.'),
  description: z.string().optional(),
  fields: z.array(z.string()).min(1, 'Debes seleccionar al menos un campo.'),
});

export function PersonalDataReportGenerator() {
  const { employees, getEffectiveWeeklyHours } = useDataProvider();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [orderedFields, setOrderedFields] = useState<FieldId[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      fields: [],
    },
  });

  const selectedFields = form.watch('fields');

  useState(() => {
    const newOrderedFields = availableFields
      .map(f => f.id)
      .filter(id => selectedFields.includes(id));
    
    const currentSelectionSet = new Set(selectedFields);
    const orderedSelectionSet = new Set(orderedFields);
    
    let finalOrder = [...orderedFields].filter(f => currentSelectionSet.has(f));
    
    for (const field of selectedFields) {
      if (!orderedSelectionSet.has(field)) {
        finalOrder.push(field);
      }
    }
    setOrderedFields(finalOrder);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  });


  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrderedFields(items);
  };

  const getEmployeeData = (employee: any, fieldId: FieldId) => {
    const activePeriod = employee.employmentPeriods?.find((p: any) => !p.endDate || isAfter(parseISO(p.endDate), new Date()));
    
    switch (fieldId) {
        case 'employeeNumber': return employee.employeeNumber || '';
        case 'dni': return employee.dni || '';
        case 'phone': return employee.phone || '';
        case 'email': return employee.email || '';
        case 'contractType': return activePeriod?.contractType || '';
        case 'weeklyHours': return activePeriod ? `${getEffectiveWeeklyHours(activePeriod, new Date()).toFixed(2)}h` : '';
        default: return '';
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    try {
        const activeEmployees = employees.filter(e => e.employmentPeriods?.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())));

        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        const pageMargin = 15;

        doc.setFontSize(16).setFont('helvetica', 'bold');
        doc.text(data.title.toUpperCase(), pageMargin, pageMargin);

        if(data.description) {
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const descriptionLines = doc.splitTextToSize(data.description, doc.internal.pageSize.width - (pageMargin * 2));
            doc.text(descriptionLines, pageMargin, pageMargin + 8);
        }

        const headers = ['Empleado', ...orderedFields.map(fieldId => availableFields.find(f => f.id === fieldId)?.label || '')];
        const body = activeEmployees.map(emp => [
            emp.name,
            ...orderedFields.map(fieldId => getEmployeeData(emp, fieldId))
        ]);

        autoTable(doc, {
            head: [headers],
            body,
            startY: data.description ? pageMargin + 15 + (doc.getTextDimensions(data.description).h) : pageMargin + 10,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        });
        
        const safeTitle = data.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        doc.save(`formulario_datos_${safeTitle}_${format(new Date(), 'yyyyMMdd')}.pdf`);

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error al generar PDF',
        description: 'Hubo un problema al crear el documento.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
      <CardHeader>
        <CardTitle>Formulario de Datos Personales</CardTitle>
        <CardDescription>
          Selecciona los campos de datos que quieres incluir en el informe, ordénalos y genera un PDF.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Título del Informe</FormLabel>
                            <FormControl><Input placeholder="Ej: Datos de Contacto de Plantilla" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="mt-4">
                            <FormLabel>Descripción (Opcional)</FormLabel>
                            <FormControl><Textarea placeholder="Añade una breve explicación que aparecerá debajo del título en el PDF." {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="fields"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Campos a Incluir</FormLabel>
                            <FormMessage />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {availableFields.map((field) => (
                            <FormField
                                key={field.id}
                                control={form.control}
                                name="fields"
                                render={({ field: formField }) => {
                                return (
                                    <FormItem
                                    key={field.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                    <FormControl>
                                        <Checkbox
                                        checked={formField.value?.includes(field.id)}
                                        onCheckedChange={(checked) => {
                                            const updatedValue = checked
                                            ? [...(formField.value || []), field.id]
                                            : (formField.value || []).filter(
                                                (value) => value !== field.id
                                            );
                                            formField.onChange(updatedValue);
                                            
                                            if(checked) {
                                                setOrderedFields(prev => [...prev, field.id]);
                                            } else {
                                                setOrderedFields(prev => prev.filter(id => id !== field.id));
                                            }
                                        }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {field.label}
                                    </FormLabel>
                                    </FormItem>
                                )
                                }}
                            />
                            ))}
                        </div>
                        </FormItem>
                    )}
                />
            </div>
            
            {orderedFields.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Ordenar Columnas</h3>
                    <p className="text-sm text-muted-foreground">Arrastra y suelta los campos para cambiar el orden de las columnas en el PDF.</p>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="columns">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 rounded-md border p-4">
                                {orderedFields.map((fieldId, index) => {
                                    const field = availableFields.find(f => f.id === fieldId);
                                    if (!field) return null;
                                    return (
                                        <Draggable key={field.id} draggableId={field.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="flex items-center gap-2 rounded-md border bg-background p-2"
                                                >
                                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                    <span>{field.label}</span>
                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                        </Droppable>
                    </DragDropContext>
                </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Generar PDF
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    