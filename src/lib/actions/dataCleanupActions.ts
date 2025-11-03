

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


export async function clearAllConversations(): Promise<{ success: boolean; message?: string; error?: string }> {
    'use server';

    try {
        const dbAdmin = getDbAdmin();
        const conversationsRef = dbAdmin.collection('conversations');
        const snapshot = await conversationsRef.get();

        if (snapshot.empty) {
            return { success: true, message: 'No hay conversaciones que borrar.' };
        }
        
        // Firestore Admin SDK does not support recursive delete directly in the client-side library.
        // The recommended way is to use the Firebase CLI, but for a server action,
        // we must iterate. We will use a more robust parallel approach.
        const deletePromises: Promise<any>[] = [];
        snapshot.forEach(doc => {
            // This is a more robust way to delete a document and its subcollections from a server action.
            // It leverages the REST API's recursive delete feature implicitly if available on the backend,
            // or falls back to a managed deletion.
            deletePromises.push(dbAdmin.recursiveDelete(doc.ref));
        });

        await Promise.all(deletePromises);

        return { success: true, message: `Se han eliminado ${snapshot.size} conversaciones y todos sus mensajes.` };

    } catch (error) {
        console.error('Error clearing conversations:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al borrar las conversaciones.';
        return { success: false, error: errorMessage };
    }
}
