
'use server';

/**
 * @fileOverview This file is no longer in use.
 * The one-time data migration from employees to users has been completed.
 * This script is retained for historical purposes but should not be used.
 */

export async function migrateEmployeeDataToUsers(): Promise<{ success: boolean; message: string; error?: string }> {
    return {
        success: false,
        message: 'This migration script is disabled.',
        error: 'This script has been deprecated and should not be used.'
    };
}
