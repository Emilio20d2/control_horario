
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowRight, User, Loader2, Trash2, CalendarRange, Info, Calendar as CalendarIcon, MessageCircle, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
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
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence, HolidayReport, AbsenceType } from '@/lib/types';
import { WeekNavigator } from '@/components/schedule/week-navigator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { hardDeleteScheduledAbsence } from '@/lib/services/employeeService';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { AddAbsenceDialog } from '@/components/schedule/add-absence-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';


interface CellAbsenceInfo {
    employee: Employee;
    absence: ScheduledAbsence;
    absenceType: AbsenceType;
    periodId: string;
}

export default function CalendarPage() {
  const { employees, absenceTypes, loading, getActiveEmployeesForDate, holidays, refreshData, getTheoreticalHoursAndTurn } = useDataProvider();
  const { reauthenticateWithPassword } = useAuth();
  const { toast } = useToast();
  
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
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

  const getAbsencesForDay = useCallback((day: Date): CellAbsenceInfo[] => {
    const dayStart = startOfDay(day);
    const absences: CellAbsenceInfo[] = [];

    const activeEmployeesForDay = getActiveEmployeesForDate(day);

    activeEmployeesForDay.forEach(emp => {
      (emp.employmentPeriods || []).forEach(period => {
        (period.scheduledAbsences || []).forEach(absence => {
          const absenceStart = safeParseDate(absence.startDate);
          const absenceEnd = absence.endDate ? safeParseDate(absence.endDate) : absenceStart;

          if (absenceStart && absenceEnd && isWithinInterval(dayStart, { start: startOfDay(absenceStart), end: endOfDay(absenceEnd) })) {
            const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
            if (absenceType) {
              absences.push({
                employee: emp,
                absence: absence,
                absenceType: absenceType,
                periodId: period.id,
              });
            }
          }
        });
      });
    });

    return absences.sort((a, b) => a.employee.name.localeCompare(b.employee.name));
  }, [getActiveEmployeesForDate, absenceTypes, safeParseDate]);


  const weeklyAbsenceData = useMemo(() => {
    if (loading || view !== 'week') return [];
    
    const eventsByDay: Record<string, CellAbsenceInfo[]> = {};
    weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        eventsByDay[dayKey] = getAbsencesForDay(day);
    });
    return eventsByDay;
  }, [loading, view, weekDays, getAbsencesForDay]);
  

  const { turnId: weekTurnId } = useMemo(() => {
    if (activeEmployees.length > 0) {
        return getTheoreticalHoursAndTurn(activeEmployees[0].id, currentDate);
    }
    return { turnId: null };
  }, [activeEmployees, currentDate, getTheoreticalHoursAndTurn]);

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
        
        await setDoc(convDocRef, {
            employeeId: employee.id,
            employeeName: employee.name,
            lastMessageText: text,
            lastMessageTimestamp: serverTimestamp(),
            unreadByAdmin: false,
            unreadByEmployee: true,
        }, { merge: true });

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
        <div className="p-2 md:p-4 space-y-4">
            <Skeleton className="h-10 w-full max-w-lg mx-auto" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  const renderWeeklyView = () => (
    <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 border-b">
            <div className="flex items-center gap-2">
                <WeekNavigator currentDate={currentDate} onWeekChange={setCurrentDate} onDateSelect={setCurrentDate} />
                {weekTurnId && (
                    <Badge variant="secondary" className="text-xs">
                        {`T.${weekTurnId.replace('turn', '')}`}
                    </Badge>
                )}
            </div>
        </CardHeader>
        <CardContent className="p-0">
             <div className="grid grid-cols-7 border-t">
                {weekDays.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const events = weeklyAbsenceData[dayKey] || [];
                    return (
                        <div key={dayKey} className="flex flex-col border-r last:border-r-0 min-h-[600px]">
                            <div className="text-center p-2 border-b">
                                <p className="font-semibold capitalize text-sm">{format(day, 'E', { locale: es })}</p>
                                <p className="text-2xl font-bold">{format(day, 'd')}</p>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-2">
                                    {events.map(event => (
                                        <div 
                                            key={`${event.employee.id}-${event.absence.id}`}
                                            onClick={() => handleOpenDetails(event)}
                                            className="p-1.5 rounded-md cursor-pointer text-[11px]"
                                            style={{ backgroundColor: `${event.absenceType.color}40` }}
                                        >
                                            <p className="font-bold">{event.employee.name}</p>
                                            <p className="text-muted-foreground">{event.absenceType.name}</p>
                                        </div>
                                    ))}
                                    {events.length === 0 && <div className="h-24"></div>}
                                </div>
                            </ScrollArea>
                        </div>
                    )
                })}
            </div>
        </CardContent>
    </Card>
  );

  const MonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weeksOfMonth = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return (
        <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background border rounded-lg">
             <div className="px-2 pb-2">
                 <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] border-t border-l">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                        <div key={day} className="text-center font-bold p-2 border-r border-b bg-muted/50 text-xs sm:text-sm">
                            {day}
                        </div>
                    ))}
                    {weeksOfMonth.map(weekStart => {
                        const daysOfWeek = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
                        const { turnId: monthWeekTurnId } = activeEmployees.length > 0 ? getTheoreticalHoursAndTurn(activeEmployees[0].id, weekStart) : { turnId: null };

                        return (
                            <React.Fragment key={weekStart.toString()}>
                                {daysOfWeek.map((day, dayIndex) => {
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const absences = getAbsencesForDay(day);
                                    const holiday = holidays.find(h => isSameDay(h.date, day));

                                    return (
                                        <Popover key={day.toString()}>
                                            <PopoverTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "relative p-1 sm:p-2 border-r border-b min-h-[120px] cursor-pointer hover:bg-muted/50",
                                                        !isCurrentMonth && 'bg-muted/30 text-muted-foreground'
                                                    )}
                                                >
                                                    {dayIndex === 0 && monthWeekTurnId && (
                                                        <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] h-4 px-1">
                                                            {`T.${monthWeekTurnId.replace('turn', '')}`}
                                                        </Badge>
                                                    )}
                                                    <div className={cn("font-semibold text-xs sm:text-sm", isSameDay(day, new Date()) && "text-primary font-bold")}>
                                                        {format(day, 'd')}
                                                    </div>
                                                    <div className="space-y-1 mt-1">
                                                        {holiday && isCurrentMonth && (
                                                            <div className="text-[10px] sm:text-xs p-1 rounded-md text-center truncate" style={{backgroundColor: `${holiday.type === 'Apertura' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`}}>
                                                                {holiday.name}
                                                            </div>
                                                        )}
                                                        {absences.map(absenceInfo => (
                                                            <div 
                                                                key={absenceInfo.employee.id} 
                                                                className="h-2 w-2 rounded-full inline-block mr-1" 
                                                                style={{ backgroundColor: absenceInfo.absenceType.color || '#ccc' }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium leading-none capitalize">{format(day, 'EEEE, d \'de\' MMMM', {locale: es})}</h4>
                                                    <Separator />
                                                    <div className="space-y-2">
                                                        {absences.length > 0 ? absences.map(absenceInfo => (
                                                             <div key={absenceInfo.employee.id} onClick={() => handleOpenDetails(absenceInfo)} className="p-2 rounded-md" style={{ backgroundColor: `${absenceInfo.absenceType.color}40`}}>
                                                               <p className="font-bold text-sm truncate">{absenceInfo.employee.name}</p>
                                                               <p className="text-xs text-muted-foreground">{absenceInfo.absenceType.name}</p>
                                                            </div>
                                                        )) : (
                                                            <p className="text-sm text-muted-foreground">No hay eventos programados.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

  return (
    <>
    <div className="p-2 md:p-4 space-y-4">
        <Card className="shadow-none border-0">
             <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-2 p-4">
                 {view === 'week' ? (
                     <div /> // Placeholder to keep spacing
                 ) : (
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-xl font-bold capitalize w-48 text-center">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                 )}
                 <div className="flex items-center gap-4">
                    <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'month')} className="w-auto">
                        <TabsList>
                            <TabsTrigger value="week">Semana</TabsTrigger>
                            <TabsTrigger value="month">Mes</TabsTrigger>
                        </TabsList>
                    </Tabs>
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
            </CardHeader>
        </Card>
        {view === 'week' ? renderWeeklyView() : <MonthView />}
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

    