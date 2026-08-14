
export class SearchPage {
  constructor() {
    this.currentView = 'search';
    this.allLectures = [];
    this.allTeachers = [];
    this.initializeTeachers();
    this.loadLectureData();
  }

  render() {
    const container = document.createElement('div');
    container.className = 'search-page';

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const searchBar = document.createElement('div');
    searchBar.className = 'enhanced-search-bar';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.className = 'search-input';

    const searchTypeSelect = document.createElement('select');
    searchTypeSelect.className = 'search-type-select';
    searchTypeSelect.innerHTML = `
      <option value="teacher">Search by Teacher</option>
      <option value="lecture">Search by Lecture</option>
    `;

    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results';
    resultsContainer.innerHTML = '<p class="search-prompt">Enter at least 2 characters to search</p>';

    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value, searchTypeSelect.value, resultsContainer);
    });

    searchTypeSelect.addEventListener('change', () => {
      searchInput.value = '';
      resultsContainer.innerHTML = '<p class="search-prompt">Enter at least 2 characters to search</p>';
    });

    searchBar.appendChild(searchInput);
    searchBar.appendChild(searchTypeSelect);
    searchContainer.appendChild(searchBar);
    container.appendChild(searchContainer);
    container.appendChild(resultsContainer);

    return container;
  }

  async loadLectureData() {
    try {
      const platforms = ['marrow', 'dams', 'prepladder'];
      const subjects = ['anatomy', 'physiology'];
      
      for (const platform of platforms) {
        for (const subject of subjects) {
          try {
            const response = await fetch(`src/platforms/${platform}/subjects/${subject}.json`);
            if (response.ok) {
              const data = await response.json();
              if (data.lectures) {
                data.lectures.forEach(lecture => {
                  this.allLectures.push({
                    title: lecture.title,
                    subject: data.subjectName,
                    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                    duration: lecture.duration,
                    url: `platforms/${platform}/${platform}-${subject}.html`
                  });
                });
              }
            }
          } catch (error) {
            console.log(`Could not load ${platform}/${subject}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading lecture data:', error);
    }
  }

  initializeTeachers() {
    this.allTeachers = [
      { name: 'Dr. Sneh Agarwal', subject: 'Anatomy', platform: 'Marrow', url: 'platforms/marrow/marrow-anatomy.html' },
      { name: 'Dr. Sakshi Arora', subject: 'Physiology', platform: 'DAMS', url: 'platforms/dams/dams-physiology.html' },
      { name: 'Dr. Gobind Rai', subject: 'Biochemistry', platform: 'PrepLadder', url: 'platforms/prepladder/prepladder-biochemistry.html' },
      { name: 'Dr. Rajesh Kumar', subject: 'Pathology', platform: 'Marrow', url: 'platforms/marrow/marrow-pathology.html' },
      { name: 'Dr. Priya Singh', subject: 'Pharmacology', platform: 'DAMS', url: 'platforms/dams/dams-pharmacology.html' }
    ];
  }

  handleSearch(query, searchType, resultsContainer) {
    if (query.length < 2) {
      resultsContainer.innerHTML = '<p class="search-prompt">Enter at least 2 characters to search</p>';
      return;
    }

    if (searchType === 'teacher') {
      this.searchTeachers(query.toLowerCase(), resultsContainer);
    } else {
      this.searchLectures(query.toLowerCase(), resultsContainer);
    }
  }

  searchTeachers(query, resultsContainer) {
    const results = this.allTeachers.filter(teacher => 
      teacher.name.toLowerCase().includes(query) ||
      teacher.subject.toLowerCase().includes(query) ||
      teacher.platform.toLowerCase().includes(query)
    );

    this.displayTeacherResults(results, resultsContainer);
  }

  searchLectures(query, resultsContainer) {
    const results = this.allLectures.filter(lecture =>
      lecture.title.toLowerCase().includes(query) ||
      lecture.subject.toLowerCase().includes(query) ||
      lecture.platform.toLowerCase().includes(query)
    );

    this.displayLectureResults(results, resultsContainer);
  }

  displayTeacherResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<p class="no-results">No teachers found</p>';
      return;
    }

    container.innerHTML = results.map(teacher => `
      <div class="search-result-card" onclick="window.location.href='${teacher.url}'">
        <div class="result-header">
          <i class="fas fa-user-md"></i>
          <h3>${teacher.name}</h3>
        </div>
        <div class="result-details">
          <span><i class="fas fa-book-medical"></i> ${teacher.subject}</span>
          <span><i class="fas fa-building"></i> ${teacher.platform}</span>
        </div>
      </div>
    `).join('');
  }

  displayLectureResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<p class="no-results">No lectures found</p>';
      return;
    }

    container.innerHTML = results.map(lecture => `
      <div class="search-result-card" onclick="window.location.href='${lecture.url}'">
        <div class="result-header">
          <i class="fas fa-play-circle"></i>
          <h3>${lecture.title}</h3>
        </div>
        <div class="result-details">
          <span><i class="fas fa-book-medical"></i> ${lecture.subject}</span>
          <span><i class="fas fa-building"></i> ${lecture.platform}</span>
          <span><i class="fas fa-clock"></i> ${lecture.duration}</span>
        </div>
      </div>
    `).join('');
  }
}
