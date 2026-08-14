// ============================================================================
// AI MCQ generation (provider-agnostic). The user supplies their own API key.
// Supported providers: 'openai' and 'gemini'.
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

const PROMPT = (topic) =>
  `Generate ONE multiple-choice quiz question about "${topic || 'general knowledge'}". ` +
  `Return ONLY strict minified JSON with this exact shape and nothing else: ` +
  `{"text":"...","options":["a","b","c","d"],"correctIndex":0}. ` +
  `Exactly 4 options. correctIndex is 0-based.`;

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
  };
}

async function genOpenAI(topic, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      messages: [
        { role: 'system', content: 'You are a quiz generator that outputs only JSON.' },
        { role: 'user', content: PROMPT(topic) },
      ],
    }),
  });
  if (!res.ok) throw new Error('OpenAI error: ' + (await res.text()));
  const data = await res.json();
  return parseMCQ(data?.choices?.[0]?.message?.content);
}

async function genGemini(topic, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT(topic) }] }] }),
  });
  if (!res.ok) throw new Error('Gemini error: ' + (await res.text()));
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseMCQ(text);
}

// Groq is OpenAI-compatible. Uses the key stored in profiles.groq_api_key.
async function genGroq(topic, apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.9,
      messages: [
        { role: 'system', content: 'You are a quiz generator that outputs only JSON.' },
        { role: 'user', content: PROMPT(topic) },
      ],
    }),
  });
  if (!res.ok) throw new Error('Groq error: ' + (await res.text()));
  const data = await res.json();
  return parseMCQ(data?.choices?.[0]?.message?.content);
}

// provider: 'groq' | 'openai' | 'gemini'
export async function generateMCQ(topic, provider, apiKey) {
  if (!apiKey) return randomFromBank(); // graceful fallback
  if (provider === 'gemini') return genGemini(topic, apiKey);
  if (provider === 'openai') return genOpenAI(topic, apiKey);
  return genGroq(topic, apiKey);
}

// ----------------------------------------------------------------------------
// Normalize a raw question object from your JSON files into { text, options[4],
// correctIndex }. Handles many common shapes so it works with your existing
// question JSONs without hard-coding field names.
// ----------------------------------------------------------------------------
const LETTER = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };

export function normalizeQuestion(raw) {
  if (!raw) return null;
  const text = raw.question || raw.text || raw.q || raw.title || raw.statement || '';

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
  options = options.map(o => (o && typeof o === 'object' ? (o.text || o.value || JSON.stringify(o)) : String(o)));
  if (options.length < 2) return null;

  // correct answer: index / letter / matching text / boolean flags
  let ci = raw.correctIndex ?? raw.correct_index ?? raw.answerIndex;
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

  // ensure exactly 4 options (pad or trim) so the UI stays consistent
  while (options.length < 4) options.push('—');
  if (options.length > 4) options = options.slice(0, 4);

  return { text: String(text), options, correctIndex: ci };
}
