import apiClient from './api';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GenerateTextParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string;
}

/**
 * WanderAI Core Service for React Native (Expo)
 * 100% Tập trung bảo mật tại Backend AI Proxy (/api/ai/generate)
 * Tuyệt đối không nhúng Google Gemini API Key vào mobile app bundle.
 */
export const aiService = {
  /**
   * Gọi AI thông qua Backend AI Proxy bảo mật
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
        return res.data.data.text;
      }

      throw new Error(res.data?.message || 'Máy chủ AI không trả về dữ liệu hợp lệ.');
    } catch (e: any) {
      if (e?.response?.status === 429) {
        throw new Error('Hệ thống AI đang bận hoặc vượt quá giới hạn gọi (20 req/phút). Vui lòng thử lại sau giây lát!');
      }
      const errMsg = e?.response?.data?.message || e?.message || 'Không thể kết nối đến máy chủ AI.';
      console.error('[WanderAI Mobile] Backend AI generate error:', errMsg);
      throw new Error(errMsg);
    }
  },
};
