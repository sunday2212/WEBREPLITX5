
// Navigation and screen management
const NavigationManager = {
  showScreen(screenId) {
    // Hide all sections
    const screens = [
      'main-menu', 'platform-selection', 'subject-selection', 
      'chapter-selection', 'bookmarked-questions', 'quiz-container', 'quiz-results'
    ];
    
    screens.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
    
    // Show the requested screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.style.display = 'block';
    }
  },

  backToMainMenu() {
    this.showScreen('main-menu');
    QuizState.reset();
  },

  startNewQuiz() {
    this.showScreen('platform-selection');
  },

  selectPlatform(platform) {
    QuizState.selectedPlatform = platform;
    this.showScreen('subject-selection');
  },

  selectSubject(subject) {
    QuizState.selectedSubject = subject;
    this.showScreen('chapter-selection');
    ChapterManager.loadChapters();
  }
};

// Export for global access
window.NavigationManager = NavigationManager;
