import { Quiz } from './quiz.js';
import { SUBJECTS, DIFFICULTY_LEVELS } from './config.js';

export class QuizUI {
    constructor() {
        this.quiz = new Quiz();
        // selection: { subject: Set<subtopic> }
        this.selection = {};
        // subtopicTags: { [subject]: { [subtopic]: string[] } }
        this.subtopicTags = {};
        this.initializeElements();
        this.setupEventListeners();
        this.populateSubjects();
        this.buildTree();
    }

    initializeElements() {
        this.elements = {
            // Standard setup
            setupContainer: document.getElementById('setup-container'),
            subjectSelect: document.getElementById('subject-select'),
            subtopicSelect: document.getElementById('subtopic-select'),
            topicInput: document.getElementById('topic-input'),
            difficultySelect: document.getElementById('difficulty-select'),
            questionsSelect: document.getElementById('questions-select'),
            timeSelect: document.getElementById('time-select'),
            startQuizBtn: document.getElementById('start-quiz-btn'),
            difficultyInfo: document.getElementById('difficulty-info'),
            openCustomModuleBtn: document.getElementById('open-custom-module-btn'),

            // Custom module
            customModuleContainer: document.getElementById('custom-module-container'),
            cmTreeRoot: document.getElementById('cm-tree-root'),
            cmSelectAllBtn: document.getElementById('cm-select-all-btn'),
            cmDeselectAllBtn: document.getElementById('cm-deselect-all-btn'),
            cmSelBadge: document.getElementById('cm-sel-badge'),
            customDifficultySelect: document.getElementById('custom-difficulty-select'),
            customQuestionsSelect: document.getElementById('custom-questions-select'),
            customTimeSelect: document.getElementById('custom-time-select'),
            customBackBtn: document.getElementById('custom-back-btn'),
            customStartBtn: document.getElementById('custom-start-btn'),

            // Quiz container
            quizContainer: document.getElementById('quiz-container'),
            quizContent: document.getElementById('quiz-content'),
            timer: document.getElementById('timer'),
            currentQuestion: document.getElementById('current-question'),
            totalQuestions: document.getElementById('total-questions'),
            nextBtnContainer: document.getElementById('next-button-container'),
            nextBtn: document.getElementById('next-btn'),

            // Score
            scoreContainer: document.getElementById('score-container'),
            totalAttempted: document.getElementById('total-attempted'),
            correctAnswers: document.getElementById('correct-answers'),
            wrongAnswers: document.getElementById('wrong-answers'),
            scorePercentage: document.getElementById('score-percentage'),
            restartBtn: document.getElementById('restart-btn')
        };
    }

    setupEventListeners() {
        this.elements.subjectSelect.addEventListener('change', () => this.handleSubjectChange());
        this.elements.difficultySelect.addEventListener('change', () => this.handleDifficultyChange());
        this.elements.startQuizBtn.addEventListener('click', () => this.startQuiz());
        this.elements.openCustomModuleBtn.addEventListener('click', () => this.openCustomModule());

        this.elements.cmSelectAllBtn.addEventListener('click', () => this.selectAllTree(true));
        this.elements.cmDeselectAllBtn.addEventListener('click', () => this.selectAllTree(false));
        this.elements.customBackBtn.addEventListener('click', () => this.closeCustomModule());
        this.elements.customStartBtn.addEventListener('click', () => this.startCustomQuiz());

        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.elements.restartBtn.addEventListener('click', () => this.restartQuiz());
    }

