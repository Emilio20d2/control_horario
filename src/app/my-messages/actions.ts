
'use server';

import { messageBotFlow, type MessageBotInput } from "@/ai/flows/message-bot-flow";

export async function generateBotResponse(input: MessageBotInput): Promise<string> {
    try {
        const response = await messageBotFlow(input);
        return response;
    } catch (error) {
        console.error("Error invoking message bot flow:", error);
        // Fallback response if the AI flow fails for any reason
        return "He tenido un problema procesando tu solicitud. Un responsable revisará tu mensaje pronto.";
    }
}
