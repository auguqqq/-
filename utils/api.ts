/**
 * Inkflow Studio v2.0.0 - API Utilities
 * 统一管理 AI API 调用、重试、错误处理
 */
import { AIConfig } from '../types';

// ============================================================================
// 指数退避重试（429 限流时自动等待后重试）
// ============================================================================
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      error?.error?.code === 429 ||
      (error?.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));
    if (retries > 0 && isRateLimit) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// ============================================================================
// OpenAI 兼容格式的 API 调用（DeepSeek / 自定义端点通用）
// ============================================================================
export const fetchOpenAICompatible = async (
  config: AIConfig,
  messages: any[],
  systemPrompt?: string,
  modelOverride?: string,
) => {
  if (!config.apiKey) throw new Error("请在设置中配置 API Key");

  let baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
  if (baseUrl.endsWith('/chat/completions')) {
    baseUrl = baseUrl.substring(0, baseUrl.length - '/chat/completions'.length);
  }

  const payload: any = {
    model: modelOverride || config.model || 'gpt-3.5-turbo',
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) throw { status: 429, message: errorText };
    throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
};

// ============================================================================
// 给用户看的友好错误信息（把技术报错翻译成中文）
// ============================================================================
export const getFriendlyErrorMessage = (error: any): string => {
  if (error?.status === 429 || error?.code === 429 || error?.error?.code === 429) {
    return 'API 配额已耗尽 (429)。请在设置中更换 API Key。';
  }

  let msg = '';
  if (error instanceof Error) {
    msg = error.message;
  } else if (typeof error === 'object' && error !== null) {
    msg = error.error?.message || error.message || JSON.stringify(error);
  } else {
    msg = String(error);
  }

  if (typeof msg === 'string' && (msg.trim().startsWith('{') || msg.includes('{"error"'))) {
    try {
      const jsonMatch = msg.match(/(\{.*"error".*\})/s) || msg.match(/(\{.*\})/s);
      const jsonStr = jsonMatch ? jsonMatch[0] : msg;
      const parsed = JSON.parse(jsonStr);
      if (parsed.error?.message) msg = parsed.error.message;
      else if (parsed.message) msg = parsed.message;
      if (parsed.error?.code === 429 || parsed.status === 'RESOURCE_EXHAUSTED') {
        return 'API 配额已耗尽 (429)。请在设置中更换 API Key。';
      }
    } catch (e) {}
  }

  if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('Requested entity was not found')) {
    return '模型未找到 (404)。请在"设置"中点击【获取云端可用模型】来更新列表。';
  }
  if (msg.includes('403') || msg.includes('API key not valid') || msg.includes('PERMISSION_DENIED')) {
    return '鉴权失败 (403)。API Key 无效或无权访问该模型，请在设置中重新配置。';
  }
  if (msg.includes('Rpc failed') || msg.includes('xhr error') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return '网络连接失败。请检查：\n1. 网络连接是否正常\n2. 若使用 Gemini，需确保网络环境支持 Google 服务\n3. API Key 是否正确配置';
  }
  return `AI 服务异常: ${msg.slice(0, 150)}${msg.length > 150 ? '...' : ''}`;
};
