

'use server';

import { getDbAdmin } from '../firebase-admin';

export async function clearAllCheckmarks() {
  'use server';

  try {
    const dbAdmin = getDbAdmin();
    const weeklyRecordsRef = dbAdmin.collection('weeklyRecords');
    const snapshot = await weeklyRecordsRef.get();

    if (snapshot.empty) {
      return { success: true, message: "No se encontraron registros semanales para procesar." };
    }

    const batch = dbAdmin.batch();
    let documentsAffected = 0;
    let recordsUpdated = 0;

    for (const doc of snapshot.docs) {
      const originalWeekData = doc.data().weekData;
      if (!originalWeekData) continue;

      const newWeekData = JSON.parse(JSON.stringify(originalWeekData));
      let weekDataModified = false;

      for (const employeeId in newWeekData) {
        if (Object.prototype.hasOwnProperty.call(newWeekData, employeeId)) {
          const employeeRecord = newWeekData[employeeId];
          let recordNeedsUpdate = false;

          // Force the check to be false if it exists
          if (employeeRecord.isDifference === true) {
            employeeRecord.isDifference = false;
            recordNeedsUpdate = true;
          }

          // Force comment cleanup
          if (employeeRecord.generalComment && typeof employeeRecord.generalComment === 'string') {
            const originalComment = employeeRecord.generalComment;
            const cleanedComment = originalComment.split('\n').filter(line => 
              !line.trim().startsWith('DIFERENCIA CON EXCEL:') && !line.trim().startsWith('AUDITORÍA:')
            ).join('\n').trim();

            if (cleanedComment !== originalComment) {
              employeeRecord.generalComment = cleanedComment;
              recordNeedsUpdate = true;
            }
          }
          
          if(recordNeedsUpdate) {
            recordsUpdated++;
            weekDataModified = true;
          }
        }
      }

      if (weekDataModified) {
        documentsAffected++;
        batch.update(doc.ref, { weekData: newWeekData });
      }
    }

    if (documentsAffected > 0) {
      await batch.commit();
      return { success: true, message: `Limpieza completada. ${recordsUpdated} registros en ${documentsAffected} semanas han sido actualizados.` };
    }

    return { success: true, message: "No se encontraron diferencias ni comentarios que limpiar." };

  } catch (error) {
    console.error("Error cleaning up audit data:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la limpieza de datos.';
    return { success: false, error: errorMessage };
  }
}


export async function deleteSelectedConversations(conversationIds: string[]): Promise<{ success: boolean; message?: string; error?: string }> {
    'use server';

    if (!conversationIds || conversationIds.length === 0) {
        return { success: false, error: "No se proporcionaron IDs de conversación." };
    }

    try {
        const db = getDbAdmin();
        const batch = db.batch();
        
        let messagesDeleted = 0;

        for (const convId of conversationIds) {
            const convRef = db.collection('conversations').doc(convId);
            const messagesRef = convRef.collection('messages');
            
            // Delete all messages in the subcollection
            const messagesSnapshot = await messagesRef.get();
            if (!messagesSnapshot.empty) {
                messagesSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                    messagesDeleted++;
                });
            }

            // Delete the main conversation document
            batch.delete(convRef);
        }

        await batch.commit();

        return { success: true, message: `${conversationIds.length} conversación(es) y ${messagesDeleted} mensaje(s) han sido eliminados.` };
    } catch (error) {
        console.error("Error deleting conversations:", error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar las conversaciones.';
        return { success: false, error: errorMessage };
    }
}

export async function resolveCorrectionRequest(requestId: string): Promise<{ success: boolean; error?: string; }> {
    'use server';
    try {
        const db = getDbAdmin();
        const requestRef = db.collection('correctionRequests').doc(requestId);
        await requestRef.update({ status: 'resolved' });
        return { success: true };
    } catch (error) {
        console.error("Error resolving correction request:", error);
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.' };
    }
}
