export class SubjectList {
  constructor() {
    this.subjects = [
      { name: 'Anatomy', icon: 'fas fa-skeleton' },
      { name: 'Physiology', icon: 'fas fa-heartbeat' },
      { name: 'Biochemistry', icon: 'fas fa-flask' },
      { name: 'Pathology', icon: 'fas fa-microscope' },
      { name: 'Microbiology', icon: 'fas fa-bacteria' },
      { name: 'Pharmacology', icon: 'fas fa-pills' },
      { name: 'Forensic Medicine', icon: 'fas fa-search' },
      { name: 'ENT', icon: 'fas fa-ear' },
      { name: 'Ophthalmology', icon: 'fas fa-eye' },
      { name: 'Community Medicine', icon: 'fas fa-users' },
      { name: 'Medicine', icon: 'fas fa-stethoscope' },
      { name: 'Surgery', icon: 'fas fa-procedures' },
      { name: 'Obstetrics', icon: 'fas fa-baby' },
      { name: 'Gynecology', icon: 'fas fa-female' },
      { name: 'Pediatrics', icon: 'fas fa-child' },
      { name: 'Orthopedics', icon: 'fas fa-bone' },
      { name: 'Radiology', icon: 'fas fa-x-ray' },
      { name: 'Anesthesia', icon: 'fas fa-syringe' },
      { name: 'Psychiatry', icon: 'fas fa-brain' }
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
        <span>${subject.name}</span>
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
