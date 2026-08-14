export class MarrowSubjectList {
  constructor() {
    this.subjects = [
      { name: 'Anatomy', icon: 'fas fa-skeleton', teacher: 'Dr. Rajesh Kaushal' },
      { name: 'Physiology', icon: 'fas fa-heartbeat', teacher: 'Dr. Vinay Jain' },
      { name: 'Biochemistry', icon: 'fas fa-flask', teacher: 'Dr. Rebecca James' },
      { name: 'Pathology', icon: 'fas fa-microscope', teacher: 'Dr. Sumer Sethi' },
      { name: 'Microbiology', icon: 'fas fa-bacteria', teacher: 'Dr. Apurba S. Sastry' },
      { name: 'Pharmacology', icon: 'fas fa-pills', teacher: 'Dr. Gobind Rai Garg' },
      { name: 'Forensic Medicine', icon: 'fas fa-search', teacher: 'Dr. Anil Aggrawal' },
      { name: 'ENT', icon: 'fas fa-ear', teacher: 'Dr. P.L. Dhingra' },
      { name: 'Ophthalmology', icon: 'fas fa-eye', teacher: 'Dr. A.K. Khurana' },
      { name: 'Community Medicine', icon: 'fas fa-users', teacher: 'Dr. Vivek Jain' },
      { name: 'Medicine', icon: 'fas fa-stethoscope', teacher: 'Dr. Amit Ashish' },
      { name: 'Surgery', icon: 'fas fa-procedures', teacher: 'Dr. Rohan Khandelwal' },
      { name: 'Obstetrics', icon: 'fas fa-baby', teacher: 'Dr. Sakshi Arora' },
      { name: 'Gynecology', icon: 'fas fa-female', teacher: 'Dr. Richa Saxena' },
      { name: 'Pediatrics', icon: 'fas fa-child', teacher: 'Dr. Meenakshi Bothra' },
      { name: 'Orthopedics', icon: 'fas fa-bone', teacher: 'Dr. Tushar Mehta' },
      { name: 'Radiology', icon: 'fas fa-x-ray', teacher: 'Dr. Chandra Mohan' },
      { name: 'Anesthesia', icon: 'fas fa-syringe', teacher: 'Dr. Amit Kumar' },
      { name: 'Psychiatry', icon: 'fas fa-brain', teacher: 'Dr. Neeraj Bhalla' },
      { name: 'Emergency Medicine', icon: 'fas fa-ambulance', teacher: 'Dr. Pradeep Sharma' }
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
