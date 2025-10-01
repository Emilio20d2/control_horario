
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Gift, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { format, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export function HolidayReportGenerator() {
    const { holidays, holidayEmployees, loading } = useDataProvider();
    const [selectedHolidays, setSelectedHolidays] = useState<Record<string, boolean>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedYear, setSelectedYear] = useState(getYear(new Date()));

    const availableYears = useMemo(() => {
        if (!holidays) return [new Date().getFullYear()];
        const years = new Set(holidays.map(h => getYear(h.date as Date)));
        const currentYear = new Date().getFullYear();
        if (!years.has(currentYear)) years.add(currentYear);
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [holidays]);

    const openingHolidays = useMemo(() => {
        return holidays
            .filter(h => h.type === 'Apertura' && getYear(h.date as Date) === selectedYear)
            .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
    }, [holidays, selectedYear]);

    const activeHolidayEmployees = useMemo(() => {
        if (!holidayEmployees) return [];
        return holidayEmployees.filter(e => e.active).sort((a, b) => a.name.localeCompare(b.name));
    }, [holidayEmployees]);

    const handleGenerateReport = () => {
        setIsGenerating(true);
        const holidayIdsToReport = Object.keys(selectedHolidays).filter(id => selectedHolidays[id]);
        
        if (holidayIdsToReport.length === 0) {
            alert('Selecciona al menos un festivo.');
            setIsGenerating(false);
            return;
        }

        const selectedHolidaysData = holidayIdsToReport.map(id => holidays.find(h => h.id === id)).filter(Boolean);
        if (selectedHolidaysData.length === 0) {
             alert('No se encontraron los datos de los festivos seleccionados.');
            setIsGenerating(false);
            return;
        }

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageMargin = 15;
        
        const addHeaderFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text(`LISTA PARA TRABAJAR FESTIVO`, pageMargin, 15);
            const pageText = `Página ${pageNumber} de ${totalPages}`;
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(pageText, doc.internal.pageSize.width - pageMargin, doc.internal.pageSize.height - 10, { align: 'right' });
        };
        
        const head = [
            'Empleado',
            ...selectedHolidaysData.map(h => format(h!.date as Date, 'dd/MM/yy'))
        ];

        const body = activeHolidayEmployees.map(emp => {
            return [
                emp.name,
                ...selectedHolidaysData.map(() => "PAGO   DEVO")
            ];
        });

        // Hack para calcular el número total de páginas
        const tempDoc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        autoTable(tempDoc, { head: [head], body, startY: 25 });
        const totalPages = tempDoc.internal.getNumberOfPages();

        autoTable(doc, {
            head: [head],
            body,
            startY: 25,
            theme: 'grid',
            pageBreak: 'auto',
            margin: { left: pageMargin, right: pageMargin, top: 25 },
            headStyles: { 
                fillColor: [41, 128, 185], 
                textColor: 255, 
                halign: 'center',
            },
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left' },
            },
             didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index > 0) {
                    doc.setFontSize(8);
                    const cell = data.cell;
                    const squareSize = 3;
                    const text1 = 'PAGO';
                    const text2 = 'DEVO';

                    // Posición para el primer checkbox y texto
                    const yPos = cell.y + cell.height / 2 + 1;
                    const xPos1 = cell.x + 3;
                    doc.rect(xPos1, yPos - squareSize, squareSize, squareSize); // Dibujar cuadrado
                    doc.text(text1, xPos1 + squareSize + 2, yPos);

                    // Posición para el segundo checkbox y texto
                    const xPos2 = cell.x + cell.width / 2;
                    doc.rect(xPos2, yPos - squareSize, squareSize, squareSize); // Dibujar cuadrado
                    doc.text(text2, xPos2 + squareSize + 2, yPos);
                    
                    data.cell.text = ''; // Limpiar el texto original
                }
            },
            didDrawPage: (data) => addHeaderFooter(doc, data.pageNumber, totalPages),
        });

        const safeDate = format(new Date(), 'yyyyMMdd_HHmm');
        doc.save(`asignacion_festivos_${safeDate}.pdf`);

        setIsGenerating(false);
    };

    if (loading) {
        return <Card><CardHeader><CardTitle>Informe de Festivos</CardTitle></CardHeader><CardContent><Loader2/></CardContent></Card>;
    }
    
    const selectedCount = Object.values(selectedHolidays).filter(Boolean).length;

    return (
        <Card className="min-w-[280px] sm:min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Informe de Festivos</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Seleccionar año..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            <span>{selectedCount > 0 ? `${selectedCount} festivo(s) seleccionado(s)` : "Seleccionar festivos..."}</span>
                            <Gift className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64">
                        <DropdownMenuLabel>Festivos de Apertura ({selectedYear})</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {openingHolidays.map(holiday => (
                            <DropdownMenuCheckboxItem
                                key={holiday.id}
                                checked={selectedHolidays[holiday.id] || false}
                                onCheckedChange={(checked) => setSelectedHolidays(prev => ({ ...prev, [holiday.id]: !!checked }))}
                                onSelect={(e) => e.preventDefault()}
                            >
                                {format(holiday.date as Date, 'dd/MM/yy')}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={handleGenerateReport} disabled={isGenerating || selectedCount === 0} className="w-full">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Generando...' : 'Generar Informe'}
                </Button>
            </CardContent>
        </Card>
    );
}
