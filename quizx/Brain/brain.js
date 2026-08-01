let brainMetadata = null;
let currentPath = [];

async function loadMetadata() {
  if (brainMetadata) return brainMetadata;
  
  try {
    const response = await fetch('./website_metadata.json');
    if (!response.ok) {
      throw new Error('Failed to load metadata');
    }
    brainMetadata = await response.json();
    return brainMetadata;
  } catch (error) {
    console.error('Error loading metadata:', error);
    return null;
  }
}

function initPathFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParam = urlParams.get('path');
  
  if (pathParam && pathParam.trim() !== '') {
    currentPath = pathParam.split(',').map(Number).filter(n => !isNaN(n));
  } else {
    currentPath = [];
  }
  return currentPath;
}

function getCurrentItem() {
  if (!brainMetadata) return null;
  
  let current = brainMetadata;
  for (const index of currentPath) {
    if (current.children && current.children[index]) {
      current = current.children[index];
    } else {
      return null;
    }
  }
  return current;
}

function buildFolderPath(pathIndices) {
  if (!brainMetadata) return '';
  
  let current = brainMetadata;
  const pathNames = [];
  
  for (const index of pathIndices) {
    if (current.children && current.children[index]) {
      current = current.children[index];
      pathNames.push(current.name);
    }
  }
  
  return pathNames.join('/');
}

function isArticleFolder(pathIndices) {
  if (!brainMetadata) return false;
  
  let current = brainMetadata;
  for (const index of pathIndices) {
    if (current.children && current.children[index]) {
      current = current.children[index];
      if (current.name.toLowerCase().includes('article') || 
          (current.stats && current.stats.articles > 0 && current.stats.questions === 0)) {
        return true;
      }
    }
  }
  return false;
}

function getContentType(item, pathIndices) {
  if (item.stats) {
    if (item.stats.articles > 0 && item.stats.questions === 0) {
      return 'article';
    }
    if (item.stats.questions > 0) {
      return 'quiz';
    }
  }
  
  if (isArticleFolder(pathIndices)) {
    return 'article';
  }
  
  return 'quiz';
}

function getIconForCategory(name) {
  const iconMap = {
    'AMBOSS qBANK': 'fas fa-book-medical',
    'Amboss (Article)': 'fas fa-file-medical',
    'Anesthesiology': 'fas fa-procedures',
    'Dermatology': 'fas fa-hand-paper',
    'Ear, Nose, And Throat': 'fas fa-head-side-cough',
    'Emergency Medicine': 'fas fa-ambulance',
    'Epidemiology And Biostatistics': 'fas fa-chart-bar',
    'Family Medicine': 'fas fa-home',
    'Internal Medicine': 'fas fa-stethoscope',
    'Neurology': 'fas fa-brain',
    'Obstetrics And Gynecology': 'fas fa-baby',
    'Ophthalmology': 'fas fa-eye',
    'Pathology': 'fas fa-microscope',
    'Pediatrics': 'fas fa-child',
    'Pharmacology': 'fas fa-pills',
    'Psychiatry': 'fas fa-brain',
    'Radiology': 'fas fa-x-ray',
    'Surgery': 'fas fa-cut',
    'Urology': 'fas fa-kidneys',
    'Cardiology': 'fas fa-heartbeat',
    'Gastroenterology': 'fas fa-stomach',
    'Endocrinology': 'fas fa-dna',
    'Hematology': 'fas fa-tint',
    'Oncology': 'fas fa-ribbon',
    'Rheumatology': 'fas fa-bone',
    'Pulmonology': 'fas fa-lungs',
    'Nephrology': 'fas fa-filter',
    'Infectious Diseases': 'fas fa-virus',
    'Cerebellum': 'fas fa-brain',
    'Mock Test': 'fas fa-clipboard-list',
    'default': 'fas fa-folder'
  };

  for (const key in iconMap) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return iconMap[key];
    }
  }
  return iconMap['default'];
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function createCategoryCard(item, index) {
  const isContentFolder = item.type === 'Content Folder';
  const cardClass = isContentFolder ? 'content-folder-card' : 'category-card';
  
  const isArticle = item.stats && item.stats.articles > 0 && item.stats.questions === 0;
  const icon = isContentFolder 
    ? (isArticle ? 'fas fa-file-medical-alt' : 'fas fa-file-alt')
    : getIconForCategory(item.name);
  
  const statsHtml = [];
  if (item.stats.sub_folders > 0) {
    statsHtml.push(`<span><i class="fas fa-folder"></i> ${item.stats.sub_folders} folders</span>`);
  }
  if (item.stats.questions > 0) {
    statsHtml.push(`<span><i class="fas fa-question-circle"></i> ${formatNumber(item.stats.questions)} Q</span>`);
  }
  if (item.stats.articles > 0) {
    statsHtml.push(`<span><i class="fas fa-file-alt"></i> ${formatNumber(item.stats.articles)} articles</span>`);
  }
  if (item.stats.items > 0 && item.stats.questions === 0 && item.stats.articles === 0) {
    statsHtml.push(`<span><i class="fas fa-list"></i> ${formatNumber(item.stats.items)} items</span>`);
  }

  return `
    <div class="${cardClass}" onclick="navigateToItem(${index})" data-index="${index}">
      <div class="category-icon">
        <i class="${icon}"></i>
      </div>
      <div class="category-content">
        <div class="category-name">${item.name}</div>
        ${!isContentFolder ? `<span class="category-type">${item.type}</span>` : ''}
        <div class="category-stats">
          ${statsHtml.join('')}
        </div>
      </div>
    </div>
  `;
}

