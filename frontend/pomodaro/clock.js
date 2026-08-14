let countdownInterval;
let isOnBreak = false;
let totalSeconds;
let remainingSeconds;
let isRunning = false;

const circle = document.querySelector('.progress-ring__circle');
// Circumference calculation for 340px SVG with 160px radius: 2 * PI * 160 = 1005.3
let circumference = 1005.3;

function updateCircumference() {
    const radius = circle.r.baseVal.value;
    circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
}

updateCircumference();

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    circle.style.opacity = percent / 100;
}

function updateDisplay() {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    document.getElementById('countdownDisplay').textContent = 
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const progress = (remainingSeconds / totalSeconds) * 100;
    setProgress(progress);
}

function playAlert() {
    const alertSound = document.getElementById('alertSound');
    if (!alertSound) {
        console.error('Alert sound element not found');
        return;
    }
    
    // Reset to start before playing
    alertSound.currentTime = 0;
    
    // Play with error handling
    const playPromise = alertSound.play();
    
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log('Alert sound playing');
                // Auto-stop after 3 seconds
                setTimeout(() => {
                    alertSound.pause();
                    alertSound.currentTime = 0;
                }, 3000);
            })
            .catch(error => {
                console.error('Error playing alert sound:', error);
                alert('Timer complete! (Enable sound permissions to hear alerts)');
            });
    }
}

function toggleMute() {
    const alertSound = document.getElementById('alertSound');
    const btn = document.getElementById('musicBtn');
    
    if (alertSound.muted) {
        alertSound.muted = false;
        btn.classList.remove('fa-volume-mute');
        btn.classList.add('fa-volume-up');
    } else {
        alertSound.muted = true;
        btn.classList.remove('fa-volume-up');
        btn.classList.add('fa-volume-mute');
    }
}

function startCountdown() {
    if (isRunning) {
        clearInterval(countdownInterval);
        isRunning = false;
        document.getElementById('startBtn').innerHTML = '<i class="fas fa-play"></i>';
        return;
    }

    if (!remainingSeconds || remainingSeconds === 0) {
        const focusMins = parseInt(document.getElementById('focusInput').value) || 25;
        const breakMins = parseInt(document.getElementById('breakInput').value) || 5;
        totalSeconds = (isOnBreak ? breakMins : focusMins) * 60;
        remainingSeconds = totalSeconds;
    }

    isRunning = true;
    document.getElementById('startBtn').innerHTML = '<i class="fas fa-pause"></i>';

    countdownInterval = setInterval(() => {
        remainingSeconds--;
        updateDisplay();

        if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            isRunning = false;
            document.getElementById('startBtn').innerHTML = '<i class="fas fa-play"></i>';
            
            // Play alert sound when timer completes
            playAlert();
            
            // Switch mode
            isOnBreak = !isOnBreak;
            document.getElementById('timerLabel').textContent = isOnBreak ? "Break" : "Focus";
            
            remainingSeconds = 0;
            updateDisplay();
            
            // Automatically start next phase
            setTimeout(() => {
                startCountdown();
            }, 1000);
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(countdownInterval);
    isRunning = false;
    isOnBreak = false;
    document.getElementById('timerLabel').textContent = "Focus";
    document.getElementById('startBtn').innerHTML = '<i class="fas fa-play"></i>';
    
    const focusMins = parseInt(document.getElementById('focusInput').value) || 25;
    totalSeconds = focusMins * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
}

function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function saveSettings() {
    const focusMins = document.getElementById('focusInput').value;
    const breakMins = document.getElementById('breakInput').value;
    localStorage.setItem('pomodoroFocusTime', focusMins);
    localStorage.setItem('pomodoroBreakTime', breakMins);
    toggleSettings();
    resetTimer();
}

function changeTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.body.className = `theme-${theme}`;
    localStorage.setItem('pomodoroTheme', theme);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable full-screen mode: ${err.message}`);
        });
        document.getElementById('fullscreenBtn').classList.replace('fa-expand', 'fa-compress');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            document.getElementById('fullscreenBtn').classList.replace('fa-compress', 'fa-expand');
        }
    }
}

// Init
window.onload = () => {
    const savedTheme = localStorage.getItem('pomodoroTheme') || 'mountain';
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
    document.body.className = `theme-${savedTheme}`;
    
    // Load saved times
    const savedFocus = localStorage.getItem('pomodoroFocusTime');
    const savedBreak = localStorage.getItem('pomodoroBreakTime');
    if (savedFocus) document.getElementById('focusInput').value = savedFocus;
    if (savedBreak) document.getElementById('breakInput').value = savedBreak;

    const focusMins = parseInt(document.getElementById('focusInput').value) || 25;
    totalSeconds = focusMins * 60;
    remainingSeconds = totalSeconds;
    updateCircumference();
    updateDisplay();

    // Interaction to enable audio context
    document.body.addEventListener('click', () => {
        const alertSound = document.getElementById('alertSound');
        if (alertSound && alertSound.paused && alertSound.currentTime === 0) {
            alertSound.play().then(() => {
                alertSound.pause();
                alertSound.currentTime = 0;
            }).catch(() => {});
        }
    }, { once: true });
};

window.onresize = () => {
    updateCircumference();
    updateDisplay();
};
