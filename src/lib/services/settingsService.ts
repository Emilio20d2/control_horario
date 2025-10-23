

'use client';

import { addDoc, collection, deleteDoc, doc, updateDoc, Timestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { AbsenceType, Holiday, AnnualConfiguration, ContractType, HolidayFormData, HolidayEmployee, EmployeeGroup, VacationCampaign } from '../types';


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
    const dataToSave = { 
        ...rest, 
        active: data.active !== undefined ? data.active : true,
        groupId: data.groupId || null,
        workShift: data.workShift || null,
    };

    if (id) {
        // If an ID is provided, use setDoc to create or overwrite.
        const docRef = doc(db, 'holidayEmployees', id);
        await setDoc(docRef, dataToSave);
        return id;
    } else {
        // If no ID is provided, use addDoc to generate a new one.
        const docRef = await addDoc(collection(db, 'holidayEmployees'), dataToSave);
        return docRef.id;
    }
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
export const createVacationCampaign = async (data: Omit<VacationCampaign, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'vacationCampaigns'), data);
    return docRef.id;
}

export const updateVacationCampaign = async (id: string, data: Partial<Omit<VacationCampaign, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'vacationCampaigns', id);
    await updateDoc(docRef, data);
}

export const deleteVacationCampaign = async (id: string): Promise<void> => {
    const docRef = doc(db, 'vacationCampaigns', id);
    await deleteDoc(docRef);
}
