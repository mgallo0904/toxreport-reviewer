import { GoogleGenAI } from '@google/genai';
import { TOX_REPORT_REVIEWER_SYSTEM_PROMPT } from './prompts/toxReportReviewer';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const uploadFileToGemini = async (file: File, onStateChange?: (state: string) => void) => {
  if (onStateChange) onStateChange(`Uploading ${file.name}...`);

  const formData = new FormData();
  formData.append('file', file);

  const uploadRes = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to upload file: ${uploadRes.statusText}`);
  }

  const data = await uploadRes.json();
  return data.file;
};

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
