
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, FileDown, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HolidayEmployeeManager } from '@/components/settings/holiday-employee-manager';
import { Textarea } from '@/components/ui/textarea';

const columnSchema = z.object({
  name: z.string().min(1, 'El nombre de la columna es obligatorio.'),
  type: z.enum(['checkbox', 'freeText']),
  options: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, 'El título del listado es obligatorio.'),
  description: z.string().optional(),
  columns: z.array(columnSchema).min(1, 'Debe haber al menos una columna.'),
});

export default function ListingsPage() {
  const { employees, holidayEmployees } = useDataProvider();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const unifiedEmployees = useMemo(() => {
    const mainEmployeeNames = new Set(employees.map(e => e.name.trim().toLowerCase()));
    const externalEmployees = holidayEmployees.filter(he => !mainEmployeeNames.has(he.name.trim().toLowerCase()));

    return [...employees, ...externalEmployees].sort((a,b) => a.name.localeCompare(b.name));
  }, [employees, holidayEmployees]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      columns: [{ name: '', type: 'checkbox', options: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'columns',
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    try {
      generatePdf(data);
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

  const generatePdf = (data: z.infer<typeof formSchema>) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageMargin = 15;
    let startY = 25; // Aumentado para bajar la tabla

    const addHeaderFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
        let currentY = 15;
        doc.setFontSize(16).setFont('helvetica', 'bold');
        doc.text(data.title.toUpperCase(), pageMargin, currentY);
        currentY += 8;
        
        if (data.description) {
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const descriptionLines = doc.splitTextToSize(data.description, doc.internal.pageSize.width - (pageMargin * 2));
            doc.text(descriptionLines, pageMargin, currentY);
            currentY += (descriptionLines.length * 5) + 5;
        } else {
            currentY += 2;
        }
      
        const pageText = `Página ${pageNumber} de ${totalPages}`;
        doc.setFontSize(10).setFont('helvetica', 'normal');
        doc.text(pageText, doc.internal.pageSize.width - pageMargin, doc.internal.pageSize.height - 10, { align: 'right' });
        
        return currentY;
    };

    const head = [['Empleado', ...data.columns.map(c => c.name)]];

    const body = unifiedEmployees.map(emp => [
        emp.name,
        ...data.columns.map(col => '')
    ]);

    // Hack para calcular el número total de páginas
    const tempDoc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    let tempY = startY;
     if (data.description) {
        const descriptionLines = tempDoc.splitTextToSize(data.description, doc.internal.pageSize.width - (pageMargin * 2));
        tempY += (descriptionLines.length * 5) + 13;
    } else {
        tempY += 10;
    }
    autoTable(tempDoc, { head, body, startY: tempY });
    const totalPages = tempDoc.internal.getNumberOfPages();
    
    const columnStyles: { [key: number]: any } = { 0: { cellWidth: 'auto' } };
    for (let i = 1; i < head[0].length; i++) {
        columnStyles[i] = { cellWidth: 'wrap' };
    }

    autoTable(doc, {
        head,
        body,
        startY: startY,
        theme: 'grid',
        pageBreak: 'auto',
        margin: { left: pageMargin, right: pageMargin, top: 15, bottom: 20 }, // Aumentado el margen inferior
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        columnStyles: columnStyles,
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
                const columnDef = form.getValues('columns')[data.column.index - 1];
                if (columnDef.type === 'checkbox') {
                    data.cell.text = []; // Clear original text
                    doc.setFontSize(8);
                    const cell = data.cell;
                    const options = (columnDef.options || '').split(',').map(opt => opt.trim()).filter(Boolean);
                    const squareSize = 4;
                    let currentX = cell.x + 3;
                    const yPos = cell.y + cell.height / 2 + 1;

                    doc.setLineWidth(0.5);

                    if (options.length > 0) {
                        options.forEach((option, index) => {
                            if (index > 0) {
                               currentX += 20;
                            }
                            doc.rect(currentX, yPos - squareSize, squareSize, squareSize);
                            doc.text(option, currentX + squareSize + 2, yPos);
                        });
                    } else {
                        // Si no hay opciones, dibuja un solo cuadrado
                         doc.rect(currentX, yPos - squareSize, squareSize, squareSize);
                    }
                }
            }
        },
        didDrawPage: (hookData) => {
            const newStartY = addHeaderFooter(doc, hookData.pageNumber, totalPages);
            // @ts-ignore
            hookData.cursor.y = newStartY;
        },
    });

    const safeTitle = data.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`listado_${safeTitle}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 md:px-6 pt-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Listados Personalizados</h1>
      </div>
      <div className="px-4 md:px-6 pb-4">
        <Tabs defaultValue="generator">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generator">Generador de Listados</TabsTrigger>
            <TabsTrigger value="employees">Empleados Eventuales</TabsTrigger>
          </TabsList>
          <TabsContent value="generator">
            <Card>
              <CardHeader>
                <CardTitle>Crea un Listado Personalizado</CardTitle>
                <CardDescription>
                  Define el título, las columnas y el contenido para generar un formulario en PDF listo para imprimir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título del Listado</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Control de Entrega de Uniformes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Añade una breve explicación que aparecerá debajo del título en el PDF." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label>Columnas del Listado</Label>
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex flex-col md:flex-row items-start md:items-end gap-4 p-4 border rounded-lg">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-grow w-full">
                            <FormField
                              control={form.control}
                              name={`columns.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombre Columna {index + 1}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej: Firma" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`columns.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo de Contenido</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="checkbox">Casillas de verificación</SelectItem>
                                      <SelectItem value="freeText">Campo libre (para rellenar)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Controller
                              control={form.control}
                              name={`columns.${index}.type`}
                              render={({ field: { value } }) => value === 'checkbox' ? (
                                  <FormField
                                    control={form.control}
                                    name={`columns.${index}.options`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Etiquetas de Casillas</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Entregado, Devuelto" {...field} />
                                        </FormControl>
                                        <FormDescription>Separadas por comas.</FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                  />
                                ) : null
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => remove(index)}
                            className="mt-4 md:mt-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ name: '', type: 'checkbox', options: '' })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Columna
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Generar PDF
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="employees">
            <HolidayEmployeeManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
