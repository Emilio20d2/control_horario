
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataProvider } from '@/hooks/use-data-provider';
import { format, getYear, eachDayOfInterval, parseISO, isWithinInterval, startOfWeek, endOfWeek, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Ausencia {
    employeeId: string;
    employeeName: string;
    groupName: string;
    startDate: Date;
    endDate: Date;
    type: string;
    substitute?: {
      name: string;
    };
}

export function ReportGenerator() {
    const { employees, employeeGroups, loading, absenceTypes, weeklyRecords, holidayEmployees } = useDataProvider();
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);
    
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        if (weeklyRecords) {
            Object.keys(weeklyRecords).forEach(id => years.add(parseInt(id.split('-')[0], 10)));
        }
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);

    const schedulableAbsenceTypes = useMemo(() => {
        return absenceTypes.filter(at => at.name === 'Vacaciones' || at.name === 'Excedencia' || at.name === 'Permiso no retribuido');
    }, [absenceTypes]);


    const allAbsences = useMemo((): Ausencia[] => {
        if (loading) return [];
        const absenceList: Ausencia[] = [];
        const schedulableAbsenceTypeIds = new Set(schedulableAbsenceTypes.map(at => at.id));

        employees.forEach(emp => {
            const group = employeeGroups.find(g => g.id === emp.groupId);
            if (!group) return;

            emp.employmentPeriods.forEach(period => {
                period.scheduledAbsences?.forEach(absence => {
                    if (schedulableAbsenceTypeIds.has(absence.absenceTypeId) && absence.endDate) {
                        const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
                        if (getYear(absence.startDate) === selectedYear || getYear(absence.endDate) === selectedYear) {
                            absenceList.push({
                                employeeId: emp.id,
                                employeeName: emp.name,
                                groupName: group.name,
                                startDate: absence.startDate,
                                endDate: absence.endDate,
                                type: absenceType?.name || 'Ausencia',
                            });
                        }
                    }
                });
            });
        });
        return absenceList;
    }, [loading, employees, employeeGroups, schedulableAbsenceTypes, absenceTypes, selectedYear, weeklyRecords]);

    const generateReport = () => {
        setIsGenerating(true);

        const groupOrder = employeeGroups.sort((a, b) => a.order - b.order).map(g => g.name);
        const groupChunks = [];
        for (let i = 0; i < groupOrder.length; i += 5) {
            groupChunks.push(groupOrder.slice(i, i + 5));
        }
        
        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        
        groupChunks.forEach((chunk, pageIndex) => {
            if (pageIndex > 0) {
                doc.addPage();
            }
            
            doc.setFontSize(18);
            doc.text(`Informe de Ausencias por Agrupaciones - ${selectedYear}`, 15, 20);
            doc.setFontSize(10);
            doc.text(`Página ${pageIndex + 1} de ${groupChunks.length}`, 297 - 15, 20, { align: 'right' });

            const head = [['Semana', 'Periodo', ...chunk]];
            const body = [];
            
            const yearStart = new Date(selectedYear, 0, 1);
            for (let i = 0; i < 53; i++) {
                const weekStart = startOfWeek(addWeeks(yearStart, i), { weekStartsOn: 1 });
                if (getYear(weekStart) > selectedYear && getISOWeek(weekStart) > 1) break;
                if (getYear(weekStart) < selectedYear) continue;

                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const row: (string | null)[] = [
                    String(getISOWeek(weekStart)),
                    `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`
                ];
                
                let hasAbsenceInRow = false;
                
                chunk.forEach(groupName => {
                    const absencesInWeekAndGroup = allAbsences.filter(a => 
                        a.groupName === groupName &&
                        isWithinInterval(weekStart, { start: a.startDate, end: a.endDate })
                    );

                    if (absencesInWeekAndGroup.length > 0) {
                        hasAbsenceInRow = true;
                        row.push(absencesInWeekAndGroup.map(a => a.employeeName).join('\n'));
                    } else {
                        row.push('');
                    }
                });

                if (hasAbsenceInRow) {
                    body.push(row);
                }
            }
            
            autoTable(doc, {
                head,
                body,
                startY: 30,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'top',
                },
                headStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                }
            });
        });
        
        doc.save(`informe_ausencias_${selectedYear}.pdf`);
        setIsGenerating(false);
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle>Generador de Informes de Ausencia</CardTitle>
                <CardDescription>
                    Crea un informe PDF paginado con las ausencias (vacaciones, excedencias) de los empleados, agrupadas por departamento.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                 <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className='w-full sm:w-48'>
                        <SelectValue placeholder="Seleccionar año..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={generateReport} disabled={isGenerating || loading} className='w-full sm:w-auto'>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Generar Informe PDF
                </Button>
            </CardContent>
        </Card>
    );
}
