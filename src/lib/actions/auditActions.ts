
'use server';

import { getDbAdmin } from '../firebase-admin';
import prefilledData from '@/lib/prefilled_data.json';
import type { PrefilledWeeklyRecord, WeeklyRecord, Employee, AbsenceType, EmploymentPeriod, ContractType, CorrectionRequest } from '../types';
import { parseISO, isAfter, startOfDay, format } from 'date-fns';
import { calculateBalancePreview } from '../calculators/balance-calculator';
import { es } from 'date-fns/locale';

interface RecordUpdate {
  weekId: string;
  employeeId: string;
  newComment: string;
  isDifference: boolean;
}

const getActivePeriodForAudit = (employee: Employee, date: Date): EmploymentPeriod | null => {
    if (!employee?.employmentPeriods) return null;
    return employee.employmentPeriods.find(p => {
        const pStart = startOfDay(parseISO(p.startDate as string));
        const pEnd = p.endDate ? startOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
        return !isAfter(pStart, date) && isAfter(pEnd, date);
    }) || null;
};


/**
 * Runs a retroactive audit on all confirmed weekly records to find differences with the excel file.
 */
export async function runRetroactiveAudit() {
    'use server';
    try {
        const db = getDbAdmin();
        const [weeklyRecordsSnapshot, employeesSnapshot, absenceTypesSnapshot, contractTypesSnapshot] = await Promise.all([
            db.collection('weeklyRecords').get(),
            db.collection('employees').get(),
            db.collection('absenceTypes').get(),
            db.collection('contractTypes').get(),
        ]);
        
        const employeesMap = new Map(employeesSnapshot.docs.map(doc => [doc.id, doc.data() as Employee]));
        const absenceTypes = absenceTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AbsenceType));
        const contractTypes = contractTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContractType));
        const auditFile: Record<string, PrefilledWeeklyRecord> = prefilledData as any;
        
        const updates: RecordUpdate[] = [];

        for (const doc of weeklyRecordsSnapshot.docs) {
            const weekId = doc.id;
            const weeklyRecord = doc.data() as WeeklyRecord;

            if (!weeklyRecord.weekData) continue;

            for (const employeeId in weeklyRecord.weekData) {
                const record = weeklyRecord.weekData[employeeId];
                if (!record.confirmed || !record.days) continue;

                const employee = employeesMap.get(employeeId);
                if (!employee) continue;

                const weekStartDate = parseISO(weekId);
                const activePeriod = getActivePeriodForAudit(employee, weekStartDate);
                if (!activePeriod) continue;

                const dbImpact = calculateBalancePreview(
                    employee.id,
                    record.days,
                    { ordinary: 0, holiday: 0, leave: 0 }, 
                    absenceTypes,
                    contractTypes,
                    employee.employmentPeriods,
                    record.weeklyHoursOverride,
                    record.totalComplementaryHours
                );

                if (!dbImpact) continue;
                 
                const prefilledWeekData = auditFile[weekId]?.weekData;
                let prefilledEmpData;
                if (prefilledWeekData) {
                    const jsonEmployeeName = Object.keys(prefilledWeekData).find(name => 
                        name.trim().toLowerCase() === employee.name.trim().toLowerCase()
                    );
                    if (jsonEmployeeName) {
                        prefilledEmpData = prefilledWeekData[jsonEmployeeName];
                    }
                }
                
                const expectedImpact = {
                    ordinary: prefilledEmpData?.expectedOrdinaryImpact ?? 0,
                    holiday: prefilledEmpData?.expectedHolidayImpact ?? 0,
                    leave: prefilledEmpData?.expectedLeaveImpact ?? 0,
                };

                const ordinaryDiff = dbImpact.ordinary - expectedImpact.ordinary;
                const holidayDiff = dbImpact.holiday - expectedImpact.holiday;
                const leaveDiff = dbImpact.leave - expectedImpact.leave;

                const diffs: string[] = [];
                if (Math.abs(ordinaryDiff) > 0.01) diffs.push(`Ordinaria (Dif: ${(ordinaryDiff).toFixed(2)}h)`);
                if (Math.abs(holidayDiff) > 0.01) diffs.push(`Festivos (Dif: ${(holidayDiff).toFixed(2)}h)`);
                if (Math.abs(leaveDiff) > 0.01) diffs.push(`Libranza (Dif: ${(leaveDiff).toFixed(2)}h)`);
                
                const currentComment = String(record.generalComment || '');
                const cleanedComment = currentComment.split('\n').filter(line => !line.trim().startsWith('DIFERENCIA CON EXCEL:') && !line.trim().startsWith('AUDITORÍA:')).join('\n').trim();
                
                if (diffs.length > 0) {
                    const diffMessage = `AUDITORÍA: ${diffs.join(', ')}.`;
                    const newComment = cleanedComment ? `${cleanedComment}\n${diffMessage}` : diffMessage;
                    if (newComment !== currentComment || !record.isDifference) {
                        updates.push({ weekId, employeeId, newComment, isDifference: true });
                    }
                } else {
                     if (currentComment !== cleanedComment || record.isDifference) {
                         updates.push({ weekId, employeeId, newComment: cleanedComment, isDifference: false });
                    }
                }
            }
        }
        
        if (updates.length > 0) {
            const updateResult = await updateAuditComments(updates);
            return { success: true, message: updateResult.message };
        }
        
        return { success: true, message: 'No se encontraron nuevas diferencias de auditoría.' };

    } catch (error) {
        console.error("Error running retroactive audit:", error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al ejecutar la auditoría.';
        return { success: false, error: errorMessage };
    }
}


