
// Global state management
const QuizState = {
  selectedPlatform: '',
  selectedSubject: '',
  selectedChapter: '',
  currentQuestionIndex: 0,
  questions: [],
  userAnswers: [],
  score: 0,
  isReviewMode: false,
  bookmarkedQuestions: [],

  reset() {
    this.selectedPlatform = '';
    this.selectedSubject = '';
    this.selectedChapter = '';
    this.currentQuestionIndex = 0;
    this.questions = [];
    this.userAnswers = [];
    this.score = 0;
    this.isReviewMode = false;
  }
};

// Export for use in other modules
window.QuizState = QuizState;
