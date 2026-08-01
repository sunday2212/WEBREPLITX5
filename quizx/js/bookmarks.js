
// Bookmark management functionality
const BookmarkManager = {
  loadBookmarkedQuestions() {
    const saved = localStorage.getItem('quizBookmarks');
    QuizState.bookmarkedQuestions = saved ? JSON.parse(saved) : [];
    this.updateBookmarkCount();
  },

  saveBookmarkedQuestions() {
    localStorage.setItem('quizBookmarks', JSON.stringify(QuizState.bookmarkedQuestions));
    this.updateBookmarkCount();
  },

  updateBookmarkCount() {
    const countElement = document.getElementById('bookmark-count');
    const count = QuizState.bookmarkedQuestions.length;
    countElement.textContent = `${count} question${count !== 1 ? 's' : ''} saved`;
  },

  isQuestionBookmarked(question) {
    return QuizState.bookmarkedQuestions.some(bookmark => 
      bookmark.q_no === question.q_no && 
      bookmark.platform === QuizState.selectedPlatform && 
      bookmark.subject === QuizState.selectedSubject
    );
  },

  toggleBookmark() {
    const currentQuestion = QuizState.questions[QuizState.currentQuestionIndex];
    const bookmarkBtn = document.getElementById('bookmark-btn');
    const bookmarkIcon = bookmarkBtn.querySelector('i');
    
    const bookmarkData = {
      ...currentQuestion,
      platform: QuizState.selectedPlatform,
      subject: QuizState.selectedSubject,
      chapter: QuizState.selectedChapter,
      bookmarkedAt: new Date().toISOString()
    };
    
    const existingIndex = QuizState.bookmarkedQuestions.findIndex(bookmark => 
      bookmark.q_no === currentQuestion.q_no && 
      bookmark.platform === QuizState.selectedPlatform && 
      bookmark.subject === QuizState.selectedSubject
    );
    
    if (existingIndex > -1) {
      // Remove bookmark
      QuizState.bookmarkedQuestions.splice(existingIndex, 1);
      bookmarkIcon.className = 'far fa-bookmark';
      bookmarkBtn.title = 'Bookmark this question';
    } else {
      // Add bookmark
      QuizState.bookmarkedQuestions.push(bookmarkData);
      bookmarkIcon.className = 'fas fa-bookmark';
      bookmarkBtn.title = 'Remove bookmark';
    }
    
    this.saveBookmarkedQuestions();
  },

  updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('bookmark-btn');
    const bookmarkIcon = bookmarkBtn.querySelector('i');
    const currentQuestion = QuizState.questions[QuizState.currentQuestionIndex];
    
    if (this.isQuestionBookmarked(currentQuestion)) {
      bookmarkIcon.className = 'fas fa-bookmark';
      bookmarkBtn.title = 'Remove bookmark';
    } else {
      bookmarkIcon.className = 'far fa-bookmark';
      bookmarkBtn.title = 'Bookmark this question';
    }
  },

  viewBookmarkedQuestions() {
    this.loadBookmarkedQuestions();
    
    const bookmarkedList = document.getElementById('bookmarked-list');
    bookmarkedList.innerHTML = '';
    
    if (QuizState.bookmarkedQuestions.length === 0) {
      bookmarkedList.innerHTML = `
        <div class="empty-bookmarks">
          <i class="fas fa-bookmark" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
          <h3>No bookmarked questions yet</h3>
          <p>Start a quiz and bookmark questions for later review!</p>
        </div>
      `;
    } else {
      // Group bookmarks by platform and subject
      const groupedBookmarks = QuizState.bookmarkedQuestions.reduce((groups, bookmark) => {
        const key = `${bookmark.platform}-${bookmark.subject}`;
        if (!groups[key]) {
          groups[key] = {
            platform: bookmark.platform,
            subject: bookmark.subject,
            questions: []
          };
        }
        groups[key].questions.push(bookmark);
        return groups;
      }, {});
      
      // Show platform/subject overview
      Object.values(groupedBookmarks).forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'bookmark-overview-item';
        groupDiv.innerHTML = `
          <div class="bookmark-overview-content">
            <div class="platform-subject-info">
              <h3>${group.platform.charAt(0).toUpperCase() + group.platform.slice(1)} - ${group.subject.charAt(0).toUpperCase() + group.subject.slice(1)}</h3>
              <span class="question-count-badge">${group.questions.length} question${group.questions.length !== 1 ? 's' : ''}</span>
            </div>
            <i class="fas fa-chevron-right"></i>
          </div>
        `;
        groupDiv.onclick = () => this.showGroupQuestions(group);
        bookmarkedList.appendChild(groupDiv);
      });
    }
    
    NavigationManager.showScreen('bookmarked-questions');
  },

  showGroupQuestions(group) {
    const bookmarkedList = document.getElementById('bookmarked-list');
    bookmarkedList.innerHTML = '';
    
    // Add back button
    const backButton = document.createElement('div');
    backButton.className = 'group-back-button';
    backButton.innerHTML = `
      <button onclick="BookmarkManager.viewBookmarkedQuestions()" class="group-back-btn">
        <i class="fas fa-arrow-left"></i> Back to Groups
      </button>
    `;
    bookmarkedList.appendChild(backButton);
    
    // Add group header
    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-questions-header';
    groupHeader.innerHTML = `
      <h3>${group.platform.charAt(0).toUpperCase() + group.platform.slice(1)} - ${group.subject.charAt(0).toUpperCase() + group.subject.slice(1)}</h3>
      <span class="question-count">${group.questions.length} question${group.questions.length !== 1 ? 's' : ''}</span>
    `;
    bookmarkedList.appendChild(groupHeader);
    
    // Add questions list
    const questionsContainer = document.createElement('div');
    questionsContainer.className = 'group-questions-list';
    
    group.questions.forEach(question => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'bookmarked-question-item';
      questionDiv.innerHTML = `
        <div class="question-preview">
          <span class="question-number">Q${question.q_no}</span>
          <span class="question-text">${question.question.substring(0, 100)}${question.question.length > 100 ? '...' : ''}</span>
        </div>
        <div class="bookmark-actions">
          <button onclick="event.stopPropagation(); BookmarkManager.removeBookmark('${question.platform}', '${question.subject}', ${question.q_no})" class="remove-bookmark">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      questionDiv.onclick = () => this.reviewBookmarkedQuestion(question.platform, question.subject, question.q_no);
      questionsContainer.appendChild(questionDiv);
    });
    
    bookmarkedList.appendChild(questionsContainer);
  },

  removeBookmark(platform, subject, qNo) {
    const index = QuizState.bookmarkedQuestions.findIndex(bookmark => 
      bookmark.q_no === qNo && 
      bookmark.platform === platform && 
      bookmark.subject === subject
    );
    
    if (index > -1) {
      QuizState.bookmarkedQuestions.splice(index, 1);
      this.saveBookmarkedQuestions();
      this.viewBookmarkedQuestions(); // Refresh the view
    }
  },

  reviewBookmarkedQuestion(platform, subject, qNo) {
    const bookmark = QuizState.bookmarkedQuestions.find(b => 
      b.platform === platform && b.subject === subject && b.q_no === qNo
    );
    
    if (bookmark) {
      // Set up single question review
      QuizState.selectedPlatform = platform;
      QuizState.selectedSubject = subject;
      QuizState.selectedChapter = bookmark.chapter;
      QuizState.questions = [bookmark];
      QuizState.currentQuestionIndex = 0;
      QuizState.userAnswers = [];
      QuizState.isReviewMode = true;
      
      // Navigate to quiz page with bookmark flag
      window.location.href = `quiz.html?fromBookmarks=true&platform=${platform}&subject=${subject}`;
    }
  }
};

// Export for global access
window.BookmarkManager = BookmarkManager;
