import { z } from "zod";
import OpenAI from "openai";
import { THEME_PROMPT_SUFFIX, THEME_WORLD_SYSTEM, Theme } from "./themes";

const BASE_PROMPT =
  "A super fluffy chibi animal mascot icon, ultra plush toy-like design, extremely round and chubby proportions, minimal simplified shapes, soft pillow-like mochi volume, cute slightly silly expression, modern kawaii brand mascot, LINE sticker and app icon ready";

const PREFERRED_BASE_ANIMALS = ["cat", "dog", "rabbit", "bear", "fox", "hamster", "penguin", "frog", "panda"] as const;

const ANIMAL_SYNONYMS: Record<string, string> = {
  cat: "cat",
  cats: "cat",
  kitty: "cat",
  kitten: "cat",
  dog: "dog",
  dogs: "dog",
  puppy: "dog",
  rabbit: "rabbit",
  bunny: "rabbit",
  hare: "rabbit",
  bear: "bear",
  teddybear: "bear",
  fox: "fox",
  hamster: "hamster",
  hamsters: "hamster",
  penguin: "penguin",
  frog: "frog",
  panda: "panda",
  giraffe: "giraffe",
  giraffes: "giraffe",
  lion: "lion",
  lions: "lion",
  tiger: "tiger",
  tigers: "tiger",
  elephant: "elephant",
  elephants: "elephant",
  koala: "koala",
  koalas: "koala",
  monkey: "monkey",
  monkeys: "monkey",
  duck: "duck",
  ducks: "duck",
  owl: "owl",
  owls: "owl",
  deer: "deer"
};

const ANIMAL_SYNONYMS_JA: Record<string, string> = {
  猫: "cat",
  ねこ: "cat",
  ネコ: "cat",
  犬: "dog",
  いぬ: "dog",
  イヌ: "dog",
  うさぎ: "rabbit",
  ウサギ: "rabbit",
  兎: "rabbit",
  くま: "bear",
  クマ: "bear",
  熊: "bear",
  きつね: "fox",
  キツネ: "fox",
  狐: "fox",
  はむすたー: "hamster",
  ハムスター: "hamster",
  ぺんぎん: "penguin",
  ペンギン: "penguin",
  かえる: "frog",
  カエル: "frog",
  蛙: "frog",
  ぱんだ: "panda",
  パンダ: "panda",
  きりん: "giraffe",
  キリン: "giraffe",
  麒麟: "giraffe"
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function detectAnimalKeyword(value: string): string | null {
  const normalized = normalizeToken(value);
  if (normalized && ANIMAL_SYNONYMS[normalized]) {
    return ANIMAL_SYNONYMS[normalized];
  }

  const tokens = value.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const token of tokens) {
    if (ANIMAL_SYNONYMS[token]) {
      return ANIMAL_SYNONYMS[token];
    }
  }

  for (const [jaKey, species] of Object.entries(ANIMAL_SYNONYMS_JA)) {
    if (value.includes(jaKey)) {
      return species;
    }
  }

  return null;
}

function pickAnimal(allKeywords: string[]): {
  selectedAnimal: string;
  isInputAnimal: boolean;
  sourceKeyword: string;
  sourceType: "input" | "random" | "locked";
} {
  for (const keyword of allKeywords) {
    const detected = detectAnimalKeyword(keyword);
    if (!detected) continue;

    // Animal specified in user input -> species hard lock
    return {
      selectedAnimal: detected,
      isInputAnimal: true,
      sourceKeyword: keyword,
      sourceType: "input"
    };
  }

  // No animal keyword in input -> randomly choose one allowed base animal.
  const randomIndex = Math.floor(Math.random() * PREFERRED_BASE_ANIMALS.length);
  const selectedAnimal = PREFERRED_BASE_ANIMALS[randomIndex];

  return {
    selectedAnimal,
    isInputAnimal: false,
    sourceKeyword: "",
    sourceType: "random"
  };
}

function resolveAnimalDecision(lockedAnimal: string | undefined, allKeywords: string[]) {
  const normalizedLockedAnimal = (lockedAnimal ?? "").trim().toLowerCase();
  if (normalizedLockedAnimal) {
    return {
      selectedAnimal: normalizedLockedAnimal,
      isInputAnimal: true,
      sourceKeyword: normalizedLockedAnimal,
      sourceType: "locked" as const
    };
  }
  return pickAnimal(allKeywords);
}

