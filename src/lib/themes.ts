export type Theme = "pastel" | "neon" | "vivid" | "mono";

export const THEME_OPTIONS: { id: Theme; label: string; desc: string }[] = [
  { id: "pastel", label: "パステル", desc: "やわらかく癒し系" },
  { id: "neon", label: "ネオン", desc: "サイバー・おしゃれ" },
  { id: "vivid", label: "ビビッド", desc: "ポップ・元気" },
  { id: "mono", label: "モノクロ", desc: "シンプル・手書き風" }
];

export const THEME_PROMPT_SUFFIX: Record<Theme, string> = {
  pastel: "soft pastel colors, gentle, healing atmosphere",
  neon: "cyber neon glow, futuristic, stylish lighting",
  vivid: "high saturation, pop art style, energetic colors",
  mono: "black and white only, hand-drawn sketch illustration style, soft organic ink lines, slightly imperfect human-drawn strokes, cute chibi mascot with line-based softness, stylish minimal sketchbook aesthetic, NOT grayscale filter"
};

export const THEME_WORLD_SYSTEM: Record<Theme, string> = {
  pastel:
    "PASTEL WORLD: pastel palette only (baby pink, mint, lavender, cream), dreamy healing mood, include ribbons, bows, lace, and hearts, like a cute accessory brand or plush toy shop",
  vivid:
    "VIVID WORLD: high-saturation vivid colors only, Harajuku pop energy, sticker and pop-art feeling, playful graphic contrasts, energetic but still cute",
  neon:
    "NEON WORLD: American neon pop mood, 80s-90s diner/arcade/signage inspiration, glowing neon accents with dark contrast background, stylish urban but still cute mascot",
  mono:
    "MONOCHROME WORLD: hand-drawn minimal illustration style — ONLY black and white, pure ink drawing aesthetic, NO gray tint, NO color accents; slightly imperfect hand-drawn lines with soft sketch-like strokes and organic line variation, feels human-drawn not digitally perfect; cute chibi animal mascot must remain (big head, small body, expressive eyes); softness expressed through line quality not color; feels like a stylish sketchbook brand mascot or editorial hand-drawn illustration — NOT grayscale filter, NOT desaturated render, NOT digital-perfect vector; simplicity + personality through line expression"
};
