'use server';

import { generateBotResponse as generateBotResponseFlow, type MessageBotInput, type MessageBotOutput } from '@/ai/flows/message-bot-flow';

export async function generateBotResponse(input: MessageBotInput): Promise<MessageBotOutput> {
  return await generateBotResponseFlow(input);
}
