/**
 * WanderAI Core Service for React Native (Expo) - Google Gemini Integration
 */
const GEMINI_API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY && process.env.EXPO_PUBLIC_GEMINI_API_KEY.trim()) || '';
const GEMINI_API_URL = process.env.EXPO_PUBLIC_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GenerateTextParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string;
}

export const aiService = {
  getApiKey(): string {
    if (!GEMINI_API_KEY) {
      throw new Error('Chưa cấu hình EXPO_PUBLIC_GEMINI_API_KEY. Vui lòng thiết lập biến môi trường này để sử dụng tính năng AI.');
    }
    return GEMINI_API_KEY;
  },

  getApiEndpoint(): string {
    return GEMINI_API_URL.replace(/\/+$/, '');
  },

  /**
   * Gọi trực tiếp Google Gemini API (Mặc định gemini-3.8-flash)
   */
  async generateText({
    prompt,
    systemPrompt,
    model = DEFAULT_MODEL,
    temperature = 0.3,
    maxTokens = 8192,
    responseMimeType = 'application/json',
  }: GenerateTextParams): Promise<string> {
    const key = this.getApiKey();
    const endpoint = this.getApiEndpoint();

    let targetModel = model || DEFAULT_MODEL;
    if (!targetModel.startsWith('gemini-') || targetModel === 'gemini-1.5-flash' || targetModel.includes('1.5-flash')) {
      targetModel = DEFAULT_MODEL;
    }

    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: Number(temperature) || 0.3,
        maxOutputTokens: Number(maxTokens) || 8192,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const executeCall = async (modelName: string) => {
      const url = `${endpoint}/models/${modelName}:generateContent?key=${key}`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    };

    let res = await executeCall(targetModel);

    // Tự động fallback sang DEFAULT_MODEL nếu targetModel 404
    if (res.status === 404 && targetModel !== DEFAULT_MODEL) {
      console.warn(`[WanderAI Mobile] Model ${targetModel} không khả dụng (404), tự động chuyển sang ${DEFAULT_MODEL}...`);
      res = await executeCall(DEFAULT_MODEL);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API Error: ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },
};
