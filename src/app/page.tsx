"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { THEME_OPTIONS, Theme } from "@/lib/themes";
import { IconRecord } from "@/lib/supabase";
import { loadGallery, saveToGallery } from "@/lib/localGallery";

type GenerateResponse = {
  imageUrl: string;
  prompt: string;
  animal?: string;
};

async function toCompactGalleryImageUrl(sourceUrl: string): Promise<string> {
  if (!sourceUrl.startsWith("data:image/")) {
    return sourceUrl;
  }

  try {
    const img = new Image();
    img.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = sourceUrl;
    });

    const maxEdge = 384;
    const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * ratio));
    const height = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return sourceUrl;

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.76);
  } catch {
    return sourceUrl;
  }
}

const inputClass =
  "w-full rounded-[1.75rem] border border-white/80 bg-white/85 px-5 py-4 text-sm text-[#5a4d76] shadow-[0_14px_30px_rgba(176,160,205,0.12)] outline-none transition placeholder:text-[#c2b5d7] focus:-translate-y-0.5 focus:border-[#f0b8d1] focus:ring-4 focus:ring-[#ffe4f0]";

const buttonBase =
  "rounded-full px-6 py-3.5 text-sm font-semibold transition duration-200 active:scale-[0.98] disabled:opacity-60 disabled:saturate-50";

const themeCardMap: Record<Theme, string> = {
  pastel: "from-rose-100 via-pink-50 to-sky-100 border-rose-200/80",
  neon: "from-cyan-100 via-fuchsia-50 to-lime-100 border-cyan-200/80",
  vivid: "from-orange-100 via-rose-50 to-yellow-100 border-orange-200/80",
  mono: "from-slate-100 via-white to-zinc-100 border-slate-200/80"
};

const mascotFaces = ["(◍•ᴗ•◍)", "U・ᴥ・U", "(=^·ω·^=)", "ʕ•ᴥ•ʔ"];