const OBJECT_KEYWORD_SYNONYMS: Record<string, string> = {
  flute: "flute",
  guitar: "guitar",
  book: "book",
  hat: "hat",
  ribbon: "ribbon",
  bow: "bow",
  crown: "crown",
  glasses: "glasses",
  backpack: "backpack",
  flower: "flower",
  star: "star",
  moon: "moon",
  heart: "heart",
  donut: "donut",
  cake: "cake",
  cookie: "cookie",
  umbrella: "umbrella",
  camera: "camera",
  microphone: "microphone",
  ball: "ball"
};

const STYLE_KEYWORD_SYNONYMS: Record<string, string> = {
  cheeky: "cheeky",
  cute: "cute",
  angry: "angry",
  happy: "happy",
  shy: "shy",
  sleepy: "sleepy",
  brave: "brave",
  playful: "playful",
  calm: "calm",
  excited: "excited",
  curious: "curious",
  gentle: "gentle"
};

type KeywordCategory = "animal" | "object" | "style" | "other";

type KeywordClassification = {
  source: string;
  normalized: string;
  category: KeywordCategory;
};

function classifyKeyword(value: string): KeywordClassification {
  const normalized = normalizeToken(value);
  const detectedAnimal = detectAnimalKeyword(value);

  if (detectedAnimal) {
    return { source: value, normalized: detectedAnimal, category: "animal" };
  }
  if (!normalized) {
    return { source: value, normalized, category: "other" };
  }
  if (OBJECT_KEYWORD_SYNONYMS[normalized]) {
    return { source: value, normalized: OBJECT_KEYWORD_SYNONYMS[normalized], category: "object" };
  }
  if (STYLE_KEYWORD_SYNONYMS[normalized]) {
    return { source: value, normalized: STYLE_KEYWORD_SYNONYMS[normalized], category: "style" };
  }
  return { source: value, normalized, category: "other" };
}

const responseSchema = z.object({
  prompt: z.string().min(30)
});

export type PromptBuildInput = {
  keyword1: string;
  keyword2: string;
  keyword3: string;
  theme: Theme;
  variationHint: string;
  lockedAnimal?: string;
};

export type PromptBuildResult = {
  prompt: string;
  animal: string;
};

