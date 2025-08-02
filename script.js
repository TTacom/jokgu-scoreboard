document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modal = document.getElementById('setup-modal');
    const startGameBtn = document.getElementById('start-game-btn');
    const scoreboardContainer = document.getElementById('scoreboard-container');
    const mainBoard = document.getElementById('main-board');

    const homeScoreEl = document.getElementById('home-score');
    const awayScoreEl = document.getElementById('away-score');
    const homeSetScoreEl = document.getElementById('home-set-score');
    const awaySetScoreEl = document.getElementById('away-set-score');
    const homeServerEl = document.getElementById('home-server');
    const awayServerEl = document.getElementById('away-server');

    const undoBtn = document.getElementById('undo-btn');
    const courtChangeBtn = document.getElementById('court-change-btn');
    const resetBtn = document.getElementById('reset-btn');
    const autoCourtChangeCheckbox = document.getElementById('auto-court-change');

    // Game State
    let state = {
        homeScore: 0,
        awayScore: 0,
        homeSetScore: 0,
        awaySetScore: 0,
        homeServer: 1,
        awayServer: 1,
        hasServe: 'home',
        isCourtSwapped: false,
        isAutoCourtChangeEnabled: true,
        gameOver: false,
    };

    let history = [];

    const SET_WIN_SCORE = 15;
    const DEUCE_SCORE = 14;
    const MAX_SCORE = 19;
    const MATCH_WIN_SETS = 2;

    // --- Audio & Haptic Feedback ---
    let audioCtx;
    function playBeep() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
                return;
            }
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 pitch
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1); // Play for 0.1 seconds
    }

    function triggerVibration() {
        if (navigator.vibrate) {
            navigator.vibrate(100); // 100ms vibration
        }
    }

    function giveFeedback() {
        playBeep();
        triggerVibration();
    }

    // --- Core Functions ---

    function initializeGame() {
        const startSide = document.querySelector('input[name="start-side"]:checked').value;
        const firstServe = document.querySelector('input[name="first-serve"]:checked').value;

        state.hasServe = firstServe;
        state.isCourtSwapped = (startSide === 'right');
        
        resetScoresAndServers();
        state.homeSetScore = 0;
        state.awaySetScore = 0;
        state.gameOver = false;
        history = [];

        modal.classList.add('hidden');
        scoreboardContainer.classList.remove('hidden');
        
        updateDisplay();
    }

    function updateDisplay() {
        homeScoreEl.textContent = state.homeScore;
        awayScoreEl.textContent = state.awayScore;
        homeSetScoreEl.textContent = state.homeSetScore;
        awaySetScoreEl.textContent = state.awaySetScore;

        homeServerEl.textContent = `서브: ${state.homeServer}`;
        awayServerEl.textContent = `서브: ${state.awayServer}`;

        homeServerEl.style.visibility = state.hasServe === 'home' ? 'visible' : 'hidden';
        awayServerEl.style.visibility = state.hasServe === 'away' ? 'visible' : 'hidden';

        if (state.isCourtSwapped) {
            mainBoard.classList.add('swapped');
        } else {
            mainBoard.classList.remove('swapped');
        }
    }

    function incrementScore(team) {
        if (state.gameOver) return;

        giveFeedback(); // Call feedback function
        saveState();

        const servingTeam = state.hasServe;
        const isSideOut = servingTeam !== team;

        // Update score
        if (team === 'home') {
            state.homeScore++;
        } else {
            state.awayScore++;
        }
        
        // Assign serve to the scoring team
        state.hasServe = team;

        // If serve was lost, rotate the server for the team that lost the point
        if (isSideOut) {
            if (servingTeam === 'home') {
                state.homeServer = (state.homeServer % 4) + 1;
            } else { // away team lost the serve
                state.awayServer = (state.awayServer % 4) + 1;
            }
        }

        checkSetWin();
        updateDisplay();
    }

    function checkSetWin() {
        const { homeScore, awayScore } = state;
        let homeWon = false;
        let awayWon = false;

        if (homeScore >= SET_WIN_SCORE && homeScore >= awayScore + 2) {
            homeWon = true;
        } else if (awayScore >= SET_WIN_SCORE && awayScore >= homeScore + 2) {
            awayWon = true;
        } else if (homeScore === MAX_SCORE) {
            homeWon = true;
        } else if (awayScore === MAX_SCORE) {
            awayWon = true;
        }

        if (homeWon || awayWon) {
            if (homeWon) state.homeSetScore++;
            if (awayWon) state.awaySetScore++;
            
            if (checkMatchWin()) {
                return; // Game over handled in checkMatchWin
            }

            // Prepare for next set
            resetScoresAndServers();
            if (state.isAutoCourtChangeEnabled) {
                courtChange();
            }
        }
    }
    
    function checkMatchWin() {
        let winner = null;
        if (state.homeSetScore >= MATCH_WIN_SETS) {
            winner = '우리팀';
        } else if (state.awaySetScore >= MATCH_WIN_SETS) {
            winner = '상대팀';
        }

        if (winner) {
            state.gameOver = true;
            setTimeout(() => {
                alert(`${winner} 승리!`);
            }, 100); // Timeout to allow display to update first
            return true;
        }
        return false;
    }

    function saveState() {
        history.push(JSON.parse(JSON.stringify(state)));
    }

    function undo() {
        if (history.length > 0) {
            state = history.pop();
            updateDisplay();
        }
    }

    function courtChange() {
        state.isCourtSwapped = !state.isCourtSwapped;
        updateDisplay();
    }
    
    function resetScoresAndServers() {
        state.homeScore = 0;
        state.awayScore = 0;
        state.homeServer = 1;
        state.awayServer = 1;
    }

    function resetGame() {
        if (confirm('게임을 초기화하시겠습니까?')) {
            scoreboardContainer.classList.add('hidden');
            modal.classList.remove('hidden');
            // State will be reset on new game start
        }
    }

    // --- Event Listeners ---

    startGameBtn.addEventListener('click', initializeGame);
    
    homeScoreEl.addEventListener('click', () => incrementScore('home'));
    awayScoreEl.addEventListener('click', () => incrementScore('away'));

    undoBtn.addEventListener('click', undo);
    courtChangeBtn.addEventListener('click', courtChange);
    resetBtn.addEventListener('click', resetGame);

    autoCourtChangeCheckbox.addEventListener('change', (e) => {
        state.isAutoCourtChangeEnabled = e.target.checked;
    });
});
