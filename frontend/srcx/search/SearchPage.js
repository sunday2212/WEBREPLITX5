export class SearchPage {
  constructor() {
    this.currentView = 'search';
  }

  async getAllLectures() {
    const lectures = [];
    
    try {
      // Fetch manifest.json to get the actual platform structure
      const manifestResponse = await fetch('platforms/manifest.json');
      if (!manifestResponse.ok) {
        console.error('Could not load manifest.json');
        return lectures;
      }
      
      const manifest = await manifestResponse.json();
      
      // Iterate through each platform configuration in manifest
      for (const platformConfig of manifest) {
        const { platform, subfolder, files } = platformConfig;
        
        // Construct the correct path based on subfolder
        const folderPath = subfolder === 'non' ? platform : `${platform}/${subfolder}`;
        
        // Fetch each JSON file specified in the manifest
        for (const jsonFile of files) {
          try {
            const response = await fetch(`platforms/${folderPath}/${jsonFile}`);
            if (response.ok) {
              const data = await response.json();
              if (data.lectures && Array.isArray(data.lectures)) {
                data.lectures.forEach(lecture => {
                  lectures.push({
                    ...lecture,
                    subject: data.subjectName || jsonFile.replace('.json', ''),
                    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                    subfolder: subfolder
                  });
                });
              }
            }
          } catch (error) {
            console.log(`Could not load ${folderPath}/${jsonFile}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading manifest or lecture data:', error);
    }
    
    return lectures;
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


    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results';

    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.toLowerCase();
      
      if (query.length < 2) {
        resultsContainer.innerHTML = '<p class="search-prompt">Enter at least 2 characters to search</p>';
        return;
      }

      const lectures = await this.getAllLectures();
      const results = lectures.filter(lecture =>
        lecture.title.toLowerCase().includes(query) ||
        lecture.subject.toLowerCase().includes(query)
      );
      this.displayLectureResults(results, resultsContainer);
    });

    searchBar.appendChild(searchInput);
    searchContainer.appendChild(searchBar);
    container.appendChild(searchContainer);
    container.appendChild(resultsContainer);

    return container;
  }

  displayLectureResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<p class="no-results">No lectures found</p>';
      return;
    }

    container.innerHTML = results.map(lecture => `
      <div class="search-result-card" onclick="document.dispatchEvent(new CustomEvent('subjectSelect', { detail: { platform: '${lecture.platform.toLowerCase()}', subject: '${lecture.subject}' } }))">
        <div class="result-header">
          <i class="fas fa-play-circle"></i>
          <h3>${lecture.title}</h3>
        </div>
        <div class="result-details">
          <span><i class="fas fa-book-medical"></i> ${lecture.subject}</span>
          <span><i class="fas fa-building"></i> ${lecture.platform}</span>
        </div>
      </div>
    `).join('');
  }
}