export async function buildYurukawaPrompt(input: PromptBuildInput): Promise<PromptBuildResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const textModel = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";
  const keyword1 = input.keyword1.trim();
  const keyword2 = input.keyword2.trim();
  const keyword3 = input.keyword3.trim();
  const providedKeywords = [keyword1, keyword2, keyword3].filter(Boolean);
  const animalDecision = resolveAnimalDecision(input.lockedAnimal, providedKeywords);
  const classifiedKeywords = providedKeywords.map(classifyKeyword);
  const objectKeywords = classifiedKeywords.filter((item) => item.category === "object").map((item) => item.source);
  const styleKeywords = classifiedKeywords.filter((item) => item.category === "style").map((item) => item.source);
  const otherKeywords = classifiedKeywords.filter((item) => item.category === "other").map((item) => item.source);

  const strictRule = `
You convert user intent into an image prompt with hard constraints.
CORE PRINCIPLE (ABSOLUTE):
- Animal mascot is ALWAYS the main subject. Everything else is decoration.
- Animal cuteness must NEVER be broken.

ANIMAL SPECIES (PRE-DETERMINED - DO NOT CHANGE):
- The animal species has already been selected by the application layer.
- It is provided in the "animal" field of the user message.
- Use it EXACTLY as given. Never modify, override, or substitute it.
- Do NOT make your own animal decision.
- Do NOT replace it with a "cuter" or "more suitable" animal.
- Do NOT ignore it even if a keyword seems to suggest a different animal.

NO SPECIES SUBSTITUTION:
- Never replace giraffe with hamster.
- Never replace hamster with rabbit/cat/dog.
- Never downgrade or swap animal types under any condition.

CUTE ANIMAL STYLE LOCK:
- Chibi style only
- Big head, small body
- Large expressive eyes
- Soft plush toy appearance
- Rounded shapes only
- Maximum cuteness preserved
- Ultra fluffy, mochi-like soft volume

KEYWORD INTEGRATION RULE:
- Keywords appear as accessories, costumes, motifs, props, or background elements.
- NEVER replace or deform animal identity because of keywords.

KEYWORD FIDELITY SYSTEM (CRITICAL):
- Every input keyword must be represented visually in some natural form; no keyword can be ignored.
- Real-world object keywords (for example flute, guitar, book, hat) MUST appear clearly and be visually recognizable.
- Object keywords may be represented only as held items, worn accessories, nearby props, or integrated motifs.
- Never replace object keywords with unrelated objects.
- Emotional/adjective keywords (for example cheeky, cute, angry) must be expressed via facial expression, pose, or body language.
- Do not force all keywords equally; keep composition balanced while preserving visibility for each keyword.

PRIORITY ORDER:
1) Pre-determined animal species (absolute, never change)
2) Object keywords
3) Emotion/style keywords
4) Visual world style

CONSISTENCY:
- Keep the same animal species across the entire output.
- No mid-generation species switching.

WORLD STYLE SYSTEM:
- Apply exactly one world based on theme input and enforce its palette/mood/decoration.
- Only style layer may change: colors, decorations, background.
- NEVER break animal face/body structure.

QUALITY GUARDRAILS:
- Never realistic fur rendering
- No detailed anatomy
- No complex textures
- No horror/violent elements
- Icon-ready sticker/branding composition
- Do not copy existing IP
Return JSON only: {"prompt":"..."}
`;

  const userMessage = {
    instruction: "Use the pre-determined 'animal' field exactly as-is. Do NOT change or substitute the species.",
    animal: animalDecision.selectedAnimal,
    keywords: providedKeywords,
    objectKeywords,
    styleKeywords,
    otherKeywords,
    selectedAnimal: animalDecision.selectedAnimal,
    isInputAnimal: animalDecision.isInputAnimal,
    animalSourceKeyword: animalDecision.sourceKeyword,
    animalSourceType: animalDecision.sourceType,
    speciesHardLock: true,
    noSpeciesSubstitution: true,
    priorityOrder: ["pre-determined-animal", "object-keywords", "emotion-style-keywords", "visual-world-style"],
    preferredBaseAnimals: PREFERRED_BASE_ANIMALS,
    theme: input.theme,
    worldStyleSystem: THEME_WORLD_SYSTEM[input.theme],
    variationHint: input.variationHint,
    basePrompt: BASE_PROMPT,
    themeSuffix: THEME_PROMPT_SUFFIX[input.theme]
  };

  if (!apiKey) {
    const primaryKeywordNote = animalDecision.isInputAnimal
      ? `main subject: ${animalDecision.selectedAnimal} mascot (input contains animal "${animalDecision.sourceKeyword}" - SPECIES HARD LOCK, NEVER CHANGE)`
      : `main subject: ${animalDecision.selectedAnimal} mascot (randomly selected from allowed list because no animal keyword provided)`;

    const keywordIntegrationNote = animalDecision.isInputAnimal
      ? "keyword integration: non-animal keywords are accessories/costumes/motifs only; never replace animal identity"
      : `keyword integration: express "${keyword1}"${keyword2 ? ` and "${keyword2}"` : ""}${keyword3 ? ` and "${keyword3}"` : ""} as accessories/costumes/motifs only`;

    return {
      prompt: [
      BASE_PROMPT,
      "core principle: animal mascot is always the main subject; all other elements are decorations",
      "species hard lock: if primary keyword is an animal, preserve exact species and never substitute",
      primaryKeywordNote,
      "CRITICAL: PRIMARY KEYWORD must be clearly visually recognizable",
      "style lock: chibi only, big head small body, large expressive eyes, rounded plush toy shape only",
      "secondary elements: " + [keyword2, keyword3].filter(Boolean).join(", "),
      "ultra fluffy plush toy-like style, extremely round chubby body, minimal simplified shapes",
      "soft pillow-like mochi volume, cute slightly silly expression, no realistic fur, no detailed anatomy, no complex textures",
      "soft editorial kawaii, aesthetic pastel mascot, modern minimal kawaii, toy-like branding mascot for stickers and apps",
      keywordIntegrationNote,
      objectKeywords.length > 0
        ? `object fidelity: include recognizable real objects (${objectKeywords.join(", ")}) as held items, accessories, nearby props, or motifs; do not replace`
        : "object fidelity: if no real object keyword is present, keep props minimal and keyword-consistent",
      styleKeywords.length > 0
        ? `style fidelity: express adjectives (${styleKeywords.join(", ")}) through facial expression, pose, and body language`
        : "style fidelity: keep expression clear, cute, and readable",
      otherKeywords.length > 0 ? `other keywords to visualize naturally: ${otherKeywords.join(", ")}` : "",
      "priority order: 1) animal keyword 2) object keywords 3) emotion/style keywords 4) visual world style",
      "world style system: " + THEME_WORLD_SYSTEM[input.theme],
      THEME_PROMPT_SUFFIX[input.theme],
      `variation: ${input.variationHint}`,
      "same mascot identity, but different facial expression and icon-friendly composition"
      ].filter(Boolean).join(", "),
      animal: animalDecision.selectedAnimal
    };
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: textModel,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: strictRule },
      { role: "user", content: JSON.stringify(userMessage) }
    ]
  });

  const parsed = responseSchema.safeParse(JSON.parse(completion.choices[0]?.message?.content ?? "{}"));

  if (!parsed.success) {
    const primaryKeywordNote = animalDecision.isInputAnimal
      ? `main subject: ${animalDecision.selectedAnimal} mascot (input contains animal "${animalDecision.sourceKeyword}" - SPECIES HARD LOCK, NEVER CHANGE)`
      : `main subject: ${animalDecision.selectedAnimal} mascot (randomly selected from allowed list because no animal keyword provided)`;

    const keywordIntegrationNote = animalDecision.isInputAnimal
      ? "keyword integration: non-animal keywords are accessories/costumes/motifs only; never replace animal identity"
      : `keyword integration: express "${keyword1}"${keyword2 ? ` and "${keyword2}"` : ""}${keyword3 ? ` and "${keyword3}"` : ""} as accessories/costumes/motifs only`;

    return {
      prompt: [
      BASE_PROMPT,
      "core principle: animal mascot is always the main subject; all other elements are decorations",
      "species hard lock: if primary keyword is an animal, preserve exact species and never substitute",
      primaryKeywordNote,
      "CRITICAL: PRIMARY KEYWORD must be clearly visually recognizable",
      "style lock: chibi only, big head small body, large expressive eyes, rounded plush toy shape only",
      "secondary elements: " + [keyword2, keyword3].filter(Boolean).join(", "),
      "ultra fluffy plush toy-like style, extremely round chubby body, minimal simplified shapes",
      "soft pillow-like mochi volume, cute slightly silly expression, no realistic fur, no detailed anatomy, no complex textures",
      "soft editorial kawaii, aesthetic pastel mascot, modern minimal kawaii, toy-like branding mascot for stickers and apps",
      keywordIntegrationNote,
      objectKeywords.length > 0
        ? `object fidelity: include recognizable real objects (${objectKeywords.join(", ")}) as held items, accessories, nearby props, or motifs; do not replace`
        : "object fidelity: if no real object keyword is present, keep props minimal and keyword-consistent",
      styleKeywords.length > 0
        ? `style fidelity: express adjectives (${styleKeywords.join(", ")}) through facial expression, pose, and body language`
        : "style fidelity: keep expression clear, cute, and readable",
      otherKeywords.length > 0 ? `other keywords to visualize naturally: ${otherKeywords.join(", ")}` : "",
      "priority order: 1) animal keyword 2) object keywords 3) emotion/style keywords 4) visual world style",
      "world style system: " + THEME_WORLD_SYSTEM[input.theme],
      THEME_PROMPT_SUFFIX[input.theme],
      `variation: ${input.variationHint}`,
      "same mascot identity, but different facial expression and icon-friendly composition"
      ].filter(Boolean).join(", "),
      animal: animalDecision.selectedAnimal
    };
  }

  return {
    prompt: parsed.data.prompt,
    animal: animalDecision.selectedAnimal
  };
}
