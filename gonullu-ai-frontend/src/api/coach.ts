import api from './client';

export interface CoachChatResponse {
  reply: string;
}

export async function coachChat(message: string): Promise<CoachChatResponse> {
  const { data } = await api.post<CoachChatResponse>('/coach/chat', { message });
  return data;
}
