
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Loader2, FileDown } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { useDataProvider } from '@/hooks/use-data-provider';
import { generateAnnualReport, generateAnnualDetailedReport, generateAbsenceReport } from '@/lib/actions/reportActions';
import { getYear } from 'date-fns';

type ReportType = 'annual-summary' | 'annual-workday' | 'absences';

export function EmployeeReportGenerator({ employee }: { employee: Employee }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);

    const { weeklyRecords } = useDataProvider();

    const availableYears = useMemo(() => {
        if (!weeklyRecords) return [new Date().getFullYear()];
        const years = new Set(Object.keys(weeklyRecords).map(id => parseInt(id.split('-')[0])));
        const currentYear = new Date().getFullYear();
        if (!years.has(currentYear)) {
            years.add(currentYear);
        }
        // Add next year for future reports
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);


    const handleGenerateAndSend = async () => {
        if (!selectedReport || !employee.email) return;
        
        setIsGenerating(true);
        
        try {
            let subject = '';
            let body = '';
            let pdfBlob: Blob | null = null;
            
            switch (selectedReport) {
                case 'annual-summary':
                    subject = `Informe de Resumen Anual ${selectedYear}`;
                    body = `Hola ${employee.name},\n\nAdjunto tu informe de resumen anual para el año ${selectedYear}.\n\nSaludos.`;
                    pdfBlob = await generateAnnualReport(employee.id, selectedYear);
                    break;
                case 'annual-workday':
                    subject = `Informe de Jornada Anual ${selectedYear}`;
                    body = `Hola ${employee.name},\n\nAdjunto tu informe de jornada anual para el año ${selectedYear}.\n\nSaludos.`;
                    pdfBlob = await generateAnnualDetailedReport(employee.id, selectedYear);
                    break;
                case 'absences':
                    subject = `Informe de Ausencias ${selectedYear}`;
                    body = `Hola ${employee.name},\n\nAdjunto tu informe de ausencias para el año ${selectedYear}.\n\nSaludos.`;
                    pdfBlob = await generateAbsenceReport(employee.id, selectedYear);
                    break;
            }

            if (pdfBlob) {
                // Descargar el PDF
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pdfBlob);
                const safeEmployeeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const fileName = `informe_${selectedReport}_${safeEmployeeName}_${selectedYear}.pdf`;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
            
            const mailtoLink = `mailto:${employee.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;

        } catch (error) {
            console.error('Error generating report:', error);
            // Handle error toast if needed
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
            case 'absences': return 'Ausencias';
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
                        <Mail className="mr-2 h-4 w-4" />
                        Generar Informe para Enviar
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
                        <DialogTitle>Generar y Enviar {getReportName(selectedReport)}</DialogTitle>
                        <DialogDescription>
                            Selecciona el año para el informe de {employee.name}. Se descargará el PDF y se abrirá tu cliente de correo.
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
                        <Button onClick={handleGenerateAndSend} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Generar y Enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
