// ============================================================================
// AI MCQ generation (provider-agnostic). The user supplies their own API key.
// Supported providers: 'groq', 'openai', and 'gemini'.
// Falls back to a built-in question bank when no key / demo mode.
// ============================================================================

export const SAMPLE_BANK = [
  { subject: 'Physics', chapter: 'Kinematics', topic: 'Motion',
    text: 'The SI unit of acceleration is:',
    options: ['m/s', 'm/s²', 'km/h', 'N'], correctIndex: 1 },
  { subject: 'Physics', chapter: 'Optics', topic: 'Light',
    text: 'Speed of light in vacuum is approximately:',
    options: ['3×10⁶ m/s', '3×10⁸ m/s', '3×10¹⁰ m/s', '3×10⁴ m/s'], correctIndex: 1 },
  { subject: 'Chemistry', chapter: 'Periodic Table', topic: 'Elements',
    text: 'Which element has the chemical symbol "Na"?',
    options: ['Nitrogen', 'Sodium', 'Neon', 'Nickel'], correctIndex: 1 },
  { subject: 'Chemistry', chapter: 'Acids & Bases', topic: 'pH',
    text: 'A solution with pH = 7 is:',
    options: ['Acidic', 'Basic', 'Neutral', 'Amphoteric'], correctIndex: 2 },
  { subject: 'Biology', chapter: 'Cell', topic: 'Organelles',
    text: 'The powerhouse of the cell is the:',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correctIndex: 2 },
  { subject: 'Maths', chapter: 'Algebra', topic: 'Quadratics',
    text: 'The roots of x² - 5x + 6 = 0 are:',
    options: ['1 and 6', '2 and 3', '-2 and -3', '5 and 6'], correctIndex: 1 },
  { subject: 'GK', chapter: 'Geography', topic: 'Capitals',
    text: 'The capital of Australia is:',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correctIndex: 2 },
  { subject: 'Computer', chapter: 'Basics', topic: 'Units',
    text: '1 Kilobyte equals how many bytes?',
    options: ['100', '1000', '1024', '2048'], correctIndex: 2 },
];

export function randomFromBank(filter = {}) {
  let pool = SAMPLE_BANK.slice();
  if (filter.subject) pool = pool.filter(q => q.subject === filter.subject);
  if (filter.chapter) pool = pool.filter(q => q.chapter === filter.chapter);
  if (!pool.length) pool = SAMPLE_BANK;
  const q = pool[Math.floor(Math.random() * pool.length)];
  return { text: q.text, options: q.options.slice(), correctIndex: q.correctIndex };
}

const SHAPE =
  `Return ONLY strict minified JSON with this exact shape and nothing else: ` +
  `{"text":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}. ` +
  `Exactly 4 options. correctIndex is 0-based. "explanation" briefly justifies the correct answer using medical knowledge.`;

const MED = 'You are a medical educator setting NEET PG / INICET standard MCQs. Output only JSON.';

function selectedModel(provider, fallback) {
  const manager = typeof window !== 'undefined' && window.AIKeyManager;
  const settings = manager && manager.getCachedAISettings();
  return settings && settings.provider === provider && settings.model
    ? settings.model
    : fallback;
}

// Build the right prompt for the Manual Entry "AI Generate / Fix" button.
// - full question + options -> proof-read & correct mistakes
// - only a question       -> generate options + answer + explanation
// - nothing               -> random NEET PG question
// One prompt covers all Manual-Entry cases: correct what's filled, fill what's
// blank (question / options / correct answer / explanation), or build the whole
// MCQ from scratch when everything is empty.
function manualPrompt({ question, options, correctIndex, explanation }) {
  const q = (question || '').trim();
  const opts = (options || []).map(o => (o || '').trim());
  return `You are a medical educator preparing NEET PG / INICET standard MCQs.\n` +
    `A partially or fully filled MCQ is given below (blank fields may be empty strings):\n` +
    `Question: ${q || '(blank)'}\n` +
    `Options: ${JSON.stringify(opts)}\n` +
    `Marked correctIndex (may be a guess): ${Number(correctIndex) || 0}\n` +
    `Explanation: ${(explanation || '').trim() || '(blank)'}\n\n` +
    `Rules:\n` +
    `- Keep the author's intent. For any field that is FILLED, only fix spelling, grammar, language and medical/factual errors.\n` +
    `- For any field that is BLANK, generate it accurately from NEET PG medical knowledge so the whole MCQ is consistent.\n` +
    `- If everything is blank, create one high-yield random NEET PG MCQ.\n` +
    `- Ensure exactly 4 options, the correct one identified by correctIndex, and a concise explanation.\n` + SHAPE;
}

function bankPrompt({ subject, chapter, topic, difficulty }) {
  const scope = [subject, chapter].filter(Boolean).join(' - ') || 'general medicine';
  const focus = (topic || '').trim();
  const diff = (difficulty || '').trim();
  return `Generate ONE NEET PG / INICET level multiple-choice question.\n` +
    `Subject & sub-topic: ${scope}.\n` +
    (focus ? `Specific focus: ${focus}.\n` : '') +
    (diff ? `Difficulty: ${diff}.\n` : '') + SHAPE;
}

