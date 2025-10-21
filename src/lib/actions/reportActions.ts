'use server';

// NOTE: This file is a placeholder. The original server-side generation logic
// was moved back to the client to enable the `mailto:` functionality.
// The core PDF generation logic is now in `src/lib/report-generators.ts`.

export async function generateAnnualReportServer(employeeId: string, year: number) {
    console.log(`Generating Annual Report for ${employeeId} for ${year}`);
    // This server action is currently not in use.
    return { success: true, message: "Action not implemented." };
}

export async function generateAnnualDetailedReportServer(employeeId: string, year: number) {
    console.log(`Generating Annual Detailed Report for ${employeeId} for ${year}`);
    // This server action is currently not in use.
    return { success: true, message: "Action not implemented." };
}

export async function generateAbsenceReportServer(employeeId: string, year: number) {
    console.log(`Generating Absence Report for ${employeeId} for ${year}`);
    // This server action is currently not in use.
    return { success: true, message: "Action not implemented." };
}
