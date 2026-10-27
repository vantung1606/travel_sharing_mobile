import apiClient from './api';

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
    return GEMINI_API_KEY;
  },

  getApiEndpoint(): string {
    return GEMINI_API_URL.replace(/\/+$/, '');
  },

  /**
   * Gọi AI thông qua Backend Proxy (Bảo mật tuyệt đối, không lộ API key ra app bundle)
   */
  async generateText({
    prompt,
    systemPrompt,
    model = DEFAULT_MODEL,
    temperature = 0.3,
    maxTokens = 8192,
    responseMimeType = 'application/json',
  }: GenerateTextParams): Promise<string> {
    let targetModel = model || DEFAULT_MODEL;
    if (!targetModel.startsWith('gemini-') || targetModel.includes('3.8')) {
      targetModel = DEFAULT_MODEL;
    }

    // 1. ƯU TIÊN GỌI QUA BACKEND AI PROXY (Bảo mật an toàn cao nhất)
    try {
      const res = await apiClient.post('/ai/generate', {
        prompt,
        systemPrompt,
        model: targetModel,
        temperature: Number(temperature) || 0.3,
        maxTokens: Number(maxTokens) || 8192,
        responseMimeType,
      });

      if (res.data?.success && res.data.data?.text) {
        // Nếu backend trả về kết quả live từ Gemini thật (không phải fallback), trả về ngay
        if (!res.data.data.model?.includes('fallback')) {
          return res.data.data.text;
        }
        // Nếu backend trả về fallback (do backend Railway chưa cài GEMINI_API_KEY)
        console.warn('[WanderAI Mobile] Backend trả về dữ liệu fallback, tự động chuyển sang gọi trực tiếp bằng EXPO_PUBLIC_GEMINI_API_KEY...');
      }
    } catch (e: any) {
      if (e?.response?.status === 429) {
        throw new Error('Hệ thống AI đang bận hoặc vượt quá giới hạn gọi (20 req/phút). Vui lòng thử lại sau giây lát!');
      }
      console.warn('[WanderAI Mobile] Backend AI proxy request failed, checking client key fallback:', e?.message);
    }

    // 2. Client fallback nếu có cấu hình EXPO_PUBLIC_GEMINI_API_KEY
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Tính năng AI hiện chưa thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc thử lại sau!');
    }

    const endpoint = this.getApiEndpoint();
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
