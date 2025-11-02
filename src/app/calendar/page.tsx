

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowRight, User, Loader2, CalendarPlus, Trash2, CalendarRange, Info, Calendar as CalendarIcon, MessageCircle, UserCheck } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import {
  format,
  isWithinInterval,
  startOfDay,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  parseISO,
  isSameDay,
  isValid,
  addDays,
  isAfter,
  endOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence, HolidayReport, AbsenceType } from '@/lib/types';
import { WeekNavigator } from '@/components/schedule/week-navigator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addScheduledAbsence, hardDeleteScheduledAbsence } from '@/lib/services/employeeService';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { DayPicker } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { AddAbsenceDialog } from '@/components/schedule/add-absence-dialog';

interface CellAbsenceInfo {
    employee: Employee;
    absence: ScheduledAbsence;
    absenceType: AbsenceType;
    substituteName?: string;
    periodId: string;
}

export default function CalendarPage() {
  const { employees, holidayReports, absenceTypes, loading, getActiveEmployeesForDate, holidays, refreshData, getEmployeeBalancesForWeek, getTheoreticalHoursAndTurn } = useDataProvider();
  const { reauthenticateWithPassword } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // State for absence details dialog
  const [selectedCell, setSelectedCell] = useState<CellAbsenceInfo | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const weekDays = useMemo(() => eachDayOfInterval({ start: currentDate, end: endOfWeek(currentDate, { weekStartsOn: 1 }) }), [currentDate]);
  
  const activeEmployees = useMemo(() => {
    return getActiveEmployeesForDate(currentDate).sort((a,b) => a.name.localeCompare(b.name));
  }, [getActiveEmployeesForDate, currentDate]);


  const safeParseDate = useCallback((date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date.toDate && typeof date.toDate === 'function') return date.toDate();
    if (typeof date === 'string') {
        const parsed = parseISO(date);
        return isValid(parsed) ? parsed : null;
    }
    return null;
  }, []);

  const weeklyAbsenceData = useMemo(() => {
    if (loading) return [];

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekId = format(weekStart, 'yyyy-MM-dd');
    const activeEmployeesForWeek = getActiveEmployeesForDate(currentDate);
    const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
    const recoveryType = absenceTypes.find(at => at.name === 'Recuperación de Horas');

    const substitutesMap: Record<string, string> = {};
    holidayReports.forEach((report: HolidayReport) => {
        if (report.weekId === weekId) {
            substitutesMap[report.employeeId] = report.substituteName;
        }
    });

    const employeesWithAbsences = activeEmployeesForWeek.map((employee: Employee) => {
        const info: { employee: Employee; dayAbsences: Record<string, CellAbsenceInfo | null> } = {
            employee: employee,
            dayAbsences: {},
        };
        
        let hasAbsenceInWeek = false;
        let isPartialVacationWeek = false;
        let workDaysInVacationWeek = 0;

        // First pass: find real absences
        weekDays.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            let foundAbsence: ScheduledAbsence | null = null;
            let foundPeriodId: string | null = null;
            
            for (const period of employee.employmentPeriods || []) {
                for (const absence of period.scheduledAbsences || []) {
                    const absenceStart = safeParseDate(absence.startDate);
                    if (!absenceStart || !isValid(absenceStart)) continue;
                    
                    const absenceEnd = absence.endDate ? safeParseDate(absence.endDate) : absenceStart;
                    if (!absenceEnd || !isValid(absenceEnd)) continue;

                    if (isWithinInterval(day, { start: startOfDay(absenceStart), end: endOfDay(absenceEnd) })) {
                        foundAbsence = absence;
                        foundPeriodId = period.id;
                        break;
                    }
                }
                if (foundAbsence) break;
            }

            if (foundAbsence && foundPeriodId) {
                hasAbsenceInWeek = true;
                if (vacationType && foundAbsence.absenceTypeId === vacationType.id) {
                    isPartialVacationWeek = true;
                }
                const absenceType = absenceTypes.find(at => at.id === foundAbsence!.absenceTypeId);
                if (absenceType) {
                    info.dayAbsences[dayKey] = {
                        employee: employee,
                        absence: foundAbsence,
                        absenceType: absenceType,
                        substituteName: substitutesMap[employee.id],
                        periodId: foundPeriodId
                    };
                } else {
                     info.dayAbsences[dayKey] = null;
                }
            } else {
                info.dayAbsences[dayKey] = null;
                const { weekDaysWithTheoreticalHours } = getTheoreticalHoursAndTurn(employee.id, day);
                const dayTheoretical = weekDaysWithTheoreticalHours.find(d => d.dateKey === dayKey);
                if (dayTheoretical && dayTheoretical.theoreticalHours > 0) {
                    workDaysInVacationWeek++;
                }
            }
        });
        
        if (isPartialVacationWeek && workDaysInVacationWeek > 0 && recoveryType) {
            const balances = getEmployeeBalancesForWeek(employee.id, weekId);
            const totalBalance = balances.total;
            
            if (totalBalance > 0) {
                let availableHolidayHours = balances.holiday;
                let availableLeaveHours = balances.leave;

                weekDays.forEach(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayIsHoliday = holidays.some(h => isSameDay(h.date, day));

                    if (!info.dayAbsences[dayKey] && !dayIsHoliday) {
                        const { weekDaysWithTheoreticalHours } = getTheoreticalHoursAndTurn(employee.id, day);
                        const dayTheoretical = weekDaysWithTheoreticalHours.find(d => d.dateKey === dayKey);
                        
                        if (dayTheoretical && dayTheoretical.theoreticalHours > 0) {
                            const neededHours = dayTheoretical.theoreticalHours;
                            let usedHours = 0;

                             if (availableHolidayHours > 0) {
                                const hoursToUse = Math.min(neededHours - usedHours, availableHolidayHours);
                                if (hoursToUse > 0) {
                                    usedHours += hoursToUse;
                                    availableHolidayHours -= hoursToUse;
                                }
                            }

                            if (usedHours < neededHours && availableLeaveHours > 0) {
                                const hoursToUse = Math.min(neededHours - usedHours, availableLeaveHours);
                                if (hoursToUse > 0) {
                                    usedHours += hoursToUse;
                                    availableLeaveHours -= hoursToUse;
                                }
                            }
                            
                            if (usedHours > 0) {
                                const mockAbsence: ScheduledAbsence = { id: `auto_${dayKey}`, absenceTypeId: recoveryType.id, startDate: day, endDate: day, isDefinitive: true };
                                info.dayAbsences[dayKey] = {
                                    employee,
                                    absence: mockAbsence,
                                    absenceType: recoveryType,
                                    periodId: employee.employmentPeriods[0]?.id || ''
                                };
                                hasAbsenceInWeek = true;
                            }
                        }
                    }
                });
            }
        }


        return hasAbsenceInWeek ? info : null;
    }).filter((item): item is { employee: Employee; dayAbsences: Record<string, CellAbsenceInfo | null> } => item !== null)
      .sort((a,b) => a.employee.name.localeCompare(b.employee.name));

    return employeesWithAbsences;

  }, [loading, currentDate, getActiveEmployeesForDate, holidayReports, absenceTypes, weekDays, safeParseDate, getEmployeeBalancesForWeek, getTheoreticalHoursAndTurn, holidays]);
  
  const handleOpenDetails = (cellInfo: CellAbsenceInfo) => {
    setSelectedCell(cellInfo);
    setIsDetailDialogOpen(true);
  };
  
    const sendMessage = async (employee: Employee, text: string) => {
        if (!employee) return;
        const conversationId = employee.id;
        
        const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
        const adminMessageData = {
            text: text,
            senderId: 'admin',
            timestamp: serverTimestamp()
        };

        const convDocRef = doc(db, 'conversations', conversationId);
        const convDoc = await getDoc(convDocRef);

        if (!convDoc.exists()) {
            await setDoc(convDocRef, {
                employeeId: employee.id,
                employeeName: employee.name,
                lastMessageText: text,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: false,
                unreadByEmployee: true,
            });
        } else {
             await updateDoc(convDocRef, {
                lastMessageText: text,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: false,
                unreadByEmployee: true,
            });
        }

        await addDoc(messagesColRef, adminMessageData);
    };

  const handleRejectAbsence = async () => {
    if (!selectedCell) return;
    if (!deletePassword) {
      toast({ title: 'Contraseña requerida', description: 'Introduce tu contraseña para confirmar la eliminación.', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    try {
      const isAuthenticated = await reauthenticateWithPassword(deletePassword);
      if (!isAuthenticated) {
        toast({ title: 'Error de autenticación', description: 'La contraseña no es correcta.', variant: 'destructive' });
        setIsDeleting(false);
        return;
      }
      
      const { employee, absence, periodId } = selectedCell;

      await hardDeleteScheduledAbsence(employee.id, periodId, absence.id, absence.originalRequest);

      // Only notify if it was an original request from the employee
      if (absence.originalRequest) {
        const rejectionMessage = `Tu solicitud de ${selectedCell.absenceType.name} del ${format(safeParseDate(absence.startDate)!, 'dd/MM/yyyy')} al ${format(safeParseDate(absence.endDate)!, 'dd/MM/yyyy')} ha sido rechazada y eliminada del planificador.`;
        await sendMessage(employee, rejectionMessage);
        toast({ title: 'Ausencia Rechazada', description: `La solicitud de ${employee.name} ha sido eliminada y se le ha notificado.`, variant: 'destructive' });
      } else {
        toast({ title: 'Ausencia Eliminada', description: `La ausencia de ${employee.name} ha sido eliminada del planificador.` });
      }

      refreshData();
      setIsDetailDialogOpen(false);
      setSelectedCell(null);

    } catch (error) {
      console.error("Error rejecting absence:", error);
      toast({ title: 'Error al Rechazar', description: error instanceof Error ? error.message : "No se pudo completar la acción.", variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeletePassword('');
    }
  };


  if (loading) {
    return (
        <div className="p-4 md:p-6 space-y-4">
            <Skeleton className="h-10 w-full max-w-md mx-auto" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  const renderMobileView = () => {
    const absenceDaysByEmployee = weeklyAbsenceData.map(empData => {
        const daysWithAbsences = weekDays
            .map(day => empData.dayAbsences[format(day, 'yyyy-MM-dd')])
            .filter((cellInfo): cellInfo is CellAbsenceInfo => cellInfo !== null);
        return {
            employee: empData.employee,
            absences: daysWithAbsences
        };
    }).filter(data => data.absences.length > 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
                <WeekNavigator currentDate={currentDate} onWeekChange={setCurrentDate} onDateSelect={setCurrentDate} />
                <AddAbsenceDialog
                    isOpen={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                    activeEmployees={activeEmployees}
                    absenceTypes={absenceTypes}
                    holidays={holidays}
                    employees={employees}
                    refreshData={refreshData}
                />
            </div>
            {absenceDaysByEmployee.map(({ employee, absences }) => (
                <Card key={employee.id} className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">{employee.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-2">
                        {absences.map(cellInfo => (
                            <div
                                key={cellInfo.absence.id}
                                onClick={() => handleOpenDetails(cellInfo)}
                                className="flex items-center gap-4 p-3 rounded-md cursor-pointer hover:bg-muted/50"
                                style={{ backgroundColor: `${cellInfo.absenceType.color}40` }}
                            >
                                <div className="flex flex-col items-center justify-center w-16 shrink-0">
                                    <span className="font-semibold capitalize text-sm">{format(cellInfo.absence.startDate, 'E', { locale: es })}</span>
                                    <span className="text-muted-foreground text-xs">{format(cellInfo.absence.startDate, 'dd/MM/yyyy')}</span>
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold">{cellInfo.absenceType.name}</p>
                                    {cellInfo.substituteName && (
                                        <p className="text-xs text-muted-foreground font-semibold">Sustituto: {cellInfo.substituteName}</p>
                                    )}
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
            {!loading && weeklyAbsenceData.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No hay empleados con ausencias programadas para esta semana.
                    </CardContent>
                </Card>
            )}
        </div>
    );
};


  const renderDesktopView = () => (
    <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
            <AddAbsenceDialog 
                isOpen={isAddDialogOpen} 
                onOpenChange={setIsAddDialogOpen} 
                activeEmployees={activeEmployees} 
                absenceTypes={absenceTypes} 
                holidays={holidays}
                employees={employees}
                refreshData={refreshData}
            />
            <WeekNavigator currentDate={currentDate} onWeekChange={setCurrentDate} onDateSelect={setCurrentDate} />
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 bg-card z-10 w-[250px] min-w-[250px] p-2">Empleado</TableHead>
                            {weekDays.map(day => {
                                const holiday = holidays.find(h => isSameDay(h.date, day));
                                return (
                                    <TableHead key={day.toISOString()} className={cn("text-center min-w-[70px] p-1", holiday && 'bg-primary/10')}>
                                        <div className="flex flex-col items-center">
                                            <span>{format(day, 'E', { locale: es })}</span>
                                            <span className="text-xs text-muted-foreground">{format(day, 'dd/MM')}</span>
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {weeklyAbsenceData.map(empData => (
                            <TableRow key={empData.employee.id}>
                                <TableCell className="sticky left-0 bg-card z-10 font-medium p-2">{empData.employee.name}</TableCell>
                                {weekDays.map(day => {
                                    const dayKey = format(day, 'yyyy-MM-dd');
                                    const cellInfo = empData.dayAbsences[dayKey];
                                    const holiday = holidays.find(h => isSameDay(h.date, day));
                                    
                                    return (
                                        <TableCell 
                                            key={dayKey} 
                                            onClick={() => cellInfo && handleOpenDetails(cellInfo)}
                                            className={cn(
                                                "text-center p-1 align-middle", 
                                                cellInfo && "cursor-pointer hover:bg-muted/50",
                                                holiday && !cellInfo && 'bg-primary/5'
                                            )}
                                            style={{ backgroundColor: cellInfo ? `${cellInfo.absenceType.color}40` : undefined }}
                                        >
                                            {cellInfo ? (
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-4 w-4" />
                                                        <span className="font-bold text-sm">{cellInfo.absenceType.abbreviation}</span>
                                                    </div>
                                                    {cellInfo.substituteName && (
                                                        <span className="text-xs text-muted-foreground font-semibold truncate">{cellInfo.substituteName}</span>
                                                    )}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                         {!loading && weeklyAbsenceData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                    No hay empleados con ausencias programadas para esta semana.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  )

  return (
    <>
    <div className="p-4 md:p-6 space-y-6">
        {isMobile ? renderMobileView() : renderDesktopView()}
    </div>
    
    <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Detalle de la Ausencia</DialogTitle>
                <DialogDescription>Revisa la información de la ausencia y toma una acción si es necesario.</DialogDescription>
            </DialogHeader>
            {selectedCell && (
                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <p><strong>Empleado:</strong> {selectedCell.employee.name}</p>
                    </div>
                     <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <p><strong>Tipo:</strong> {selectedCell.absenceType.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <CalendarRange className="h-5 w-5 text-muted-foreground" />
                        <p>
                            <strong>Periodo Completo:</strong> {format(safeParseDate(selectedCell.absence.startDate)!, 'dd/MM/yyyy', {locale: es})} - {selectedCell.absence.endDate ? format(safeParseDate(selectedCell.absence.endDate)!, 'dd/MM/yyyy', {locale: es}) : 'Indefinido'}
                        </p>
                    </div>
                     {selectedCell.absence.communicatedTo && (
                        <div className="flex items-center gap-3">
                            <UserCheck className="h-5 w-5 text-muted-foreground" />
                            <p><strong>Comunicado a:</strong> {selectedCell.absence.communicatedTo}</p>
                        </div>
                    )}
                     {selectedCell.absence.notes && (
                        <div className="flex items-start gap-3">
                            <MessageCircle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                            <div>
                                <p><strong>Notas Adicionales:</strong></p>
                                <p className="text-muted-foreground whitespace-pre-wrap">{selectedCell.absence.notes}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <DialogFooter className="sm:justify-between">
                <DialogClose asChild>
                    <Button variant="secondary">Cerrar</Button>
                </DialogClose>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            <Trash2 className="mr-2 h-4 w-4" /> 
                            {selectedCell?.absence.originalRequest ? 'Rechazar y Notificar' : 'Eliminar Ausencia'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Confirmas la acción?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {selectedCell?.absence.originalRequest
                                    ? "Esta acción eliminará la ausencia del planificador y enviará un mensaje al empleado informándole del rechazo."
                                    : "Esta acción eliminará la ausencia del planificador de forma permanente."
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                         <div className="space-y-2 py-2">
                            <Label htmlFor="password-reject">Contraseña de Administrador</Label>
                            <Input id="password-reject" type="password" placeholder="Introduce tu contraseña" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRejectAbsence} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Sí, continuar'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
