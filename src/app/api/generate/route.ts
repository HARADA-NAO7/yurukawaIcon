export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildYurukawaPrompt } from "@/lib/prompt";
import { generateIconImage } from "@/lib/image";
import { Theme } from "@/lib/themes";

const requestSchema = z.object({
  keyword1: z.string().optional().default(""),
  keyword2: z.string().optional().default(""),
  keyword3: z.string().optional().default(""),
  animal: z.string().optional(),
  theme: z.enum(["pastel", "neon", "vivid", "mono"]),
  variationToken: z.string().min(3)
});

export async function POST(req: NextRequest) {
  try {
    const body = requestSchema.parse(await req.json());
    const keywordList = [body.keyword1, body.keyword2, body.keyword3].map((v) => v.trim()).filter(Boolean);

    if (keywordList.length < 1 || keywordList.length > 3) {
      return NextResponse.json({ error: "キーワードは1〜3個入力してください🐾" }, { status: 400 });
    }

    const built = await buildYurukawaPrompt({
      keyword1: body.keyword1.trim(),
      keyword2: body.keyword2.trim(),
      keyword3: body.keyword3.trim(),
      theme: body.theme as Theme,
      variationHint: body.variationToken,
      lockedAnimal: body.animal?.trim()
    });

    const imageUrl = await generateIconImage(built.prompt);
    console.log("[api/generate] output", {
      hasImageUrl: Boolean(imageUrl),
      imageUrlHead: imageUrl ? imageUrl.slice(0, 64) : ""
    });

    if (!imageUrl || !imageUrl.trim()) {
      throw new Error("画像URLが空です。生成に失敗しました。");
    }

    return NextResponse.json({ imageUrl, prompt: built.prompt, animal: built.animal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    console.error("[api/generate] failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
