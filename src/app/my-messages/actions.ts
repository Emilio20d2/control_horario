
'use server';

import { messageBotFlow, type MessageBotInput } from "@/ai/flows/message-bot-flow";

export async function generateBotResponse(input: MessageBotInput): Promise<string> {
    // Let the error propagate to the client component to be handled there.
    // This allows for more specific error messages if needed in the future.
    const response = await messageBotFlow(input);
    return response;
}
