
export class LectureCompletion {
  constructor() {
    this.storageKey = 'lectureCompletions';
  }

  // Get completion status for a specific lecture
  isCompleted(platform, subject, lectureTitle) {
    const completions = this.getCompletions();
    const key = `${platform}-${subject}-${lectureTitle}`;
    return completions[key] || false;
  }

  // Toggle completion status
  toggleCompletion(platform, subject, lectureTitle) {
    const completions = this.getCompletions();
    const key = `${platform}-${subject}-${lectureTitle}`;
    completions[key] = !completions[key];
    this.saveCompletions(completions);
    return completions[key];
  }

  // Get all completions from localStorage
  getCompletions() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading completions from localStorage:', error);
      return {};
    }
  }

  // Save completions to localStorage
  saveCompletions(completions) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(completions));
    } catch (error) {
      console.error('Error saving completions to localStorage:', error);
    }
  }

  // Create completion toggle element
  createCompletionToggle(platform, subject, lectureTitle) {
    const isCompleted = this.isCompleted(platform, subject, lectureTitle);
    
    const toggle = document.createElement('div');
    toggle.className = 'completion-toggle';
    toggle.innerHTML = `
      <div class="completion-circle ${isCompleted ? 'completed' : ''}">
        <i class="fas fa-check ${isCompleted ? 'visible' : ''}"></i>
      </div>
    `;

    toggle.onclick = (e) => {
      e.stopPropagation();
      const newStatus = this.toggleCompletion(platform, subject, lectureTitle);
      const circle = toggle.querySelector('.completion-circle');
      const checkIcon = toggle.querySelector('.fas.fa-check');
      
      if (newStatus) {
        circle.classList.add('completed');
        checkIcon.classList.add('visible');
      } else {
        circle.classList.remove('completed');
        checkIcon.classList.remove('visible');
      }
    };

    return toggle;
  }
}
