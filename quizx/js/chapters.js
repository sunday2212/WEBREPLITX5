
// Chapter loading and management
const ChapterManager = {
  async loadChapters() {
    try {
      this.showLoading(true);

      const manifest = await this.getManifest();
      const chapters = manifest[QuizState.selectedSubject] || [];

      if (chapters.length === 0) {
        this.displayChapters([]);
        return;
      }

      // Asynchronously check for the availability of each chapter
      const chapterPromises = chapters.map(async (chapter) => {
        const chapterPath = `quiz/${QuizState.selectedPlatform}/${QuizState.selectedSubject}/${chapter.file}`;
        try {
          const response = await fetch(chapterPath);
          if (response.ok) {
            return {
              name: chapter.name,
              filename: chapter.file,
              available: true
            };
          }
        } catch (error) {
          // This chapter is not available, but we don't need to log an error for each one
        }
        return {
          name: chapter.name,
          filename: chapter.file,
          available: false
        };
      });

      const availableChapters = await Promise.all(chapterPromises);

      this.displayChapters(availableChapters);

    } catch (error) {
      console.error('Error loading chapters:', error);
      this.displayChapters([]); // Show no chapters on error
    } finally {
      this.showLoading(false);
    }
  },

  async getManifest() {
    try {
      const response = await fetch(`quiz/${QuizState.selectedPlatform}/manifest.json`);
      if (!response.ok) {
        throw new Error(`Failed to load manifest for ${QuizState.selectedPlatform}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching manifest:', error);
      return {};
    }
  },

  displayChapters(chapters) {
    const chapterList = document.getElementById('chapter-list');
    chapterList.innerHTML = '';
    
    const availableChapters = chapters.filter(c => c.available);

    if (availableChapters.length === 0) {
      chapterList.innerHTML = '<p>No chapters available for this combination.</p>';
      return;
    }
    
    availableChapters.forEach(chapter => {
      const button = document.createElement('button');
      button.className = 'chapter-btn';
      button.innerHTML = `<i class="fas fa-book"></i> ${chapter.name}`;
      button.onclick = () => this.selectChapter(chapter.filename, chapter.name);
      chapterList.appendChild(button);
    });
  },

  async selectChapter(filename, chapterName) {
    QuizState.selectedChapter = filename;
    
    try {
      this.showLoading(true);
      const response = await fetch(`quiz/${QuizState.selectedPlatform}/${QuizState.selectedSubject}/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load chapter data');
      }
      
      const data = await response.json();
      QuizState.questions = data.questions || [];
      
      if (QuizState.questions.length === 0) {
        alert('No questions found in this chapter.');
        this.showLoading(false);
        return;
      }
      
      // Initialize quiz
      QuizState.currentQuestionIndex = 0;
      QuizState.userAnswers = [];
      QuizState.score = 0;
      QuizState.isReviewMode = false;
      
      NavigationManager.showScreen('quiz-container');
      QuizManager.loadQuestion();
    } catch (error) {
      console.error('Error loading chapter:', error);
      alert('Error loading chapter. Please try again.');
    } finally {
        this.showLoading(false);
    }
  },
  
  showLoading(isLoading) {
      const loadingIndicator = document.getElementById('loading-indicator');
      if (loadingIndicator) {
          loadingIndicator.style.display = isLoading ? 'block' : 'none';
      }
  }
};

// Export for global access
window.ChapterManager = ChapterManager;