async function loadMainCategories() {
  const grid = document.getElementById('categoriesGrid');
  
  const metadata = await loadMetadata();
  if (!metadata) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load categories. Please try again.</p>
      </div>
    `;
    return;
  }

  currentPath = [];
  renderCategories(metadata.children);
}

function renderCategories(children) {
  const grid = document.getElementById('categoriesGrid');
  
  if (!children || children.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-folder-open"></i>
        <p>No items found in this category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = children.map((item, index) => createCategoryCard(item, index)).join('');
}

function navigateToItem(index) {
  const currentChildren = getCurrentChildren();
  const item = currentChildren[index];
  
  if (!item) return;

  if (item.type === 'Content Folder') {
    openContentFolder(item, index);
  } else if (item.children && item.children.length > 0) {
    currentPath.push(index);
    window.location.href = `browse.html?path=${currentPath.join(',')}`;
  } else {
    alert('This category is empty.');
  }
}

function getCurrentChildren() {
  if (!brainMetadata) return [];
  
  let current = brainMetadata;
  for (const index of currentPath) {
    if (current.children && current.children[index]) {
      current = current.children[index];
    }
  }
  return current.children || [];
}

function openContentFolder(item, itemIndex) {
  const pathToFolder = [...currentPath];
  if (typeof itemIndex !== 'undefined') {
    pathToFolder.push(itemIndex);
  }
  const pathString = pathToFolder.join(',');
  
  const folderPath = buildFolderPath(pathToFolder);
  const contentType = getContentType(item, pathToFolder);
  
  if (contentType === 'article') {
    window.location.href = `article.html?folder=${encodeURIComponent(item.name)}&folderPath=${encodeURIComponent(folderPath)}&path=${pathString}`;
  } else {
    window.location.href = `quiz.html?folder=${encodeURIComponent(item.name)}&folderPath=${encodeURIComponent(folderPath)}&path=${pathString}`;
  }
}

function goBack() {
  if (currentPath.length > 0) {
    currentPath.pop();
    if (currentPath.length === 0) {
      window.location.href = 'index.html';
    } else {
      window.location.href = `browse.html?path=${currentPath.join(',')}`;
    }
  } else {
    window.location.href = '../index.html';
  }
}

function navigateToBreadcrumb(index) {
  if (index === -1) {
    window.location.href = 'index.html';
  } else {
    currentPath = currentPath.slice(0, index + 1);
    window.location.href = `browse.html?path=${currentPath.join(',')}`;
  }
}

function getBreadcrumbPath() {
  if (!brainMetadata) return [];
  
  const path = [{ name: 'Nextpulse', index: -1 }];
  let current = brainMetadata;
  
  for (let i = 0; i < currentPath.length; i++) {
    const index = currentPath[i];
    if (current.children && current.children[index]) {
      current = current.children[index];
      path.push({ name: current.name, index: i });
    }
  }
  
  return path;
}

function renderBreadcrumb() {
  const breadcrumbPath = getBreadcrumbPath();
  const breadcrumbHtml = breadcrumbPath.map((item, i) => {
    if (i === breadcrumbPath.length - 1) {
      return `<span class="breadcrumb-current">${item.name}</span>`;
    }
    return `
      <span class="breadcrumb-item" onclick="navigateToBreadcrumb(${item.index})">${item.name}</span>
      <span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
    `;
  }).join('');
  
  return `<div class="breadcrumb">${breadcrumbHtml}</div>`;
}

async function listJsonFilesInFolder(folderPath) {
  const files = [];
  
  try {
    const testPaths = [
      `./${folderPath}/`,
      `./${encodeURIComponent(folderPath)}/`
    ];
    
    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    return files;
  }
}

function stripHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}
