

'use client';

import { addDoc, collection, deleteDoc, doc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AbsenceType, Holiday, AnnualConfiguration, ContractType, HolidayFormData } from '../types';


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
