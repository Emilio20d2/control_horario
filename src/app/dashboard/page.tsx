
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
import { Users, FileDown, CalendarX2, Library, BookUser, AlertTriangle, FileSignature, ScanText, Loader2 as Loader2Icon, Mail } from 'lucide-react';
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
    const [selectedYear, setSelectedYear] = useState(getYear(referenceDate));
    const [selectedMonth, setSelectedMonth] = useState(getMonth(referenceDate));
    const [selectedBalanceReportWeek, setSelectedBalanceReportWeek] = useState(getWeekId(subWeeks(new Date(), 1)));
    const [complementaryHoursReportWeek, setComplementaryHoursReportWeek] = useState(getWeekId(subWeeks(new Date(), 1)));


    // For annual report
    const [reportEmployeeId, setReportEmployeeId] = useState('');
    const [reportYear, setReportYear] = useState(2025);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // For detailed annual report
    const [detailedReportEmployeeId, setDetailedReportEmployeeId] = useState('');
    const [detailedReportYear, setDetailedReportYear] = useState(2025);
    const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
    
    // For absence report
    const [absenceReportEmployeeId, setAbsenceReportEmployeeId] = useState('');
    const [absenceReportYear, setAbsenceReportYear] = useState(2025);
    const [isGeneratingAbsenceReport, setIsGeneratingAbsenceReport] = useState(false);
    
    // For signature report
    const [signatureReportYear, setSignatureReportYear] = useState(2025);
    const [isGeneratingSignatureReport, setIsGeneratingSignatureReport] = useState(false);

    const [isGeneratingBalanceReport, setIsGeneratingBalanceReport] = useState(false);


    
    const allEmployeesForReport = useMemo(() => {
        return employees
            .filter(e => e.employmentPeriods?.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())))
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
                 setSelectedYear(getYear(initialDate));
                 setSelectedMonth(getMonth(initialDate));
            }
        }
         if (allEmployeesForReport.length > 0) {
            if (!reportEmployeeId) setReportEmployeeId(allEmployeesForReport[0].id);
            if (!detailedReportEmployeeId) setDetailedReportEmployeeId(allEmployeesForReport[0].id);
            if (!absenceReportEmployeeId) setAbsenceReportEmployeeId(allEmployeesForReport[0].id);
        }
    }, [loading, weeklyRecords, allEmployeesForReport, reportEmployeeId, detailedReportEmployeeId, absenceReportEmployeeId]);


    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: format(new Date(selectedYear, i), 'MMMM', { locale: es }),
    }));
    
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
        if (loading || !complementaryHoursReportWeek) return null;
        return weeklyRecords[complementaryHoursReportWeek];
      }, [weeklyRecords, complementaryHoursReportWeek, loading]);

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

    const totalEmployees = employees.length;
    const activeEmployeesCount = employees.filter(e => e.employmentPeriods?.some(p => !p.endDate)).length;
    

    const chartData = employees.map(emp => ({
        name: emp.name,
        balance: getEmployeeFinalBalances(emp.id).total,
      })).sort((a, b) => b.balance - a.balance).slice(0, 10);
    
    const handleGenerateReport = () => {
        if (!complementaryHoursRecord) {
            alert("No hay datos de horas complementarias para la semana seleccionada.");
            return;
        }

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
            return;
        }

        const doc = new jsPDF();
        const weekStartDate = parseISO(complementaryHoursReportWeek);
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
        
        const safeWeekId = complementaryHoursReportWeek.replace(/-/g, '');
        doc.save(`informe-complementarias-${safeWeekId}.pdf`);
    };
    
    const parseDateFromString = (dateString: string) => {
        return parse(dateString, 'dd/MM/yyyy', new Date());
    };

    const handleGenerateAbsenceReport = async () => {
        setIsGeneratingAbsenceReport(true);
        const employee = employees.find(e => e.id === absenceReportEmployeeId);
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGeneratingAbsenceReport(false);
            return;
        }

        try {
            await generateAbsenceReportPDF(employee, absenceReportYear, weeklyRecords, absenceTypes);
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
        if (!selectedBalanceReportWeek) {
            alert("Por favor, selecciona una semana.");
            return;
        }
        setIsGeneratingBalanceReport(true);
    
        const weekDate = parseISO(selectedBalanceReportWeek);
        const nextWeekDate = addDays(weekDate, 7);
        const nextWeekId = getWeekId(nextWeekDate);

        const activeEmps = employees.filter(emp => emp.employmentPeriods?.some(p => {
            const startDate = parseISO(p.startDate as string);
            const endDate = p.endDate ? parseISO(p.endDate as string) : new Date('9999-12-31');
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
        const weekDateParsed = parseISO(selectedBalanceReportWeek);
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

        const safeWeekId = selectedBalanceReportWeek.replace(/-/g, '');
        doc.save(`informe-balances-${safeWeekId}.pdf`);

        setIsGeneratingBalanceReport(false);
    };

    const handleGenerateAnnualDetailedReport = async () => {
        setIsGeneratingDetailed(true);
        const employee = employees.find(e => e.id === detailedReportEmployeeId);
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGeneratingDetailed(false);
            return;
        }
    
        try {
            await generateAnnualDetailedReportPDF(employee, detailedReportYear, dataProvider);
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
        <div className="flex flex-col gap-6">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
              Panel de Control
            </h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Informe Resumen Anual</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
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
                        <Select value={String(reportYear)} onValueChange={v => setReportYear(Number(v))}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateAnnualReport} disabled={isGenerating || !reportEmployeeId} className="w-full">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isGenerating ? 'Generando...' : 'Generar Resumen'}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Informe Jornada Anual</CardTitle>
                    <BookUser className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={detailedReportEmployeeId} onValueChange={setDetailedReportEmployeeId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar empleado..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allEmployeesForReport.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={String(detailedReportYear)} onValueChange={v => setDetailedReportYear(Number(v))}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateAnnualDetailedReport} disabled={isGeneratingDetailed || !detailedReportEmployeeId} className="w-full">
                            {isGeneratingDetailed ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isGeneratingDetailed ? 'Generando...' : 'Generar Informe'}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    Informe Ausencias por Empleado
                    </CardTitle>
                    <CalendarX2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={absenceReportEmployeeId} onValueChange={setAbsenceReportEmployeeId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar empleado..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allEmployeesForReport.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(absenceReportYear)} onValueChange={v => setAbsenceReportYear(Number(v))}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar año..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleGenerateAbsenceReport} disabled={isGeneratingAbsenceReport || !absenceReportEmployeeId} className="w-full">
                        {isGeneratingAbsenceReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        {isGeneratingAbsenceReport ? 'Generando...' : 'Generar Resumen'}
                    </Button>
                </CardContent>
                </Card>
                <HolidayReportGenerator />
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Horas Complementarias</CardTitle>
                        <CardDescription>
                            Total semana: <span className="font-bold text-primary">+{complementaryHours.toFixed(2)}h</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={complementaryHoursReportWeek} onValueChange={setComplementaryHoursReportWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar semana..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableWeeks.map(w => (
                                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateReport} className="w-full">
                            <FileDown className="mr-2 h-4 w-4" />
                            Generar Informe
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Informe Semanal Horas</CardTitle>
                    <Library className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={selectedBalanceReportWeek} onValueChange={setSelectedBalanceReportWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar semana..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableWeeks.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateBalanceReport} disabled={isGeneratingBalanceReport || !selectedBalanceReportWeek} className="w-full">
                            {isGeneratingBalanceReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isGeneratingBalanceReport ? 'Generando...' : 'Generar Informe'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

           <div className="px-4 md:px-6 pb-4">
            <Card>
                <CardHeader>
                <CardTitle>Top 10 Empleados por Balance de Horas</CardTitle>
                <CardDescription>Los 10 empleados con el mayor balance de horas acumulado.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <RechartsBarChart data={chartData} accessibilityLayer>
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
                            <Bar dataKey="balance" fill="var(--color-balance)" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
           </div>
        </div>
      );
}

    

    