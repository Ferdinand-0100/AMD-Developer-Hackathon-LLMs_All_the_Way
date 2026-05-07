/**
 * Hugging Face Inference API client for Qwen2.5-Coder-7B-Instruct.
 * Runs on AMD Developer Cloud (ROCm-compatible endpoint).
 *
 * Docs: https://huggingface.co/docs/api-inference/index
 */

const HF_API_TOKEN = process.env.HF_API_TOKEN ?? "";
const MODEL_ID = "Qwen/Qwen2.5-Coder-7B-Instruct";

// The HF Inference API chat completions endpoint is at the root,
// not nested under the model path.
// Custom AMD endpoint overrides this entirely.
const BASE_URL =
  process.env.HF_ENDPOINT_URL ??
  "https://api-inference.huggingface.co/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface InferenceOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface InferenceLog {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  endpoint: string;
}

export interface InferenceResult {
  text: string;
  log: InferenceLog;
}

/**
 * Send a chat completion request to Qwen via HF Inference API.
 * Returns the generated text and a log object for the inference_logs table.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: InferenceOptions = {}
): Promise<InferenceResult> {
  const { maxTokens = 512, temperature = 0.7 } = options;

  const start = Date.now();

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  const latency_ms = Date.now() - start;

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HF Inference API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string =
    data.choices?.[0]?.message?.content?.trim() ?? "";

  const log: InferenceLog = {
    model: MODEL_ID,
    prompt_tokens: data.usage?.prompt_tokens ?? 0,
    completion_tokens: data.usage?.completion_tokens ?? 0,
    latency_ms,
    endpoint: BASE_URL,
  };

  return { text, log };
}
