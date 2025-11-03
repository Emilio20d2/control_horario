

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Loader2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { useDataProvider } from '@/hooks/use-data-provider';
import { getYear, getISOWeekYear, parseISO } from 'date-fns';
import { generateAnnualReportPDF, generateAnnualDetailedReportPDF, generateAbsenceReportPDF } from '@/lib/report-generators';
import { useToast } from '@/hooks/use-toast';

type ReportType = 'annual-summary' | 'annual-workday' | 'absences';

export function EmployeeReportGenerator({ employee }: { employee: Employee }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const dataProvider = useDataProvider();
    const { weeklyRecords, absenceTypes, getEmployeeBalancesForWeek, calculateBalancePreview, getActivePeriod, getEffectiveWeeklyHours, holidays, getWeekId, getProcessedAnnualDataForEmployee, calculateTheoreticalAnnualWorkHours, calculateCurrentAnnualComputedHours } = dataProvider;

    const availableYears = useMemo(() => {
        if (!weeklyRecords) return [new Date().getFullYear()];
        const years = new Set(Object.keys(weeklyRecords).map(id => getISOWeekYear(parseISO(id))));
        const currentYear = new Date().getFullYear();
        if (!years.has(currentYear)) {
            years.add(currentYear);
        }
        // Add next year for future reports
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);


    const handleGenerateReport = async () => {
        if (!selectedReport) return;
        
        setIsGenerating(true);
        
        try {
            switch (selectedReport) {
                case 'annual-summary':
                    await generateAnnualReportPDF(employee, selectedYear, weeklyRecords, dataProvider);
                    break;
                case 'annual-workday':
                    await generateAnnualDetailedReportPDF(employee, selectedYear, dataProvider);
                    break;
                case 'absences':
                    await generateAbsenceReportPDF(employee, selectedYear, weeklyRecords, absenceTypes);
                    break;
            }
        } catch (error) {
            console.error('Error generating report:', error);
            toast({
                title: 'Error al generar el informe',
                description: error instanceof Error ? error.message : 'No se pudo generar el PDF.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
            setDialogOpen(false);
            setSelectedReport(null);
        }
    };

    const getReportName = (type: ReportType | null) => {
        if (!type) return 'Informe';
        switch (type) {
            case 'annual-summary': return 'Resumen Anual';
            case 'annual-workday': return 'Jornada Anual';
            case 'absences': return 'Informe de Ausencias';
            default: return 'Informe';
        }
    };

    const handleMenuSelect = (reportType: ReportType) => {
        setSelectedReport(reportType);
        setSelectedYear(getYear(new Date()));
        setDialogOpen(true);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button>
                        <FileDown className="mr-2 h-4 w-4" />
                        Generar Informe
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Seleccionar Informe</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleMenuSelect('annual-summary')}>Resumen Anual</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleMenuSelect('annual-workday')}>Jornada Anual</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleMenuSelect('absences')}>Informe de Ausencias</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generar {getReportName(selectedReport)}</DialogTitle>
                        <DialogDescription>
                            Selecciona el año para el informe de {employee.name}. Se descargará el PDF.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleGenerateReport} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Generar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