export default function HomePage() {
  const [keyword1, setKeyword1] = useState("");
  const [keyword2, setKeyword2] = useState("");
  const [keyword3, setKeyword3] = useState("");
  const [theme, setTheme] = useState<Theme>("pastel");

  const [isLoading, setLoading] = useState(false);

  const [imageUrl, setImageUrl] = useState<string>("");
  const [promptText, setPromptText] = useState<string>("");
  const [gallery, setGallery] = useState<IconRecord[]>([]);
  const [selected, setSelected] = useState<IconRecord | null>(null);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [imageVisible, setImageVisible] = useState(false);
  const [currentAnimal, setCurrentAnimal] = useState("");
  const [mascotFaceIndex, setMascotFaceIndex] = useState(0);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mascotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const keywords = useMemo(() => [keyword1.trim(), keyword2.trim(), keyword3.trim()].filter(Boolean), [keyword1, keyword2, keyword3]);
  const canGenerate = useMemo(() => keywords.length >= 1 && keywords.length <= 3 && !!theme, [keywords, theme]);
  const mascotFace = mascotFaces[mascotFaceIndex % mascotFaces.length];

  const variationToken = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    setGallery(loadGallery());
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      setMascotFaceIndex(0);
      mascotIntervalRef.current = setInterval(() => {
        setMascotFaceIndex((prev) => prev + 1);
      }, 600);
    } else {
      if (mascotIntervalRef.current) {
        clearInterval(mascotIntervalRef.current);
        mascotIntervalRef.current = null;
      }
    }
    return () => {
      if (mascotIntervalRef.current) clearInterval(mascotIntervalRef.current);
    };
  }, [isLoading]);

  const showSuccess = (message: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setSuccessMessage(message);
    successTimerRef.current = setTimeout(() => setSuccessMessage(""), 3000);
  };

  const validateKeywords = () => {
    if (keywords.length < 1 || keywords.length > 3) {
      setError("キーワードを1～3個入力してください🐾");
      return false;
    }
    return true;
  };

  const doGenerate = async (evt?: FormEvent, options?: { lockAnimal?: boolean }) => {
    evt?.preventDefault();
    if (!validateKeywords()) return;
    console.log("CLICKED");
    setError("");
    setSuccessMessage("");
    setImageVisible(false);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword1: keyword1.trim(),
          keyword2: keyword2.trim(),
          keyword3: keyword3.trim(),
          animal: options?.lockAnimal ? currentAnimal : undefined,
          theme,
          variationToken: variationToken()
        })
      });

      const json = (await res.json()) as GenerateResponse & { error?: string };
      console.log("API DONE", json);
      if (!res.ok) throw new Error(json.error ?? "生成に失敗しました");

      const nextImageUrl = json.imageUrl?.trim();
      if (!nextImageUrl) throw new Error("生成画像URLの取得に失敗しました");

      setImageUrl(nextImageUrl);
      setPromptText(json.prompt);
      setCurrentAnimal((json.animal ?? "").trim());
      requestAnimationFrame(() => setImageVisible(true));

      console.log("SAVE FLOW");
      const storableImageUrl = await toCompactGalleryImageUrl(nextImageUrl);
      const updated = saveToGallery({
        image_url: storableImageUrl,
        keyword1: keyword1.trim(),
        keyword2: keyword2.trim(),
        keyword3: keyword3.trim(),
        theme
      });
      console.log('[doGenerate] saveToGallery returned:', updated.length, 'items');
      setGallery(updated);

      showSuccess("ゆるかわアイコンができました🐾");
    } catch (e) {
      console.error("[client/generate] failed", e);
      setImageUrl("");
      setImageVisible(false);
      setError(e instanceof Error ? e.message : "生成エラー");
      setSuccessMessage("");
    } finally {
      setLoading(false);
    }
  };

  const buttonDisabled = isLoading || !canGenerate;
  const previewMode = isLoading ? "loading" : error ? "error" : imageUrl ? "success" : "idle";

  return (
    <main className="relative mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <section className="float-panel pastel-grid overflow-hidden rounded-[2.5rem] border border-white/75 p-5 backdrop-blur-xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="float-panel rounded-[2rem] border border-white/80 p-6 md:p-7">
              <div className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[#d386a6] shadow-[0_10px_30px_rgba(229,177,201,0.22)]">
                YURUKAWA ICON MAKER
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-[#64567f] md:text-6xl">
                ゆるかわ
                <br />
                <span className="whitespace-nowrap">アイコンメーカー</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#7f739c] md:text-base">
                3つのキーワードを入れるだけで、どんな入力でも丸くてかわいい動物キャラに変換。テーマごとの世界観で、アイコンとして使いやすい一枚に整えます。
              </p>
            </div>
            <form onSubmit={doGenerate} className="float-panel rounded-[2rem] border border-white/80 p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#655780] md:text-xl">キーワードを入力</h2>
                  <p className="mt-1 text-sm text-[#8a7ea5]">かわいい雰囲気になるよう、好きな要素を自由に入れてください。</p>
                </div>
                <div className="rounded-full bg-[#fff2f8] px-4 py-2 text-xs font-semibold text-[#d387a8]">1画面で完結</div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="px-2 text-xs font-semibold text-[#9d8ab5]">keyword1</span>
                  <input type="text" className={inputClass} placeholder="例: ふわふわ" value={keyword1} onChange={(e) => setKeyword1(e.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="px-2 text-xs font-semibold text-[#9d8ab5]">keyword2</span>
                  <input type="text" className={inputClass} placeholder="例: 猫" value={keyword2} onChange={(e) => setKeyword2(e.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="px-2 text-xs font-semibold text-[#9d8ab5]">keyword3</span>
                  <input type="text" className={inputClass} placeholder="例: リボン" value={keyword3} onChange={(e) => setKeyword3(e.target.value)} />
                </label>
              </div>
              <p className="mt-3 px-2 text-xs text-[#9b8fb4]">1～3個まで入力できます。空欄があってもOKです。</p>
              <div className="mt-6">
                <div className="px-2 text-xs font-semibold text-[#9d8ab5]">テーマを選ぶ</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`rounded-[1.7rem] border bg-gradient-to-br p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(177,160,205,0.15)] ${themeCardMap[t.id]} ${
                        theme === t.id ? "ring-4 ring-white shadow-[0_20px_36px_rgba(176,160,205,0.18)]" : "opacity-85"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-base font-bold text-[#645780]">{t.label}</div>
                        <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#9a87b5]">{theme === t.id ? "選択中" : "チェック"}</div>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[#7d7296]">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={buttonDisabled}
                  className={`${buttonBase} bg-gradient-to-r from-[#ffb8cf] via-[#ffc7df] to-[#ffd7ea] text-[#7b4c66] shadow-[0_16px_28px_rgba(255,189,216,0.36)] hover:-translate-y-0.5`}
                >
                  {isLoading ? "生成中です…" : "ゆるかわ生成"}
                </button>
                <button
                  type="button"
                  disabled={buttonDisabled}
                  onClick={() => void doGenerate(undefined, { lockAnimal: true })}
                  className={`${buttonBase} bg-gradient-to-r from-[#b9e9ff] via-[#d4f1ff] to-[#e7f8ff] text-[#46728c] shadow-[0_16px_28px_rgba(188,230,249,0.34)] hover:-translate-y-0.5`}
                >
                  別バリエーション再生成
                </button>
              </div>

              {successMessage && <p className="mt-4 rounded-[1.4rem] bg-[#ecfff3] px-4 py-3 text-sm text-[#4f9a72]">{successMessage}</p>}
              {error && <p className="mt-4 rounded-[1.4rem] bg-[#fff0f4] px-4 py-3 text-sm text-[#c35c7f]">{error}</p>}
            </form>
          </div>
          <div className="space-y-6">
            <article className="float-panel rounded-[2rem] border border-white/80 p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#655780] md:text-xl">生成プレビュー</h2>
                  <p className="mt-1 text-sm text-[#8a7ea5]">かわいい丸みと余白で、アイコンとして見やすく仕上げます。</p>
                </div>
                <div className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-[#a18cbe] shadow-[0_10px_20px_rgba(176,160,205,0.12)]">
                  theme: {THEME_OPTIONS.find((item) => item.id === theme)?.label}
                </div>
              </div>

              <div className="relative mt-5 aspect-square overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className={`absolute inset-0 ${isLoading ? "animated-gradient" : "bg-gradient-to-br from-white/70 via-[#fff7fb] to-[#eef8ff]"}`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_42%)]" />

                {previewMode === "loading" ? (
                  <div className="absolute inset-3 z-20 flex min-h-[14rem] flex-col items-center justify-center gap-4 rounded-[1.6rem] border border-white/85 bg-white/72 px-4 py-5 text-center backdrop-blur-sm">
                    <div className="yurupuru inline-flex min-h-28 min-w-28 max-w-full items-center justify-center rounded-full bg-white/85 px-4 py-3 text-3xl shadow-[0_18px_36px_rgba(178,160,205,0.22)]">
                      <span className="block max-w-full whitespace-normal break-keep text-center leading-tight">{mascotFace.replace(/\n/g, " ")}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-[#715f91]">生成中です…</p>
                      <p className="text-sm text-[#8e81a7]">ゆるかわアイコンを描いています🐾</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-bounce rounded-full bg-[#ffc6dc] [animation-delay:-0.25s]" />
                      <span className="h-3 w-3 animate-bounce rounded-full bg-[#c7ebff] [animation-delay:-0.12s]" />
                      <span className="h-3 w-3 animate-bounce rounded-full bg-[#c9f4d5]" />
                    </div>
                  </div>
                ) : previewMode === "success" && imageUrl ? (
                  <div className={`relative h-full overflow-hidden rounded-[1.6rem] transition-opacity duration-500 ${imageVisible ? "fade-in-up opacity-100" : "opacity-0"}`}>
                    {imageUrl && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          key={imageUrl}
                          src={imageUrl}
                          alt="generated icon"
                          className="h-full w-full object-cover"
                          onLoad={() => setImageVisible(true)}
                          onError={() => {
                            setImageVisible(false);
                            setError("画像表示に失敗しました。再生成してください🐾");
                          }}
                        />
                      </>
                    )}
                  </div>
                ) : previewMode === "error" ? (
                  <div className="absolute inset-3 z-20 grid place-items-center rounded-[1.6rem] border border-[#f6c9d8] bg-[#fff4f8] text-center">
                    <div className="px-5">
                      <p className="text-base font-semibold text-[#b76587]">生成に失敗しました</p>
                      <p className="mt-2 text-sm text-[#be6f90]">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 grid h-full place-items-center rounded-[1.6rem] border border-dashed border-white/80 bg-white/35 text-center">
                    <div>
                      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/85 text-3xl shadow-[0_16px_30px_rgba(181,164,208,0.2)]">ʕ•ᴥ•ʔ</div>
                      <p className="mt-4 text-base font-semibold text-[#76688f]">ここにかわいいアイコンが表示されます</p>
                      <p className="mt-2 text-sm text-[#9487ac]">キーワードとテーマを選んで、かわいい世界観の一枚を生成してください。</p>
                    </div>
                  </div>
                )}

              </div>
            </article>

            {promptText && (
              <article className="float-panel rounded-[2rem] border border-white/80 p-5 md:p-6">
                <h3 className="text-sm font-bold text-[#655780]">生成プロンプト</h3>
                <p className="mt-3 break-words text-xs leading-6 text-[#8a7ea5]">{promptText}</p>
              </article>
            )}

            <article className="float-panel rounded-[2rem] border border-white/80 p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#655780] md:text-xl">最新5件ギャラリー</h2>
                  <p className="mt-1 text-sm text-[#8a7ea5]">生成したゆるかわアイコンをすぐ確認できます。</p>
                </div>
                <div className="rounded-full bg-[#fff3f8] px-3 py-1.5 text-xs font-semibold text-[#d489ab]">latest 5</div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {gallery.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="group relative aspect-square overflow-hidden rounded-[1.2rem] border border-white/75 bg-white/50 transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(176,160,205,0.18)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url} alt="gallery item" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="relative max-w-md rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-4 top-4 text-xl text-[#a18cbe]" onClick={() => setSelected(null)}>✕</button>
            <div className="relative aspect-square overflow-hidden rounded-[1.6rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.image_url} alt="expanded" className="h-full w-full object-cover" />
            </div>
            <div className="mt-4 space-y-2 text-sm text-[#7f739c]">
              <p><strong>キーワード:</strong> {selected.keyword1}, {selected.keyword2}, {selected.keyword3}</p>
              <p><strong>テーマ:</strong> {selected.theme}</p>
              <p className="text-xs text-[#a18cbe]">作成: {new Date(selected.created_at).toLocaleString('ja-JP')}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
