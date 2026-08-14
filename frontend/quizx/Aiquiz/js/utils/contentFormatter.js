export function formatLearningContent(content) {
    if (!content || !content.type) return null;

    let formattedHTML = '';
    
    switch (content.type) {
        case 'keyPoints':
            formattedHTML = formatKeyPoints(content);
            break;
        case 'table':
            formattedHTML = formatTable(content);
            break;
        case 'formula':
            formattedHTML = formatFormula(content);
            break;
        case 'mnemonic':
            formattedHTML = formatMnemonic(content);
            break;
        case 'flowchart':
            formattedHTML = formatFlowchart(content);
            break;
        case 'flashcard':
            formattedHTML = formatFlashcard(content);
            break;
    }

    return formattedHTML;
}

function formatKeyPoints(content) {
    return `
        <div class="key-points">
            <h4>${content.title}</h4>
            <ul>
                ${content.content.points.map(point => `
                    <li>${point}</li>
                `).join('')}
            </ul>
        </div>
    `;
}

function formatTable(content) {
    return `
        <div class="concept-table-container">
            <h4>${content.title}</h4>
            <table class="concept-table">
                <thead>
                    <tr>
                        ${content.content.headers.map(header => `
                            <th>${header}</th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${content.content.rows.map(row => `
                        <tr>
                            ${row.map(cell => `<td>${cell}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function formatFormula(content) {
    const variables = Object.entries(content.content.variables)
        .map(([variable, explanation]) => `${variable}: ${explanation}`)
        .join('<br>');

    return `
        <div class="formula-box">
            <div class="formula-title">${content.title}</div>
            <div class="formula">${content.content.expression}</div>
            <div class="formula-variables">${variables}</div>
            <div class="formula-description">${content.content.description}</div>
        </div>
    `;
}

function formatMnemonic(content) {
    return `
        <div class="mnemonic">
            <div class="mnemonic-title">${content.title}</div>
            <div class="mnemonic-word">${content.content.word}</div>
            <ul class="mnemonic-explanation">
                ${content.content.explanation.map(exp => `
                    <li>${exp}</li>
                `).join('')}
            </ul>
        </div>
    `;
}

function formatFlowchart(content) {
    return `
        <div class="flowchart-container">
            <h4>${content.title}</h4>
            <div class="flowchart">
                ${content.content.steps.map((step, index) => `
                    <div class="flowchart-step">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-content">${step}</div>
                    </div>
                    ${index < content.content.steps.length - 1 ? '<div class="flowchart-arrow">↓</div>' : ''}
                `).join('')}
            </div>
            <div class="flowchart-connections">
                ${content.content.connections.map(connection => `
                    <div class="connection">${connection}</div>
                `).join('')}
            </div>
        </div>
    `;
}

function formatFlashcard(content) {
    return `
        <div class="flashcard" onclick="this.classList.toggle('flipped')">
            <div class="flashcard-front">${content.content.front}</div>
            <div class="flashcard-back">${content.content.back}</div>
        </div>
    `;
}