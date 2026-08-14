
export class PlatformSelector {
  constructor() {
    this.platforms = [
      {
        name: 'Marrow',
        description: 'Comprehensive NEET PG preparation with expert faculty',
        icon: 'fas fa-graduation-cap'
      },
      {
        name: 'DAMS',
        description: 'Delhi Academy of Medical Sciences - Premier coaching',
        icon: 'fas fa-user-md'
      },
      {
        name: 'PrepLadder',
        description: 'Interactive video lectures and practice tests',
        icon: 'fas fa-laptop-medical'
      }
    ];
  }

  render() {
    const container = document.createElement('div');
    container.className = 'platform-selector';

    this.platforms.forEach(platform => {
      const button = document.createElement('button');
      button.innerHTML = `
        <i class="${platform.icon}"></i>
        <div class="platform-name">${platform.name}</div>
        <div class="platform-description">${platform.description}</div>
      `;
      button.onclick = () => this.handlePlatformSelect(platform.name.toLowerCase());
      container.appendChild(button);
    });

    return container;
  }

  handlePlatformSelect(platform) {
    const event = new CustomEvent('platformSelect', {
      detail: platform
    });
    document.dispatchEvent(event);
  }
}
