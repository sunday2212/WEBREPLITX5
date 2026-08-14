// ============================================================================
// qbank.js — reads your file-based question bank (Brain/file-manifest.json +
// the per-topic question JSON files). Auth-independent, shared by all sources.
// Manifest shape: { folders: { "<Platform>/<sub>/<folder>": { type, files:[..] } } }
// Question file shape: { questions: [ { text, choices:[{id,text}], correct_choice_id } ] }
// ============================================================================

import { CONFIG } from './config.js';
import { normalizeQuestion } from './ai.js';

let _manifest = null;
const _fileCache = {};

function base() {
  let b = CONFIG.QUESTION_FILE_BASE || '/quizx/Brain/';
  if (!b.endsWith('/')) b += '/';
  return b;
}

export function fileUrl(filePath) {
  const clean = String(filePath).replace(/^\.\//, '').replace(/^\//, '');
  const encoded = clean.split('/').map(encodeURIComponent).join('/');
  return base() + encoded;
}

export async function loadManifest() {
  if (_manifest) return _manifest;
  const url = CONFIG.MANIFEST_URL || (base() + 'file-manifest.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Manifest load failed (' + res.status + ')');
  _manifest = await res.json();
  return _manifest;
}

export async function loadFile(filePath) {
  if (_fileCache[filePath]) return _fileCache[filePath];
  const res = await fetch(fileUrl(filePath));
  if (!res.ok) throw new Error('File load failed: ' + filePath);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : (json.questions || json.data || json.items || json.mcqs || []);
  _fileCache[filePath] = arr;
  return arr;
}

// Folders that contain quiz JSON files
export async function getQuizFolders() {
  const m = await loadManifest();
  const out = [];
  for (const [k, v] of Object.entries(m.folders || {})) {
    const files = (v.files || []).filter(f => /\.json$/i.test(f));
    if (files.length && (v.type === 'quiz' || v.type == null)) out.push({ path: k, count: files.length });
  }
  return out;
}

export async function getPlatforms() {
  const folders = await getQuizFolders();
  return [...new Set(folders.map(f => f.path.split('/')[0]))].sort();
}

export async function getFoldersForPlatform(platform) {
  const folders = await getQuizFolders();
  return folders.filter(f => f.path.split('/')[0] === platform);
}

export async function getFilesInFolder(folderPath) {
  const m = await loadManifest();
  const info = m.folders?.[folderPath];
  if (!info) return [];
  return (info.files || []).filter(f => /\.json$/i.test(f)).map(f => ({
    name: f.replace(/\.json$/i, '').replace(/_/g, ' '),
    path: folderPath + '/' + f,
  }));
}

export async function getQuestions(filePath) {
  const arr = await loadFile(filePath);
  return arr.map(normalizeQuestion).filter(q => q && q.text);
}

// Resolve a bookmark (file_path + question_index) to a normalized question
export async function resolveBookmark(filePath, index) {
  const arr = await loadFile(filePath);
  return normalizeQuestion(arr[index]);
}

// Random question, optionally scoped to a platform (for "AI Question Bank"/random)
export async function randomQuestion(platform) {
  let folders = await getQuizFolders();
  if (platform) folders = folders.filter(f => f.path.split('/')[0] === platform);
  if (!folders.length) return null;
  for (let tries = 0; tries < 5; tries++) {
    const folder = folders[Math.floor(Math.random() * folders.length)];
    const files = await getFilesInFolder(folder.path);
    if (!files.length) continue;
    const file = files[Math.floor(Math.random() * files.length)];
    const qs = await getQuestions(file.path);
    if (qs.length) return qs[Math.floor(Math.random() * qs.length)];
  }
  return null;
}
