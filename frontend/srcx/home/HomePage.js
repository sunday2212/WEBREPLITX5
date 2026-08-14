
export class HomePage {
  constructor() {
    this.featuredContent = [
      {
        title: 'Latest Updates',
        description: 'New lectures added daily across all platforms',
        icon: 'fas fa-star'
      },
      {
        title: 'Study Progress',
        description: 'Track your learning journey',
        icon: 'fas fa-chart-line'
      },
      {
        title: 'Quick Access',
        description: 'Jump to your favorite subjects',
        icon: 'fas fa-bolt'
      }
    ];
  }

  async render() {
    const container = document.createElement('div');
    container.className = 'home-page';
    container.innerHTML = `
      <div class="welcome-section">
        <h2>Welcome to LASTPULSE</h2>
        <p style="font-style: italic; font-size: 1.1em; color: #666; margin-top: 1rem;">„If he is a God than I am a Bloody Doctor"</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <i class="fas fa-play-circle"></i>
          <h3>2000+</h3>
          <p>Video Lectures</p>
        </div>
        <div class="stat-card">
          <i class="fas fa-book"></i>
          <h3>50+</h3>
          <p>Subjects Covered</p>
        </div>
        <div class="stat-card">
          <i class="fas fa-graduation-cap"></i>
          <h3>3</h3>
          <p>Top Platforms</p>
        </div>
      </div>
      <div class="quick-actions">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button class="action-btn" id="browseVideos">
            <i class="fas fa-video"></i>
            Browse Videos
          </button>
          <button class="action-btn" id="searchContent">
            <i class="fas fa-search"></i>
            Search Content
          </button>
        </div>
      </div>
      <div class="featured-section">
        <h3>Featured</h3>
        <div class="featured-grid">
          ${this.featuredContent.map(item => `
            <div class="featured-card">
              <i class="${item.icon}"></i>
              <h4>${item.title}</h4>
              <p>${item.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Add event listeners
    setTimeout(() => {
      const browseBtn = container.querySelector('#browseVideos');
      const searchBtn = container.querySelector('#searchContent');

      browseBtn.onclick = () => {
        const bottomNav = document.querySelector('.bottom-nav');
        const videosLink = bottomNav.querySelector('a:nth-child(2)');
        videosLink.click();
      };

      searchBtn.onclick = () => {
        const bottomNav = document.querySelector('.bottom-nav');
        const searchLink = bottomNav.querySelector('a:nth-child(3)');
        searchLink.click();
      };
    }, 100);

    return container;
  }
}
