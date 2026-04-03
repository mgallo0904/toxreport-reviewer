import { GoogleGenAI } from '@google/genai';
import { TOX_REPORT_REVIEWER_SYSTEM_PROMPT } from './prompts/toxReportReviewer';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const sendToxReviewMessage = async (history: any[]) => {
  return await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: history,
    config: {
      systemInstruction: TOX_REPORT_REVIEWER_SYSTEM_PROMPT,
      temperature: 0.2,
    }
  });
};