function parseMCQ(raw) {
  if (!raw) throw new Error('Empty AI response');
  let s = String(raw).trim();
  // strip code fences if present
  s = s.replace(/^```(json)?/i, '').replace(/```$/,'').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  const obj = JSON.parse(s);
  if (!obj.text || !Array.isArray(obj.options) || obj.options.length !== 4)
    throw new Error('AI returned malformed question');
  const ci = Number(obj.correctIndex);
  return {
    text: String(obj.text),
    options: obj.options.map(String),
    correctIndex: (ci >= 0 && ci <= 3) ? ci : 0,
    explanation: obj.explanation ? String(obj.explanation) : '',
  };
}

async function genOpenAI(prompt, apiKey) {
  const model = selectedModel('openai', 'gpt-4o-mini');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: 'system', content: MED },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error('OpenAI error: ' + (await res.text()));
  const data = await res.json();
  return parseMCQ(data?.choices?.[0]?.message?.content);
}

async function genGemini(prompt, apiKey) {
  const model = selectedModel('gemini', 'gemini-2.5-flash-lite');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: MED + '\n' + prompt }] }] }),
  });
  if (!res.ok) throw new Error('Gemini error: ' + (await res.text()));
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseMCQ(text);
}

// Groq is OpenAI-compatible. Uses the key stored in profiles.groq_api_key.
async function genGroq(prompt, apiKey) {
  const model = selectedModel('groq', 'llama-3.1-8b-instant');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: 'system', content: MED },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error('Groq error: ' + (await res.text()));
  const data = await res.json();
  return parseMCQ(data?.choices?.[0]?.message?.content);
}

function dispatch(prompt, provider, apiKey) {
  if (provider === 'gemini') return genGemini(prompt, apiKey);
  if (provider === 'openai') return genOpenAI(prompt, apiKey);
  return genGroq(prompt, apiKey);
}

// Manual Entry AI helper (correct / fill / generate depending on inputs).
export async function aiManual(input, provider, apiKey) {
  if (!apiKey) return randomFromBank();
  return dispatch(manualPrompt(input), provider, apiKey);
}

// AI Question Bank: generate from subject/chapter.
export async function aiBank(input, provider, apiKey) {
  if (!apiKey) return randomFromBank();
  return dispatch(bankPrompt(input), provider, apiKey);
}

// provider: 'groq' | 'openai' | 'gemini'
export async function generateMCQ(topic, provider, apiKey) {
  if (!apiKey) return randomFromBank(); // graceful fallback
  return dispatch(bankPrompt({ topic }), provider, apiKey);
}

// ----------------------------------------------------------------------------
// Normalize a raw question object from your JSON files into { text, options[4],
// correctIndex }. Handles many common shapes so it works with your existing
// question JSONs without hard-coding field names.
// ----------------------------------------------------------------------------
const LETTER = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };

export function normalizeQuestion(raw) {
  if (!raw) return null;
  const content = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      return content(value.html ?? value.content ?? value.text ?? value.value
        ?? value.question ?? value.statement ?? '');
    }
    return '';
  };
  const text = content(raw.question ?? raw.text ?? raw.q ?? raw.title ?? raw.statement);

  // options can be an array, or an object {A:..,B:..}, or opt1..opt4
  let options = raw.options || raw.choices || raw.answers || raw.opts;
  if (!options) {
    const keyed = ['A', 'B', 'C', 'D'].map(k => raw['option' + k] ?? raw['opt' + k]);
    if (keyed.some(v => v != null)) options = keyed;
  }
  if (options && !Array.isArray(options) && typeof options === 'object') {
    options = Object.keys(options).sort().map(k => options[k]);
  }
  if (!Array.isArray(options)) return null;
  options = options.map(o => content(o));
  if (options.length < 2) return null;

  // correct answer: index / letter / matching text / boolean flags
  let ci = raw.correctIndex ?? raw.correct_index ?? raw.answerIndex;
  // your medical JSON format: choices:[{id,text}] + correct_choice_id
  if (ci == null && raw.correct_choice_id != null && Array.isArray(raw.choices)) {
    const j = raw.choices.findIndex(c => c && c.id === raw.correct_choice_id);
    if (j >= 0) ci = j;
  }
  if (ci == null) {
    const ans = raw.answer ?? raw.correct ?? raw.correctAnswer ?? raw.correct_option ?? raw.ans;
    if (typeof ans === 'number') ci = ans;
    else if (typeof ans === 'string') {
      if (ans in LETTER && ans.length === 1) ci = LETTER[ans];
      else {
        const idx = options.findIndex(o => String(o).trim() === ans.trim());
        ci = idx >= 0 ? idx : 0;
      }
    }
  }
  if (ci == null) {
    const flagIdx = options.findIndex((_, i) => {
      const o = (raw.options || raw.choices || [])[i];
      return o && typeof o === 'object' && (o.correct || o.isCorrect);
    });
    ci = flagIdx >= 0 ? flagIdx : 0;
  }
  ci = Math.max(0, Math.min(options.length - 1, Number(ci) || 0));
  const imageValue = raw.image ?? raw.image_url ?? raw.imageUrl ?? raw.img
    ?? (raw.media && (raw.media.url || raw.media.src));
  return {
    text,
    options,
    correctIndex: ci,
    explanation: content(raw.explanation ?? raw.solution ?? raw.explanation_html),
    image: content(imageValue),
  };
}
