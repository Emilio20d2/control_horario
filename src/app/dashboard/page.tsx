
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileDown, CalendarX2, Library, BookUser, AlertTriangle, FileSignature, ScanText, Loader2 as Loader2Icon, Mail, User } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, CartesianGrid, XAxis, BarChart as RechartsBarChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMonth, getYear, parseISO, format, isSameDay, isAfter, startOfDay, startOfWeek, endOfMonth, endOfWeek, parse, isWithinInterval, subWeeks, getISODay, addDays, getISOWeekYear } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader2 } from 'lucide-react';
import { HolidayReportGenerator } from '@/components/dashboard/holiday-report-generator';
import { useRouter } from 'next/navigation';
import { generateAnnualReportPDF, generateAnnualDetailedReportPDF, generateAbsenceReportPDF } from '@/lib/report-generators';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const chartConfig = {
    balance: {
      label: "Balance",
      color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;


export default function DashboardPage() {
    const dataProvider = useDataProvider();
    const { employees, weeklyRecords, loading, absenceTypes, holidays, getProcessedAnnualDataForEmployee, getEmployeeFinalBalances, calculateTheoreticalAnnualWorkHours, getEmployeeBalancesForWeek, getWeekId, calculateCurrentAnnualComputedHours, getEffectiveWeeklyHours, getTheoreticalHoursAndTurn, getActivePeriod, processEmployeeWeekData, calculateBalancePreview, vacationData } = dataProvider;
    const { appUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // Redirect if not admin
    useEffect(() => {
        if (!loading && appUser && appUser.role !== 'admin') {
            router.replace('/my-profile');
        }
    }, [loading, appUser, router]);
    
    // Default to a date from data if available, otherwise today
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [selectedGeneralReportWeek, setSelectedGeneralReportWeek] = useState(getWeekId(subWeeks(new Date(), 1)));

    // For annual report
    const [reportEmployeeId, setReportEmployeeId] = useState('');
    const [reportYear, setReportYear] = useState(2025);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
    
    const [isGeneratingAbsenceReport, setIsGeneratingAbsenceReport] = useState(false);
    
    const [isGeneratingSignatureReport, setIsGeneratingSignatureReport] = useState(false);

    const [isGeneratingBalanceReport, setIsGeneratingBalanceReport] = useState(false);
    const [isGeneratingComplementaryReport, setIsGeneratingComplementaryReport] = useState(false);


    
    const allEmployeesForReport = useMemo(() => {
        return employees
            .filter(e => e.employmentPeriods?.some(p => {
                if (!p.endDate) return true;
                const endDate = p.endDate instanceof Date ? p.endDate : parseISO(p.endDate as string);
                return isAfter(endDate, new Date());
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [employees]);

    useEffect(() => {
        if (loading) return;

        if (Object.keys(weeklyRecords).length > 0) {
            const firstRecordId = Object.keys(weeklyRecords).sort()[0];
            const firstDayOfWeek = Object.keys(weeklyRecords[firstRecordId].weekData[Object.keys(weeklyRecords[firstRecordId].weekData)[0]]?.days || {})[0];
            if (firstDayOfWeek) {
                 const initialDate = new Date();
                 setReferenceDate(initialDate);
            }
        }
         if (allEmployeesForReport.length > 0) {
            if (!reportEmployeeId) setReportEmployeeId(allEmployeesForReport[0].id);
        }
    }, [loading, weeklyRecords, allEmployeesForReport, reportEmployeeId]);


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
    
    const availableWeeks = useMemo(() => {
        if (!weeklyRecords) return [];
        return Object.keys(weeklyRecords)
            .sort((a, b) => b.localeCompare(a)) // Sort weeks descending
            .map(weekId => {
                const weekStartDate = parseISO(weekId);
                const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
                
                const startDay = format(weekStartDate, 'd MMM', { locale: es });
                const endDay = format(weekEndDate, 'd MMM, yyyy', { locale: es });

                return { value: weekId, label: `${startDay} - ${endDay}`};
            });
    }, [weeklyRecords]);

    const complementaryHoursRecord = useMemo(() => {
        if (loading || !selectedGeneralReportWeek) return null;
        return weeklyRecords[selectedGeneralReportWeek];
      }, [weeklyRecords, selectedGeneralReportWeek, loading]);

    const complementaryHours = useMemo(() => {
        if (!complementaryHoursRecord) return 0;
        return Object.values(complementaryHoursRecord.weekData).reduce((empAcc, empData) => empAcc + (empData.totalComplementaryHours || 0), 0);
    }, [complementaryHoursRecord]);


    if (loading || !appUser || appUser.role !== 'admin') {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }
    
    const chartData = employees.map(emp => ({
        name: emp.name,
        balance: getEmployeeFinalBalances(emp.id).total,
      })).sort((a, b) => b.balance - a.balance).slice(0, 10);
    
    const handleGenerateComplementaryReport = () => {
        if (!complementaryHoursRecord) {
            alert("No hay datos de horas complementarias para la semana seleccionada.");
            return;
        }
        setIsGeneratingComplementaryReport(true);

        const reportData = allEmployeesForReport.map(emp => {
            const empWeekData = complementaryHoursRecord.weekData[emp.id];
            const empComplementaryHours = empWeekData?.totalComplementaryHours || 0;

            if (empComplementaryHours > 0) {
                return { name: emp.name, hours: empComplementaryHours };
            }
            return null;
        }).filter((item): item is { name: string; hours: number } => item !== null);

        if (reportData.length === 0) {
            alert("No hay horas complementarias para generar un informe en la semana seleccionada.");
            setIsGeneratingComplementaryReport(false);
            return;
        }

        const doc = new jsPDF();
        const weekStartDate = parseISO(selectedGeneralReportWeek);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
        const weekLabel = `${format(weekStartDate, 'd MMM', { locale: es })} - ${format(weekEndDate, 'd MMM yyyy', { locale: es })}`;
        
        doc.text(`Informe de Horas Complementarias - Semana del ${weekLabel}`, 14, 16);

        autoTable(doc, {
            startY: 22,
            head: [['Empleado', 'Horas Complementarias']],
            body: reportData.map(item => [item.name, item.hours.toFixed(2) + 'h']),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });
        
        const safeWeekId = selectedGeneralReportWeek.replace(/-/g, '');
        doc.save(`informe-complementarias-${safeWeekId}.pdf`);
        setIsGeneratingComplementaryReport(false);
    };
    
    const handleGenerateAbsenceReport = async () => {
        setIsGeneratingAbsenceReport(true);
        const employee = employees.find(e => e.id === reportEmployeeId);
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGeneratingAbsenceReport(false);
            return;
        }

        try {
            await generateAbsenceReportPDF(employee, reportYear, weeklyRecords, absenceTypes);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error al generar informe",
                description: error instanceof Error ? error.message : "No se pudo generar el informe de ausencias.",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingAbsenceReport(false);
        }
    };


    const handleGenerateAnnualReport = async () => {
        setIsGenerating(true);
        const employee = employees.find(e => e.id === reportEmployeeId);
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGenerating(false);
            return;
        }

        try {
            await generateAnnualReportPDF(employee, reportYear, weeklyRecords, dataProvider);
        } catch (error) {
            console.error(error);
             toast({
                title: "Error al generar informe",
                description: error instanceof Error ? error.message : "No se pudo generar el resumen anual.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateBalanceReport = () => {
        if (!selectedGeneralReportWeek) {
            alert("Por favor, selecciona una semana.");
            return;
        }
        setIsGeneratingBalanceReport(true);
    
        const weekDate = parseISO(selectedGeneralReportWeek);
        const nextWeekDate = addDays(weekDate, 7);
        const nextWeekId = getWeekId(nextWeekDate);

        const activeEmps = employees.filter(emp => emp.employmentPeriods?.some(p => {
            const startDate = p.startDate as Date;
            const endDate = p.endDate ? (p.endDate as Date) : new Date('9999-12-31');
            return isWithinInterval(weekDate, { start: startDate, end: endDate });
        }));
    
        if (activeEmps.length === 0) {
            alert("No hay empleados activos para la semana seleccionada.");
            setIsGeneratingBalanceReport(false);
            return;
        }
    
        const reportData = activeEmps.map(emp => {
            const balances = getEmployeeBalancesForWeek(emp.id, nextWeekId);
            return {
                name: emp.name,
                ordinary: balances.ordinary.toFixed(2),
                holiday: balances.holiday.toFixed(2),
                leave: balances.leave.toFixed(2),
                total: (balances.ordinary + balances.holiday + balances.leave).toFixed(2),
            };
        });
    
        const doc = new jsPDF();
        const weekDateParsed = parseISO(selectedGeneralReportWeek);
        const weekLabel = `${format(weekDateParsed, 'd MMM', { locale: es })} - ${format(endOfWeek(weekDateParsed, { weekStartsOn: 1 }), 'd MMM, yyyy', { locale: es })}`;
        const pageMargin = 14;
        const addHeader = () => {
             doc.setFontSize(16).setFont('helvetica', 'bold');
             doc.text(`Informe de Balances (Final Semana ${weekLabel})`, pageMargin, 20);
        };
        const addFooter = () => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10).setFont('helvetica', 'normal');
                const text = `Página ${i} de ${pageCount}`;
                const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
                doc.text(text, doc.internal.pageSize.getWidth() - pageMargin - textWidth, doc.internal.pageSize.getHeight() - 10);
            }
        };

        autoTable(doc, {
            head: [['Empleado', 'B. Ordinaria', 'B. Festivos', 'B. Libranza', 'Balance Total']],
            body: reportData.map(d => [d.name, `${d.ordinary}h`, `${d.holiday}h`, `${d.leave}h`, `${d.total}h`]),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            didDrawPage: (data) => {
                // Add header to each page
                addHeader();
            },
            margin: { top: 30 },
        });

        addFooter();

        const safeWeekId = selectedGeneralReportWeek.replace(/-/g, '');
        doc.save(`informe-balances-${safeWeekId}.pdf`);

        setIsGeneratingBalanceReport(false);
    };

    const handleGenerateAnnualDetailedReport = async () => {
        setIsGeneratingDetailed(true);
        const employee = employees.find(e => e.id === reportEmployeeId);
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGeneratingDetailed(false);
            return;
        }
    
        try {
            await generateAnnualDetailedReportPDF(employee, reportYear, dataProvider);
        } catch (error) {
             console.error(error);
             toast({
                title: "Error al generar informe",
                description: error instanceof Error ? error.message : "No se pudo generar el informe de jornada anual.",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingDetailed(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
              Panel de Control
            </h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <CardTitle className="text-xl font-bold">Informes por Empleado</CardTitle>
                        <Select value={String(reportYear)} onValueChange={v => setReportYear(Number(v))}>
                            <SelectTrigger className="h-8 text-xs w-28">
                                <SelectValue placeholder="Año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={reportEmployeeId} onValueChange={setReportEmployeeId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar empleado..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allEmployeesForReport.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            <Button onClick={handleGenerateAnnualReport} disabled={isGenerating || !reportEmployeeId}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                {isGenerating ? 'Generando...' : 'Resumen Anual'}
                            </Button>
                             <Button onClick={handleGenerateAnnualDetailedReport} disabled={isGeneratingDetailed || !reportEmployeeId}>
                                {isGeneratingDetailed ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookUser className="mr-2 h-4 w-4" />}
                                {isGeneratingDetailed ? 'Generando...' : 'Jornada Anual'}
                            </Button>
                             <Button onClick={handleGenerateAbsenceReport} disabled={isGeneratingAbsenceReport || !reportEmployeeId}>
                                {isGeneratingAbsenceReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarX2 className="mr-2 h-4 w-4" />}
                                {isGeneratingAbsenceReport ? 'Generando...' : 'Informe Ausencias'}
                            </Button>
                            <Button onClick={() => router.push(`/employees/${reportEmployeeId}`)} disabled={!reportEmployeeId} variant="outline">
                               <User className="mr-2 h-4 w-4" />
                                Ver Ficha
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                <HolidayReportGenerator />
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">Informes Generales</CardTitle>
                        <Library className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={selectedGeneralReportWeek} onValueChange={setSelectedGeneralReportWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar semana..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableWeeks.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            <div className="space-y-2 rounded-md border p-4">
                                <div className="flex justify-between items-center">
                                    <CardDescription>
                                        Total semana: <span className="font-bold text-primary">+{complementaryHours.toFixed(2)}h</span>
                                    </CardDescription>
                                    <Button onClick={handleGenerateComplementaryReport} size="sm" disabled={isGeneratingComplementaryReport || !selectedGeneralReportWeek}>
                                        {isGeneratingComplementaryReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                        H. Complem.
                                    </Button>
                                </div>
                            </div>

                             <div className="space-y-2 rounded-md border p-4">
                                 <div className="flex justify-between items-center">
                                    <CardDescription>
                                        Balances de plantilla para la semana.
                                    </CardDescription>
                                    <Button onClick={handleGenerateBalanceReport} size="sm" disabled={isGeneratingBalanceReport || !selectedGeneralReportWeek}>
                                        {isGeneratingBalanceReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                        Balances
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">Top 10 Empleados por Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <ChartContainer config={chartConfig} className="w-full h-full min-h-[250px]">
                             <RechartsBarChart data={chartData} accessibilityLayer>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <ChartTooltip 
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        formatter={(value) => `${Number(value).toFixed(2)}h`}
                                        indicator="dot"
                                    />} 
                                />
                                <Bar dataKey="balance" fill="url(#colorBalance)" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
      );
}

    

    

    

    