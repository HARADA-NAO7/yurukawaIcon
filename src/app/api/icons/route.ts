import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase";

const saveSchema = z.object({
  imageUrl: z.string().url(),
  keyword1: z.string().optional().default(""),
  keyword2: z.string().optional().default(""),
  keyword3: z.string().optional().default(""),
  theme: z.enum(["pastel", "neon", "vivid", "mono"])
});

export async function GET() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ items: [] });
  }

  const { data, error } = await supabase
    .from("icons")
    .select("id,image_url,keyword1,keyword2,keyword3,theme,created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = saveSchema.parse(await req.json());
    const keywordList = [body.keyword1, body.keyword2, body.keyword3].map((v) => v.trim()).filter(Boolean);

    if (keywordList.length < 1 || keywordList.length > 3) {
      return NextResponse.json({ error: "キーワードは1〜3個入力してください🐾" }, { status: 400 });
    }

    const { error } = await supabase.from("icons").insert({
      image_url: body.imageUrl,
      keyword1: body.keyword1.trim(),
      keyword2: body.keyword2.trim(),
      keyword3: body.keyword3.trim(),
      theme: body.theme
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
