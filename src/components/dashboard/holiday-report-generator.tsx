

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Gift, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { format, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { HolidayReport, HolidayReportAssignment } from '@/lib/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export function HolidayReportGenerator() {
    const { holidays, holidayEmployees, holidayReports, loading } = useDataProvider();
    const [selectedHolidays, setSelectedHolidays] = useState<Record<string, boolean>>({});
    const [isGenerating, setIsGenerating] = useState(false);

    const openingHolidays = useMemo(() => {
        const currentYear = getYear(new Date());
        return holidays
            .filter(h => h.type === 'Apertura' && getYear(h.date as Date) === currentYear)
            .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
    }, [holidays]);

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

        const doc = new jsPDF();
        const generationDate = format(new Date(), 'PPP p', { locale: es });

        doc.setFontSize(16);
        doc.text(`Informe de Festivos de Apertura`, 14, 16);
        doc.setFontSize(10);
        doc.text(`Generado el: ${generationDate}`, 14, 22);

        let finalY = 30;

        // Find the latest report to get assignments from
        const latestReport = holidayReports && holidayReports.length > 0
            ? [...holidayReports].sort((a, b) => (b.generationDate as Timestamp).toMillis() - (a.generationDate as Timestamp).toMillis())[0]
            : null;

        holidayIdsToReport.forEach(holidayId => {
            const holiday = holidays.find(h => h.id === holidayId);
            if (!holiday) return;

            const tableData = activeHolidayEmployees.map(emp => {
                const assignment = latestReport?.assignments[holidayId]?.[emp.id];
                let assignmentText = 'Sin Asignar';
                if (assignment === 'doublePay') {
                    assignmentText = 'Pago Doble';
                } else if (assignment === 'dayOff') {
                    assignmentText = 'Día Libre';
                }
                return [emp.name, assignmentText];
            });
            
            const holidayTitle = `${holiday.name} - ${format(holiday.date as Date, 'PPP', { locale: es })}`;
            doc.setFontSize(12);
            doc.text(holidayTitle, 14, finalY);

            autoTable(doc, {
                startY: finalY + 4,
                head: [['Empleado', 'Asignación']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                         finalY = data.cursor?.y || 20;
                    }
                }
            });
            
            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 15;
        });

        const safeDate = format(new Date(), 'yyyyMMdd_HHmm');
        doc.save(`informe_festivos_${safeDate}.pdf`);

        setIsGenerating(false);
        setSelectedHolidays({});
    };

    if (loading) {
        return <Card><CardHeader><CardTitle>Informe de Festivos</CardTitle></CardHeader><CardContent><Loader2/></CardContent></Card>;
    }
    
    const selectedCount = Object.values(selectedHolidays).filter(Boolean).length;

    return (
        <Card className="min-w-[280px] sm:min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Informe de Festivos (PDF)</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            <span>{selectedCount > 0 ? `${selectedCount} festivo(s) seleccionado(s)` : "Seleccionar festivos..."}</span>
                            <Gift className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64">
                        <DropdownMenuLabel>Festivos de Apertura</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {openingHolidays.map(holiday => (
                            <DropdownMenuCheckboxItem
                                key={holiday.id}
                                checked={selectedHolidays[holiday.id] || false}
                                onCheckedChange={(checked) => setSelectedHolidays(prev => ({ ...prev, [holiday.id]: !!checked }))}
                            >
                                {holiday.name} - {format(holiday.date as Date, 'dd/MM/yy')}
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
