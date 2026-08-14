
// Main quiz script - now loads modular components
// Load all the modular components
const scripts = [
  'js/state.js',
  'js/bookmarks.js',
  'js/navigation.js',
  'js/chapters.js',
  'js/quiz.js',
  'js/results.js',
  'js/app.js'
];

// Load scripts sequentially
function loadScripts(scriptArray, index = 0) {
  if (index >= scriptArray.length) {
    return;
  }
  
  const script = document.createElement('script');
  script.src = scriptArray[index];
  script.onload = () => loadScripts(scriptArray, index + 1);
  script.onerror = () => {
    console.error(`Failed to load script: ${scriptArray[index]}`);
    loadScripts(scriptArray, index + 1);
  };
  document.head.appendChild(script);
}

// Start loading scripts
loadScripts(scripts);
