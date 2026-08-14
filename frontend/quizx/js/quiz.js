
// Quiz logic and question handling
const QuizManager = {
  loadQuestion() {
    const question = QuizState.questions[QuizState.currentQuestionIndex];
    
    // Debug logging for bookmark issues
    console.log('Loading question:', question);
    console.log('Question keys:', Object.keys(question || {}));
    
    if (!question) {
      console.error('No question found at index:', QuizState.currentQuestionIndex);
      alert('No question found. Please try again.');
      return;
    }
    
    // Update progress
    document.getElementById('current-question').textContent = QuizState.currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = QuizState.questions.length;
    
    // Update bookmark button
    BookmarkManager.updateBookmarkButton();
    
    // Load question text
    document.getElementById('question-text').textContent = `${question.q_no}. ${question.question}`;
    
    // Load question image if available
    const questionImageDiv = document.getElementById('question-image');
    const questionImg = document.getElementById('question-img');
    if (question.image) {
      questionImg.src = question.image;
      questionImageDiv.style.display = 'block';
    } else {
      questionImageDiv.style.display = 'none';
    }
    
    // Load options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    Object.entries(question.options).forEach(([key, value]) => {
      const button = document.createElement('button');
      button.className = 'option-btn';
      
      // If in review mode, show the user's answer and correct answer
      if (QuizState.isReviewMode) {
        const userAnswer = QuizState.userAnswers[QuizState.currentQuestionIndex];
        const correctAnswer = question.correct_answer;
        
        if (key === correctAnswer) {
          button.classList.add('correct');
        } else if (key === userAnswer && userAnswer !== correctAnswer) {
          button.classList.add('incorrect');
        }
        button.classList.add('disabled');
        button.onclick = null;
      } else {
        button.onclick = () => this.selectAnswer(key, button);
      }
      
      button.innerHTML = `
        <span class="option-label">${key}</span>
        <span>${value}</span>
      `;
      optionsContainer.appendChild(button);
    });
    
    // Show/hide explanation based on mode
    if (QuizState.isReviewMode) {
      this.showExplanation();
    } else {
      document.getElementById('explanation-container').style.display = 'none';
    }
  },

  selectAnswer(selectedOption, buttonElement) {
    const question = QuizState.questions[QuizState.currentQuestionIndex];
    const correctAnswer = question.correct_answer;
    
    // Disable all option buttons
    const allOptions = document.querySelectorAll('.option-btn');
    allOptions.forEach(btn => {
      btn.classList.add('disabled');
      btn.onclick = null;
    });
    
    // Mark correct and incorrect answers
    allOptions.forEach(btn => {
      const optionLabel = btn.querySelector('.option-label').textContent;
      if (optionLabel === correctAnswer) {
        btn.classList.add('correct');
      } else if (optionLabel === selectedOption && selectedOption !== correctAnswer) {
        btn.classList.add('incorrect');
      }
    });
    
    // Store user answer
    QuizState.userAnswers[QuizState.currentQuestionIndex] = selectedOption;
    
    // Update score
    if (selectedOption === correctAnswer) {
      QuizState.score++;
    }
    
    // Show explanation
    setTimeout(() => {
      this.showExplanation();
    }, 1000);
  },

  showExplanation() {
    const question = QuizState.questions[QuizState.currentQuestionIndex];
    const explanationContainer = document.getElementById('explanation-container');
    const explanationText = document.getElementById('explanation-text');
    const explanationImageDiv = document.getElementById('explanation-image');
    const explanationImg = document.getElementById('explanation-img');
    
    explanationText.textContent = question.explanation || 'No explanation available.';
    
    if (question.explanation_image) {
      explanationImg.src = question.explanation_image;
      explanationImageDiv.style.display = 'block';
    } else {
      explanationImageDiv.style.display = 'none';
    }
    
    explanationContainer.style.display = 'block';
    
    // Clear existing buttons
    const existingButtons = explanationContainer.querySelectorAll('.next-btn, .back-to-results-btn');
    existingButtons.forEach(btn => btn.remove());
    
    // Create button container if it doesn't exist
    let buttonContainer = explanationContainer.querySelector('.explanation-buttons');
    if (!buttonContainer) {
      buttonContainer = document.createElement('div');
      buttonContainer.className = 'explanation-buttons';
      buttonContainer.style.cssText = 'display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap;';
      explanationContainer.appendChild(buttonContainer);
    }
    buttonContainer.innerHTML = '';
    
    if (QuizState.isReviewMode) {
      // Always show "Back to Results" button in review mode
      const backButton = document.createElement('button');
      backButton.className = 'back-to-results-btn';
      backButton.innerHTML = '<i class="fas fa-chart-bar"></i> Back to Results';
      backButton.style.cssText = 'background: #2c5282; color: white; border: none; padding: 1.25rem 2.5rem; border-radius: 8px; cursor: pointer; font-size: 1.1rem; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 0.75rem;';
      backButton.onmouseover = () => backButton.style.background = '#1a365d';
      backButton.onmouseout = () => backButton.style.background = '#2c5282';
      
      // Check if this is a single bookmarked question review
      if (QuizState.questions.length === 1) {
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Bookmarks';
        backButton.onclick = () => BookmarkManager.viewBookmarkedQuestions();
      } else {
        backButton.onclick = () => ResultsManager.backToResults();
      }
      
      buttonContainer.appendChild(backButton);
      
      // Show next button if not on last question
      if (QuizState.currentQuestionIndex < QuizState.questions.length - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'next-btn';
        nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Next Question';
        nextBtn.style.cssText = 'background: #16a34a; color: white; border: none; padding: 1.25rem 2.5rem; border-radius: 8px; cursor: pointer; font-size: 1.1rem; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 0.75rem;';
        nextBtn.onmouseover = () => nextBtn.style.background = '#15803d';
        nextBtn.onmouseout = () => nextBtn.style.background = '#16a34a';
        nextBtn.onclick = () => this.nextQuestion();
        buttonContainer.appendChild(nextBtn);
      }
    } else {
      // Normal quiz mode
      const nextBtn = document.createElement('button');
      nextBtn.className = 'next-btn';
      nextBtn.style.cssText = 'background: #16a34a; color: white; border: none; padding: 1.25rem 2.5rem; border-radius: 8px; cursor: pointer; font-size: 1.1rem; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 0.75rem; margin: 0 auto;';
      nextBtn.onmouseover = () => nextBtn.style.background = '#15803d';
      nextBtn.onmouseout = () => nextBtn.style.background = '#16a34a';
      nextBtn.onclick = () => this.nextQuestion();
      
      if (QuizState.currentQuestionIndex === QuizState.questions.length - 1) {
        nextBtn.innerHTML = '<i class="fas fa-check"></i> Finish Quiz';
      } else {
        nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Next Question';
      }
      
      buttonContainer.appendChild(nextBtn);
    }
  },

  nextQuestion() {
    if (QuizState.isReviewMode) {
      if (QuizState.currentQuestionIndex < QuizState.questions.length - 1) {
        QuizState.currentQuestionIndex++;
        this.loadQuestion();
      }
    } else {
      if (QuizState.currentQuestionIndex < QuizState.questions.length - 1) {
        QuizState.currentQuestionIndex++;
        this.loadQuestion();
      } else {
        ResultsManager.showResults();
      }
    }
  }
};
// Add initialization logic to check for review mode
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const reviewQuestionIndex = urlParams.get('review');

  if (reviewQuestionIndex !== null) {
    const index = parseInt(reviewQuestionIndex, 10);
    if (!isNaN(index) && index > 0) {
      QuizState.currentQuestionIndex = index - 1; // Adjust for 0-based index
      QuizState.isReviewMode = true;
    }
  }
  // Initial load is handled by the script that fetches and sets QuizState.questions
});

// Export for global access
window.QuizManager = QuizManager;
