
// Main application initialization and global functions
const QuizApp = {
  initialize() {
    BookmarkManager.loadBookmarkedQuestions();
    BookmarkManager.updateBookmarkCount();
  }
};

// Global functions for HTML onclick handlers
function initializeApp() {
  QuizApp.initialize();
}

function startNewQuiz() {
  NavigationManager.startNewQuiz();
}

function backToMainMenu() {
  NavigationManager.backToMainMenu();
}

function viewBookmarkedQuestions() {
  BookmarkManager.viewBookmarkedQuestions();
}

function selectPlatform(platform) {
  NavigationManager.selectPlatform(platform);
}

function selectSubject(subject) {
  NavigationManager.selectSubject(subject);
}

function toggleBookmark() {
  BookmarkManager.toggleBookmark();
}

function exitQuiz() {
  ResultsManager.exitQuiz();
}

function restartQuiz() {
  ResultsManager.restartQuiz();
}

// Initialize app when page loads
window.addEventListener('load', initializeApp);
