import OpenAI from "openai";

export async function generateIconImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が未設定です。実画像を生成できません。");
  }

  const client = new OpenAI({ apiKey });
  const startedAt = Date.now();

  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  });
  console.log("[generateIconImage] response", {
    durationMs: Date.now() - startedAt,
    hasUrl: Boolean(result.data?.[0]?.url),
    hasBase64: Boolean(result.data?.[0]?.b64_json)
  });

  const imageBase64 = result.data?.[0]?.b64_json;
  const imageUrl = result.data?.[0]?.url;

  if (imageUrl) {
    return imageUrl;
  }

  if (imageBase64) {
    return `data:image/png;base64,${imageBase64}`;
  }

  throw new Error("画像生成に失敗しました");
}