async function updateAuditComments(updates: RecordUpdate[]) {
  'use server';
  try {
    const db = getDbAdmin();
    const batch = db.batch();

    for (const update of updates) {
      const docRef = db.collection('weeklyRecords').doc(update.weekId);
      batch.update(docRef, {
        [`weekData.${update.employeeId}.generalComment`]: update.newComment,
        [`weekData.${update.employeeId}.isDifference`]: update.isDifference,
      });
    }

    await batch.commit();

    return { success: true, message: `${updates.length} registros han sido actualizados con resultados de auditoría.` };
  } catch (error) {
    console.error("Error updating audit comments:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al actualizar los comentarios.';
    return { success: false, error: errorMessage };
  }
}

export async function syncCorrectionRequestMessages() {
    'use server';
    try {
        const db = getDbAdmin();
        const [employeesSnapshot, correctionRequestsSnapshot] = await Promise.all([
            db.collection('employees').get(),
            db.collection('correctionRequests').where('status', '==', 'pending').get(),
        ]);
        
        const employeesMap = new Map(employeesSnapshot.docs.map(doc => [doc.id, doc.data() as Employee]));
        
        let messagesSynced = 0;
        if (!correctionRequestsSnapshot.empty) {
            const batch = db.batch();
            for (const doc of correctionRequestsSnapshot.docs) {
                const request = doc.data() as CorrectionRequest;
                const employee = employeesMap.get(request.employeeId);
                if (employee) {
                    const conversationRef = db.collection('conversations').doc(request.employeeId);
                    const messagesRef = conversationRef.collection('messages');
                    const weekStartDateFormatted = format(parseISO(request.weekId), 'dd/MM/yyyy', { locale: es });
                    const messageText = `SOLICITUD DE CORRECCIÓN\n\nSemana: ${weekStartDateFormatted}\nMotivo: ${request.reason}`;
                    
                    // Check if a message with this exact text and timestamp already exists
                    const existingMessagesQuery = await messagesRef
                        .where('text', '==', messageText)
                        .where('timestamp', '==', request.requestedAt)
                        .limit(1)
                        .get();

                    if (existingMessagesQuery.empty) {
                        // Use set with merge to create or update the conversation summary
                        batch.set(conversationRef, {
                            employeeId: request.employeeId,
                            employeeName: employee.name,
                            lastMessageText: messageText,
                            lastMessageTimestamp: request.requestedAt,
                            unreadByAdmin: true,
                            unreadByEmployee: false
                        }, { merge: true });

                        // Add the actual message to the subcollection
                        const messageRef = messagesRef.doc(); // Auto-generate ID
                        batch.set(messageRef, {
                            text: messageText,
                            senderId: request.employeeId,
                            timestamp: request.requestedAt
                        });
                        messagesSynced++;
                    }
                }
            }
            if (messagesSynced > 0) {
                await batch.commit();
            }
        }
        
        if (messagesSynced > 0) {
            return { success: true, message: `Se han recuperado y sincronizado ${messagesSynced} solicitudes de corrección en la mensajería.` };
        }
        
        return { success: true, message: 'No había solicitudes de corrección pendientes por sincronizar.' };

    } catch (error) {
        console.error("Error syncing correction request messages:", error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al sincronizar mensajes.';
        return { success: false, error: errorMessage };
    }
}
