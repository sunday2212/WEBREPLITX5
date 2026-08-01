export class ExplanationComponent {
    static create(explanation) {
        const div = document.createElement('div');
        div.className = 'explanation';
        div.innerHTML = `
            <div class="explanation-content">
                <pre>${explanation.text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</pre>
                ${explanation.imageUrl ? `
                    <div class="explanation-image">
                        <img src="${explanation.imageUrl}" alt="Explanation diagram" class="medical-diagram">
                    </div>
                ` : ''}
            </div>
            <div class="doubt-section">
                <h4><b>Have a doubt?</b></h4>
                <div class="doubt-input-container">
                    <textarea 
                        placeholder="Type your doubt here related to this question..."
                        class="doubt-input"
                    ></textarea>
                    <button class="ask-doubt-btn">Ask Doubt</button>
                </div>
                <div class="doubt-answer hidden"></div>
            </div>
        `;
        return div;
    }
}