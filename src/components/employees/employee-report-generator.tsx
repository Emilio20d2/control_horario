'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Loader2, FileDown } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { useDataProvider } from '@/hooks/use-data-provider';

type ReportType = 'annual-summary' | 'annual-workday' | 'absences';

export function EmployeeReportGenerator({ employee }: { employee: Employee }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);

    const { availableYears } = useDataProvider();

    const handleGenerateAndSend = async () => {
        if (!selectedReport || !employee.email) return;
        
        setIsGenerating(true);
        // In a real scenario, this would call a server action to generate the PDF
        // and then trigger the email. For now, we simulate it.
        console.log(`Generating ${selectedReport} for ${employee.name} for year ${selectedYear}`);
        
        // This is where you'd call your report generation functions from reportActions.ts
        // e.g., await generateAnnualReportServer(employee.id, selectedYear);
        
        // Simulate PDF generation delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const subject = `Informe de ${selectedYear}: ${getReportName(selectedReport)}`;
        const body = `Hola ${employee.name},\n\nAdjunto tu informe de ${getReportName(selectedReport)} para el año ${selectedYear}.\n\nSaludos.`;
        const mailtoLink = `mailto:${employee.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.location.href = mailtoLink;
        
        setIsGenerating(false);
        setDialogOpen(false);
        setSelectedReport(null);
    };

    const getReportName = (type: ReportType) => {
        switch (type) {
            case 'annual-summary': return 'Resumen Anual';
            case 'annual-workday': return 'Jornada Anual';
            case 'absences': return 'Ausencias';
            default: return 'Informe';
        }
    };

    const handleMenuSelect = (reportType: ReportType) => {
        setSelectedReport(reportType);
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
                        <DialogTitle>Generar y Enviar {selectedReport ? getReportName(selectedReport) : ''}</DialogTitle>
                        <DialogDescription>
                            Selecciona el año para el informe de {employee.name}. Se abrirá tu cliente de correo para que puedas adjuntar el archivo generado.
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
