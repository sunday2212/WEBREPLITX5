export class DamsSubjectList {
  constructor() {
    this.subjects = [
      { name: 'Anatomy', icon: 'fas fa-skeleton', teacher: 'Dr. Ashwani Kumar' },
      { name: 'Physiology', icon: 'fas fa-heartbeat', teacher: 'Dr. Yogesh Patel' },
      { name: 'Biochemistry', icon: 'fas fa-flask', teacher: 'Dr. Vasudev Sharma' },
      { name: 'Pathology', icon: 'fas fa-microscope', teacher: 'Dr. Harsh Mohan' },
      { name: 'Microbiology', icon: 'fas fa-bacteria', teacher: 'Dr. Ananthnarayan' },
      { name: 'Pharmacology', icon: 'fas fa-pills', teacher: 'Dr. K.D. Tripathi' },
      { name: 'ENT', icon: 'fas fa-ear', teacher: 'Dr. Mohan Bansal' },
      { name: 'Ophthalmology', icon: 'fas fa-eye', teacher: 'Dr. Ruchi Rai' },
      { name: 'Medicine', icon: 'fas fa-stethoscope', teacher: 'Dr. Praveen Gupta' },
      { name: 'Surgery', icon: 'fas fa-procedures', teacher: 'Dr. Sriram Bhat' },
      { name: 'OBG', icon: 'fas fa-baby', teacher: 'Dr. Daftary Shirish' },
      { name: 'Pediatrics', icon: 'fas fa-child', teacher: 'Dr. Vinod Paul' },
      { name: 'Orthopedics', icon: 'fas fa-bone', teacher: 'Dr. John Ebnezar' },
      { name: 'Radiology', icon: 'fas fa-x-ray', teacher: 'Dr. Satish K Bhargava' },
      { name: 'Psychiatry', icon: 'fas fa-brain', teacher: 'Dr. Niraj Ahuja' },
      { name: 'Clinical Cases', icon: 'fas fa-user-md', teacher: 'Dr. Yash Pal Munjal' }
    ];
  }

  render(selectedPlatform) {
    const container = document.createElement('div');
    container.className = 'subject-list';

    this.subjects.forEach(subject => {
      const subjectCard = document.createElement('div');
      subjectCard.className = 'subject-card';
      subjectCard.innerHTML = `
        <i class="${subject.icon}"></i>
        <span class="subject-name">${subject.name}</span>
        <span class="teacher-name">${subject.teacher}</span>
      `;
      subjectCard.onclick = () => this.handleSubjectSelect(selectedPlatform, subject.name);
      container.appendChild(subjectCard);
    });

    return container;
  }

  handleSubjectSelect(platform, subject) {
    const event = new CustomEvent('subjectSelect', {
      detail: { platform, subject }
    });
    document.dispatchEvent(event);
  }
}
