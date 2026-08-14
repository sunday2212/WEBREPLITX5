
// Results and analysis functionality
const ResultsManager = {
  showResults() {
    NavigationManager.showScreen('quiz-results');
    
    const percentage = Math.round((QuizState.score / QuizState.questions.length) * 100);
    
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    document.getElementById('correct-answers').textContent = QuizState.score;
    document.getElementById('total-questions-result').textContent = QuizState.questions.length;
    
    // Update score circle color based on performance
    const scoreCircle = document.querySelector('.score-circle');
    if (percentage >= 80) {
      scoreCircle.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
    } else if (percentage >= 60) {
      scoreCircle.style.background = 'linear-gradient(135deg, #eab308, #ca8a04)';
    } else {
      scoreCircle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    }
    
    // Show analysis container
    this.showAnalysisContainer();
  },

  showAnalysisContainer() {
    const analysisContainer = document.getElementById('analysis-container');
    const questionGrid = document.getElementById('question-grid');
    
    questionGrid.innerHTML = '';
    
    QuizState.questions.forEach((question, index) => {
      const questionBtn = document.createElement('button');
      questionBtn.className = 'question-number-btn';
      questionBtn.textContent = index + 1;
      
      const userAnswer = QuizState.userAnswers[index];
      const correctAnswer = question.correct_answer;
      
      if (userAnswer === correctAnswer) {
        questionBtn.classList.add('correct');
      } else {
        questionBtn.classList.add('incorrect');
      }
      
      questionBtn.onclick = () => this.reviewQuestion(index);
      questionGrid.appendChild(questionBtn);
    });
    
    analysisContainer.style.display = 'block';
  },

  reviewQuestion(questionIndex) {
    QuizState.currentQuestionIndex = questionIndex;
    QuizState.isReviewMode = true;
    
    NavigationManager.showScreen('quiz-container');
    QuizManager.loadQuestion();
  },

  backToResults() {
    QuizState.isReviewMode = false;
    this.showResults();
  },

  restartQuiz() {
    QuizState.currentQuestionIndex = 0;
    QuizState.userAnswers = [];
    QuizState.score = 0;
    QuizState.isReviewMode = false;
    
    NavigationManager.showScreen('quiz-container');
    QuizManager.loadQuestion();
  },

  exitQuiz() {
    NavigationManager.backToMainMenu();
  }
};

// Export for global access
window.ResultsManager = ResultsManager;
