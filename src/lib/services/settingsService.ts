

'use client';

import { addDoc, collection, deleteDoc, doc, updateDoc, Timestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { AbsenceType, Holiday, AnnualConfiguration, ContractType, HolidayFormData, HolidayEmployee, EmployeeGroup, VacationCampaign, HolidayReport } from '../types';


export const createAbsenceType = async (data: Omit<AbsenceType, 'id'>): Promise<string> => {
    // Ensure abbreviation is included, even if it's derived from name
    const dataToSave = {
        ...data,
        abbreviation: data.abbreviation || data.name.substring(0, 3).toUpperCase(),
    };
    const docRef = await addDoc(collection(db, 'absenceTypes'), dataToSave);
    return docRef.id;
}

export const updateAbsenceType = async (id: string, data: Partial<Omit<AbsenceType, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'absenceTypes', id);
    await updateDoc(docRef, data);
}

export const deleteAbsenceType = async (id: string): Promise<void> => {
    const docRef = doc(db, 'absenceTypes', id);
    await deleteDoc(docRef);
}


// --- Holiday Service Functions ---

export const createHoliday = async (data: Omit<Holiday, 'id' | 'date'> & { date: string }): Promise<string> => {
    const holidayDate = new Date(data.date);
    const timeZoneOffset = holidayDate.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(holidayDate.getTime() + timeZoneOffset);

    const docId = data.date;
    const docRef = doc(db, 'holidays', docId);

    await setDoc(docRef, {
        name: data.name,
        type: data.type,
        date: Timestamp.fromDate(adjustedDate),
    });
    return docId;
}

export const updateHoliday = async (id: string, data: Partial<HolidayFormData>): Promise<void> => {
    const docRef = doc(db, 'holidays', id);
    // Don't update the date, as it's the ID
    const { date, ...dataToUpdate } = data;
    await updateDoc(docRef, dataToUpdate);
};

export const deleteHoliday = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'holidays', id));
}


// --- Annual Configuration Service Functions ---

export const createAnnualConfig = async (data: Omit<AnnualConfiguration, 'id'>): Promise<string> => {
    const docId = String(data.year);
    const docRef = doc(db, 'annualConfigurations', docId);
    await setDoc(docRef, data);
    return docId;
};

export const updateAnnualConfig = async (id: string, data: Partial<Omit<AnnualConfiguration, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'annualConfigurations', id);
    await updateDoc(docRef, data);
}

export const deleteAnnualConfig = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'annualConfigurations', id));
}

// --- Contract Type Service Functions ---

export const createContractType = async (data: Omit<ContractType, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'contractTypes'), data);
    return docRef.id;
}

export const updateContractType = async (id: string, data: Partial<Omit<ContractType, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'contractTypes', id);
await updateDoc(docRef, data);
}

export const deleteContractType = async (id: string): Promise<void> => {
    const docRef = doc(db, 'contractTypes', id);
    await deleteDoc(docRef);
}

// --- Holiday Employee Service ---

export const addHolidayEmployee = async (data: Partial<Omit<HolidayEmployee, 'id'>> & { id?: string }): Promise<string> => {
    const { id, ...rest } = data;
    if (!id) throw new Error("Employee ID is required to add a holiday employee.");

    const dataToSave = { 
        name: rest.name,
        active: rest.active !== undefined ? rest.active : true,
        groupId: rest.groupId || null,
        workShift: rest.workShift || null,
    };

    const docRef = doc(db, 'holidayEmployees', id);
    await setDoc(docRef, dataToSave);
    return id;
};

export const updateHolidayEmployee = async (id: string, data: Partial<Omit<HolidayEmployee, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'holidayEmployees', id);
    
    // Ensure undefined values are converted to null to prevent Firestore errors
    const sanitizedData = { ...data };
    if (sanitizedData.groupId === undefined) {
        sanitizedData.groupId = null;
    }
    if (sanitizedData.workShift === undefined) {
        sanitizedData.workShift = null;
    }
    
    await updateDoc(docRef, sanitizedData);
}

export const deleteHolidayEmployee = async (id: string): Promise<void> => {
    const docRef = doc(db, 'holidayEmployees', id);
    await deleteDoc(docRef);
}

export const seedHolidayEmployees = async (employeeNames: string[]): Promise<void> => {
    const batch = writeBatch(db);
    employeeNames.forEach(name => {
        const docRef = doc(collection(db, 'holidayEmployees'));
        batch.set(docRef, { name, active: true });
    });
    await batch.commit();
};

export const addHolidayReport = async (report: Omit<HolidayReport, 'id'>): Promise<string> => {
    const docId = `${report.weekId}_${report.employeeId}`;
    const docRef = doc(db, 'holidayReports', docId);
    await setDoc(docRef, report, { merge: true });
    return docId;
}

export const updateHolidayReport = async (reportId: string, data: Partial<Omit<HolidayReport, 'id'>>) => {
    const docRef = doc(db, 'holidayReports', reportId);
    await updateDoc(docRef, data);
}

// --- Employee Group Service Functions ---
export const createEmployeeGroup = async (data: Omit<EmployeeGroup, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'employeeGroups'), data);
    return docRef.id;
}

export const updateEmployeeGroup = async (id: string, data: Partial<Omit<EmployeeGroup, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'employeeGroups', id);
    await updateDoc(docRef, data);
}

export const deleteEmployeeGroup = async (id: string): Promise<void> => {
    const docRef = doc(db, 'employeeGroups', id);
    await deleteDoc(docRef);
}

export const updateEmployeeGroupOrder = async (groups: EmployeeGroup[]): Promise<void> => {
    const batch = writeBatch(db);
    groups.forEach(group => {
        const docRef = doc(db, 'employeeGroups', group.id);
        batch.update(docRef, { order: group.order });
    });
    await batch.commit();
}


// --- Vacation Campaign Service Functions ---
const convertToTimestampIfDate = (value: any): Timestamp | any => {
    if (value instanceof Date) {
        return Timestamp.fromDate(value);
    }
    return value;
};

export const createVacationCampaign = async (data: Omit<VacationCampaign, 'id'>): Promise<string> => {
    const dataToSave = {
        ...data,
        submissionStartDate: convertToTimestampIfDate(data.submissionStartDate),
        submissionEndDate: convertToTimestampIfDate(data.submissionEndDate),
        absenceStartDate: convertToTimestampIfDate(data.absenceStartDate),
        absenceEndDate: convertToTimestampIfDate(data.absenceEndDate),
    };
    const docRef = await addDoc(collection(db, 'vacationCampaigns'), dataToSave);
    return docRef.id;
}

export const updateVacationCampaign = async (id: string, data: Partial<Omit<VacationCampaign, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'vacationCampaigns', id);
    const dataToSave: Partial<Omit<VacationCampaign, 'id'>> = { ...data };

    for (const key in dataToSave) {
        if (Object.prototype.hasOwnProperty.call(dataToSave, key) && key.includes('Date')) {
            (dataToSave as any)[key] = convertToTimestampIfDate((dataToSave as any)[key]);
        }
    }
    
    await updateDoc(docRef, dataToSave);
}

export const deleteVacationCampaign = async (id: string): Promise<void> => {
    const docRef = doc(db, 'vacationCampaigns', id);
    await deleteDoc(docRef);
}