    populateSubjects() {
        this.elements.subjectSelect.innerHTML = '<option value="">Choose a subject...</option>';
        Object.keys(SUBJECTS).forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            this.elements.subjectSelect.appendChild(option);
        });
    }

    handleSubjectChange() {
        const subject = this.elements.subjectSelect.value;
        this.elements.subtopicSelect.innerHTML = '<option value="">Choose a sub-topic...</option>';
        this.elements.topicInput.value = '';

        if (subject && SUBJECTS[subject]) {
            this.elements.subtopicSelect.disabled = false;
            this.elements.topicInput.disabled = false;
            SUBJECTS[subject].forEach(subtopic => {
                const option = document.createElement('option');
                option.value = subtopic;
                option.textContent = subtopic;
                this.elements.subtopicSelect.appendChild(option);
            });
        } else {
            this.elements.subtopicSelect.disabled = true;
            this.elements.topicInput.disabled = true;
        }
    }

    handleDifficultyChange() {
        const difficulty = this.elements.difficultySelect.value;
        const info = DIFFICULTY_LEVELS[difficulty];
        if (info) {
            this.elements.difficultyInfo.textContent = info;
            this.elements.difficultyInfo.classList.add('show');
        } else {
            this.elements.difficultyInfo.classList.remove('show');
        }
    }

    // ── Custom Module ─────────────────────────────────────────────────────────

    openCustomModule() {
        this.elements.setupContainer.classList.add('hidden');
        this.elements.customModuleContainer.classList.remove('hidden');
    }

    closeCustomModule() {
        this.elements.customModuleContainer.classList.add('hidden');
        this.elements.setupContainer.classList.remove('hidden');
    }

    // ── Tree ─────────────────────────────────────────────────────────────────

    buildTree() {
        const root = this.elements.cmTreeRoot;
        root.innerHTML = '';

        Object.entries(SUBJECTS).forEach(([subject, subtopics]) => {
            this.selection[subject] = new Set();
            this.subtopicTags[subject] = {};
            subtopics.forEach(st => { this.subtopicTags[subject][st] = []; });
            root.appendChild(this._makeSubjectNode(subject, subtopics));
        });

        this._updateBadge();
    }

    _makeSubjectNode(subject, subtopics) {
        const node = document.createElement('div');
        node.className = 'cm-node';

        // ── subject row ──────────────────────────────────────────────────────
        const row = document.createElement('div');
        row.className = 'cm-subject-row';

        const toggle = document.createElement('button');
        toggle.className = 'cm-toggle-btn';
        toggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
        toggle.setAttribute('aria-label', 'Expand');

        const cb = document.createElement('div');
        cb.className = 'cm-cb';
        cb.innerHTML = '<i class="fas fa-check"></i>';

        const label = document.createElement('span');
        label.className = 'cm-subject-label';
        label.textContent = subject;

        const count = document.createElement('span');
        count.className = 'cm-count';
        count.textContent = `0 / ${subtopics.length}`;

        row.appendChild(toggle);
        row.appendChild(cb);
        row.appendChild(label);
        row.appendChild(count);

        // ── children ─────────────────────────────────────────────────────────
        const children = document.createElement('div');
        children.className = 'cm-children';

        subtopics.forEach(subtopic => {
            children.appendChild(this._makeSubtopicNode(subject, subtopic, cb, count, subtopics));
        });

        // toggle expand/collapse
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = children.classList.toggle('cm-open');
            toggle.innerHTML = open
                ? '<i class="fas fa-chevron-down"></i>'
                : '<i class="fas fa-chevron-right"></i>';
        });

        // click subject checkbox → select/deselect all its subtopics
        cb.addEventListener('click', () => {
            const sel = this.selection[subject];
            const allSelected = sel.size === subtopics.length;
            if (allSelected) {
                sel.clear();
            } else {
                subtopics.forEach(s => sel.add(s));
            }
            this._syncSubjectCheckbox(cb, count, sel, subtopics);
            this._syncSubtopicCheckboxes(children, sel);
            this._updateBadge();
        });

        node.appendChild(row);
        node.appendChild(children);
        return node;
    }

    _makeSubtopicNode(subject, subtopic, parentCb, countEl, allSubtopics) {
        // Wrapper holds both the row and the collapsible tag area
        const wrapper = document.createElement('div');
        wrapper.className = 'cm-subtopic-wrapper';

        // ── subtopic row ─────────────────────────────────────────────────────
        const row = document.createElement('div');
        row.className = 'cm-subtopic-row';

        const cb = document.createElement('div');
        cb.className = 'cm-cb cm-cb-sm';
        cb.innerHTML = '<i class="fas fa-check"></i>';

        const labelEl = document.createElement('span');
        labelEl.className = 'cm-subtopic-label';
        labelEl.textContent = subtopic;

        // Small button to expand/collapse the tag input area
        const expandBtn = document.createElement('button');
        expandBtn.className = 'cm-st-expand-btn';
        expandBtn.title = 'Add specific topics';
        expandBtn.innerHTML = '<i class="fas fa-plus"></i> topics';

        row.appendChild(cb);
        row.appendChild(labelEl);
        row.appendChild(expandBtn);

        // ── tag input area (collapsed by default) ────────────────────────────
        const tagArea = document.createElement('div');
        tagArea.className = 'cm-st-tag-area';

        const inputRow = document.createElement('div');
        inputRow.className = 'cm-st-input-row';

        const input = document.createElement('input');
        input.className = 'cm-st-input';
        input.type = 'text';
        input.placeholder = `e.g. specific topic in ${subtopic}…`;

        const addBtn = document.createElement('button');
        addBtn.className = 'cm-st-add-btn';
        addBtn.textContent = '+ Add';

        inputRow.appendChild(input);
        inputRow.appendChild(addBtn);

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'cm-st-tags';

        tagArea.appendChild(inputRow);
        tagArea.appendChild(tagsContainer);

        wrapper.appendChild(row);
        wrapper.appendChild(tagArea);

        // ── helpers ──────────────────────────────────────────────────────────
        const renderTags = () => {
            const tags = this.subtopicTags[subject][subtopic];
            tagsContainer.innerHTML = '';
            tags.forEach((tag, idx) => {
                const chip = document.createElement('span');
                chip.className = 'cm-st-chip';
                chip.innerHTML = `<span class="cm-st-chip-text">${tag}</span><button class="cm-st-chip-remove" title="Remove">×</button>`;
                chip.querySelector('.cm-st-chip-remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.subtopicTags[subject][subtopic].splice(idx, 1);
                    renderTags();
                });
                tagsContainer.appendChild(chip);
            });
        };

        const addTag = () => {
            const val = input.value.trim();
            if (!val) { input.focus(); return; }
            const tags = this.subtopicTags[subject][subtopic];
            if (!tags.includes(val)) {
                tags.push(val);
                // Auto-select the subtopic when a tag is added
                const sel = this.selection[subject];
                if (!sel.has(subtopic)) {
                    sel.add(subtopic);
                    this._syncCb(cb, 'full');
                    this._syncSubjectCheckbox(parentCb, countEl, sel, allSubtopics);
                    this._updateBadge();
                }
                renderTags();
            }
            input.value = '';
            input.focus();
        };

        // ── events ───────────────────────────────────────────────────────────
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = tagArea.classList.toggle('cm-st-open');
            expandBtn.classList.toggle('cm-st-expand-active', open);
            if (open) input.focus();
        });

        addBtn.addEventListener('click', (e) => { e.stopPropagation(); addTag(); });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addTag(); }
        });

        cb.addEventListener('click', (e) => {
            e.stopPropagation();
            const sel = this.selection[subject];
            if (sel.has(subtopic)) {
                sel.delete(subtopic);
            } else {
                sel.add(subtopic);
            }
            this._syncCb(cb, sel.has(subtopic) ? 'full' : '');
            this._syncSubjectCheckbox(parentCb, countEl, sel, allSubtopics);
            this._updateBadge();
        });

        // Clicking the label text also toggles checkbox
        labelEl.addEventListener('click', (e) => {
            e.stopPropagation();
            cb.click();
        });

        return wrapper;
    }

    _syncSubjectCheckbox(cb, countEl, sel, subtopics) {
        const n = sel.size;
        const total = subtopics.length;
        countEl.textContent = `${n} / ${total}`;
        if (n === 0) this._syncCb(cb, '');
        else if (n === total) this._syncCb(cb, 'full');
        else this._syncCb(cb, 'part');
    }

    _syncSubtopicCheckboxes(childrenEl, sel) {
        childrenEl.querySelectorAll('.cm-subtopic-wrapper').forEach(wrapper => {
            const labelEl = wrapper.querySelector('.cm-subtopic-label');
            const cb = wrapper.querySelector('.cm-cb');
            this._syncCb(cb, sel.has(labelEl.textContent) ? 'full' : '');
        });
    }

    _syncCb(cb, state) {
        cb.classList.remove('full', 'part');
        if (state) cb.classList.add(state);
    }

    selectAllTree(select) {
        Object.entries(SUBJECTS).forEach(([subject, subtopics]) => {
            const sel = this.selection[subject];
            sel.clear();
            if (select) subtopics.forEach(s => sel.add(s));
        });

        const root = this.elements.cmTreeRoot;
        root.querySelectorAll('.cm-node').forEach((node, idx) => {
            const subject = Object.keys(SUBJECTS)[idx];
            const subtopics = SUBJECTS[subject];
            const sel = this.selection[subject];
            const subjectCb = node.querySelector('.cm-subject-row > .cm-cb');
            const countEl = node.querySelector('.cm-count');
            this._syncSubjectCheckbox(subjectCb, countEl, sel, subtopics);
            const childrenEl = node.querySelector('.cm-children');
            this._syncSubtopicCheckboxes(childrenEl, sel);
        });

        this._updateBadge();
    }

    _updateBadge() {
        let total = 0;
        Object.values(this.selection).forEach(s => { total += s.size; });
        this.elements.cmSelBadge.textContent = `${total} sub-topic${total !== 1 ? 's' : ''} selected`;
        this.elements.cmSelBadge.classList.toggle('cm-sel-badge-active', total > 0);
    }

    _getCustomPairs() {
        const pairs = [];
        Object.entries(this.selection).forEach(([subject, subtopicSet]) => {
            subtopicSet.forEach(subtopic => {
                const tags = (this.subtopicTags[subject] || {})[subtopic] || [];
                if (tags.length > 0) {
                    // Generate one pair per typed tag — AI gets precise context
                    tags.forEach(tag => pairs.push({
                        subtopic: `${subject} > ${subtopic}`,
                        topic: tag
                    }));
                } else {
                    // No specific tags — use subtopic broadly
                    pairs.push({ subtopic, topic: '' });
                }
            });
        });
        return pairs;
    }

    startCustomQuiz() {
        const pairs = this._getCustomPairs();
        if (pairs.length === 0) {
            alert('Please select at least one sub-topic.');
            return;
        }
        const difficulty = this.elements.customDifficultySelect.value;
        if (!difficulty) {
            alert('Please select a difficulty level.');
            return;
        }

        const questionLimit = parseInt(this.elements.customQuestionsSelect.value);
        const timeLimit = parseInt(this.elements.customTimeSelect.value);

        this.quiz = new Quiz();
        this.quiz.difficulty = difficulty;
        this.quiz.questionLimit = questionLimit;
        this.quiz.timeLimit = timeLimit;
        this.quiz.customPairs = pairs;

        this.elements.customModuleContainer.classList.add('hidden');
        this.elements.quizContainer.classList.remove('hidden');
        this.elements.totalQuestions.textContent = questionLimit || '∞';

        this.nextQuestion();
    }

    // ── Standard Quiz ─────────────────────────────────────────────────────────

    startQuiz() {
        const subject = this.elements.subjectSelect.value;
        const subtopic = this.elements.subtopicSelect.value;
        const topic = this.elements.topicInput.value.trim();
        const difficulty = this.elements.difficultySelect.value;
        const questionLimit = parseInt(this.elements.questionsSelect.value);
        const timeLimit = parseInt(this.elements.timeSelect.value);

        if (!subject || !subtopic || !difficulty) {
            alert('Please select subject, sub-topic and difficulty level.');
            return;
        }

        this.quiz = new Quiz();
        this.quiz.subject = subject;
        this.quiz.subtopic = subtopic;
        this.quiz.topic = topic;
        this.quiz.difficulty = difficulty;
        this.quiz.questionLimit = questionLimit;
        this.quiz.timeLimit = timeLimit;
        this.quiz.customPairs = [];

        this.elements.setupContainer.classList.add('hidden');
        this.elements.quizContainer.classList.remove('hidden');
        this.elements.totalQuestions.textContent = questionLimit || '∞';

        this.nextQuestion();
    }

    restartQuiz() {
        this.quiz = new Quiz();
        this.elements.quizContainer.classList.add('hidden');
        this.elements.setupContainer.classList.remove('hidden');
        this.elements.scoreContainer.classList.add('hidden');
        this.elements.nextBtnContainer.classList.add('hidden');
        this.elements.currentQuestion.textContent = '1';
    }

    // ── Quiz UI ───────────────────────────────────────────────────────────────

    showSkeletonLoading() {
        this.elements.quizContent.innerHTML = `
            <div id="question-container">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
            <div id="options-container">
                ${Array(4).fill('<div class="skeleton skeleton-option"></div>').join('')}
            </div>
        `;
    }

    async nextQuestion() {
        this.elements.nextBtnContainer.classList.add('hidden');
        this.showSkeletonLoading();

        const question = await this.quiz.generateQuestion();

        if (!question) {
            this.showResults();
            return;
        }

        this.quiz.currentQuestion = question;

        this.elements.quizContent.innerHTML = `
            <div id="question-container">
                <p id="question-text">${question.question}</p>
            </div>
            <div id="options-container"></div>
            <div class="collapsible-sections">
                <details class="explanation-details">
                    <summary>Explanation</summary>
                    <div id="explanation-container"></div>
                </details>
            </div>
        `;

        this.elements.optionsContainer = document.getElementById('options-container');
        this.elements.explanationContainer = document.getElementById('explanation-container');
        this.elements.currentQuestion.textContent = this.quiz.questionsAnswered + 1;

        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option';
            button.textContent = option;
            button.addEventListener('click', () => this.selectAnswer(index));
            this.elements.optionsContainer.appendChild(button);
        });

        if (this.quiz.timeLimit) {
            this.startTimer();
        }
    }

    startTimer() {
        if (this.quiz.timer) clearInterval(this.quiz.timer);

        let timeLeft = this.quiz.timeLimit;
        this.elements.timer.textContent = `Time left: ${timeLeft}s`;

        this.quiz.timer = setInterval(() => {
            timeLeft--;
            this.elements.timer.textContent = `Time left: ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(this.quiz.timer);
                for (let o of this.elements.optionsContainer.children) o.disabled = true;
                this.selectAnswer(-1);
            }
        }, 1000);
    }

    selectAnswer(selectedIndex) {
        if (this.quiz.timer) {
            clearInterval(this.quiz.timer);
            this.elements.timer.textContent = '';
        }

        for (let o of this.elements.optionsContainer.children) o.disabled = true;

        const correctIndex = this.quiz.currentQuestion.correctIndex;
        this.elements.optionsContainer.children[correctIndex].classList.add('correct');

        if (selectedIndex === correctIndex) {
            this.quiz.score++;
        } else if (selectedIndex !== -1) {
            this.elements.optionsContainer.children[selectedIndex].classList.add('wrong');
            this.quiz.wrongAnswers++;
        }

        this.quiz.questionsAnswered++;
        this.elements.nextBtnContainer.classList.remove('hidden');
        this.showExplanationAndObjectives();
    }

    async showExplanationAndObjectives() {
        const currentQuestion = this.quiz.currentQuestion;
        const explanation = await this.quiz.getExplanation(
            currentQuestion.question,
            currentQuestion.options,
            currentQuestion.correctIndex
        );

        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'explanation';
        explanationDiv.innerHTML = `
            <div class="explanation-content">
                <pre>${explanation.text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</pre>
            </div>
            <div class="doubt-section">
                <h4><b>Have a doubt?</b></h4>
                <div class="doubt-input-container">
                    <textarea placeholder="Type your doubt here related to this question..." class="doubt-input"></textarea>
                    <button class="ask-doubt-btn">Ask Doubt</button>
                </div>
                <div class="doubt-answer hidden"></div>
            </div>
        `;

        this.elements.explanationContainer.innerHTML = '';
        this.elements.explanationContainer.appendChild(explanationDiv);
        this.setupDoubtHandling(explanationDiv);
    }

    setupDoubtHandling(explanationDiv) {
        const doubtInput = explanationDiv.querySelector('.doubt-input');
        const askDoubtBtn = explanationDiv.querySelector('.ask-doubt-btn');
        const doubtAnswer = explanationDiv.querySelector('.doubt-answer');

        askDoubtBtn.addEventListener('click', async () => {
            const doubt = doubtInput.value.trim();
            if (!doubt) return;

            askDoubtBtn.disabled = true;
            askDoubtBtn.textContent = 'Processing...';

            try {
                const answer = await this.quiz.askDoubt(doubt, this.quiz.currentQuestion.question);
                doubtAnswer.innerHTML = `<div class="doubt-text">${answer.text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</div>`;
                doubtAnswer.classList.remove('hidden');
            } catch (error) {
                doubtAnswer.textContent = 'Failed to get answer. Please try again.';
                doubtAnswer.classList.remove('hidden');
            } finally {
                askDoubtBtn.disabled = false;
                askDoubtBtn.textContent = 'Ask Doubt';
            }
        });
    }

    showResults() {
        const results = this.quiz.getResults();
        this.elements.quizContent.innerHTML = '';
        this.elements.scoreContainer.classList.remove('hidden');
        this.elements.nextBtnContainer.classList.add('hidden');

        this.elements.totalAttempted.textContent = results.total;
        this.elements.correctAnswers.textContent = results.correct;
        this.elements.wrongAnswers.textContent = results.wrong;
        this.elements.scorePercentage.textContent = `${results.percentage}%`;
    }
}
