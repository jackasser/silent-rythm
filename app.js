// app.js - Main Application Logic, Gamification and State Management (GSAP & FontAwesome Integrated)

class SilentRhythmApp {
    constructor() {
        this.staff = null;
        this.fretboard = null;
        this.currentStep = '1'; // 初心者はまずPhase 1から開始
        this.currentLesson = 1; // 各Phase内のレッスンインデックス
        this.score = 0;
        this.unlockedSteps = new Set(['1', '2', '3', '4', '5', '6']); // すべての機能を最初から解放
        
        // Step 0-B builder state (コードの成り立ちなどで使用)
        this.builderState = {
            step: 1, // 1: Root, 2: 3rd, 3: 5th, 4: 7th, 5: Scale
            rootMidi: 48, // C3
            rootName: 'C',
            thirdType: 'major', // 'major' | 'minor'
            seventhType: 'maj7', // 'maj7' | 'min7' | 'dom7'
            scaleType: 'major' // 'major' | 'pentatonic'
        };

        // Step 2 Chord Form Explorer state (基本コードフォームで使用)
        this.chordFormState = {
            root: 'G',
            string: '6', // '6' | '5'
            type: 'min7' // 'maj7' | 'min7' | 'dom7'
        };
        
        // ユーザー称号の定義 (リニューアル版)
        this.titles = [
            { score: 0, title: '路地裏のリスナー' },
            { score: 200, title: '地下の楽屋泥棒' },
            { score: 500, title: '夜更かしのバッカー' },
            { score: 1000, title: '煙の立ち込めるソロイスト' },
            { score: 2000, title: 'ミッドナイト・ジャズマスター' }
        ];

        // 共通教材：『枯葉 (Autumn Leaves)』のコード進行定義 (Key: G minor, BPM 110)
        this.autumnLeavesProgression = [
            { chord: 'Cm7', quality: 'min7', rootMidi: 48, notesMidi: [60, 63, 67, 70], beats: 4 },      // C E♭ G B♭
            { chord: 'F7', quality: 'dom7', rootMidi: 41, notesMidi: [53, 57, 60, 63], beats: 4 },        // F A C E♭
            { chord: 'B♭maj7', quality: 'maj7', rootMidi: 46, notesMidi: [58, 62, 65, 69], beats: 4 },    // B♭ D F A
            { chord: 'E♭maj7', quality: 'maj7', rootMidi: 51, notesMidi: [63, 67, 70, 74], beats: 4 },    // E♭ G B♭ D
            { chord: 'Am7(♭5)', quality: 'm7b5', rootMidi: 45, notesMidi: [57, 60, 63, 67], beats: 4 },   // A C E♭ G
            { chord: 'D7', quality: 'dom7', rootMidi: 50, notesMidi: [54, 57, 60, 64], beats: 4 },        // F# A C E (rootless 9th)
            { chord: 'Gm7', quality: 'min7', rootMidi: 43, notesMidi: [55, 58, 62, 65], beats: 4 },       // G B♭ D F
            { chord: 'G7', quality: 'dom7', rootMidi: 43, notesMidi: [55, 59, 62, 65], beats: 4 }         // G B D F
        ];

        this.gameInterval = null;
        this.gameTimer = 0;
        this.gameState = null;

        // 19のレッスンの階層定義
        this.lessons = {
            '1': [
                { id: 1, title: 'Lesson 01: ジャズセッションの全貌' },
                { id: 2, title: 'Lesson 02: 指板上の音名暗記 (CDE)' },
                { id: 3, title: 'Lesson 03: 基本コード・フォーム (Shell)' }
            ],
            '2': [
                { id: 4, title: 'Lesson 04: コード・トーン・ハーモナイズ' },
                { id: 5, title: 'Lesson 05: コードの成り立ち (度数)' },
                { id: 6, title: 'Lesson 06: ダイアトニック・コードの地図' }
            ],
            '3': [
                { id: 7, title: 'Lesson 07: メジャー・スケールでアドリブ' },
                { id: 9, title: 'Lesson 09: コード・トーン (アルペジオ)' },
                { id: 10, title: 'Lesson 10: ターゲットノート着地ゲーム' }
            ],
            '4': [
                { id: 8, title: 'Lesson 08: オルタード・スケール解決' },
                { id: 11, title: 'Lesson 11: モード・スケールの色彩' }
            ],
            '5': [
                { id: 12, title: 'Lesson 12: 曲の分析 (ダイアトニック)' },
                { id: 13, title: 'Lesson 13: 曲の分析 (ノンダイアトニック)' },
                { id: 14, title: 'Lesson 14: ジャズ定番フレーズを弾く' },
                { id: 15, title: 'Lesson 15: テンション・コードの覚え方' },
                { id: 16, title: 'Lesson 16: タイム感と実践コンピング' }
            ],
            '6': [
                { id: 17, title: 'Lesson 17: イントロ＆エンディング' },
                { id: 18, title: 'Lesson 18: 実践曲挑戦 (Autumn Leaves)' },
                { id: 19, title: 'Lesson 19: ジャム・セッションの流儀' }
            ]
        };
    }

    init() {
        this.initComponents();
        this.setupAppEvents();
        this.loadCurrentUser();
        this.setupLoginEvents();
        this.syncRoadmapLocks();
        this.switchStep(this.currentStep, false); // 初期起動時はアニメーションなし
        this.showOnboardingIfFirstVisit();
    }

    // unlockedSteps の状態をサイドバーのDOM (disabled/locked) に反映する。
    syncRoadmapLocks() {
        const steps = ['1', '2', '3', '4', '5', '6'];
        steps.forEach(step => {
            const btn = document.getElementById(`btn-step-${step}`);
            if (!btn) return;
            if (this.unlockedSteps.has(step)) {
                btn.classList.remove('locked');
                btn.removeAttribute('disabled');
                const lockIcon = btn.querySelector('.lock-icon');
                if (lockIcon) lockIcon.innerHTML = '<i class="fa-solid fa-lock-open" style="color: var(--accent-emerald);"></i>';
            }
        });
    }

    // 初回訪問時のみオンボーディングを表示
    showOnboardingIfFirstVisit() {
        if (localStorage.getItem('sr_onboarding_done')) return;
        const modal = document.getElementById('onboarding-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        const closeOnboarding = () => {
            localStorage.setItem('sr_onboarding_done', '1');
            if (window.gsap) {
                window.gsap.to(modal, { opacity: 0, duration: 0.3, onComplete: () => { modal.style.display = 'none'; } });
            } else {
                modal.style.display = 'none';
            }
        };
        const btnStart = document.getElementById('btn-onboarding-start');
        if (btnStart) btnStart.addEventListener('click', closeOnboarding);
    }

    /* ====================================================
       ユーザーログイン機能 ＆ ローカルセーブ永続化
       ==================================================== */
    loadCurrentUser() {
        const username = localStorage.getItem('sr_current_user');
        if (username) {
            const users = JSON.parse(localStorage.getItem('sr_users') || '{}');
            const userData = users[username];
            if (userData) {
                this.currentUser = username;
                this.score = userData.score || 0;
                this.unlockedSteps = new Set(['1', '2', '3', '4', '5', '6']); // すべて解放
                this.nickname = userData.nickname || username;

                // 前回開いていたステップから再開（古いIDからマッピング）
                let lastStep = userData.lastStep || '1';
                const stepMap = { '0a': '1', '0b': '2', '1': '3', '2': '4', '3': '5', '4': '6' };
                if (stepMap[lastStep]) {
                    lastStep = stepMap[lastStep];
                }
                this.currentStep = lastStep;
                this.currentLesson = userData.lastLesson || 1;

                this.updateUserHeaderUI();
                return;
            }
        }
        // 未ログイン/ゲスト状態
        this.currentUser = null;
        this.score = 0;
        this.unlockedSteps = new Set(['1', '2', '3', '4', '5', '6']); // すべて解放
        this.nickname = 'ゲスト';
        this.currentStep = '1';
        this.currentLesson = 1;
        this.updateUserHeaderUI();
    }

    saveCurrentUserData() {
        if (!this.currentUser) return; // ゲスト状態では保存しない
        const users = JSON.parse(localStorage.getItem('sr_users') || '{}');
        if (users[this.currentUser]) {
            users[this.currentUser].score = this.score;
            users[this.currentUser].unlockedSteps = Array.from(this.unlockedSteps);
            users[this.currentUser].lastStep = this.currentStep;
            users[this.currentUser].lastLesson = this.currentLesson;
            localStorage.setItem('sr_users', JSON.stringify(users));
        }
    }

    updateUserHeaderUI() {
        const btnTrigger = document.getElementById('btn-login-trigger');
        const badge = document.getElementById('user-profile-badge');
        const nameEl = document.getElementById('current-user-name');
        const scoreEl = document.getElementById('user-score');
        const titleEl = document.getElementById('user-title');
        const levelEl = document.getElementById('unlocked-level');

        if (this.currentUser) {
            if (btnTrigger) btnTrigger.style.display = 'none';
            if (badge) badge.style.display = 'flex';
            if (nameEl) nameEl.textContent = this.nickname;
        } else {
            if (btnTrigger) btnTrigger.style.display = 'flex';
            if (badge) badge.style.display = 'none';
        }

        if (scoreEl) scoreEl.textContent = `${this.score} pts`;
        
        let activeTitle = this.titles[0].title;
        for (let i = 0; i < this.titles.length; i++) {
            if (this.score >= this.titles[i].score) {
                activeTitle = this.titles[i].title;
            }
        }
        if (titleEl) titleEl.textContent = activeTitle;

        // ロードマップボタンのロック状態を再同期
        const steps = ['1', '2', '3', '4', '5', '6'];
        steps.forEach(step => {
            const btn = document.getElementById(`btn-step-${step}`);
            if (btn) {
                if (this.unlockedSteps.has(step)) {
                    btn.classList.remove('locked');
                    btn.removeAttribute('disabled');
                    const icon = btn.querySelector('.lock-icon');
                    if (icon) icon.innerHTML = '<i class="fa-solid fa-lock-open" style="color: var(--accent-emerald);"></i>';
                } else {
                    btn.classList.add('locked');
                    btn.setAttribute('disabled', 'true');
                    const icon = btn.querySelector('.lock-icon');
                    if (icon) icon.innerHTML = '<i class="fa-solid fa-lock" style="color: var(--text-muted);"></i>';
                }
            }
        });
        if (levelEl) {
            levelEl.textContent = `Phase ${this.currentStep}`;
        }
    }

    setupLoginEvents() {
        const modal = document.getElementById('login-modal');
        const btnTrigger = document.getElementById('btn-login-trigger');
        const btnClose = document.getElementById('btn-close-login');
        const btnLogout = document.getElementById('btn-logout');
        
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');

        const loginError = document.getElementById('login-error');
        const registerError = document.getElementById('register-error');

        if (btnTrigger) {
            btnTrigger.addEventListener('click', () => {
                if (modal) {
                    modal.style.display = 'flex';
                    if (window.gsap) {
                        window.gsap.fromTo(".login-modal-card", {scale: 0.8, opacity: 0}, {scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.5)"});
                    }
                    if (loginError) loginError.textContent = '';
                    if (registerError) registerError.textContent = '';
                }
            });
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => {
                if (modal) {
                    if (window.gsap) {
                        window.gsap.to(".login-modal-card", {scale: 0.8, opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => {
                            modal.style.display = 'none';
                        }});
                    } else {
                        modal.style.display = 'none';
                    }
                }
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                localStorage.removeItem('sr_current_user');
                this.loadCurrentUser();
                this.switchStep('1');
                alert('ログアウトしました。ゲストモードに移行します。');
            });
        }

        if (tabLogin && tabRegister && formLogin && formRegister) {
            tabLogin.addEventListener('click', () => {
                tabLogin.classList.add('active');
                tabRegister.classList.remove('active');
                formLogin.style.display = 'flex';
                formRegister.style.display = 'none';
            });

            tabRegister.addEventListener('click', () => {
                tabRegister.classList.add('active');
                tabLogin.classList.remove('active');
                formRegister.style.display = 'flex';
                formLogin.style.display = 'none';
            });
        }

        if (formLogin) {
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                const usernameInput = document.getElementById('login-username');
                const passwordInput = document.getElementById('login-password');
                if (!usernameInput || !passwordInput) return;

                const username = usernameInput.value.trim();
                const password = passwordInput.value;

                const users = JSON.parse(localStorage.getItem('sr_users') || '{}');
                const user = users[username];

                if (!user || user.password !== password) {
                    if (loginError) loginError.textContent = 'ユーザー名またはパスワードが違います。';
                    window.audioEngine.playIncorrectSfx();
                    return;
                }

                localStorage.setItem('sr_current_user', username);
                this.loadCurrentUser();
                
                window.audioEngine.playCorrectSfx();
                
                if (modal) {
                    if (window.gsap) {
                        window.gsap.to(".login-modal-card", {scale: 0.8, opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => {
                            modal.style.display = 'none';
                            formLogin.reset();
                        }});
                    } else {
                        modal.style.display = 'none';
                        formLogin.reset();
                    }
                }
                
                this.switchStep(this.currentStep);
                alert(`ログインしました。ようこそ、${this.nickname}さん！`);
            });
        }

        if (formRegister) {
            formRegister.addEventListener('submit', (e) => {
                e.preventDefault();
                const usernameInput = document.getElementById('register-username');
                const passwordInput = document.getElementById('register-password');
                const nicknameInput = document.getElementById('register-nickname');
                if (!usernameInput || !passwordInput || !nicknameInput) return;

                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                const nickname = nicknameInput.value.trim() || username;

                if (username.length < 2) {
                    if (registerError) registerError.textContent = 'ユーザー名は2文字以上で入力してください。';
                    window.audioEngine.playIncorrectSfx();
                    return;
                }

                const users = JSON.parse(localStorage.getItem('sr_users') || '{}');
                if (users[username]) {
                    if (registerError) registerError.textContent = 'このユーザー名は既に登録されています。';
                    window.audioEngine.playIncorrectSfx();
                    return;
                }

                users[username] = {
                    password: password,
                    nickname: nickname,
                    score: 0,
                    unlockedSteps: ['1', '2', '3', '4', '5', '6']
                };
                localStorage.setItem('sr_users', JSON.stringify(users));
                localStorage.setItem('sr_current_user', username);
                
                this.loadCurrentUser();
                window.audioEngine.playCorrectSfx();

                if (modal) {
                    if (window.gsap) {
                        window.gsap.to(".login-modal-card", {scale: 0.8, opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => {
                            modal.style.display = 'none';
                            formRegister.reset();
                        }});
                    } else {
                        modal.style.display = 'none';
                        formRegister.reset();
                    }
                }
                
                this.switchStep('1');
                alert(`登録が完了し、自動ログインしました。ようこそ、${nickname}さん！`);
            });
        }
    }

    initComponents() {
        this.staff = new window.InteractiveStaff('svg-staff-wrapper', (midi) => {
            window.audioEngine.playNote(midi, 1.5, 0.4);
            this.fretboard.clearMarkers();
            this.fretboard.addMarker(midi, 'root');
            const pitchClass = midi % 12;
            this.fretboard.setOctaveHighlight(pitchClass, true);
        });

        this.fretboard = new window.InteractiveFretboard('svg-fretboard-wrapper', (midi, stringIndex, fret) => {
            window.audioEngine.playNote(midi, 1.5, 0.4);

            // Step 3/4/6のバッキング再生中はスケール・ターゲットのガイド表示を消さない
            const isGuidedPlayback = window.audioEngine.isPlaying && (this.currentStep === '3' || this.currentStep === '4' || this.currentStep === '6');

            // ゲーム中・ガイド再生中でない場合のみ、五線譜がスナップ＆マーカーとオクターブ点線を更新
            if ((!this.gameState || !this.gameState.activeGame) && !isGuidedPlayback) {
                this.staff.setNoteByMidi(midi, true);
                this.fretboard.clearMarkers();
                this.fretboard.addMarker(midi, 'root');
                const pitchClass = midi % 12;
                this.fretboard.setOctaveHighlight(pitchClass, true);
            }

            // Phase 3 or Phase 6 (Session) adlib landing detection
            if ((this.currentStep === '3' || (this.currentStep === '6' && this.currentLesson === 18)) && window.audioEngine.isPlaying) {
                this.handleAdlibClick(midi, stringIndex, fret);
            }

            if (this.gameState && this.gameState.activeGame === 'noterun') {
                this.handleNoteRunClick(midi, stringIndex, fret);
            }

            if (this.gameState && this.gameState.activeGame === 'hunter') {
                this.handleHunterClick(midi, stringIndex, fret);
            }
            
            if (this.gameState && this.gameState.activeGame === 'builder') {
                this.handleBuilderClick(midi);
            }
        });
    }

    setupAppEvents() {
        const steps = ['1', '2', '3', '4', '5', '6'];
        steps.forEach(step => {
            const btn = document.getElementById(`btn-step-${step}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (this.unlockedSteps.has(step)) {
                        this.switchStep(step);
                    }
                });
            }
        });

        const btnCDE = document.getElementById('btn-notation-cde');
        const btnDoReMi = document.getElementById('btn-notation-doremi');
        
        if (btnCDE && btnDoReMi) {
            btnCDE.addEventListener('click', () => {
                btnCDE.classList.add('active');
                btnDoReMi.classList.remove('active');
                this.staff.setNotation('cde');
                this.fretboard.setNotation('cde');
                this.updateActiveLessonText();
            });

            btnDoReMi.addEventListener('click', () => {
                btnDoReMi.classList.add('active');
                btnCDE.classList.remove('active');
                this.staff.setNotation('doremi');
                this.fretboard.setNotation('doremi');
                this.updateActiveLessonText();
            });
        }

        // 音量コントロール (localStorageに保存し次回も引き継ぐ)
        const sliderVolume = document.getElementById('slider-volume');
        const btnMute = document.getElementById('btn-mute');
        if (sliderVolume && btnMute) {
            const VOLUME_MAX = 0.6; // スライダー100%時のマスターゲイン
            const updateMuteIcon = (percent) => {
                btnMute.className = percent === 0
                    ? 'fa-solid fa-volume-xmark'
                    : (percent < 50 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high');
            };
            const applyVolume = (percent) => {
                window.audioEngine.setMasterVolume((percent / 100) * VOLUME_MAX);
                updateMuteIcon(percent);
                localStorage.setItem('sr_volume', String(percent));
            };

            const savedVolume = parseInt(localStorage.getItem('sr_volume') || '50', 10);
            sliderVolume.value = savedVolume;
            applyVolume(savedVolume);

            sliderVolume.addEventListener('input', (e) => applyVolume(parseInt(e.target.value, 10)));

            btnMute.addEventListener('click', () => {
                const current = parseInt(sliderVolume.value, 10);
                if (current > 0) {
                    this.volumeBeforeMute = current;
                    sliderVolume.value = 0;
                    applyVolume(0);
                } else {
                    const restored = this.volumeBeforeMute || 50;
                    sliderVolume.value = restored;
                    applyVolume(restored);
                }
            });
        }

        const btnToggleAllNotes = document.getElementById('btn-toggle-all-notes');
        if (btnToggleAllNotes) {
            btnToggleAllNotes.addEventListener('click', () => {
                const isActive = btnToggleAllNotes.classList.toggle('active');
                if (isActive) {
                    btnToggleAllNotes.innerHTML = '<i class="fa-solid fa-eye"></i> ON';
                    this.fretboard.setShowAllNotes(true);
                } else {
                    btnToggleAllNotes.innerHTML = '<i class="fa-solid fa-eye-slash"></i> OFF';
                    this.fretboard.setShowAllNotes(false);
                }
            });
        }
    }

    addScore(pts) {
        this.score += pts;
        const scoreEl = document.getElementById('user-score');
        if (scoreEl) {
            scoreEl.textContent = `${this.score} pts`;
            if (window.gsap) {
                window.gsap.fromTo(scoreEl, { scale: 1.5, color: "#fff" }, { scale: 1, color: "var(--accent-amber)", duration: 0.4, ease: "back.out(2)" });
            }
        }
        
        let activeTitle = this.titles[0].title;
        for (let i = 0; i < this.titles.length; i++) {
            if (this.score >= this.titles[i].score) {
                activeTitle = this.titles[i].title;
            }
        }
        
        const titleEl = document.getElementById('user-title');
        if (titleEl) {
            const oldTitle = titleEl.textContent;
            titleEl.textContent = activeTitle;
            if (oldTitle !== activeTitle && window.gsap) {
                window.gsap.fromTo(titleEl, { scale: 1.4, color: "#fff" }, { scale: 1, color: "var(--accent-amber)", duration: 0.6, ease: "back.out(2)" });
            }
        }

        // セーブデータをローカルに保存
        this.saveCurrentUserData();
    }

    unlockStep(step) {
        this.unlockedSteps.add(step);
        const btn = document.getElementById(`btn-step-${step}`);
        if (btn) {
            btn.classList.remove('locked');
            btn.removeAttribute('disabled');
            const lockIcon = btn.querySelector('.lock-icon');
            // FontAwesome ロックオープンアイコンに変更
            if (lockIcon) lockIcon.innerHTML = '<i class="fa-solid fa-lock-open" style="color: var(--accent-emerald);"></i>';
        }
        const unlockEl = document.getElementById('unlocked-level');
        if (unlockEl) unlockEl.textContent = `Phase ${step}`;

        // セーブデータをローカルに保存
        this.saveCurrentUserData();
    }

    switchStep(step, animate = true) {
        document.querySelectorAll('.roadmap-step-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`btn-step-${step}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        this.currentStep = step;
        
        // そのPhaseの最初のレッスンを自動設定
        const phaseLessons = this.lessons[step] || [];
        if (phaseLessons.length > 0) {
            const belongsToPhase = phaseLessons.some(l => l.id === this.currentLesson);
            if (!belongsToPhase) {
                this.currentLesson = phaseLessons[0].id;
            }
        }
        
        this.saveCurrentUserData();

        window.audioEngine.stopBackingTrack();
        this.cleanupActiveGame();
        
        this.fretboard.clearMarkers();
        
        // プレミアム・モーション・トランジション
        const panel = document.getElementById('lesson-panel');
        if (animate && panel && window.gsap) {
            window.gsap.fromTo(panel, 
                { opacity: 0, y: 15 }, 
                { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
            );
        }
        
        this.syncInteractiveStageForLesson(this.currentLesson);
        this.renderLessonPanel();
    }

    updateActiveLessonText() {
        if (this.gameState && this.gameState.activeGame) {
            const active = this.gameState.activeGame;
            if (active === 'noterun') {
                this.updateNoteRunUI();
            } else if (active === 'hunter') {
                this.updateHunterGameUI();
            } else if (active === 'builder') {
                this.updateBuilderGameUI();
            }
        } else {
            this.renderLessonPanel();
        }
    }

    renderLessonPanel() {
        let placeholder = document.getElementById('lesson-content-placeholder');
        if (!placeholder) {
            const panel = document.getElementById('lesson-panel');
            if (panel) {
                panel.innerHTML = '<div id="lesson-content-placeholder"></div>';
                placeholder = document.getElementById('lesson-content-placeholder');
            }
        }
        if (!placeholder) return;
        
        const phaseLessons = this.lessons[this.currentStep] || [];
        
        let vinylShelfHtml = `<div class="vinyl-shelf">`;
        phaseLessons.forEach((lesson) => {
            const isActive = this.currentLesson === lesson.id;
            const activeClass = isActive ? 'active' : '';
            const displayTitle = lesson.title.split(': ')[1] || lesson.title;
            
            vinylShelfHtml += `
                <div class="vinyl-album ${activeClass}" data-lesson-id="${lesson.id}" role="button" tabindex="0">
                    <div class="vinyl-jacket-wrapper">
                        <div class="vinyl-jacket">
                            <span>L${String(lesson.id).padStart(2, '0')}</span>
                        </div>
                        <div class="vinyl-disc">
                            <div class="vinyl-disc-label"></div>
                        </div>
                    </div>
                    <div class="vinyl-title">${displayTitle}</div>
                </div>
            `;
        });
        vinylShelfHtml += `</div>`;

        const lessonContentHtml = this.getLessonContent(this.currentLesson);
        
        placeholder.innerHTML = vinylShelfHtml + `<div class="active-lesson-body" style="margin-top: 10px;">${lessonContentHtml}</div>`;
        
        this.attachVinylEvents();
        this.attachLessonEvents();
    }

    attachVinylEvents() {
        document.querySelectorAll('.vinyl-album').forEach(album => {
            album.addEventListener('click', () => {
                const lessonId = parseInt(album.getAttribute('data-lesson-id'), 10);
                this.switchLesson(lessonId);
            });
        });
    }

    switchLesson(lessonId) {
        if (this.currentLesson === lessonId) return;
        this.currentLesson = lessonId;
        this.saveCurrentUserData();
        
        window.audioEngine.playNote(55, 0.1, 0.25);
        
        const body = document.querySelector('.active-lesson-body');
        if (body && window.gsap) {
            window.gsap.fromTo(body, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
        }
        
        this.cleanupActiveGame();
        this.syncInteractiveStageForLesson(lessonId);
        this.renderLessonPanel();
    }

    /* ====================================================
       各ステップの表示HTML (FontAwesomeで洗練化)
       ==================================================== */

    getStep0AContent() {
        return `
            <div class="lesson-header">
                <span class="lesson-badge"><i class="fa-solid fa-graduation-cap"></i> 超入門 - 1</span>
                <h2 class="lesson-title">Step 0-A: 音の地図 (五線譜＆指板のリンク)</h2>
            </div>
            <p class="lesson-desc">
                まずはギターと楽譜の「基本の地図」を覚えましょう。<br>
                五線譜の音をクリックすると、ギター指板上で<strong>「同じ音が出せるフレット」がすべて光り</strong>、オクターブで繋がれます。
                ギターは複数の弦で同じ音が出る仕組みを、実際に触って体感してください！
            </p>
            
            <div class="lesson-interactive-panel">
                <h3 class="section-title"><i class="fa-solid fa-circle-info"></i> 五線譜と指板を繋ぐルール</h3>
                <ul style="margin-left: 20px; margin-bottom: 25px; font-size: 0.9rem; display: flex; flex-direction: column; gap: 8px; list-style-type: square; color: var(--text-secondary);">
                    <li><strong>オクターブの幾何学</strong>: 指板上の特定の音をクリックすると、オクターブ違いの同じ音が点線で結ばれ、ギターの規則的な構造が見えてきます。</li>
                    <li><strong>ドレミとCDE</strong>: ジャズではドレミを「C D E F G A B」と呼びます。右上のトグルで切り替えて、両方に慣れましょう。</li>
                </ul>
                
                <div class="action-area" style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-start-game-0a">
                        <i class="fa-solid fa-gamepad"></i> ミニゲーム『Note Run (指板音名当て)』をプレイ！
                    </button>
                    <button class="secondary-btn" id="btn-start-memorize-0a" style="background: linear-gradient(135deg, var(--accent-purple) 0%, #6366f1 100%); color: white; border: none; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);">
                        <i class="fa-solid fa-eye"></i> 見てるだけ暗記モード (オートラーニング)
                    </button>
                </div>
            </div>
        `;
    }

    getStep0BContent() {
        return `
            <div class="lesson-header">
                <span class="lesson-badge"><i class="fa-solid fa-graduation-cap"></i> 超入門 - 2</span>
                <h2 class="lesson-title">Step 0-B: コード＆スケールの正体</h2>
            </div>
            <p class="lesson-desc">
                音楽の縦糸（コード＝和音）と横糸（スケール＝音階）の構造を直感的に探検しましょう。<br>
                コードは<strong>「空間の感情」</strong>を決め、スケールは<strong>「メロディを紡ぐための色」</strong>を提供します。
            </p>
            
            <div class="lesson-interactive-panel" style="display: flex; flex-direction: column; gap: 15px;">
                <!-- タブナビゲーション -->
                <div class="tabs-nav-0b" style="display: flex; border-bottom: 2px solid var(--border-glass); margin-bottom: 10px; gap: 5px;">
                    <button class="tab-btn-0b active" id="tab-btn-chords" style="flex: 1; padding: 12px; background: none; border: none; border-bottom: 3px solid var(--accent-amber); color: var(--text-primary); font-weight: bold; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s ease;">
                        <i class="fa-solid fa-cubes"></i> 🎸 コードを探検する (Chords)
                    </button>
                    <button class="tab-btn-0b" id="tab-btn-scales" style="flex: 1; padding: 12px; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text-muted); font-weight: bold; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s ease;">
                        <i class="fa-solid fa-palette"></i> 🎨 スケールで遊ぶ (Scales)
                    </button>
                </div>

                <!-- ステッパー（進行インジケーター） -->
                <div id="stepper-container-0b">
                    <!-- JSで動的描画 -->
                </div>

                <!-- メイン解説エリア -->
                <div id="content-chords-0b" style="display: flex; flex-direction: column; gap: 15px;">
                    <!-- アナロジー説明カード -->
                    <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.03) 0%, rgba(0,0,0,0) 100%); border: 1px dashed rgba(251, 191, 36, 0.2); border-radius: 12px; padding: 12px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                        <span style="color: var(--accent-amber); font-weight: bold; display: block; margin-bottom: 3px;"><i class="fa-solid fa-lightbulb"></i> プロのアドバイス: コードは「背景の感情フィルター」</span>
                        ジャズでは、3音のシンプルな和音ではなく、7度の音を足した<strong>「4声の7thコード（四和音）」</strong>を使うことで、まるで写真のフィルターのように独特のおしゃれさ、哀愁、緊張感といった「背景 of 感情」を表現します。
                    </div>
                </div>

                <div id="content-scales-0b" style="display: none; flex-direction: column; gap: 15px;">
                    <!-- アナロジー説明カード -->
                    <div style="background: linear-gradient(135deg, rgba(96, 165, 250, 0.03) 0%, rgba(0,0,0,0) 100%); border: 1px dashed rgba(96, 165, 250, 0.2); border-radius: 12px; padding: 12px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                        <span style="color: var(--accent-blue); font-weight: bold; display: block; margin-bottom: 3px;"><i class="fa-solid fa-lightbulb"></i> プロのアドバイス: スケールは「アドリブ用の絵の具」</span>
                        スケールとは、特定の気分を出すためにあらかじめ選ばれた「音のセット」です。「明るいメジャー系パレット」か、「渋いマイナー・ペンタトニック系パレット」か。絵の具の選び方によって、つむぎ出されるメロディの雰囲気が一瞬で変化します。
                    </div>
                </div>

                <!-- 詳細解説 ＆ セレクター -->
                <div id="chord-detail-panel" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 16px; padding: 15px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 12px;">
                    <!-- JSで描画 -->
                </div>

                <!-- ナビゲーションコントロール -->
                <div class="builder-nav-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <button class="secondary-btn" id="btn-builder-prev" style="padding: 6px 14px; font-size: 0.8rem;">
                        <i class="fa-solid fa-chevron-left"></i> 戻る
                    </button>
                    <button class="action-btn" id="btn-builder-next" style="padding: 6px 14px; font-size: 0.8rem; font-weight: bold;">
                        次へ進む <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderBuilderStepUI() {
        switch (this.builderState.step) {
            case 1:
                return `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <h3 style="color: var(--accent-amber); font-size: 1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span style="background: var(--accent-amber-glow); color: var(--accent-amber); border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">1</span>
                            根音（ルート）を選びましょう
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            すべてのコードやスケールは、土台となる1つの音（ルート）から構築されます。下のセレクターで基準となる音を選んでください。
                        </p>
                        <div style="display: flex; gap: 8px; justify-content: center; margin: 10px 0; flex-wrap: wrap;">
                            ${['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note => `
                                <button class="root-select-btn ${this.builderState.rootName === note ? 'active' : ''}" data-note="${note}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${this.builderState.rootName === note ? 'var(--accent-amber)' : 'var(--border-glass)'}; background: ${this.builderState.rootName === note ? 'var(--accent-amber-glow)' : 'rgba(255,255,255,0.02)'}; color: #fff; font-weight: bold; cursor: pointer; font-family: var(--font-heading); font-size: 1rem; transition: all 0.2s ease;">
                                    ${note}
                                </button>
                            `).join('')}
                        </div>
                        <div style="background: rgba(0,0,0,0.15); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.03);">
                            <span style="font-size: 0.78rem; color: var(--text-muted);">
                                現在選ばれているルート音: <strong style="color: var(--color-root); font-size: 0.9rem; font-family: var(--font-heading);">${this.builderState.rootName}</strong>
                            </span>
                            <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; line-height: 1.3;">
                                指板上で <strong style="color: var(--color-root);">赤色(●)</strong> で光っている場所が、選んだルート音の位置（オクターブ位置）です。
                            </p>
                        </div>
                    </div>
                `;
            case 2:
                return `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <h3 style="color: var(--accent-amber); font-size: 1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span style="background: var(--accent-amber-glow); color: var(--accent-amber); border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">2</span>
                            3度音を重ねて感情を吹き込もう
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            3度は、その和音が「明るい」か「悲しい」かを決定する最も重要な音です。
                        </p>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 5px 0;">
                            <div class="preset-card-0b ${this.builderState.thirdType === 'major' ? 'active' : ''}" id="preset-3rd-major" style="background: ${this.builderState.thirdType === 'major' ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 2px solid ${this.builderState.thirdType === 'major' ? 'var(--color-3rd)' : 'var(--border-glass)'}; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                                <i class="fa-solid fa-sun" style="font-size: 1.4rem; color: var(--color-3rd); margin-bottom: 6px; display: block;"></i>
                                <strong style="font-size: 0.88rem; display: block; color: var(--text-primary);">長3度 (Major 3rd)</strong>
                                <span style="font-size: 0.65rem; color: var(--text-muted); display: block; margin-top: 3px; line-height: 1.3;">
                                    明るく晴れやか。ルートから4フレット上。
                                </span>
                            </div>
                            <div class="preset-card-0b ${this.builderState.thirdType === 'minor' ? 'active' : ''}" id="preset-3rd-minor" style="background: ${this.builderState.thirdType === 'minor' ? 'rgba(96, 165, 250, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 2px solid ${this.builderState.thirdType === 'minor' ? 'var(--accent-blue)' : 'var(--border-glass)'}; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                                <i class="fa-solid fa-cloud-showers-water" style="font-size: 1.4rem; color: var(--accent-blue); margin-bottom: 6px; display: block;"></i>
                                <strong style="font-size: 0.88rem; display: block; color: var(--text-primary);">短3度 (Minor 3rd)</strong>
                                <span style="font-size: 0.65rem; color: var(--text-muted); display: block; margin-top: 3px; line-height: 1.3;">
                                    切なく悲しげ。ルートから3フレット上。
                                </span>
                            </div>
                        </div>
                        <div style="background: rgba(0,0,0,0.15); border-radius: 8px; padding: 8px; text-align: center; font-size: 0.72rem; color: var(--text-muted); line-height: 1.3;">
                            カードを切り替えると、指板上で <strong style="color: var(--color-3rd);">緑色(●)</strong> の3度音が半音（1フレット分）上下に動き、和音の響きが一変するのを聴き比べられます。
                        </div>
                    </div>
                `;
            case 3:
                return `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <h3 style="color: var(--accent-amber); font-size: 1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span style="background: var(--accent-amber-glow); color: var(--accent-amber); border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">3</span>
                            完全5度を加えて骨組みを安定させよう
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            完全5度（Perfect 5th）は、和音の厚みと安定感を支えるサポート音です。感情（明るさ/暗さ）に影響を与えずに、響きを豊かにします。
                        </p>
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin: 5px 0;">
                            <button class="action-btn" id="btn-toggle-5th" style="padding: 10px 20px; font-size: 0.9rem; font-weight: bold; width: 100%; max-width: 250px; background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%); border: 1px solid var(--border-glass);">
                                <i class="fa-solid fa-anchor" style="margin-right: 6px;"></i> 5度音を追加済み
                            </button>
                            <span style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.3; text-align: center; max-width: 320px;">
                                ルートから7フレット上の音。これで『メジャー三和音』または『マイナー三和音』の3音コード（トライアド）が完成しました！
                            </span>
                        </div>
                        <div style="background: rgba(0,0,0,0.15); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.03); font-size: 0.75rem;">
                            構成音: <strong style="color: var(--color-root);">${this.builderState.rootName}</strong> + 
                            <strong style="color: var(--color-3rd);">${this.builderState.thirdType === 'minor' ? '♭3度' : '3度'}</strong> + 
                            <strong style="color: #9ca3af;">5度音</strong>
                        </div>
                    </div>
                `;
            case 4:
                return `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <h3 style="color: var(--accent-amber); font-size: 1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span style="background: var(--accent-amber-glow); color: var(--accent-amber); border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">4</span>
                            7度を重ねてジャジーな響きへ進化
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            ジャズでは、3音の三和音ではなく、さらに1音足した「7thコード」を使います。独特のおしゃれな浮遊感や緊張感を表現できます。
                        </p>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 5px 0;">
                            <div class="preset-card-0b ${this.builderState.seventhType === 'maj7' ? 'active' : ''}" id="preset-7th-maj7" style="background: ${this.builderState.seventhType === 'maj7' ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 2px solid ${this.builderState.seventhType === 'maj7' ? 'var(--accent-amber)' : 'var(--border-glass)'}; border-radius: 10px; padding: 8px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                                <i class="fa-solid fa-sun" style="font-size: 1.1rem; color: var(--accent-amber); margin-bottom: 4px; display: block;"></i>
                                <strong style="font-size: 0.8rem; display: block; color: var(--text-primary);">Maj7</strong>
                                <span style="font-size: 0.65rem; color: var(--text-muted); display: block; margin-top: 2px; line-height: 1.2;">
                                    長7度。爽やかでおしゃれ。
                                </span>
                            </div>
                            <div class="preset-card-0b ${this.builderState.seventhType === 'min7' ? 'active' : ''}" id="preset-7th-min7" style="background: ${this.builderState.seventhType === 'min7' ? 'rgba(167, 139, 250, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 2px solid ${this.builderState.seventhType === 'min7' ? 'var(--accent-purple)' : 'var(--border-glass)'}; border-radius: 10px; padding: 8px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                                <i class="fa-solid fa-moon" style="font-size: 1.1rem; color: var(--accent-purple); margin-bottom: 4px; display: block;"></i>
                                <strong style="font-size: 0.8rem; display: block; color: var(--text-primary);">m7</strong>
                                <span style="font-size: 0.65rem; color: var(--text-muted); display: block; margin-top: 2px; line-height: 1.2;">
                                    短7度。切なく哀愁の大人の夜。
                                </span>
                            </div>
                            <div class="preset-card-0b ${this.builderState.seventhType === 'dom7' ? 'active' : ''}" id="preset-7th-dom7" style="background: ${this.builderState.seventhType === 'dom7' ? 'rgba(248, 113, 113, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 2px solid ${this.builderState.seventhType === 'dom7' ? '#f87171' : 'var(--border-glass)'}; border-radius: 10px; padding: 8px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                                <i class="fa-solid fa-bolt-lightning" style="font-size: 1.1rem; color: #f87171; margin-bottom: 4px; display: block;"></i>
                                <strong style="font-size: 0.8rem; display: block; color: var(--text-primary);">7 (ドミナント)</strong>
                                <span style="font-size: 0.65rem; color: var(--text-muted); display: block; margin-top: 2px; line-height: 1.2;">
                                    短7度。不安定なブルース感。
                                </span>
                            </div>
                        </div>
                        <div style="background: rgba(0,0,0,0.15); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.03); font-size: 0.72rem; line-height: 1.35; color: var(--text-secondary);">
                            構成コード: <strong style="color: var(--accent-amber); font-family: var(--font-heading); font-size: 0.85rem;">
                                ${this.builderState.rootName}${this.builderState.seventhType === 'maj7' ? 'maj7' : this.builderState.seventhType === 'min7' ? 'm7' : '7'}
                            </strong><br>
                            <span style="color: var(--text-muted); display: block; margin-top: 3px;">
                                指板上で <strong style="color: var(--color-7th);">青色(●)</strong> で光る7度音が追加されました。五線譜の綺麗に重なった4和音（四声）の縦並びと、指板上の配置を見比べましょう。
                            </span>
                        </div>
                    </div>
                `;
            case 5:
                return `
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <h3 style="color: var(--accent-amber); font-size: 1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span style="background: var(--accent-amber-glow); color: var(--accent-amber); border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">5</span>
                            スケール（音階）へ展開してアドリブ体験！
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.35;">
                            コード（縦の響き）を引き伸ばして、メロディを作るための「スケール（横の流れ）」へ展開します。
                        </p>
                        
                        <!-- スケールセレクター -->
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 3px 0;">
                            <div class="preset-card-0b ${this.builderState.scaleType === 'major' ? 'active' : ''}" id="preset-scale-major" style="background: ${this.builderState.scaleType === 'major' ? 'rgba(96, 165, 250, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 2px solid ${this.builderState.scaleType === 'major' ? 'var(--accent-blue)' : 'var(--border-glass)'}; border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                                <strong style="font-size: 0.82rem; display: block; color: var(--text-primary);"><i class="fa-solid fa-rainbow" style="margin-right: 4px; color: var(--accent-blue);"></i> メジャースケール</strong>
                                <span style="font-size: 0.6rem; color: var(--text-muted); display: block; margin-top: 2px; line-height: 1.2;">
                                    7音構成。すべての基本の明るい音階。
                                </span>
                            </div>
                            <div class="preset-card-0b ${this.builderState.scaleType === 'pentatonic' ? 'active' : ''}" id="preset-scale-penta" style="background: ${this.builderState.scaleType === 'pentatonic' ? 'rgba(167, 139, 250, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 2px solid ${this.builderState.scaleType === 'pentatonic' ? 'var(--accent-purple)' : 'var(--border-glass)'}; border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                                <strong style="font-size: 0.82rem; display: block; color: var(--text-primary);"><i class="fa-solid fa-wand-magic-sparkles" style="margin-right: 4px; color: var(--accent-purple);"></i> マイナーペンタ</strong>
                                <span style="font-size: 0.6rem; color: var(--text-muted); display: block; margin-top: 2px; line-height: 1.2;">
                                    5音構成。不協半音を除去したアドリブの王道。
                                </span>
                            </div>
                        </div>

                        <!-- サンドボックスプレイコントロール -->
                        <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; border: 1px solid rgba(255,255,255,0.03);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.72rem; color: var(--accent-amber); font-weight: bold;"><i class="fa-solid fa-gamepad"></i> アドリブ・サンドボックスモード</span>
                                <button class="secondary-btn" id="btn-toggle-sandbox-backing" style="padding: 4px 8px; font-size: 0.72rem; display: flex; align-items: center; gap: 4px; background: rgba(255, 255, 255, 0.05);">
                                    <i class="fa-solid fa-play"></i> 伴奏を再生
                                </button>
                            </div>
                            <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0; line-height: 1.35;">
                                指板上で光っているスケール音（オレンジ色のマーカー）を、マウスやタッチで適当にクリックしてみましょう。伴奏に合わせて弾くだけで、外さない即興ソロが体験できます！
                            </p>
                        </div>
                    </div>
                `;
        }
    }

    setupStep0BBuilder() {
        const detailPanel = document.getElementById('chord-detail-panel');
        if (!detailPanel) return;

        // Render current step UI
        detailPanel.innerHTML = this.renderBuilderStepUI();

        // Render Stepper UI
        const stepperContainer = document.getElementById('stepper-container-0b');
        if (stepperContainer) {
            stepperContainer.innerHTML = `
                <div class="stepper-0b" style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 15px;">
                    ${[1, 2, 3, 4, 5].map(num => {
                        const stepNames = ['根音', '3度', '5度', '7度', '音階'];
                        const isActive = this.builderState.step === num;
                        const isCompleted = this.builderState.step > num;
                        
                        let color = 'var(--text-muted)';
                        let background = 'rgba(255,255,255,0.02)';
                        let border = '1px solid var(--border-glass)';
                        if (isActive) {
                            color = 'var(--accent-amber)';
                            background = 'rgba(251, 191, 36, 0.1)';
                            border = '1px solid var(--accent-amber)';
                        } else if (isCompleted) {
                            color = 'var(--accent-emerald)';
                            background = 'rgba(52, 211, 153, 0.05)';
                            border = '1px solid rgba(52, 211, 153, 0.3)';
                        }
                        
                        return `
                            <div style="flex: 1; padding: 6px 4px; text-align: center; border-radius: 6px; background: ${background}; border: ${border}; color: ${color}; font-size: 0.72rem; font-weight: bold; transition: all 0.3s ease;">
                                <span style="font-family: var(--font-heading); font-size: 0.8rem; display: block; margin-bottom: 2px;">0${num}</span>
                                ${stepNames[num - 1]}
                            </div>
                        `;
                    }).join(`
                        <div style="width: 10px; height: 2px; background: rgba(255,255,255,0.1);"></div>
                    `)}
                </div>
            `;
        }

        // Sync Tab Highlight
        const tabChords = document.getElementById('tab-btn-chords');
        const tabScales = document.getElementById('tab-btn-scales');
        const chordsContainer = document.getElementById('content-chords-0b');
        const scalesContainer = document.getElementById('content-scales-0b');
        const btnPrev = document.getElementById('btn-builder-prev');
        const btnNext = document.getElementById('btn-builder-next');

        if (tabChords && tabScales && chordsContainer && scalesContainer) {
            if (this.builderState.step <= 4) {
                tabChords.style.borderBottom = '3px solid var(--accent-amber)';
                tabChords.style.color = 'var(--text-primary)';
                tabScales.style.borderBottom = '3px solid transparent';
                tabScales.style.color = 'var(--text-muted)';
                chordsContainer.style.display = 'flex';
                scalesContainer.style.display = 'none';
            } else {
                tabScales.style.borderBottom = '3px solid var(--accent-amber)';
                tabScales.style.color = 'var(--text-primary)';
                tabChords.style.borderBottom = '3px solid transparent';
                tabChords.style.color = 'var(--text-muted)';
                chordsContainer.style.display = 'none';
                scalesContainer.style.display = 'flex';
            }
        }

        if (btnPrev) {
            btnPrev.disabled = this.builderState.step === 1;
        }

        if (btnNext) {
            if (this.builderState.step === 5) {
                btnNext.innerHTML = 'ゲームを開始 <i class="fa-solid fa-gamepad"></i>';
            } else {
                btnNext.innerHTML = '次へ進む <i class="fa-solid fa-chevron-right"></i>';
            }
        }

        // Bind events
        this.bindStep0BEvents();

        // Update Fretboard/Staff
        this.updateBuilderVisualization();
    }

    bindStep0BEvents() {
        // Tab switching
        const tabChords = document.getElementById('tab-btn-chords');
        const tabScales = document.getElementById('tab-btn-scales');
        if (tabChords && tabScales) {
            tabChords.onclick = () => {
                if (this.builderState.step !== 1) {
                    this.builderState.step = 1;
                    if (window.audioEngine.isPlaying) window.audioEngine.stopBackingTrack();
                    this.setupStep0BBuilder();
                }
            };
            tabScales.onclick = () => {
                if (this.builderState.step !== 5) {
                    this.builderState.step = 5;
                    this.setupStep0BBuilder();
                }
            };
        }

        // Stepper Navigation
        const btnPrev = document.getElementById('btn-builder-prev');
        const btnNext = document.getElementById('btn-builder-next');
        if (btnPrev) {
            btnPrev.onclick = () => {
                if (this.builderState.step > 1) {
                    this.builderState.step--;
                    if (this.builderState.step < 5 && window.audioEngine.isPlaying) {
                        window.audioEngine.stopBackingTrack();
                    }
                    this.setupStep0BBuilder();
                }
            };
        }
        if (btnNext) {
            btnNext.onclick = () => {
                if (this.builderState.step < 5) {
                    this.builderState.step++;
                    this.setupStep0BBuilder();
                } else {
                    if (window.audioEngine.isPlaying) window.audioEngine.stopBackingTrack();
                    this.startFretboardHunterGame();
                }
            };
        }

        // Step 1: Root Select Buttons
        const rootBtns = document.querySelectorAll('.root-select-btn');
        rootBtns.forEach(btn => {
            btn.onclick = () => {
                const note = btn.getAttribute('data-note');
                this.builderState.rootName = note;
                this.builderState.rootMidi = this.getMidiFromName(note);
                
                // Adjust chord spelling based on root
                if (this.builderState.seventhType === 'min7') {
                    this.builderState.thirdType = 'minor';
                } else {
                    this.builderState.thirdType = 'major';
                }
                
                this.setupStep0BBuilder();
                window.audioEngine.playNote(this.builderState.rootMidi, 0.6, 0.4);
            };
        });

        // Step 2: 3rd Select Cards
        const card3rdMajor = document.getElementById('preset-3rd-major');
        const card3rdMinor = document.getElementById('preset-3rd-minor');
        if (card3rdMajor) {
            card3rdMajor.onclick = () => {
                this.builderState.thirdType = 'major';
                if (this.builderState.seventhType === 'min7') {
                    this.builderState.seventhType = 'maj7';
                }
                this.setupStep0BBuilder();
            };
        }
        if (card3rdMinor) {
            card3rdMinor.onclick = () => {
                this.builderState.thirdType = 'minor';
                this.builderState.seventhType = 'min7';
                this.setupStep0BBuilder();
            };
        }

        // Step 4: 7th Select Cards
        const card7thMaj7 = document.getElementById('preset-7th-maj7');
        const card7thMin7 = document.getElementById('preset-7th-min7');
        const card7thDom7 = document.getElementById('preset-7th-dom7');
        if (card7thMaj7) {
            card7thMaj7.onclick = () => {
                this.builderState.seventhType = 'maj7';
                this.builderState.thirdType = 'major';
                this.setupStep0BBuilder();
            };
        }
        if (card7thMin7) {
            card7thMin7.onclick = () => {
                this.builderState.seventhType = 'min7';
                this.builderState.thirdType = 'minor';
                this.setupStep0BBuilder();
            };
        }
        if (card7thDom7) {
            card7thDom7.onclick = () => {
                this.builderState.seventhType = 'dom7';
                this.builderState.thirdType = 'major';
                this.setupStep0BBuilder();
            };
        }

        // Step 5: Scale Select Cards
        const cardScaleMajor = document.getElementById('preset-scale-major');
        const cardScalePenta = document.getElementById('preset-scale-penta');
        if (cardScaleMajor) {
            cardScaleMajor.onclick = () => {
                this.builderState.scaleType = 'major';
                this.setupStep0BBuilder();
            };
        }
        if (cardScalePenta) {
            cardScalePenta.onclick = () => {
                this.builderState.scaleType = 'pentatonic';
                this.setupStep0BBuilder();
            };
        }

        // Step 5: Backing track toggle
        const btnToggleBacking = document.getElementById('btn-toggle-sandbox-backing');
        if (btnToggleBacking) {
            btnToggleBacking.onclick = () => {
                if (window.audioEngine.isPlaying) {
                    window.audioEngine.stopBackingTrack();
                    btnToggleBacking.innerHTML = '<i class="fa-solid fa-play"></i> 伴奏を再生';
                } else {
                    const progression = [
                        { chord: this.builderState.rootName + (this.builderState.scaleType === 'pentatonic' ? 'm7' : 'maj7'), rootMidi: this.builderState.rootMidi, notesMidi: this.builderState.scaleType === 'pentatonic' ? [this.builderState.rootMidi + 12, this.builderState.rootMidi + 15, this.builderState.rootMidi + 19, this.builderState.rootMidi + 22] : [this.builderState.rootMidi + 12, this.builderState.rootMidi + 16, this.builderState.rootMidi + 19, this.builderState.rootMidi + 23], beats: 4 },
                        { chord: 'Dm7', rootMidi: this.builderState.rootMidi + 2, notesMidi: [this.builderState.rootMidi + 14, this.builderState.rootMidi + 17, this.builderState.rootMidi + 21, this.builderState.rootMidi + 24], beats: 4 }
                    ];
                    btnToggleBacking.innerHTML = '<i class="fa-solid fa-square"></i> 伴奏を停止';
                    window.audioEngine.startBackingTrack(progression, (tickInfo) => {
                        // update UI if needed
                    });
                }
            };
        }
    }

    getMidiFromName(note) {
        const map = { 'C': 48, 'D': 50, 'E': 52, 'F': 53, 'G': 55, 'A': 57, 'B': 59 };
        return map[note] || 48;
    }

    calculateCurrentMidiStack() {
        const root = this.builderState.rootMidi;
        const isMinor3rd = this.builderState.thirdType === 'minor';
        const isDom7 = this.builderState.seventhType === 'dom7';
        const isMin7 = this.builderState.seventhType === 'min7';
        const step = this.builderState.step;
        
        if (step === 1) {
            return [root];
        }
        if (step === 2) {
            return [root, root + (isMinor3rd ? 3 : 4)];
        }
        if (step === 3) {
            return [root, root + (isMinor3rd ? 3 : 4), root + 7];
        }
        if (step === 4) {
            if (isMin7) {
                return [root, root + 3, root + 7, root + 10];
            } else if (isDom7) {
                return [root, root + 4, root + 7, root + 10];
            } else { // maj7
                return [root, root + 4, root + 7, root + 11];
            }
        }
        if (step === 5) {
            if (this.builderState.scaleType === 'major') {
                return [root, root + 2, root + 4, root + 5, root + 7, root + 9, root + 11];
            } else { // pentatonic
                return [root, root + 3, root + 5, root + 7, root + 10];
            }
        }
        return [root];
    }

    calculateCurrentDegrees(midiStack) {
        const root = this.builderState.rootMidi;
        const step = this.builderState.step;
        
        if (step < 5) {
            return midiStack.map((midi, idx) => {
                if (idx === 0) return 'root';
                if (idx === 1) return '3rd';
                if (idx === 2) return '5th';
                if (idx === 3) return '7th';
                return 'scale';
            });
        } else {
            const isPenta = this.builderState.scaleType === 'pentatonic';
            return midiStack.map((midi) => {
                const diff = (midi - root) % 12;
                const positiveDiff = diff >= 0 ? diff : diff + 12;
                if (positiveDiff === 0) return 'root';
                if (isPenta) {
                    if (positiveDiff === 3) return '3rd';
                    if (positiveDiff === 7) return '5th';
                    if (positiveDiff === 10) return '7th';
                } else {
                    if (positiveDiff === 4) return '3rd';
                    if (positiveDiff === 7) return '5th';
                    if (positiveDiff === 11) return '7th';
                }
                return 'scale';
            });
        }
    }

    updateBuilderVisualization() {
        if (this.currentStep !== '2') return;
        
        const midiStack = this.calculateCurrentMidiStack();
        const degrees = this.calculateCurrentDegrees(midiStack);
        
        // 1. Sync Fretboard
        this.fretboard.clearMarkers();
        this.fretboard.setDisplayMode('degrees');
        
        if (this.builderState.step === 5) {
            // Scale Mode
            const scaleNotes = midiStack.map(m => m % 12);
            for (let str = 0; str < 6; str++) {
                for (let fret = 0; fret <= 24; fret++) {
                    const midi = this.fretboard.openStrings[str] + fret;
                    if (scaleNotes.includes(midi % 12)) {
                        const diff = (midi - this.builderState.rootMidi) % 12;
                        const positiveDiff = diff >= 0 ? diff : diff + 12;
                        let type = 'scale';
                        if (positiveDiff === 0) type = 'root';
                        else if (this.builderState.scaleType === 'pentatonic') {
                            if (positiveDiff === 3) type = '3rd';
                            if (positiveDiff === 7) type = '5th';
                            if (positiveDiff === 10) type = '7th';
                        } else {
                            if (positiveDiff === 4) type = '3rd';
                            if (positiveDiff === 7) type = '5th';
                            if (positiveDiff === 11) type = '7th';
                        }
                        this.fretboard.addMarker(midi, type);
                    }
                }
            }
            this.fretboard.renderMarkers();
            this.staff.setChordNotes(midiStack, degrees);
        } else {
            // Chord Builder Mode
            midiStack.forEach((midi, idx) => {
                if (degrees[idx] === 'root') {
                    for (let str = 0; str < 6; str++) {
                        for (let fret = 0; fret <= 24; fret++) {
                            const m = this.fretboard.openStrings[str] + fret;
                            if (m % 12 === midi % 12) {
                                this.fretboard.addMarker(m, 'root');
                            }
                        }
                    }
                } else {
                    this.fretboard.addMarker(midi, degrees[idx]);
                }
            });
            this.fretboard.renderMarkers();
            this.staff.setChordNotes(midiStack, degrees);
        }
        
        // Play chord preview
        if (this.builderState.step < 5) {
            window.audioEngine.playChord(midiStack, 0.8, 0.25);
        }
    }

    getLessonContent(lessonId) {
        if (lessonId <= 6) return this.getPhase1_2Lessons(lessonId);
        if (lessonId <= 11) return this.getPhase3_4Lessons(lessonId);
        return this.getPhase5_6Lessons(lessonId);
    }

    getPhase1_2Lessons(lessonId) {
        if (lessonId === 1) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-graduation-cap"></i> Lesson 01</span>
                    <h3 class="lesson-title">ジャズセッションの全貌</h3>
                </div>
                <p class="lesson-desc">
                    ジャズセッションは、楽譜通りの演奏ではなく<strong>「リアルタイムの会話」</strong>です。<br>
                    定番曲（スタンダード）のコード進行という共通ルールをベースに、テーマ ➔ アドリブソロ ➔ 伴奏（コンピング）の順で役割を対話するように展開します。
                </p>
                <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass); font-size: 0.8rem; line-height: 1.45;">
                    <strong style="color: var(--accent-amber); display: block; margin-bottom: 5px;"><i class="fa-solid fa-list-ol"></i> 演奏の構成：</strong>
                    1. <strong>イントロ ➔ テーマ</strong>: 曲のメロディをフロント奏者が奏でます。<br>
                    2. <strong>ソロ回し</strong>: 順番にその場でフレーズを作ってアドリブします。<br>
                    3. <strong>後テーマ ➔ エンディング</strong>: 最後にもう一度メロディを奏でて終わります。
                </div>
            `;
        }
        if (lessonId === 2) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-map"></i> Lesson 02</span>
                    <h3 class="lesson-title">指板上の音名を覚えよう！</h3>
                </div>
                <p class="lesson-desc">
                    アドリブやコードを自在に操るためには、指板上の音名把握が不可欠です。<br>
                    特に<strong>「5弦と6弦」</strong>の音はすべてのコードのルート（根音）を決定するため、最優先で暗記します。
                </p>
                <div class="action-area" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                    <button class="action-btn" id="btn-start-game-noterun">
                        <i class="fa-solid fa-gamepad"></i> Note Run (音名当てゲーム) を開始
                    </button>
                    <button class="secondary-btn" id="btn-start-game-hunter" style="background: linear-gradient(135deg, var(--accent-purple) 0%, #6366f1 100%); border: none; color: white;">
                        <i class="fa-solid fa-stopwatch"></i> 音名ハント (時間制限ゲーム)
                    </button>
                    <button class="secondary-btn" id="btn-start-memorize" style="background: linear-gradient(135deg, var(--accent-emerald) 0%, #059669 100%); border: none; color: white; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);">
                        <i class="fa-solid fa-eye"></i> 見てるだけ暗記モード (オートラーニング)
                    </button>
                </div>
            `;
        }
        if (lessonId === 3) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-guitar"></i> Lesson 03</span>
                    <h3 class="lesson-title">ジャズの基本コード・フォーム (Shell Voicing)</h3>
                </div>
                <p class="lesson-desc">
                    ジャズの伴奏では、ルート(R) + 3度 + 7度だけで構築する<strong>「シェルボイシング」</strong>が基本です。低音をベースに任せ、他とぶつからないスッキリした響きを作ります。
                </p>
                <div class="voicing-explorer-card" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; flex-direction: column; gap: 6px; padding: 8px; background: rgba(0,0,0,0.15); border-radius: 8px; border: 1px solid rgba(255,255,255,0.02);">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: bold; width: 75px;">1. ルート音:</span>
                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                ${['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note => `
                                    <button class="form-root-btn ${this.chordFormState.root === note ? 'active' : ''}" data-note="${note}" style="width: 26px; height: 26px; border-radius: 50%; border: 1px solid ${this.chordFormState.root === note ? 'var(--accent-amber)' : 'var(--border-glass)'}; background: ${this.chordFormState.root === note ? 'var(--accent-amber-glow)' : 'transparent'}; color: #fff; font-weight: bold; cursor: pointer; font-size: 0.72rem; transition: all 0.2s ease;">
                                        ${note}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
                            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: bold; width: 75px;">2. ルートの弦:</span>
                            <button class="toggle-btn ${this.chordFormState.string === '6' ? 'active' : ''}" id="btn-form-string-6" style="padding: 4px 8px; font-size: 0.7rem;">6弦ルート</button>
                            <button class="toggle-btn ${this.chordFormState.string === '5' ? 'active' : ''}" id="btn-form-string-5" style="padding: 4px 8px; font-size: 0.7rem;">5弦ルート</button>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
                            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: bold; width: 75px;">3. タイプ:</span>
                            <button class="toggle-btn ${this.chordFormState.type === 'maj7' ? 'active' : ''}" id="btn-form-type-maj7" style="padding: 4px 8px; font-size: 0.7rem;">Maj7</button>
                            <button class="toggle-btn ${this.chordFormState.type === 'min7' ? 'active' : ''}" id="btn-form-type-min7" style="padding: 4px 8px; font-size: 0.7rem;">m7</button>
                            <button class="toggle-btn ${this.chordFormState.type === 'dom7' ? 'active' : ''}" id="btn-form-type-dom7" style="padding: 4px 8px; font-size: 0.7rem;">7 (ドミナント)</button>
                        </div>
                    </div>
                    <div id="chord-form-guidance" style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(251, 191, 36, 0.2); border-radius: 8px; padding: 10px; font-size: 0.75rem; line-height: 1.4;">
                    </div>
                </div>
            `;
        }
        if (lessonId === 4) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-cubes"></i> Lesson 04</span>
                    <h3 class="lesson-title">コード・トーン・ハーモナイズ</h3>
                </div>
                <p class="lesson-desc">
                    ルート、3度、5度、7度の基本の4和音にテンションを重ねる手法を学びます。<br>
                    ジャズでお洒落なサウンドを作る基礎となる「積み重ね」のバリエーションです。
                </p>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 12px; padding: 15px; text-align: center; font-size: 0.78rem;">
                    <p style="margin-bottom: 8px; color: var(--text-secondary);">4和音の音を重ねる順番を工夫するだけで、お洒落な響きが変化します。</p>
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button class="action-btn" onclick="window.audioEngine.playChord([48, 55, 59, 64], 0.8, 0.5)" style="padding: 8px 14px; font-size: 0.75rem;"><i class="fa-solid fa-volume-high"></i> Cmaj7 プレビュー</button>
                        <button class="secondary-btn" onclick="window.audioEngine.playChord([48, 55, 59, 64, 66], 0.8, 0.5)" style="padding: 8px 14px; font-size: 0.75rem;"><i class="fa-solid fa-volume-high"></i> Cmaj9 プレビュー</button>
                    </div>
                </div>
            `;
        }
        if (lessonId === 5) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-circle-nodes"></i> Lesson 05</span>
                    <h3 class="lesson-title">コードの成り立ち (度数表現)</h3>
                </div>
                <p class="lesson-desc">
                    コードが「どのような度数（距離）」の音で成り立っているか探検ましょう。<br>
                    ルートから3度、5度、7度と順に重ねることで、コードの感情や役割が構築されます。
                </p>
                <div class="lesson-interactive-panel" style="display: flex; flex-direction: column; gap: 10px;">
                    <div id="stepper-container-0b"></div>
                    <div id="chord-detail-panel" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 12px; padding: 12px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 10px;"></div>
                    <div class="builder-nav-controls" style="display: flex; justify-content: space-between; align-items: center;">
                        <button class="secondary-btn" id="btn-builder-prev" style="padding: 4px 10px; font-size: 0.75rem;"><i class="fa-solid fa-chevron-left"></i> 戻る</button>
                        <button class="action-btn" id="btn-builder-next" style="padding: 4px 10px; font-size: 0.75rem; font-weight: bold;">次へ <i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
            `;
        }
        if (lessonId === 6) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-sitemap"></i> Lesson 06</span>
                    <h3 class="lesson-title">ダイアトニック・コードを知ろう</h3>
                </div>
                <p class="lesson-desc">
                    あるキー（調）のスケールの音だけで作られる7つの基本的なコードを<strong>「ダイアトニックコード」</strong>と呼びます。<br>
                    これらを度数（ローマ数字: I, II, III...）で把握することが、ジャズのコード進行分析の鍵です。
                </p>
                <div class="lesson-interactive-panel" style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid var(--border-glass);">
                    <div style="margin-bottom: 8px; font-size: 0.72rem; color: var(--text-muted);">キー: C メジャー・ダイアトニックコード</div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;" id="diatonic-chords-list">
                        <!-- JSで動的にボタン生成 -->
                    </div>
                </div>
            `;
        }
        return '';
    }

    getPhase3_4Lessons(lessonId) {
        if (lessonId === 7) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-rainbow"></i> Lesson 07</span>
                    <h3 class="lesson-title">メジャー・スケールで鼻歌アドリブ</h3>
                </div>
                <p class="lesson-desc">
                    アドリブソロは、頭の中のメロディをそのまま指板に反映させる鼻歌のような演奏です。<br>
                    明るい曲調の基本となる<strong>Gメジャースケール</strong>の音を光らせます。伴奏を再生して、自由に弾いてみましょう！
                </p>
                <div class="lesson-interactive-panel" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 16px; border: 1px solid var(--border-glass);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.72rem; color: var(--accent-amber); font-weight: bold;"><i class="fa-solid fa-play"></i> アドリブ・サンドボックス</span>
                        <button class="action-btn" id="btn-toggle-sandbox-backing" style="padding: 6px 12px; font-size: 0.75rem;">伴奏を再生</button>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; line-height: 1.35; margin-bottom: 0;">
                        指板上のオレンジ色のスケール音（G, A, B, C, D, E, F#）を適当に鳴らすだけで、絶対に外さないオシャレなフレーズが生まれます。
                    </p>
                </div>
            `;
        }
        if (lessonId === 8) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-bolt-lightning"></i> Lesson 08</span>
                    <h3 class="lesson-title">オルタード・スケール（解決の緊張感）</h3>
                </div>
                <p class="lesson-desc">
                    ドミナント7th（G7等）のとき、あえて外れたスリリングな音を加えることで強烈な「緊張（テンション）」を作ります。<br>
                    これが次のトニック（Cmaj7等）に着地（解決）した瞬間に、極上の「安心感（解決）」をもたらします。
                </p>
                <div class="lesson-interactive-panel" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: center;">
                    <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 8px;">G7 (オルタード緊張) ➔ Cmaj7 (メジャー解決) デモ</span>
                    <button class="action-btn" id="btn-play-resolve-demo" style="padding: 8px 16px; font-size: 0.8rem;">
                        <i class="fa-solid fa-headphones"></i> 緊張➔解決デモを聴く
                    </button>
                </div>
            `;
        }
        if (lessonId === 9) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-route"></i> Lesson 09</span>
                    <h3 class="lesson-title">コード・トーン（アルペジオ）の道筋</h3>
                </div>
                <p class="lesson-desc">
                    スケールを適当に弾くだけでなく、コードの構成音（アルペジオ）をなぞるように弾くことで、コード進行に完全に寄り添った説得力のあるアドリブが可能になります。
                </p>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid var(--border-glass); font-size: 0.75rem; line-height: 1.4;">
                    指板上に <strong>Gm7 のコードトーン (G, B♭, D, F)</strong> を表示します。<br>
                    ルートから順番に指板のハイライトをクリックして、コードアルペジオの「光る道筋」をなぞってみましょう。
                </div>
            `;
        }
        if (lessonId === 10) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-gamepad"></i> Lesson 10</span>
                    <h3 class="lesson-title">ターゲットノート着地ゲーム</h3>
                </div>
                <p class="lesson-desc">
                    スケールのアドリブソロを弾きながら、コードが切り替わる瞬間だけ、そのコードの<strong>3度または7度の音（ターゲットノート）</strong>を狙って着地します。コードの色彩がグッと際立ちます。
                </p>
                <div class="lesson-interactive-panel">
                    <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid var(--border-glass); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: bold;"><i class="fa-solid fa-music"></i> 枯葉バッキング進行</span>
                            <div id="target-chord-readout" style="font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: var(--accent-amber); margin-top: 2px;">STOPPED</div>
                        </div>
                        <button class="action-btn" id="btn-toggle-target-playback" style="padding: 6px 12px; font-size: 0.75rem;">バッキング再生</button>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 12px; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: 12px;">
                        <div>
                            <span style="color: var(--text-muted);"><i class="fa-solid fa-hand-pointer"></i> 着地判定</span>
                            <div id="adlib-feedback" style="font-weight: 700; color: var(--text-secondary); margin-top: 2px;">再生を開始して、光る音をクリック！</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: var(--text-muted);">ナイス着地</span>
                            <div id="adlib-landing-count" style="font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: var(--accent-amber);">0 回</div>
                        </div>
                    </div>
                </div>
            `;
        }
        if (lessonId === 11) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-palette"></i> Lesson 11</span>
                    <h3 class="lesson-title">モード・スケールの色彩 (ドリアン＆ミクソ)</h3>
                </div>
                <p class="lesson-desc">
                    ジャズの真髄である「モード（旋法）」を学びます。コードの背景に特定の雰囲気を漂わせるスケールです。<br>
                    マイナーコードで使用される哀愁の<strong>「ドリアン」</strong>、ドミナントコードで使用されるファンキーな<strong>「ミクソリディアン」</strong>を体験しましょう。
                </p>
                <div class="lesson-interactive-panel" style="display: flex; gap: 10px; justify-content: center;">
                    <button class="action-btn" id="btn-mode-dorian" style="padding: 8px 16px; font-size: 0.8rem; background: linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%);"><i class="fa-solid fa-cloud-moon"></i> G ドリアン (哀愁)</button>
                    <button class="action-btn" id="btn-mode-mixo" style="padding: 8px 16px; font-size: 0.8rem; background: linear-gradient(135deg, var(--accent-amber) 0%, #d97706 100%);"><i class="fa-solid fa-sun"></i> G ミクソリディアン (ファンク)</button>
                </div>
            `;
        }
        return '';
    }

    getPhase5_6Lessons(lessonId) {
        if (lessonId === 12 || lessonId === 13) {
            const isNonDiatonic = lessonId === 13;
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-chart-pie"></i> Lesson ${lessonId === 12 ? '12' : '13'}</span>
                    <h3 class="lesson-title">曲を分析しよう ── ${isNonDiatonic ? 'ノンダイアトニック編' : 'ダイアトニック編'}</h3>
                </div>
                <p class="lesson-desc">
                    ${isNonDiatonic ? 'ダイアトニックコード（調性内の音）からはみ出すことで、楽曲にスリリングな推進力（セカンダリードミナント等）を与えます。' : '名曲『枯葉 (Autumn Leaves)』のコード進行を分析し、II-V-I などの基本的なダイアトニック進行の連結を学びます。'}
                </p>
                <div class="lesson-interactive-panel" style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid var(--border-glass);">
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px;">枯葉（Autumn Leaves）進行アナライズ</div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                        ${this.autumnLeavesProgression.map((prog, idx) => {
                            const isSpecial = isNonDiatonic && (prog.chord === 'D7' || prog.chord === 'G7');
                            const isNormal = !isNonDiatonic && !isSpecial;
                            const border = isSpecial ? '1px solid var(--color-root)' : (isNormal ? '1px solid var(--accent-blue)' : '1px solid var(--border-glass)');
                            return `<button class="analyse-chord-btn" data-chord-idx="${idx}" style="padding: 6px 0; border-radius: 6px; font-size: 0.72rem; background: rgba(0,0,0,0.2); border: ${border}; color: #fff; cursor: pointer;">${prog.chord}</button>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        if (lessonId === 14) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-music"></i> Lesson 14</span>
                    <h3 class="lesson-title">定番フレーズ (Lick) を覚えよう</h3>
                </div>
                <p class="lesson-desc">
                    ジャズの先輩たちが残した「II-V-I 定番フレーズ（リック）」を自分の引き出しに入れることで、手癖からジャズらしいアドリブを組み立てることができます。
                </p>
                <div class="lesson-interactive-panel" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: center;">
                    <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 8px;">枯葉 II-V-I 定番メロディフレーズ</span>
                    <button class="action-btn" id="btn-play-lick" style="padding: 8px 16px; font-size: 0.8rem;">
                        <i class="fa-solid fa-play"></i> 定番リックを再生＆ガイド表示
                    </button>
                </div>
            `;
        }
        if (lessonId === 15) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-shapes"></i> Lesson 15</span>
                    <h3 class="lesson-title">テンション・コードの押さえ方</h3>
                </div>
                <p class="lesson-desc">
                    9th や 13th などのテンションを追加し、ジャズギタリストが実際にセッションで多用するプロの実践コードフォーム（グリップ）を習得します。
                </p>
                <div class="lesson-interactive-panel" style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid var(--border-glass);">
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px;">押さえるフォームを選んで指板に表示：</div>
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button class="tension-select-btn action-btn" data-grip="g79" style="padding: 6px 12px; font-size: 0.75rem;">G7 (9th)</button>
                        <button class="tension-select-btn action-btn" data-grip="g713" style="padding: 6px 12px; font-size: 0.75rem;">G7 (13th)</button>
                        <button class="tension-select-btn action-btn" data-grip="cmaj9" style="padding: 6px 12px; font-size: 0.75rem;">Cmaj9</button>
                    </div>
                </div>
            `;
        }
        if (lessonId === 16) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-drum"></i> Lesson 16</span>
                    <h3 class="lesson-title">タイム感と実践コンピング (2・4拍)</h3>
                </div>
                <p class="lesson-desc">
                    ジャズのリズム（スウィング）は、ドラムのハイハットが鳴る<strong>2拍目・4拍目</strong>を強く意識します。ここにタイム感を合わせることでスウィング感が生まれます。
                </p>
                <div class="lesson-interactive-panel">
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass); margin-bottom: 12px;">
                        <div>
                            <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-gauge-high"></i> TEMPO CONTROL</span>
                            <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                                <input type="range" id="slider-bpm" min="70" max="160" value="110" style="width: 100px; accent-color: var(--accent-amber);">
                                <span id="label-bpm" style="font-family: var(--font-heading); font-weight: 800; color: var(--accent-amber); font-size: 1rem;">110 BPM</span>
                            </div>
                        </div>
                        <button class="action-btn" id="btn-toggle-swing" style="padding: 6px 12px; font-size: 0.75rem;">スウィング再生</button>
                    </div>
                    <div class="action-area" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="action-btn" id="btn-start-swing-tap" style="padding: 8px 14px; font-size: 0.75rem;"><i class="fa-solid fa-gamepad"></i> Swing Tap (2・4拍ゲーム)</button>
                        <button class="secondary-btn" id="btn-start-voicing-builder" style="padding: 8px 14px; font-size: 0.75rem;"><i class="fa-solid fa-gamepad"></i> Voicing Builder (コード作り)</button>
                    </div>
                </div>
            `;
        }
        if (lessonId === 17) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-compact-disc"></i> Lesson 17</span>
                    <h3 class="lesson-title">イントロ＆エンディングを作ろう</h3>
                </div>
                <p class="lesson-desc">
                    セッション曲の始まりと終わりは、あらかじめ用意された定番の常套句（イントロ＆エンディング進行）を使います。
                </p>
                <div class="lesson-interactive-panel" style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid var(--border-glass); text-align: center;">
                    <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 8px;">定番常套句デモ：</span>
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button class="action-btn" id="btn-play-intro" style="padding: 8px 14px; font-size: 0.75rem;"><i class="fa-solid fa-headphones"></i> 逆循環イントロ進行</button>
                        <button class="action-btn" id="btn-play-ending" style="padding: 8px 14px; font-size: 0.75rem;"><i class="fa-solid fa-headphones"></i> ジャズ定番エンディング</button>
                    </div>
                </div>
            `;
        }
        if (lessonId === 18) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-bolt"></i> Lesson 18</span>
                    <h3 class="lesson-title">実際の曲に挑戦 (Autumn Leaves)</h3>
                </div>
                <p class="lesson-desc">
                    いよいよバーチャルセッションです！<br>
                    ドラム、ベース、ピアノとの合奏で、指示に従ってメロディ演奏、バッキング、ソロの役割を果たします。
                </p>
                <div class="lesson-interactive-panel">
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass); margin-bottom: 12px;">
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: bold;"><i class="fa-solid fa-microphone-lines"></i> SESSION PLAYER</span>
                            <div style="display: flex; align-items: center; gap: 10px; margin-top: 2px;">
                                <span id="session-chord" style="font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: var(--accent-amber);">STOPPED</span>
                                <span id="session-bar-count" style="font-size: 0.8rem; color: var(--text-muted);">0 / 32小節</span>
                            </div>
                        </div>
                        <button class="action-btn" id="btn-start-session" style="padding: 8px 14px; font-size: 0.75rem; background: linear-gradient(135deg, var(--accent-purple) 0%, #6366f1 100%);"><i class="fa-solid fa-guitar"></i> セッション開始！</button>
                    </div>
                    <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 12px; position: relative;" id="session-band-members">
                        <div class="band-member-wrapper" id="member-bass" style="display: flex; flex-direction: column; align-items: center; position: relative;">
                            <div class="band-avatar" style="width: 44px; height: 44px; border-radius: 50%; background: rgba(59,130,246,0.15); border: 2px solid var(--accent-blue); display: flex; align-items: center; justify-content: center; color: var(--accent-blue); font-size: 1.25rem; transition: transform 0.2s;">
                                <i class="fa-solid fa-guitar"></i>
                            </div>
                            <span style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">Billy (B)</span>
                            <div class="session-bubble" id="bubble-bass">Yeah!</div>
                        </div>
                        <div class="band-member-wrapper" id="member-drums" style="display: flex; flex-direction: column; align-items: center; position: relative;">
                            <div class="band-avatar" style="width: 44px; height: 44px; border-radius: 50%; background: rgba(16,185,129,0.15); border: 2px solid var(--accent-emerald); display: flex; align-items: center; justify-content: center; color: var(--accent-emerald); font-size: 1.25rem; transition: transform 0.2s;">
                                <i class="fa-solid fa-drum"></i>
                            </div>
                            <span style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">Dan (D)</span>
                            <div class="session-bubble" id="bubble-drums">Go!</div>
                        </div>
                        <div class="band-member-wrapper" id="member-piano" style="display: flex; flex-direction: column; align-items: center; position: relative;">
                            <div class="band-avatar" style="width: 44px; height: 44px; border-radius: 50%; background: rgba(167,139,250,0.15); border: 2px solid var(--accent-purple); display: flex; align-items: center; justify-content: center; color: var(--accent-purple); font-size: 1.25rem; transition: transform 0.2s;">
                                <i class="fa-solid fa-music"></i>
                            </div>
                            <span style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">Pam (P)</span>
                            <div class="session-bubble" id="bubble-piano">Nice!</div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 12px; padding: 15px; text-align: center; margin-bottom: 10px;" id="session-role-card">
                        <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">現在の役割</span>
                        <h4 id="session-role-title" style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; margin: 5px 0; color: #fff;">待機中</h4>
                        <p id="session-role-instruction" style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">セッションを開始するとバンド演奏が始まります。</p>
                    </div>
                    <div id="session-tips-box" style="font-size: 0.75rem; color: var(--text-secondary); background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 8px 12px;">
                        <i class="fa-solid fa-circle-question" style="color: var(--accent-blue);"></i> <strong>現場のマナー</strong>: イントロからテーマの演奏中は、キーボードの音やフロントのフレーズをよく聴きながら、自分の音量を控えめにするのが美しいアンサンブル of 第一歩です。
                    </div>
                </div>
            `;
        }
        if (lessonId === 19) {
            return `
                <div class="lesson-header">
                    <span class="lesson-badge"><i class="fa-solid fa-users"></i> Lesson 19</span>
                    <h3 class="lesson-title">ジャム・セッションに参加してみよう！</h3>
                </div>
                <p class="lesson-desc">
                    ついに最終レッスンです！実際のジャムセッションでのマナー、ルール、そしてその場を楽しむ「ジャズの流儀」についてクイズで確認します。
                </p>
                <div class="lesson-interactive-panel" id="manner-quiz-area" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass);">
                    <!-- クイズが動的に表示されます -->
                </div>
            `;
        }
        return '';
    }

    attachLessonEvents() {
        // Lesson 2 音名あてゲーム
        const btnNoterun = document.getElementById('btn-start-game-noterun');
        if (btnNoterun) btnNoterun.addEventListener('click', () => this.startNoteRunGame());
        const btnHunter = document.getElementById('btn-start-game-hunter');
        if (btnHunter) btnHunter.addEventListener('click', () => this.startFretboardHunterGame());
        const btnMemorize = document.getElementById('btn-start-memorize');
        if (btnMemorize) btnMemorize.addEventListener('click', () => this.startMemorizeMode());
        const btnMemorize0a = document.getElementById('btn-start-memorize-0a');
        if (btnMemorize0a) btnMemorize0a.addEventListener('click', () => this.startMemorizeMode());

        // Lesson 3 シェルコードフォーム
        if (this.currentStep === '1' && this.currentLesson === 3) {
            this.setupChordFormExplorerEvents();
        }

        // Lesson 5 度数ビルダー
        if (this.currentStep === '2' && this.currentLesson === 5) {
            this.setupStep0BBuilder();
        }

        // Lesson 6 ダイアトニック
        if (this.currentStep === '2' && this.currentLesson === 6) {
            this.setupDiatonicLessonEvents();
        }

        // Lesson 7 アドリブサンドボックス
        const btnToggleSandbox = document.getElementById('btn-toggle-sandbox-backing');
        if (btnToggleSandbox) {
            btnToggleSandbox.addEventListener('click', () => this.toggleSandboxBacking());
        }

        // Lesson 8 緊張と解決
        const btnPlayResolve = document.getElementById('btn-play-resolve-demo');
        if (btnPlayResolve) {
            btnPlayResolve.addEventListener('click', () => this.playResolveDemo());
        }

        // Lesson 10 ターゲット着地
        const btnToggleTarget = document.getElementById('btn-toggle-target-playback');
        if (btnToggleTarget) {
            btnToggleTarget.addEventListener('click', () => this.toggleTargetPlayback());
        }

        // Lesson 11 モード
        const btnDorian = document.getElementById('btn-mode-dorian');
        if (btnDorian) btnDorian.addEventListener('click', () => this.showModeOnFretboard('dorian'));
        const btnMixo = document.getElementById('btn-mode-mixo');
        if (btnMixo) btnMixo.addEventListener('click', () => this.showModeOnFretboard('mixo'));

        // Lesson 12 & 13 アナライズ
        document.querySelectorAll('.analyse-chord-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-chord-idx'), 10);
                this.previewAnalyseChord(idx);
            });
        });

        // Lesson 14 リックお手本
        const btnPlayLick = document.getElementById('btn-play-lick');
        if (btnPlayLick) btnPlayLick.addEventListener('click', () => this.playLickDemo());

        // Lesson 15 テンション
        document.querySelectorAll('.tension-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const grip = btn.getAttribute('data-grip');
                this.showTensionGrip(grip);
            });
        });

        // Lesson 16 スウィング＆コンピング
        const btnToggleSwing = document.getElementById('btn-toggle-swing');
        if (btnToggleSwing) btnToggleSwing.addEventListener('click', () => this.toggleSwingMetronome());
        const sliderBpm = document.getElementById('slider-bpm');
        if (sliderBpm) {
            sliderBpm.addEventListener('input', (e) => {
                const bpm = parseInt(e.target.value);
                window.audioEngine.bpm = bpm;
                const label = document.getElementById('label-bpm');
                if (label) label.textContent = `${bpm} BPM`;
            });
        }
        const btnStartSwingTap = document.getElementById('btn-start-swing-tap');
        if (btnStartSwingTap) btnStartSwingTap.addEventListener('click', () => this.startSwingTapGame());
        const btnStartVoicingBuilder = document.getElementById('btn-start-voicing-builder');
        if (btnStartVoicingBuilder) btnStartVoicingBuilder.addEventListener('click', () => this.startVoicingBuilderGame());

        // Lesson 17 イントロ＆エンディング
        const btnPlayIntro = document.getElementById('btn-play-intro');
        if (btnPlayIntro) btnPlayIntro.addEventListener('click', () => this.playIntroDemo());
        const btnPlayEnding = document.getElementById('btn-play-ending');
        if (btnPlayEnding) btnPlayEnding.addEventListener('click', () => this.playEndingDemo());

        // Lesson 18 セッション
        const btnStartSession = document.getElementById('btn-start-session');
        if (btnStartSession) btnStartSession.addEventListener('click', () => this.startSessionPlayer());

        // Lesson 19 マナークイズ
        if (this.currentStep === '6' && this.currentLesson === 19) {
            this.renderMannerQuiz();
        }
    }

    /* ====================================================
       【Step 0-B】 コード積み木ロジック (GSAP & Audio)
       ==================================================== */
    playChordBuilding(chordName, midiNotes) {
        this.fretboard.clearMarkers();
        const readout = document.getElementById('chord-build-readout');
        const degreeNames = ['ルート音(根音)', '3度(コードの性質を決定)', '5度(基盤の安定度)', '7度(ジャジーな響きの主役)'];
        
        midiNotes.forEach((midi, i) => {
            setTimeout(() => {
                if (this.currentStep !== '2') return;
                
                const type = i === 0 ? 'root' : (i === 1 ? '3rd' : (i === 3 ? '7th' : 'scale'));
                this.fretboard.addMarker(midi, type);
                this.fretboard.renderMarkers();
                
                window.audioEngine.playNote(midi, 0.6, 0.4);
                
                if (readout) {
                    readout.textContent = `積み木中: ${degreeNames[i]} を追加...`;
                }
            }, i * 600);
        });

        setTimeout(() => {
            if (this.currentStep !== '2') return;
            window.audioEngine.playChord(midiNotes, 1.2, 0.3);
            if (readout) {
                readout.textContent = `完成: ${chordName} の響き！`;
            }
        }, midiNotes.length * 600);
    }

    showScaleGuide(scaleType) {
        this.fretboard.clearMarkers();
        const cMajorScale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
        const cMinorPenta = [60, 63, 65, 67, 70, 72, 75, 77, 79];
        const scaleNotes = scaleType === 'major' ? cMajorScale : cMinorPenta;
        
        const readout = document.getElementById('scale-build-readout');
        if (readout) {
            const notation = this.fretboard.notation;
            if (scaleType === 'major') {
                const noteNames = notation === 'doremi' ? 'ド、レ、ミ、ファ、ソ、ラ、シ' : 'C, D, E, F, G, A, B';
                readout.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-blue);"></i> 表示中: <strong>C メジャースケール</strong><br>` +
                    `<span style="color: var(--text-muted); font-size: 0.82rem; display: block; margin-top: 4px; line-height: 1.4;">` +
                    `構成音: ${noteNames}<br>` +
                    `特徴: 全ての音楽の基本となる明るい「ドレミファソラシ」の音階です。</span>`;
            } else {
                const noteNames = notation === 'doremi' ? 'ド、ミ♭、ファ、ソ、シ♭' : 'C, E♭, F, G, B♭';
                readout.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-amber);"></i> 表示中: <strong>C マイナーペンタトニック</strong><br>` +
                    `<span style="color: var(--text-muted); font-size: 0.82rem; display: block; margin-top: 4px; line-height: 1.4;">` +
                    `構成音: ${noteNames}<br>` +
                    `特徴: 哀愁や渋さを持つ「5つの音」による音階です。ジャズやロックのソロで最も愛用されます。</span>`;
            }
        }
        
        scaleNotes.forEach(midi => {
            const type = (midi % 12 === 0) ? 'root' : 'scale';
            this.fretboard.addMarker(midi, type);
        });
        
        this.fretboard.renderMarkers();
        
        scaleNotes.slice(0, 8).forEach((midi, i) => {
            setTimeout(() => {
                if (this.currentStep !== '2') return;
                window.audioEngine.playNote(midi, 0.3, 0.3);
            }, i * 150);
        });
    }

    /* ====================================================
       【Step 1】 メトロノーム ＆ 拍トラッカー
       ==================================================== */
    toggleSwingMetronome() {
        const btn = document.getElementById('btn-toggle-swing');
        if (!btn) return;
        
        if (window.audioEngine.isPlaying) {
            window.audioEngine.stopBackingTrack();
            btn.innerHTML = '<i class="fa-solid fa-play"></i> スウィングメトロノーム 再生';
            this.resetBeatTrackerVisuals();
        } else {
            const metronomeProgression = [
                { chord: 'SWING BEAT', rootMidi: 36, notesMidi: [], beats: 4 }
            ];
            
            btn.innerHTML = '<i class="fa-solid fa-square"></i> 停止';
            window.audioEngine.pianoEnabled = false;
            
            window.audioEngine.startBackingTrack(metronomeProgression, (tick) => {
                this.updateBeatTrackerVisuals(tick.beatIndex, tick.totalBeats);
            });
        }
    }

    /* ====================================================
       【Step 2】 バッキングコード
       ==================================================== */
    showCodeVoicingGuide(chordName, rootMidi, fretOffset, midiOffset) {
        this.fretboard.clearMarkers();
        const isPianoOn = window.audioEngine.pianoEnabled;
        
        let root = 0, third = 0, seventh = 0;
        
        // Normalize chord name
        let cleanName = chordName.replace('♭', 'b').replace('maj', 'maj');
        if (cleanName === 'Gm7' || cleanName === 'G7') {
            root = 43; // 6弦3F
            third = cleanName === 'Gm7' ? 46 : 47;
            seventh = 53;
        } else if (cleanName === 'C7' || cleanName === 'Cm7') {
            root = 48; // 5弦3F
            third = cleanName === 'Cm7' ? 51 : 52;
            seventh = 58;
        } else if (cleanName === 'F7') {
            root = 41; // 6弦1F
            third = 45;
            seventh = 51;
        } else if (cleanName.includes('Bbmaj7') || cleanName === 'Bb') {
            root = 46; // 5弦1F
            third = 50;
            seventh = 57;
        } else if (cleanName.includes('Ebmaj7') || cleanName === 'Eb') {
            root = 51; // 5弦6F
            third = 55;
            seventh = 62;
        } else if (cleanName.includes('Am7(b5)') || cleanName.includes('Am7b5') || cleanName.includes('Am7-b5')) {
            root = 45; // 6弦5F
            third = 48; // b3 (minor 3rd)
            seventh = 55; // b7 (minor 7th) (flat 5 is 54, but shell contains R, b3, b7)
        } else if (cleanName === 'D7') {
            root = 50; // 5弦5F
            third = 54;
            seventh = 60;
        }

        if (root > 0) {
            if (!isPianoOn) this.fretboard.addMarker(root, 'root');
            this.fretboard.addMarker(third, '3rd');
            this.fretboard.addMarker(seventh, '7th');
        }
        
        this.fretboard.renderMarkers();
        
        const currentStepAtLaunch = this.currentStep;
        const activeMidi = Array.from(this.fretboard.activeMarkers.keys());
        activeMidi.sort((a,b)=>a-b).forEach((midi, i) => {
            setTimeout(() => {
                if (this.currentStep !== currentStepAtLaunch) return;
                window.audioEngine.playNote(midi, 0.5, 0.4);
            }, i * 150);
        });
    }

    setupChordFormExplorerEvents() {
        // 1. Root Note buttons
        document.querySelectorAll('.form-root-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.form-root-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.chordFormState.root = btn.dataset.note;
                this.updateChordFormVisualization(true);
            });
        });

        // 2. Root String buttons
        const btnStr6 = document.getElementById('btn-form-string-6');
        const btnStr5 = document.getElementById('btn-form-string-5');
        if (btnStr6 && btnStr5) {
            btnStr6.addEventListener('click', () => {
                btnStr6.classList.add('active');
                btnStr5.classList.remove('active');
                this.chordFormState.string = '6';
                this.updateChordFormVisualization(true);
            });
            btnStr5.addEventListener('click', () => {
                btnStr5.classList.add('active');
                btnStr6.classList.remove('active');
                this.chordFormState.string = '5';
                this.updateChordFormVisualization(true);
            });
        }

        // 3. Chord Type buttons
        const btnMaj7 = document.getElementById('btn-form-type-maj7');
        const btnMin7 = document.getElementById('btn-form-type-min7');
        const btnDom7 = document.getElementById('btn-form-type-dom7');
        if (btnMaj7 && btnMin7 && btnDom7) {
            btnMaj7.addEventListener('click', () => {
                btnMaj7.classList.add('active');
                btnMin7.classList.remove('active');
                btnDom7.classList.remove('active');
                this.chordFormState.type = 'maj7';
                this.updateChordFormVisualization(true);
            });
            btnMin7.addEventListener('click', () => {
                btnMin7.classList.add('active');
                btnMaj7.classList.remove('active');
                btnDom7.classList.remove('active');
                this.chordFormState.type = 'min7';
                this.updateChordFormVisualization(true);
            });
            btnDom7.addEventListener('click', () => {
                btnDom7.classList.add('active');
                btnMaj7.classList.remove('active');
                btnMin7.classList.remove('active');
                this.chordFormState.type = 'dom7';
                this.updateChordFormVisualization(true);
            });
        }

        // Initial update
        this.updateChordFormVisualization(false);
    }

    updateChordFormVisualization(playAudio = true) {
        if (this.currentStep !== '1') return;

        const rootName = this.chordFormState.root;
        const string = this.chordFormState.string;
        const type = this.chordFormState.type;

        const rootFrets6 = { 'C': 8, 'D': 10, 'E': 12, 'F': 1, 'G': 3, 'A': 5, 'B': 7 };
        const rootFrets5 = { 'C': 3, 'D': 5, 'E': 7, 'F': 8, 'G': 10, 'A': 12, 'B': 2 };

        let rootFret, rootMidi;
        let midiStack = [];
        let degreeStack = [];
        let locKeys = [];

        if (string === '6') {
            rootFret = rootFrets6[rootName];
            rootMidi = 40 + rootFret; // 6弦開放はE2(40)
            
            let fret4, fret3;
            let midi4, midi3;

            if (type === 'maj7') {
                fret4 = rootFret + 1; // Major 7th
                fret3 = rootFret + 1; // Major 3rd
                midi4 = 50 + fret4;   // 4弦開放はD3(50)
                midi3 = 55 + fret3;   // 3弦開放はG3(55)
                midiStack = [rootMidi, midi4, midi3];
                degreeStack = ['root', '7th', '3rd'];
                locKeys = [`5-${rootFret}`, `3-${fret4}`, `2-${fret3}`];
            } else if (type === 'min7') {
                fret4 = rootFret;     // Minor 7th
                fret3 = rootFret;     // Minor 3rd
                midi4 = 50 + fret4;
                midi3 = 55 + fret3;
                midiStack = [rootMidi, midi4, midi3];
                degreeStack = ['root', '7th', '3rd'];
                locKeys = [`5-${rootFret}`, `3-${fret4}`, `2-${fret3}`];
            } else if (type === 'dom7') {
                fret4 = rootFret;     // Minor 7th
                fret3 = rootFret + 1; // Major 3rd
                midi4 = 50 + fret4;
                midi3 = 55 + fret3;
                midiStack = [rootMidi, midi4, midi3];
                degreeStack = ['root', '7th', '3rd'];
                locKeys = [`5-${rootFret}`, `3-${fret4}`, `2-${fret3}`];
            }
        } else { // 5弦ルート
            rootFret = rootFrets5[rootName];
            rootMidi = 45 + rootFret; // 5弦開放はA2(45)

            let fret4, fret3;
            let midi4, midi3;

            if (type === 'maj7') {
                fret4 = rootFret - 1; // Major 3rd
                fret3 = rootFret + 1; // Major 7th
                midi4 = 50 + fret4;   // 4弦開放はD3(50)
                midi3 = 55 + fret3;   // 3弦開放はG3(55)
                midiStack = [rootMidi, midi4, midi3];
                degreeStack = ['root', '3rd', '7th'];
                locKeys = [`4-${rootFret}`, `3-${fret4}`, `2-${fret3}`];
            } else if (type === 'min7') {
                fret4 = rootFret - 2; // Minor 3rd
                fret3 = rootFret;     // Minor 7th
                midi4 = 50 + fret4;
                midi3 = 55 + fret3;
                midiStack = [rootMidi, midi4, midi3];
                degreeStack = ['root', '3rd', '7th'];
                locKeys = [`4-${rootFret}`, `3-${fret4}`, `2-${fret3}`];
            } else if (type === 'dom7') {
                fret4 = rootFret - 1; // Major 3rd
                fret3 = rootFret;     // Minor 7th
                midi4 = 50 + fret4;
                midi3 = 55 + fret3;
                midiStack = [rootMidi, midi4, midi3];
                degreeStack = ['root', '3rd', '7th'];
                locKeys = [`4-${rootFret}`, `3-${fret4}`, `2-${fret3}`];
            }
        }

        // Fretboardのハイライト
        this.fretboard.clearMarkers();
        this.fretboard.setDisplayMode('degrees');
        
        midiStack.forEach((midiVal, idx) => {
            const locKey = locKeys[idx];
            const degree = degreeStack[idx];
            
            // ピアノ伴奏On/Offに関わらず、指板のマーカーには常にルートを表示する
            this.fretboard.addMarker(locKey, degree);
        });
        this.fretboard.renderMarkers();

        // 五線譜（スタッフ）の同期
        // 伴奏Onのときはルートを省いた2音（ガイドトーン）、Offのときは3音（シェル）
        const visibleMidis = isPianoOn ? midiStack.slice(1) : midiStack;
        const visibleDegrees = isPianoOn ? degreeStack.slice(1) : degreeStack;
        this.staff.setChordNotes(visibleMidis, visibleDegrees);

        // 運指ガイダンスの更新
        const guidanceEl = document.getElementById('chord-form-guidance');
        if (guidanceEl) {
            guidanceEl.innerHTML = this.getChordFormGuidanceHTML(string, type, rootName, rootFret);
        }

        // 音声プレビュー再生
        if (playAudio) {
            window.audioEngine.playChord(visibleMidis, 0.8, 0.25);
        }
    }

    generateChordDiagramSVG(string, type, rootFret) {
        let startFret = rootFret;
        let playedNotes = [];
        let mutedStrings = [true, true, true, true, true, true]; // index 0 to 5 (1st to 6th string)

        if (string === '6') {
            const rootFretVal = rootFret;
            const fret4 = (type === 'maj7') ? rootFretVal + 1 : rootFretVal;
            const fret3 = (type === 'min7') ? rootFretVal : rootFretVal + 1;

            startFret = rootFretVal;

            // ピアノ伴奏On/Offに関わらず、常にルートを表示する
            playedNotes.push({ stringIndex: 5, fret: rootFretVal, label: 'R', color: 'var(--color-root)' });
            mutedStrings[5] = false;
            
            playedNotes.push({ stringIndex: 3, fret: fret4, label: '7', color: 'var(--color-7th)' });
            mutedStrings[3] = false;

            playedNotes.push({ stringIndex: 2, fret: fret3, label: '3', color: 'var(--color-3rd)' });
            mutedStrings[2] = false;

            mutedStrings[4] = true;
            mutedStrings[1] = true;
            mutedStrings[0] = true;
        } else {
            const rootFretVal = rootFret;
            const fret4 = (type === 'maj7' || type === 'dom7') ? rootFretVal - 1 : rootFretVal - 2;
            const fret3 = (type === 'maj7') ? rootFretVal + 1 : rootFretVal;

            // ピアノ伴奏On/Offに関わらず、常にルートを表示する
            playedNotes.push({ stringIndex: 4, fret: rootFretVal, label: 'R', color: 'var(--color-root)' });
            mutedStrings[4] = false;

            playedNotes.push({ stringIndex: 3, fret: fret4, label: '3', color: 'var(--color-3rd)' });
            mutedStrings[3] = false;

            playedNotes.push({ stringIndex: 2, fret: fret3, label: '7', color: 'var(--color-7th)' });
            mutedStrings[2] = false;

            mutedStrings[5] = true;
            mutedStrings[1] = true;
            mutedStrings[0] = true;
        }

        // 開放弦 (fret === 0) を除いた、押弦するフレットの最小値を求める
        const fretsPressed = playedNotes.map(n => n.fret).filter(f => f > 0);
        if (fretsPressed.length > 0) {
            startFret = Math.min(...fretsPressed);
        } else {
            startFret = 1;
        }

        const width = 125;
        const height = 130;
        const topMargin = 20;
        const leftMargin = 20;
        const stringSpacing = 16;
        const fretHeight = 22;

        let svgHtml = `
            <svg width="${width}" height="${height}" style="background: rgba(0,0,0,0.18); border-radius: 12px; border: 1px solid var(--border-glass); padding: 5px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
                <text x="6" y="${topMargin + 14}" fill="var(--accent-amber)" font-size="10" font-family="var(--font-heading)" font-weight="bold">${startFret}F</text>
        `;

        for (let i = 0; i <= 4; i++) {
            const y = topMargin + i * fretHeight;
            const strokeColor = (i === 0 && startFret === 1) ? '#ffffff' : 'rgba(255,255,255,0.2)';
            const strokeWidth = (i === 0 && startFret === 1) ? 3 : 1;
            svgHtml += `<line x1="${leftMargin}" y1="${y}" x2="${leftMargin + 5 * stringSpacing}" y2="${y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
        }

        for (let i = 0; i < 6; i++) {
            const x = leftMargin + i * stringSpacing;
            svgHtml += `<line x1="${x}" y1="${topMargin}" x2="${x}" y2="${topMargin + 4 * fretHeight}" stroke="rgba(255,255,255,0.25)" stroke-width="1" />`;
        }

        for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
            const x = leftMargin + (5 - stringIdx) * stringSpacing;
            const isMuted = mutedStrings[stringIdx];
            if (isMuted) {
                svgHtml += `<text x="${x}" y="14" fill="var(--text-muted)" font-size="10" text-anchor="middle" font-family="sans-serif">×</text>`;
            }
        }

        playedNotes.forEach(note => {
            const x = leftMargin + (5 - note.stringIndex) * stringSpacing;
            
            if (note.fret === 0) {
                // 開放弦 (fret = 0) はナットの上 (フレット枠外) に中空の丸として描画する
                const y = topMargin - 8;
                svgHtml += `
                    <circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${note.color}" stroke-width="2" filter="drop-shadow(0 0 1px rgba(0,0,0,0.5))" />
                    <text x="${x}" y="${y + 2.5}" fill="var(--text-primary)" font-size="7" font-weight="bold" font-family="sans-serif" text-anchor="middle">${note.label}</text>
                `;
            } else {
                const relFret = note.fret - startFret + 1;
                const y = topMargin + (relFret - 0.5) * fretHeight;

                svgHtml += `
                    <circle cx="${x}" cy="${y}" r="6" fill="${note.color}" filter="drop-shadow(0 0 2px rgba(0,0,0,0.5))" />
                    <text x="${x}" y="${y + 3}" fill="#000" font-size="8" font-weight="bold" font-family="sans-serif" text-anchor="middle">${note.label}</text>
                `;
            }
        });

        svgHtml += `</svg>`;
        return svgHtml;
    }

    getChordFormGuidanceHTML(string, type, rootName, rootFret) {
        const chordName = `${rootName}${type === 'maj7' ? 'maj7' : type === 'min7' ? 'm7' : '7'}`;
        
        let fingering = '';
        let tip = '';
        
        if (string === '6') {
            if (type === 'maj7') {
                fingering = `
                    <li><strong>6弦 ${rootFret}F</strong>: <strong>人差し指</strong> (ルート音)</li>
                    <li><strong>5弦</strong>: 人差し指の先で軽く触れて<strong>消音 (Mute)</strong></li>
                    <li><strong>4弦 ${rootFret + 1}F</strong>: <strong>薬指</strong> (Major 7th)</li>
                    <li><strong>3弦 ${rootFret + 1}F</strong>: <strong>小指</strong> (Major 3rd)</li>
                    <li><strong>2弦・1弦</strong>: 人差し指の腹で軽く触れて<strong>消音 (Mute)</strong></li>
                `;
                tip = '人差し指（ルート音）の腹を使って、鳴らさない5弦と1-2弦をしっかりミュートするのが綺麗に響かせる最大のコツです。';
            } else if (type === 'min7') {
                fingering = `
                    <li><strong>6弦 ${rootFret}F</strong>: <strong>人差し指</strong> (ルート音)</li>
                    <li><strong>5弦</strong>: 人差し指の先で軽く触れて<strong>消音 (Mute)</strong></li>
                    <li><strong>4弦 ${rootFret}F</strong>: <strong>中指 または 薬指</strong> (Minor 7th)</li>
                    <li><strong>3弦 ${rootFret}F</strong>: <strong>薬指 または 小指</strong> (Minor 3rd)</li>
                    <li><strong>2弦・1弦</strong>: 人差し指の腹で軽く触れて<strong>消音 (Mute)</strong></li>
                `;
                tip = '中指と薬指を綺麗に並べるか、薬指1本を寝かせて4弦と3弦を同時にセーハ（ジョイント）で押さえるのが実用的です。';
            } else if (type === 'dom7') {
                fingering = `
                    <li><strong>6弦 ${rootFret}F</strong>: <strong>人差し指</strong> (ルート音)</li>
                    <li><strong>5弦</strong>: 人差し指の先で軽く触れて<strong>消音 (Mute)</strong></li>
                    <li><strong>4弦 ${rootFret}F</strong>: <strong>中指</strong> (Minor 7th)</li>
                    <li><strong>3弦 ${rootFret + 1}F</strong>: <strong>薬指</strong> (Major 3rd)</li>
                    <li><strong>2弦・1弦</strong>: 人差し指の腹で軽く触れて<strong>消音 (Mute)</strong></li>
                `;
                tip = '人差し指、中指、薬指が斜めのジグザグに並ぶブルース進行やジャズファンクの基本の形です。';
            }
        } else { // 5弦ルート
            if (type === 'maj7') {
                fingering = `
                    <li><strong>6弦</strong>: 親指をネックの上から回し込むか、人差し指の先で触れて<strong>消音 (Mute)</strong></li>
                    <li><strong>5弦 ${rootFret}F</strong>: <strong>人差し指</strong> (ルート音)</li>
                    <li><strong>4弦 ${rootFret - 1}F</strong>: <strong>中指</strong> (Major 3rd)</li>
                    <li><strong>3弦 ${rootFret + 1}F</strong>: <strong>薬指</strong> (Major 7th)</li>
                    <li><strong>2弦・1弦</strong>: 人差し指の腹で軽く触れて<strong>消音 (Mute)</strong></li>
                `;
                tip = '人差し指のルートに対して、中指は1フレット下、薬指は1フレット上と、前後非対称に指を広げる特徴的な美しいフォームです。';
            } else if (type === 'min7') {
                fingering = `
                    <li><strong>6弦</strong>: 親指または人差し指の先で触れて<strong>消音 (Mute)</strong></li>
                    <li><strong>5弦 ${rootFret}F</strong>: <strong>薬指</strong> (ルート音)</li>
                    <li><strong>4弦 ${rootFret - 2}F</strong>: <strong>人差し指</strong> (Minor 3rd)</li>
                    <li><strong>3弦 ${rootFret}F</strong>: <strong>中指</strong> (Minor 7th)</li>
                    <li><strong>2弦・1弦</strong>: 人差し指の腹で軽く触れて<strong>消音 (Mute)</strong></li>
                `;
                tip = '人差し指が2フレット低い位置に入ります。指をしっかり開いて独立させ、他の弦に触れないよう指を立てて押さえましょう。';
            } else if (type === 'dom7') {
                fingering = `
                    <li><strong>6弦</strong>: 親指または人差し指の先で触れて<strong>消音 (Mute)</strong></li>
                    <li><strong>5弦 ${rootFret}F</strong>: <strong>薬指</strong> (ルート音)</li>
                    <li><strong>4弦 ${rootFret - 1}F</strong>: <strong>人差し指</strong> (Major 3rd)</li>
                    <li><strong>3弦 ${rootFret}F</strong>: <strong>中指</strong> (Minor 7th)</li>
                    <li><strong>2弦・1弦</strong>: 人差し指の腹で軽く触れて<strong>消音 (Mute)</strong></li>
                `;
                tip = 'm7のフォームから人差し指を1フレットずらすだけでドミナント7thに変わります。3度と7度の間隔を意識してみてください。';
            }
        }

        const stringDesc = string === '6' ? '6弦ルート' : '5弦ルート';
        const roleDesc = window.audioEngine.pianoEnabled 
            ? '<strong style="color: var(--accent-blue);"><i class="fa-solid fa-keyboard"></i> ピアノ伴奏あり (ガイドトーン / 2声)</strong>: ピアノとベースがいるためルート音を省略し、コードの特徴を決める3度と7度の2音だけで静かに弾きます。' 
            : '<strong style="color: var(--color-3rd);"><i class="fa-solid fa-guitar"></i> ピアノ伴奏なし (シェル / 3声)</strong>: ベースラインを支えつつ和音を聴かせるため、低音（ルート）を含めた3声コードを弾きます。';

        return `
            <div style="display: flex; gap: 15px; align-items: flex-start; flex-wrap: wrap;">
                <!-- 左側：コードダイアグラム -->
                ${this.generateChordDiagramSVG(string, type, rootFret)}
                
                <!-- 右側：運指・解説テキスト -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 200px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; margin-bottom: 4px;">
                        <span style="font-size: 0.95rem; font-weight: bold; color: var(--accent-amber); font-family: var(--font-heading);">${chordName} コードフォーム (${stringDesc})</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px;">
                        ${roleDesc}
                    </div>
                    <ul style="margin-left: 20px; display: flex; flex-direction: column; gap: 4px; color: var(--text-secondary); list-style-type: disc;">
                        ${fingering}
                    </ul>
                    <div style="margin-top: 6px; background: rgba(251, 191, 36, 0.03); border-radius: 6px; padding: 8px; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                        <span style="color: var(--accent-amber); font-weight: bold; display: block; margin-bottom: 2px;"><i class="fa-solid fa-lightbulb"></i> 押さえ方のコツ:</span>
                        ${tip}
                    </div>
                </div>
            </div>
        `;
    }

    /* ====================================================
       【Step 3】 アドリブ ＆ ターゲットノートガイド
       ==================================================== */
    toggleTargetPlayback() {
        const btn = document.getElementById('btn-toggle-target-playback');
        if (!btn) return;
        
        if (window.audioEngine.isPlaying) {
            window.audioEngine.stopBackingTrack();
            btn.innerHTML = '<i class="fa-solid fa-play"></i> バッキング再生';
            const chordText = document.getElementById('target-chord-readout');
            if (chordText) chordText.textContent = 'STOPPED';
            this.fretboard.clearMarkers();

            // 着地練習の結果をフィードバック表示に残す
            const feedback = document.getElementById('adlib-feedback');
            if (feedback && this.adlibState) {
                feedback.textContent = this.adlibState.landings > 0
                    ? `お疲れさま！ ${this.adlibState.landings} 回のナイス着地でした 🎷`
                    : '再生を開始して、光っている音をクリックしてみよう！';
                feedback.style.color = 'var(--text-secondary)';
            }
            this.adlibState = null;
        } else {
            btn.innerHTML = '<i class="fa-solid fa-square"></i> 停止';
            window.audioEngine.pianoEnabled = true;

            // 着地判定のステートを初期化
            this.adlibState = { targets: [], isLandingWindow: false, landings: 0 };
            const landingCount = document.getElementById('adlib-landing-count');
            if (landingCount) landingCount.textContent = '0 回';

            window.audioEngine.startBackingTrack(this.autumnLeavesProgression, (tick) => {
                this.updateAdlibFretboardGuide(tick.chord, tick.beatIndex, tick.stepIndex);
            });
        }
    }

    // Step 3: アドリブ練習中の指板クリックをリアルタイム判定
    handleAdlibClick(midi, stringIndex, fret) {
        if (!this.adlibState) return;
        const pc = midi % 12;
        const gMinorPentaPitchClasses = [7, 10, 0, 2, 5]; // G, B♭, C, D, F
        const feedback = document.getElementById('adlib-feedback');
        
        const coords = this.getFretboardClientCoords(stringIndex, fret);

        if (this.adlibState.isLandingWindow && this.adlibState.targets.includes(pc)) {
            // 同じ着地ウィンドウ内の連打では加点しない
            if (!this.adlibState.windowScored) {
                this.adlibState.windowScored = true;
                this.adlibState.landings++;
                this.addScore(5);
                if (feedback) feedback.innerHTML = '🎯 ナイス着地！ ターゲットノートにヒット！ <span style="font-size: 0.8rem;">(+5 pts)</span>';
                const landingCount = document.getElementById('adlib-landing-count');
                if (landingCount) landingCount.textContent = `${this.adlibState.landings} 回`;

                // Neon feedback at click coordinate
                this.triggerNeonFeedback('Nice Landing!', coords.x, coords.y);

                // Virtual band members cheer
                if (this.currentStep === '6') {
                    const quotes = ['Nice!', 'Yeah!', 'Groovy!', 'Swing it!', 'Go ahead!', 'Cookin!', 'Sweet!'];
                    const quote = quotes[Math.floor(Math.random() * quotes.length)];
                    const members = ['bass', 'drums', 'piano'];
                    const member = members[Math.floor(Math.random() * members.length)];
                    this.triggerBandMemberSpeech(member, quote);
                }
            } else {
                if (feedback) feedback.innerHTML = '🎯 ナイス着地！';
            }
            if (feedback) {
                feedback.style.color = 'var(--accent-amber)';
                if (window.gsap) {
                    window.gsap.fromTo(feedback, { scale: 1.15 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
                }
            }
        } else if (gMinorPentaPitchClasses.includes(pc)) {
            if (feedback) {
                feedback.textContent = '♪ いい音！ ペンタトニックの音です。4拍目の赤い音を狙おう';
                feedback.style.color = '#34d399';
            }
            this.triggerNeonFeedback('Swing!', coords.x, coords.y);
        } else {
            if (feedback) {
                feedback.textContent = '⚠ スケール外の音。黄色く光る音に戻りましょう';
                feedback.style.color = '#f87171';
            }
            this.triggerNeonFeedback('Out!', coords.x, coords.y);
        }
    }

    /* ====================================================
       【Step 4】 バーチャル・セッション・シミュレーター
       ==================================================== */
    toggleSessionPlayback() {
        const btn = document.getElementById('btn-start-session');
        if (!btn) return;
        
        if (window.audioEngine.isPlaying) {
            window.audioEngine.stopBackingTrack();
            btn.innerHTML = '<i class="fa-solid fa-trumpets"></i> 🎺 セッションを開始する！';
            this.resetSessionUI();
        } else {
            btn.innerHTML = '<i class="fa-solid fa-square"></i> セッションを中断';
            window.audioEngine.pianoEnabled = true;
            window.audioEngine.startBackingTrack(this.autumnLeavesProgression, (tick) => {
                this.updateSessionStep(tick.chord, tick.beatIndex, tick.stepIndex, tick.totalBeats);
            });
        }
    }

    // (※セッションおよびその他のUI更新部分はそのまま継承しつつ、アイコンやテキストを微調整)
    updateSessionStep(chord, beatIndex, stepIndex, totalBeats) {
        const chordText = document.getElementById('session-chord');
        const barText = document.getElementById('session-bar-count');
        const roleTitle = document.getElementById('session-role-title');
        const roleDesc = document.getElementById('session-role-instruction');
        const tipsBox = document.getElementById('session-tips-box');
        
        const bar = Math.floor(totalBeats / 4) + 1;
        const totalBars = 32;
        
        if (chordText) chordText.textContent = chord;
        if (barText) barText.textContent = `${bar} / ${totalBars}小節`;

        // Swing bounce animation for band members on every beat
        const avatars = document.querySelectorAll('.band-avatar');
        avatars.forEach((avatar) => {
            const rotate = (beatIndex % 2 === 0) ? 6 : -6;
            if (window.gsap) {
                window.gsap.to(avatar, {
                    y: -4,
                    rotation: rotate,
                    duration: 0.15,
                    yoyo: true,
                    repeat: 1,
                    ease: "power1.inOut"
                });
            }
        });
        
        if (bar <= 8) {
            window.audioEngine.pianoEnabled = true;
            if (roleTitle) roleTitle.textContent = 'You: 伴奏 (脇役コンピング)';
            if (roleTitle) roleTitle.style.color = 'var(--accent-blue)';
            if (roleDesc) roleDesc.textContent = 'ピアノが伴奏しているので、ギターは3度・7度の「ガイドトーン（2声）」で音を控えめに支えましょう。';
            if (tipsBox) tipsBox.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-blue);"></i> <strong>現場のマナー</strong>: ピアノが和音を弾くときは、ギターの音数を極限まで減らして「2音」だけで小音量で刻むのがエレガントです。`;
            this.showCodeVoicingGuide(chord, 0, 0, 0);
        } 
        else if (bar <= 16) {
            if (roleTitle) roleTitle.textContent = '★ You: アドリブソロ！ ★';
            if (roleTitle) roleTitle.style.color = 'var(--accent-amber)';
            if (roleDesc) roleDesc.textContent = 'Gマイナーペンタを基本に、コードが変わる前の拍（4拍目）で赤く光るターゲットノートに着地しましょう！';
            if (tipsBox) tipsBox.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-amber);"></i> <strong>現場のマナー</strong>: アドリブは「空間（休符）」も大切です。全ての拍で弾かず、一息置いて歌うように弾いてみましょう。`;
            this.updateAdlibFretboardGuide(chord, beatIndex, stepIndex);
        } 
        else if (bar <= 24) {
            window.audioEngine.pianoEnabled = false;
            if (roleTitle) roleTitle.textContent = 'You: 伴奏 (主役バッキング)';
            if (roleTitle) roleTitle.style.color = 'var(--color-3rd)';
            if (roleDesc) roleDesc.textContent = 'ピアノがお休みです。低音を含む「シェルコード（3声）」をスウィングの4つ打ちでしっかり刻んでバンドを支えましょう。';
            if (tipsBox) tipsBox.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--color-3rd);"></i> <strong>現場のマナー</strong>: ギター伴奏だけのパートでは、ベースと息を合わせてタイトに4拍子をキープします。消音（ミュート）をうまく使いましょう。`;
            this.showCodeVoicingGuide(chord, 0, 0, 0);
        } 
        else if (bar <= 32) {
            if (roleTitle) roleTitle.textContent = 'You: メロディ (テーマ演奏)';
            if (roleTitle) roleTitle.style.color = 'var(--accent-purple)';
            if (roleDesc) roleDesc.textContent = '最後のメロディです。五線譜に表示される「枯葉」のテーマフレーズ（メロディ）を気持ちよく歌い上げましょう。';
            this.showThemeMelodyGuide(chord);
        }
        
        if (bar > totalBars) {
            window.audioEngine.stopBackingTrack();
            this.resetSessionUI();
            this.addScore(150);
            this.triggerConfetti();

            // alert()の代わりに世界観を保ったまま完走を演出
            const btn = document.getElementById('btn-start-session');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-trumpets"></i> 🎺 セッションを開始する！';
            if (roleTitle) {
                roleTitle.textContent = '🎉 セッション1コーラス完走！';
                roleTitle.style.color = 'var(--accent-amber)';
            }
            if (roleDesc) roleDesc.textContent = 'おめでとうございます！150 pts を獲得しました。伴奏・ソロ・テーマの全役割を体験できましたね。繰り返すほどセッション本番に強くなります！';
            if (window.gsap && roleTitle) {
                window.gsap.fromTo(roleTitle, { scale: 1.3 }, { scale: 1, duration: 0.6, ease: 'back.out(2)' });
            }
        }
    }

    getChordTargetDegrees(chordName) {
        if (chordName.startsWith('Cm7')) return { third: 3, seventh: 10 }; // Eb, Bb
        if (chordName.startsWith('F7')) return { third: 9, seventh: 3 };  // A, Eb
        if (chordName.startsWith('B♭maj7') || chordName.startsWith('Bbmaj7')) return { third: 2, seventh: 9 }; // D, A
        if (chordName.startsWith('E♭maj7') || chordName.startsWith('Ebmaj7')) return { third: 7, seventh: 2 }; // G, D
        if (chordName.startsWith('Am7')) return { third: 0, seventh: 7 }; // C, G
        if (chordName.startsWith('D7')) return { third: 6, seventh: 0 };  // F#, C
        if (chordName.startsWith('Gm7')) return { third: 10, seventh: 5 }; // Bb, F
        if (chordName.startsWith('G7')) return { third: 11, seventh: 5 };  // B, F
        return { third: 0, seventh: 0 };
    }

    updateBeatTrackerVisuals(beatIndex, totalBeats) {
        const dots = document.querySelectorAll('.beat-dot');
        dots.forEach((dot, idx) => {
            if (idx === beatIndex) {
                dot.classList.add('active');
                if (window.gsap) {
                    window.gsap.fromTo(dot, { scale: 1 }, { scale: 1.3, duration: 0.15, yoyo: true, repeat: 1 });
                }
            } else {
                dot.classList.remove('active');
            }
        });
        const statusEl = document.getElementById('swing-beat-status');
        if (statusEl) {
            const bar = Math.floor((totalBeats - 1) / 4) + 1;
            statusEl.textContent = `${bar}小節目 / ${beatIndex + 1}拍`;
        }
    }

    resetBeatTrackerVisuals() {
        const dots = document.querySelectorAll('.beat-dot');
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        const statusEl = document.getElementById('swing-beat-status');
        if (statusEl) {
            statusEl.textContent = '1小節目 / 4拍';
        }
    }

    updateAdlibFretboardGuide(chord, beatIndex, stepIndex) {
        this.fretboard.clearMarkers();
        const readout = document.getElementById('target-chord-readout');
        if (readout) {
            readout.textContent = `${chord} (拍: ${beatIndex + 1})`;
        }

        const gMinorPentaPitchClasses = [7, 10, 0, 2, 5]; // G, Bb, C, D, F

        if (beatIndex === 3) {
            const nextStep = (stepIndex + 1) % this.autumnLeavesProgression.length;
            const nextChord = this.autumnLeavesProgression[nextStep].chord;
            const targets = this.getChordTargetDegrees(nextChord);

            // 着地判定ウィンドウを開く (4拍目のみターゲットヒットが有効・加点は1回まで)
            if (this.adlibState) {
                this.adlibState.targets = [targets.third, targets.seventh];
                this.adlibState.isLandingWindow = true;
                this.adlibState.windowScored = false;
            }

            this.fretboard.openStrings.forEach(openMidi => {
                for (let fret = 0; fret <= this.fretboard.numFrets; fret++) {
                    const midi = openMidi + fret;
                    const pc = midi % 12;
                    if (pc === targets.third || pc === targets.seventh) {
                        this.fretboard.addMarker(midi, 'root'); 
                    }
                }
            });
            
            if (readout) {
                readout.innerHTML = `${chord} -> <span style="color: var(--color-root); animation: neon-blink 0.5s infinite alternate;">NEXT: ${nextChord} のターゲット！</span>`;
            }
        } else {
            // 着地判定ウィンドウを閉じる (1〜3拍目)
            if (this.adlibState) {
                this.adlibState.isLandingWindow = false;
            }

            this.fretboard.openStrings.forEach(openMidi => {
                for (let fret = 0; fret <= this.fretboard.numFrets; fret++) {
                    const midi = openMidi + fret;
                    const pc = midi % 12;
                    if (gMinorPentaPitchClasses.includes(pc)) {
                        const type = (pc === 7) ? 'root' : 'scale';
                        this.fretboard.addMarker(midi, type);
                    }
                }
            });
        }
        this.fretboard.renderMarkers();
    }

    showThemeMelodyGuide(chord) {
        this.fretboard.clearMarkers();
        
        const themeMelodyMap = {
            'Cm7': 72,       // C5
            'F7': 69,        // A4
            'B♭maj7': 74,    // D5
            'E♭maj7': 67,    // G4
            'Am7(♭5)': 72,   // C5
            'D7': 66,        // F#4
            'Gm7': 67,       // G4
            'G7': 71         // B4
        };
        
        const targetMidi = themeMelodyMap[chord] || 60;
        this.staff.setNoteByMidi(targetMidi, true);
        this.fretboard.addMarker(targetMidi, 'root');
        this.fretboard.renderMarkers();
    }

    resetSessionUI() {
        const chordText = document.getElementById('session-chord');
        const barText = document.getElementById('session-bar-count');
        const roleTitle = document.getElementById('session-role-title');
        const roleDesc = document.getElementById('session-role-instruction');
        const tipsBox = document.getElementById('session-tips-box');
        
        if (chordText) chordText.textContent = 'STOPPED';
        if (barText) barText.textContent = '0 / 32小節';
        if (roleTitle) {
            roleTitle.textContent = 'セッション待機中';
            roleTitle.style.color = '#fff';
        }
        if (roleDesc) roleDesc.textContent = 'ボタンを押すと、ドラム・ベース・ピアノ伴奏による「枯葉」のセッションがスタートします。';
        if (tipsBox) {
            tipsBox.innerHTML = `<i class="fa-solid fa-circle-question" style="color: var(--accent-blue);"></i> <strong>現場のマナー</strong>: イントロからテーマの演奏中は、キーボード of フロントのフレーズをよく聴きながら、自分の音量を控えめにするのが美しいアンサンブルの第一歩です。`;
        }
        this.fretboard.clearMarkers();
    }

    /* ====================================================
       【ゲーム①】 Note Run (五線譜早押しクイズ)
       ==================================================== */
    startNoteRunGame() {
        this.cleanupActiveGame();
        this.fretboard.clearMarkers();
        this.fretboard.setOctaveHighlight(null, false);
        
        // 7つの自然音（白鍵）をランダムな順序で出題
        const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const shuffledNotes = notes.sort(() => Math.random() - 0.5);

        this.gameState = {
            activeGame: 'noterun',
            score: 0, // クリアした音名数
            questionIndex: 0,
            totalQuestions: 7,
            questions: shuffledNotes,
            currentTarget: null,
            targetPitchClass: null,
            correctLocations: [],
            foundLocations: new Set(),
            isAnswering: false
        };
        const panel = document.getElementById('lesson-panel');
        panel.classList.remove('correct-pulse', 'incorrect-pulse');
        this.nextNoteRunQuestion();
    }

    nextNoteRunQuestion() {
        if (this.gameState.questionIndex >= this.gameState.totalQuestions) {
            this.endNoteRunGame();
            return;
        }

        this.gameState.isAnswering = false;

        const targetName = this.gameState.questions[this.gameState.questionIndex];
        const targetPitchClass = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(targetName);
        
        // 12フレット以内の正しい座標（stringIndex-fret）をすべて収集
        const correctLocations = [];
        this.fretboard.openStrings.forEach((openMidi, stringIndex) => {
            for (let fret = 0; fret <= 12; fret++) {
                const midi = openMidi + fret;
                if (midi % 12 === targetPitchClass) {
                    correctLocations.push(`${stringIndex}-${fret}`);
                }
            }
        });

        this.gameState.currentTarget = targetName;
        this.gameState.targetPitchClass = targetPitchClass;
        this.gameState.correctLocations = correctLocations;
        this.gameState.foundLocations.clear();

        // 出題中の音名を五線譜に表示（第4オクターブ前後の代表音を配置）
        const representativeMidis = {
            'C': 60, 'D': 62, 'E': 64, 'F': 65, 'G': 67, 'A': 69, 'B': 71
        };
        const staffMidi = representativeMidis[targetName] || 60;
        this.staff.setNoteByMidi(staffMidi, true);

        this.fretboard.clearMarkers();
        this.fretboard.setOctaveHighlight(null, false);

        this.updateNoteRunUI();
    }

    updateNoteRunUI() {
        const panel = document.getElementById('lesson-panel');
        if (!panel) return;

        const found = this.gameState.foundLocations.size;
        const total = this.gameState.correctLocations.length;

        panel.innerHTML = `
            <div class="game-play-area">
                <div class="game-hud">
                    <span class="hud-item"><i class="fa-solid fa-crosshairs"></i> Note Run | 第 <span class="value">${this.gameState.questionIndex + 1}</span> / ${this.gameState.totalQuestions} 問</span>
                    <span class="hud-item"><i class="fa-solid fa-bullseye"></i> 発見数: <span class="value">${found} / ${total}</span></span>
                    <button class="secondary-btn" id="btn-quit-noterun" style="padding: 4px 10px; font-size: 0.75rem; margin: 0; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25);">
                        <i class="fa-solid fa-xmark"></i> 中断
                    </button>
                </div>
                <div class="game-quiz-box" style="padding: 20px;">
                    <div class="quiz-instruction">
                        指板上のすべての <strong style="color: var(--accent-amber); font-size: 1.5rem;">${this.gameState.currentTarget}</strong> をクリックしてください！
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin-top: 10px;">
                        ※オクターブ違いを含め、0〜12フレットの範囲に合計 ${total} 箇所あります。<br>
                        右上の「指板全音表示: ON」にすると音名ガイドが表示されます。
                    </p>
                </div>
            </div>
        `;

        const btnQuit = document.getElementById('btn-quit-noterun');
        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                this.cleanupActiveGame();
                this.switchStep('1');
            });
        }
    }

    handleNoteRunClick(midi, stringIndex, fret) {
        if (!this.gameState || this.gameState.activeGame !== 'noterun') return;
        if (this.gameState.isAnswering) return;

        // 難易度の均一化のため、12フレットを超える位置のクリックは無効
        if (fret > 12) return;

        const locKey = `${stringIndex}-${fret}`;
        const isCorrect = (midi % 12) === this.gameState.targetPitchClass;
        const panel = document.getElementById('lesson-panel');
        const coords = this.getFretboardClientCoords(stringIndex, fret);

        if (isCorrect) {
            if (!this.gameState.foundLocations.has(locKey)) {
                this.gameState.foundLocations.add(locKey);
                
                // 正解した場所にのみ緑のマーカーを表示
                this.fretboard.addMarker(locKey, '3rd');
                this.fretboard.renderMarkers();
                this.updateNoteRunUI();
                this.triggerNeonFeedback('Swing!', coords.x, coords.y);
                
                // すべての正しい位置をハント完了したか
                if (this.gameState.foundLocations.size === this.gameState.correctLocations.length) {
                    this.gameState.isAnswering = true;
                    this.gameState.score++; // 音名クリア数を加算
                    
                    panel.classList.add('correct-pulse');
                    window.audioEngine.playCorrectSfx();
                    this.triggerConfetti(); // ゴールド紙吹雪
                    
                    setTimeout(() => {
                        panel.classList.remove('correct-pulse');
                        this.gameState.questionIndex++;
                        this.nextNoteRunQuestion();
                    }, 1000);
                }
            }
        } else {
            window.audioEngine.playIncorrectSfx();
            panel.classList.add('incorrect-pulse');
            this.triggerNeonFeedback('Out!', coords.x, coords.y);
            
            // 指板全体を揺らすシェイクエフェクト
            if (window.gsap) {
                window.gsap.fromTo('#fretboard-section', { x: -6 }, { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: "sine.inOut", onComplete: () => { window.gsap.set('#fretboard-section', { x: 0 }); } });
            }
            
            // 間違えた場所を赤色で一時表示
            this.fretboard.addMarker(locKey, 'root');
            this.fretboard.renderMarkers();
            
            setTimeout(() => {
                panel.classList.remove('incorrect-pulse');
                
                // 間違えたマーカーを除去し、見つけていた正解マーカーのみ再描画
                this.fretboard.clearMarkers();
                this.gameState.foundLocations.forEach(loc => {
                    this.fretboard.addMarker(loc, '3rd');
                });
                this.fretboard.renderMarkers();
            }, 500);
        }
    }

    endNoteRunGame() {
        const finalScore = Math.min(100, this.gameState.score * 15);
        this.addScore(finalScore);
        const passed = this.gameState.score >= 5; // 5音名クリアで合格
        if (passed) this.unlockStep('2');
        
        const panel = document.getElementById('lesson-panel');
        panel.innerHTML = `
            <div class="game-result-card">
                <h3 class="result-title">${passed ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> GAME CLEAR!' : '<i class="fa-solid fa-triangle-exclamation" style="color: var(--color-root);"></i> TRY AGAIN!'}</h3>
                <p style="margin-bottom: 20px; font-size: 0.95rem; font-weight: 500;">
                    指板音名テスト結果
                </p>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="label">クリア音名数</span>
                        <span class="value">${this.gameState.score} / ${this.gameState.totalQuestions}</span>
                    </div>
                    <div class="result-stat">
                        <span class="label">獲得スコア</span>
                        <span class="value">${finalScore} pts</span>
                    </div>
                </div>
                
                <p style="margin-bottom: 25px; font-size: 0.85rem; color: var(--text-muted); max-width: 420px; line-height: 1.5;">
                    ${passed ? '合格ライン(5音名クリア以上)をクリア！次の段階「Phase 2: コード構造＆度数」が解放されました。Lesson 03に進みましょう！' : '惜しい！5音名以上のクリアで合格となり、次の段階が解放されます。繰り返し練習してみましょう！'}
                </p>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-restart-noterun"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    <button class="secondary-btn" id="btn-exit-noterun"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-0b" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Lesson 03 へ進む</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-noterun').addEventListener('click', () => this.startNoteRunGame());
        document.getElementById('btn-exit-noterun').addEventListener('click', () => this.switchStep('1'));
        if (passed) {
            document.getElementById('btn-go-to-0b').addEventListener('click', () => {
                this.currentLesson = 3;
                this.switchStep('1');
            });
        }
    }

    // 【ゲーム②】 Fretboard Hunter (指板音名ハント)
    startFretboardHunterGame() {
        this.cleanupActiveGame();
        this.fretboard.clearMarkers();
        this.fretboard.setOctaveHighlight(null, false);
        
        const possibleTargets = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const targetName = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        const targetPitchClass = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(targetName);
        
        const correctLocations = [];
        this.fretboard.openStrings.forEach((openMidi, stringIndex) => {
            // 24フレット拡張による過度な難易度上昇を防ぐため、ハント対象は12フレットまでに限定
            for (let fret = 0; fret <= 12; fret++) {
                const midi = openMidi + fret;
                if (midi % 12 === targetPitchClass) {
                    correctLocations.push(`${stringIndex}-${fret}`);
                }
            }
        });

        this.gameState = {
            activeGame: 'hunter',
            targetName: targetName,
            targetPitchClass: targetPitchClass,
            correctLocations: correctLocations,
            foundLocations: new Set(),
            score: 0,
            timeLeft: 20
        };

        const panel = document.getElementById('lesson-panel');
        panel.classList.remove('correct-pulse', 'incorrect-pulse');
        this.updateHunterGameUI();
        
        if (this.gameInterval) clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => {
            this.gameState.timeLeft--;
            this.updateHunterGameUI();
            
            if (this.gameState.timeLeft <= 0) {
                clearInterval(this.gameInterval);
                this.endHunterGame();
            }
        }, 1000);
    }

    // (※ハントの進行UIやゲーム終了ロジックも、FontAwesomeやクリア時のスコア加算などの細部調整)
    updateHunterGameUI() {
        const panel = document.getElementById('lesson-panel');
        if (!panel) return;
        panel.innerHTML = `
            <div class="game-play-area">
                <div class="game-hud">
                    <span class="hud-item"><i class="fa-solid fa-crosshairs"></i> Hunter | ターゲット: <strong style="color: var(--accent-amber); font-size: 1.15rem;">${this.gameState.targetName}</strong></span>
                    <span class="hud-item"><i class="fa-solid fa-bullseye"></i> ハント数: <span class="value">${this.gameState.foundLocations.size} / ${this.gameState.correctLocations.length}</span></span>
                    <span class="hud-item"><i class="fa-solid fa-clock"></i> 残り: <span class="value" style="color: ${this.gameState.timeLeft <= 5 ? 'var(--color-root)' : 'var(--accent-amber)'};">${this.gameState.timeLeft} 秒</span></span>
                    <button class="secondary-btn" id="btn-quit-hunter" style="padding: 4px 10px; font-size: 0.75rem; margin: 0; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25);">
                        <i class="fa-solid fa-xmark"></i> 中断
                    </button>
                </div>
                <div class="game-quiz-box" style="padding: 20px;">
                    <div class="quiz-instruction">
                        指板上の <strong style="color: var(--accent-amber); font-size: 1.3rem;">すべての ${this.gameState.targetName}</strong> をタップしてハントしてください！
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                        ※ オクターブの幾何学パターン（Shapes）を思い出すと見つけやすいです。
                    </p>
                </div>
            </div>
        `;

        const btnQuit = document.getElementById('btn-quit-hunter');
        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                this.cleanupActiveGame();
                this.switchStep('1');
            });
        }
    }

    handleHunterClick(midi, stringIndex, fret) {
        if (!this.gameState || this.gameState.activeGame !== 'hunter') return;
        if (fret > 12) return; // 12フレットを超える位置のクリックは無効

        const locKey = `${stringIndex}-${fret}`;
        const isCorrect = (midi % 12) === this.gameState.targetPitchClass;
        const coords = this.getFretboardClientCoords(stringIndex, fret);
        
        if (isCorrect) {
            if (!this.gameState.foundLocations.has(locKey)) {
                this.gameState.foundLocations.add(locKey);
                window.audioEngine.playCorrectSfx();
                this.fretboard.addMarker(locKey, '3rd'); // 指定座標に緑マーカー表示
                this.fretboard.renderMarkers();
                this.updateHunterGameUI();
                this.triggerNeonFeedback('Swing!', coords.x, coords.y);
                
                if (this.gameState.foundLocations.size === this.gameState.correctLocations.length) {
                    clearInterval(this.gameInterval);
                    this.triggerConfetti(); // ゴールド紙吹雪
                    this.endHunterGame();
                }
            }
        } else {
            window.audioEngine.playIncorrectSfx();
            const panel = document.getElementById('lesson-panel');
            panel.classList.add('incorrect-pulse');
            this.triggerNeonFeedback('Out!', coords.x, coords.y);
            
            // 指板全体を揺らすシェイクエフェクト
            if (window.gsap) {
                window.gsap.fromTo('#fretboard-section', { x: -6 }, { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: "sine.inOut", onComplete: () => { window.gsap.set('#fretboard-section', { x: 0 }); } });
            }
            
            // 間違えた場所を赤色で一時表示
            this.fretboard.addMarker(locKey, 'root');
            this.fretboard.renderMarkers();
            
            setTimeout(() => {
                panel.classList.remove('incorrect-pulse');
                
                // 間違えたマーカーを除去し、見つけていた正解マーカーのみ再描画
                this.fretboard.clearMarkers();
                this.gameState.foundLocations.forEach(loc => {
                    this.fretboard.addMarker(loc, '3rd');
                });
                this.fretboard.renderMarkers();
            }, 500);
        }
    }

    endHunterGame() {
        const found = this.gameState.foundLocations.size;
        const total = this.gameState.correctLocations.length;
        const percentage = Math.round((found / total) * 100);
        this.addScore(percentage);
        const passed = percentage >= 80;
        if (passed) this.unlockStep('2');

        const panel = document.getElementById('lesson-panel');
        panel.innerHTML = `
            <div class="game-result-card">
                <h3 class="result-title">${passed ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> HUNTER CLEAR!' : '<i class="fa-solid fa-hourglass-end" style="color: var(--color-root);"></i> TIME UP!'}</h3>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="label">ハント率</span>
                        <span class="value">${percentage}% (${found} / ${total})</span>
                    </div>
                    <div class="result-stat">
                        <span class="label">獲得スコア</span>
                        <span class="value">${percentage} pts</span>
                    </div>
                </div>
                
                <p style="margin-bottom: 25px; font-size: 0.85rem; color: var(--text-muted); max-width: 420px; line-height: 1.5;">
                    ${passed ? '合格ライン(80%以上ハント)をクリア！「Phase 2: コード構造＆度数」が解放されました。Lesson 03に進みましょう！' : '惜しい！80%以上のハントで次の段階が解放されます。もう一度指板の幾何学パターンを意識して探してみましょう。'}
                </p>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-restart-hunter"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    <button class="secondary-btn" id="btn-exit-hunter"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-1" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Lesson 03 へ進む</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-hunter').addEventListener('click', () => this.startFretboardHunterGame());
        document.getElementById('btn-exit-hunter').addEventListener('click', () => this.switchStep('1'));
        if (passed) {
            document.getElementById('btn-go-to-1').addEventListener('click', () => {
                this.currentLesson = 3;
                this.switchStep('1');
            });
        }
    }

    // 【ゲーム③】 Voicing Builder (コード作り)
    startVoicingBuilderGame() {
        this.cleanupActiveGame();
        this.fretboard.clearMarkers();
        this.fretboard.setOctaveHighlight(null, false);
        
        const questions = [
            { chord: 'Gm7 (シェル・ボイシング)', correctMidis: [43, 46, 53], hint: 'G(ソ)・B♭(シ♭)・F(ファ)' },
            { chord: 'C7 (シェル・ボイシング)', correctMidis: [48, 52, 58], hint: 'C(ド)・E(ミ)・B♭(シ♭)' },
            { chord: 'F7 (シェル・ボイシング)', correctMidis: [41, 45, 51], hint: 'F(ファ)・A(ラ)・E♭(ミ♭)' }
        ];
        this.gameState = {
            activeGame: 'builder',
            questions: questions,
            currentQuestionIndex: 0,
            selectedMidis: new Set(),
            score: 0,
            lives: 3
        };
        this.nextBuilderQuestion();
    }

    nextBuilderQuestion() {
        if (this.gameState.currentQuestionIndex >= this.gameState.questions.length || this.gameState.lives <= 0) {
            this.endBuilderGame();
            return;
        }

        this.gameState.selectedMidis.clear();
        this.fretboard.clearMarkers();
        const q = this.gameState.questions[this.gameState.currentQuestionIndex];
        
        const panel = document.getElementById('lesson-panel');
        panel.innerHTML = `
            <div class="game-play-area">
                <div class="game-hud">
                    <span class="hud-item"><i class="fa-solid fa-circle-nodes"></i> Builder | 第 <span class="value">${this.gameState.currentQuestionIndex + 1}</span> / ${this.gameState.questions.length} 問</span>
                    <span class="hud-item"><i class="fa-solid fa-heart" style="color: var(--color-root);"></i> ライフ: <span class="value" style="color: var(--color-root);">${'❤️ '.repeat(this.gameState.lives)}</span></span>
                    <button class="secondary-btn" id="btn-quit-builder" style="padding: 4px 10px; font-size: 0.75rem; margin: 0; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25);">
                        <i class="fa-solid fa-xmark"></i> 中断
                    </button>
                </div>
                <div class="game-quiz-box" style="padding: 20px;">
                    <div class="quiz-instruction">
                        指板上で <strong style="color: var(--accent-amber); font-size: 1.3rem;">${q.chord}</strong> のフォームを組み立ててください！
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                        必要な3音（ルート、3度、7度）を指板上でタップしてください。<br>
                        構成音: <strong style="color: var(--text-secondary);">${q.hint}</strong>（オクターブ・ポジションはどこでもOK）
                    </p>
                    <p style="font-size: 0.78rem; color: var(--text-muted); text-align: center; margin-top: 8px;">
                        <i class="fa-solid fa-lightbulb" style="color: var(--accent-amber);"></i> ヒント: 右上の「指板全音表示: ON」にすると全フレットの音名が見えます。
                    </p>
                    <div id="builder-count" style="font-size: 0.95rem; color: var(--accent-amber); font-weight: 800; margin-top: 15px; text-align: center;">
                        選択中: 0 / 3 音
                    </div>
                </div>
            </div>
        `;

        const btnQuit = document.getElementById('btn-quit-builder');
        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                this.cleanupActiveGame();
                this.switchStep('5');
            });
        }
    }

    handleBuilderClick(midi) {
        if (!this.gameState || this.gameState.activeGame !== 'builder') return;
        const q = this.gameState.questions[this.gameState.currentQuestionIndex];
        
        if (this.gameState.selectedMidis.has(midi)) {
            this.gameState.selectedMidis.delete(midi);
            this.fretboard.clearMarkers();
            this.gameState.selectedMidis.forEach(m => this.fretboard.addMarker(m, 'scale'));
            this.fretboard.renderMarkers();
        } else {
            if (this.gameState.selectedMidis.size < 3) {
                this.gameState.selectedMidis.add(midi);
                this.fretboard.addMarker(midi, 'scale');
                this.fretboard.renderMarkers();
            }
        }
        
        const countText = document.getElementById('builder-count');
        if (countText) countText.textContent = `選択中: ${this.gameState.selectedMidis.size} / 3 音`;

        if (this.gameState.selectedMidis.size === 3) {
            // ピッチクラス（オクターブ不問）で判定: 構成音の理解を問うのが目的のため
            const requiredPcs = q.correctMidis.map(m => m % 12);
            const selectedPcs = Array.from(this.gameState.selectedMidis).map(m => m % 12);
            const allCorrect = requiredPcs.every(pc => selectedPcs.includes(pc))
                && selectedPcs.every(pc => requiredPcs.includes(pc));
            setTimeout(() => { this.judgeBuilderAnswer(allCorrect); }, 300);
        }
    }

    judgeBuilderAnswer(isCorrect) {
        const panel = document.getElementById('lesson-panel');
        const q = this.gameState.questions[this.gameState.currentQuestionIndex];
        
        if (isCorrect) {
            window.audioEngine.playChord(q.correctMidis, 1.2, 0.35);
            this.gameState.score++;
            panel.classList.add('correct-pulse');
            this.triggerConfetti(); // ゴールド紙吹雪
            setTimeout(() => panel.classList.remove('correct-pulse'), 400);
        } else {
            window.audioEngine.playIncorrectSfx();
            this.gameState.lives--;
            panel.classList.add('incorrect-pulse');

            // 指板全体を揺らすシェイクエフェクト
            if (window.gsap) {
                window.gsap.fromTo('#fretboard-section', { x: -6 }, { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: "sine.inOut", onComplete: () => { window.gsap.set('#fretboard-section', { x: 0 }); } });
            }

            setTimeout(() => panel.classList.remove('incorrect-pulse'), 400);

            // 間違えたまま次に進ませず、正解のお手本ポジションを見せて学べるようにする
            this.fretboard.clearMarkers();
            this.fretboard.addMarker(q.correctMidis[0], 'root');
            this.fretboard.addMarker(q.correctMidis[1], '3rd');
            this.fretboard.addMarker(q.correctMidis[2], '7th');
            this.fretboard.renderMarkers();
            const countText = document.getElementById('builder-count');
            if (countText) countText.innerHTML = '<i class="fa-solid fa-circle-info"></i> 正解はこの3音！ 色の意味: 赤=ルート / 緑=3度 / 青=7度';
            window.audioEngine.playChord(q.correctMidis, 1.0, 0.25);
        }

        this.gameState.currentQuestionIndex++;
        setTimeout(() => { this.nextBuilderQuestion(); }, isCorrect ? 800 : 2600);
    }

    endBuilderGame() {
        const total = this.gameState.questions.length;
        const correct = this.gameState.score;
        const passed = correct === total;
        this.addScore(correct * 50);
        
        if (passed) this.unlockStep('6');

        const panel = document.getElementById('lesson-panel');
        panel.innerHTML = `
            <div class="game-result-card">
                <h3 class="result-title">${passed ? '<i class="fa-solid fa-award" style="color: var(--accent-amber);"></i> VOICING MASTER!' : '<i class="fa-solid fa-heart-crack" style="color: var(--color-root);"></i> GAME OVER!'}</h3>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="label">正解数</span>
                        <span class="value">${correct} / ${total}</span>
                    </div>
                    <div class="result-stat">
                        <span class="label">獲得スコア</span>
                        <span class="value">${correct * 50} pts</span>
                    </div>
                </div>
                
                <p style="margin-bottom: 25px; font-size: 0.85rem; color: var(--text-muted); max-width: 420px; line-height: 1.5;">
                    ${passed ? '全問正解で合格！「Phase 6: 実践セッション」が解放されました。' : 'ライフが尽きるか、間違えた問題があります。全問正解で次のフェーズに進めます！練習してもう一度挑みましょう。'}
                </p>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-restart-builder"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    <button class="secondary-btn" id="btn-exit-builder"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-3" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Phase 6 へ進む</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-builder').addEventListener('click', () => this.startVoicingBuilderGame());
        document.getElementById('btn-exit-builder').addEventListener('click', () => this.switchStep('5'));
        if (passed) {
            document.getElementById('btn-go-to-3').addEventListener('click', () => this.switchStep('6'));
        }
    }

    /* ゴールド紙吹雪（Confetti）エフェクトの実行 */
    /* ====================================================
       【ゲーム】 Swing Tap (2・4拍タイミングゲーム / Step 1)
       メトロノームに合わせて2拍目・4拍目をタップし、
       ジャズの「裏拍のタイム感」を体で覚えるトレーニング。
       ==================================================== */
    startSwingTapGame() {
        this.cleanupActiveGame();
        window.audioEngine.stopBackingTrack();
        this.fretboard.clearMarkers();

        const COUNT_IN_BARS = 2;  // 最初の2小節は判定なしの練習
        const PLAY_BARS = 16;     // 本番16小節 (2・4拍 × 16 = 32ターゲット)

        this.gameState = {
            activeGame: 'swingtap',
            countInBeats: COUNT_IN_BARS * 4,
            totalBeats: (COUNT_IN_BARS + PLAY_BARS) * 4,
            totalTargets: PLAY_BARS * 2,
            perfect: 0,
            good: 0,
            miss: 0,
            combo: 0,
            maxCombo: 0,
            beatCount: 0,        // 鳴った拍の通し番号 (1-based)
            lastTickTime: 0,     // 直近の拍が鳴った時刻 (performance.now)
            lastBeatIndex: 0,
            judgedBeats: new Set() // 判定済みターゲット拍の絶対番号 (0-based)
        };

        this.renderSwingTapUI();

        // スペースキーでもタップできるように
        this.swingTapKeyHandler = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleSwingTap();
            }
        };
        document.addEventListener('keydown', this.swingTapKeyHandler);

        const metronomeProgression = [
            { chord: 'SWING', rootMidi: 36, notesMidi: [], beats: 4 }
        ];
        window.audioEngine.pianoEnabled = false;
        window.audioEngine.startBackingTrack(metronomeProgression, (tick) => this.onSwingTapTick(tick));
    }

    onSwingTapTick(tick) {
        const gs = this.gameState;
        if (!gs || gs.activeGame !== 'swingtap') return;

        gs.beatCount++;
        gs.lastTickTime = performance.now();
        gs.lastBeatIndex = tick.beatIndex;

        const absBeat = gs.beatCount - 1; // 0-based 絶対拍番号

        // 1拍前のターゲット(2・4拍目)がタップされないまま過ぎたらMISS確定
        const prevAbs = absBeat - 1;
        if (prevAbs >= gs.countInBeats && (prevAbs % 4 === 1 || prevAbs % 4 === 3) && !gs.judgedBeats.has(prevAbs)) {
            gs.judgedBeats.add(prevAbs);
            gs.miss++;
            gs.combo = 0;
            this.showSwingTapJudgement('MISS…', '#f87171');
            this.updateSwingTapStats();
        }

        // 規定の小節数を叩き終えたら終了 (最後のターゲットの判定締切を待つため+1拍)
        if (absBeat >= gs.totalBeats) {
            this.endSwingTapGame();
            return;
        }

        // ビートインジケーター更新
        const dots = document.querySelectorAll('.swingtap-dot');
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === tick.beatIndex);
        });

        const phaseEl = document.getElementById('swingtap-phase');
        if (phaseEl) {
            if (absBeat < gs.countInBeats) {
                phaseEl.textContent = `カウントイン中… リズムを感じて (${Math.floor(absBeat / 4) + 1} / 2小節)`;
            } else {
                const playBar = Math.floor((absBeat - gs.countInBeats) / 4) + 1;
                phaseEl.textContent = `本番中！ ${playBar} / ${(gs.totalBeats - gs.countInBeats) / 4} 小節`;
            }
        }
    }

    handleSwingTap() {
        const gs = this.gameState;
        if (!gs || gs.activeGame !== 'swingtap' || !gs.lastTickTime) return;

        const spbMs = (60.0 / window.audioEngine.bpm) * 1000;
        const beatsSinceTick = (performance.now() - gs.lastTickTime) / spbMs;
        const absBeatNow = (gs.beatCount - 1) + beatsSinceTick; // 現在位置 (絶対拍・小数)

        // 最寄りのターゲット拍 (絶対拍番号 % 4 が 1 または 3) を探す
        let best = null;
        [1, 3].forEach(t => {
            const base = Math.floor((absBeatNow - t) / 4) * 4 + t;
            [base, base + 4].forEach(cand => {
                const d = Math.abs(absBeatNow - cand);
                if (!best || d < best.d) best = { d, cand };
            });
        });
        if (!best) return;

        const deltaMs = best.d * spbMs;
        const isCountIn = best.cand < gs.countInBeats;

        if (gs.judgedBeats.has(best.cand)) return; // 同じ拍への2度タップは無視

        if (deltaMs <= 90) {
            if (!isCountIn) {
                gs.judgedBeats.add(best.cand);
                gs.perfect++;
                gs.combo++;
                gs.maxCombo = Math.max(gs.maxCombo, gs.combo);
            }
            this.showSwingTapJudgement(isCountIn ? 'PERFECT! (練習中)' : 'PERFECT!', 'var(--accent-amber)');
        } else if (deltaMs <= 180) {
            if (!isCountIn) {
                gs.judgedBeats.add(best.cand);
                gs.good++;
                gs.combo++;
                gs.maxCombo = Math.max(gs.maxCombo, gs.combo);
            }
            this.showSwingTapJudgement(isCountIn ? 'GOOD (練習中)' : 'GOOD', '#34d399');
        } else {
            // 大きく外れたタップ (1・3拍目を叩いている等)。ターゲットは未消化のまま残す
            if (!isCountIn) {
                gs.combo = 0;
            }
            this.showSwingTapJudgement('そこは裏拍じゃない！ 2・4拍目を狙おう', '#f87171');
        }
        this.updateSwingTapStats();
    }

    showSwingTapJudgement(text, color) {
        const el = document.getElementById('swingtap-judgement');
        if (!el) return;
        el.textContent = text;
        el.style.color = color;
        if (window.gsap) {
            window.gsap.fromTo(el, { scale: 1.25, opacity: 1 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
        }
    }

    updateSwingTapStats() {
        const gs = this.gameState;
        if (!gs) return;
        const statsEl = document.getElementById('swingtap-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <span style="color: var(--accent-amber);">PERFECT: ${gs.perfect}</span>
                <span style="color: #34d399;">GOOD: ${gs.good}</span>
                <span style="color: #f87171;">MISS: ${gs.miss}</span>
                <span style="color: var(--text-secondary);">COMBO: ${gs.combo}</span>
            `;
        }
    }

    renderSwingTapUI() {
        const panel = document.getElementById('lesson-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="game-play-area">
                <div class="game-hud">
                    <span class="hud-item"><i class="fa-solid fa-drum"></i> Swing Tap | <span id="swingtap-phase">カウントイン待機中…</span></span>
                    <button class="secondary-btn" id="btn-quit-swingtap" style="padding: 4px 10px; font-size: 0.75rem; margin: 0; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25);">
                        <i class="fa-solid fa-xmark"></i> 中断
                    </button>
                </div>
                <div class="game-quiz-box" style="padding: 20px; text-align: center;">
                    <div class="quiz-instruction" style="margin-bottom: 15px;">
                        ハイハットに合わせて <strong style="color: var(--accent-amber);">2拍目・4拍目</strong> でタップ！<br>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">下の青いパッドをタップ、または <kbd style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-glass); border-radius: 4px; padding: 1px 8px;">スペースキー</kbd> でもOK</span>
                    </div>
                    <div style="display: flex; justify-content: center; gap: 18px; margin-bottom: 18px;">
                        <div class="swingtap-dot">1</div>
                        <div class="swingtap-dot target">2</div>
                        <div class="swingtap-dot">3</div>
                        <div class="swingtap-dot target">4</div>
                    </div>
                    <div id="swingtap-judgement" style="font-family: var(--font-heading); font-weight: 800; font-size: 1.5rem; min-height: 1.6em; color: var(--text-secondary);">READY…</div>
                    <button id="swingtap-pad">
                        <i class="fa-solid fa-hand-pointer"></i> TAP!
                    </button>
                    <div id="swingtap-stats" style="display: flex; justify-content: center; gap: 20px; margin-top: 15px; font-size: 0.85rem; font-weight: 700;">
                        <span style="color: var(--accent-amber);">PERFECT: 0</span>
                        <span style="color: #34d399;">GOOD: 0</span>
                        <span style="color: #f87171;">MISS: 0</span>
                        <span style="color: var(--text-secondary);">COMBO: 0</span>
                    </div>
                </div>
            </div>
        `;

        const pad = document.getElementById('swingtap-pad');
        if (pad) {
            // clickより低遅延なpointerdownで判定する
            pad.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.handleSwingTap();
            });
        }

        const btnQuit = document.getElementById('btn-quit-swingtap');
        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                window.audioEngine.stopBackingTrack();
                this.cleanupActiveGame();
                this.switchStep('5');
            });
        }
    }

    endSwingTapGame() {
        const gs = this.gameState;
        window.audioEngine.stopBackingTrack();

        const hit = gs.perfect + gs.good;
        const accuracy = Math.round((hit / gs.totalTargets) * 100);
        const finalScore = gs.perfect * 5 + gs.good * 2;
        const passed = accuracy >= 70;
        const { maxCombo } = gs;

        this.addScore(finalScore);
        if (passed) this.unlockStep('6');
        this.cleanupActiveGame();

        if (passed) this.triggerConfetti();

        const panel = document.getElementById('lesson-panel');
        panel.innerHTML = `
            <div class="game-result-card">
                <h3 class="result-title">${passed ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> SWING MASTER!' : '<i class="fa-solid fa-triangle-exclamation" style="color: var(--color-root);"></i> TRY AGAIN!'}</h3>
                <p style="margin-bottom: 20px; font-size: 0.95rem; font-weight: 500;">
                    2・4拍タイム感テスト結果
                </p>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="label">命中率</span>
                        <span class="value">${accuracy}%</span>
                    </div>
                    <div class="result-stat">
                        <span class="label">PERFECT / GOOD / MISS</span>
                        <span class="value">${gs.perfect} / ${gs.good} / ${gs.miss}</span>
                    </div>
                    <div class="result-stat">
                        <span class="label">最大コンボ</span>
                        <span class="value">${maxCombo}</span>
                    </div>
                    <div class="result-stat">
                        <span class="label">獲得スコア</span>
                        <span class="value">${finalScore} pts</span>
                    </div>
                </div>

                <p style="margin-bottom: 25px; font-size: 0.85rem; color: var(--text-muted); max-width: 460px; line-height: 1.5;">
                    ${passed
                        ? '合格ライン(命中率70%)をクリア！この「2・4拍を体で感じる力」こそスウィングの核です。Phase 6に進みましょう。'
                        : '惜しい！命中率70%以上で合格です。コツは「1・3拍目に小さくうなずいて、2・4拍目で叩く」こと。テンポを下げて再挑戦もアリです。'}
                </p>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-restart-swingtap"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    <button class="secondary-btn" id="btn-exit-swingtap"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-2" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Phase 6 へ進む</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-swingtap').addEventListener('click', () => this.startSwingTapGame());
        document.getElementById('btn-exit-swingtap').addEventListener('click', () => this.switchStep('5'));
        if (passed) {
            document.getElementById('btn-go-to-2').addEventListener('click', () => this.switchStep('6'));
        }
    }

    triggerConfetti() {
        const colors = ['#fbbf24', '#f59e0b', '#d97706', '#60a5fa', '#34d399', '#f87171'];
        const container = document.body;
        
        for (let i = 0; i < 70; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-particle';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            // 画面中央付近を爆発の起点とする
            const startX = window.innerWidth / 2;
            const startY = window.innerHeight * 0.45;
            
            confetti.style.left = `${startX}px`;
            confetti.style.top = `${startY}px`;
            container.appendChild(confetti);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 80 + Math.random() * 250;
            const targetX = startX + Math.cos(angle) * velocity;
            const targetY = startY + Math.sin(angle) * velocity + (350 + Math.random() * 250); // 浮き上がってから重力落下
            
            if (window.gsap) {
                window.gsap.to(confetti, {
                    x: targetX - startX,
                    y: targetY - startY,
                    rotation: Math.random() * 1080,
                    opacity: 0,
                    scale: Math.random() * 1.5 + 0.4,
                    duration: 1.2 + Math.random() * 1.6,
                    ease: "power2.out",
                    onComplete: () => {
                        confetti.remove();
                    }
                });
            } else {
                confetti.remove();
            }
        }
    }

    /* ====================================================
       【共通クリーンアップ】 タイマー・ステート初期化
       ==================================================== */
    cleanupActiveGame() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        // Swing Tapゲームのスペースキーハンドラを解除
        if (this.swingTapKeyHandler) {
            document.removeEventListener('keydown', this.swingTapKeyHandler);
            this.swingTapKeyHandler = null;
        }
        // Step 3 アドリブ着地判定のステートを破棄
        this.adlibState = null;
        if (this.gameState && this.gameState.timerId) {
            clearTimeout(this.gameState.timerId);
            this.gameState.timerId = null;
        }
        // GSAPアニメーションの停止
        const bar = document.getElementById('memorize-progress-bar');
        if (bar && window.gsap) {
            window.gsap.killTweensOf(bar);
        }
        // 指板のオクターブハイライトなどを強制クリア
        if (this.fretboard) {
            this.fretboard.setOctaveHighlight(null, false);
            this.fretboard.setDisplayMode('notes');
        }
        // 五線譜の音符表示を復活させてテキストを復元
        if (this.staff && this.staff.noteEl) {
            this.staff.noteEl.style.display = 'block';
        }
        const staffReadout = document.getElementById('staff-readout');
        if (staffReadout && this.staff) {
            staffReadout.textContent = `選択された音: ${this.staff.getNoteName(this.staff.currentNote)}`;
        }
        this.gameState = null;
    }

    /* ====================================================
       【暗記モード】 見てるだけ暗記モード (オートラーニング)
       ==================================================== */
    startMemorizeMode() {
        this.cleanupActiveGame();

        this.gameState = {
            activeGame: 'memorize',
            status: 'playing', // 'playing' | 'paused'
            revealDelay: 2000, // ms
            nextDelay: 1500, // ms
            fretRange: '0-12', // '0-12' | '12-24' | '0-24'
            soundEnabled: true,
            currentString: null,
            currentFret: null,
            currentMidi: null,
            step: 'question', // 'question' | 'answer'
            timerId: null
        };

        const panel = document.getElementById('lesson-panel');
        if (panel) {
            panel.classList.remove('correct-pulse', 'incorrect-pulse');
        }

        this.nextMemorizeStep();
    }

    nextMemorizeStep() {
        if (!this.gameState || this.gameState.activeGame !== 'memorize') return;
        if (this.gameState.status === 'paused') return;

        if (this.gameState.step === 'question') {
            let minFret = 0;
            let maxFret = 12;
            if (this.gameState.fretRange === '12-24') {
                minFret = 12;
                maxFret = 24;
            } else if (this.gameState.fretRange === '0-24') {
                minFret = 0;
                maxFret = 24;
            }

            const stringIndex = Math.floor(Math.random() * 6);
            const fret = minFret + Math.floor(Math.random() * (maxFret - minFret + 1));
            const midi = this.fretboard.openStrings[stringIndex] + fret;

            this.gameState.currentString = stringIndex;
            this.gameState.currentFret = fret;
            this.gameState.currentMidi = midi;

            // クエスチョン時は指板のオクターブハイライトをクリアしておく
            this.fretboard.setOctaveHighlight(null, false);
            this.fretboard.clearMarkers();
            
            // 指板上の重複する同名音位置に複数の丸が表示されないよう、特定の位置（locKey）にのみ question を配置する
            const locKey = `${stringIndex}-${fret}`;
            this.fretboard.addMarker(locKey, 'question');
            this.fretboard.renderMarkers();

            // クエスチョン時は五線譜の音符と読み上げ文字列を非表示にする
            if (this.staff && this.staff.noteEl) {
                this.staff.noteEl.style.display = 'none';
            }
            const staffReadout = document.getElementById('staff-readout');
            if (staffReadout) {
                const stringNames = ['1弦', '2弦', '3弦', '4弦', '5弦', '6弦'];
                const stringLabel = stringNames[stringIndex] || `${stringIndex + 1}弦`;
                staffReadout.textContent = `${stringLabel} ${fret}フレットの音名は何でしょう？`;
            }

            this.updateMemorizeUI();

            this.gameState.timerId = setTimeout(() => {
                if (!this.gameState || this.gameState.activeGame !== 'memorize') return;
                this.gameState.step = 'answer';
                this.nextMemorizeStep();
            }, this.gameState.revealDelay);

        } else if (this.gameState.step === 'answer') {
            const midi = this.gameState.currentMidi;
            const locKey = `${this.gameState.currentString}-${this.gameState.currentFret}`;

            this.fretboard.clearMarkers();
            this.fretboard.addMarker(locKey, 'root');
            this.fretboard.renderMarkers();

            if (this.gameState.soundEnabled) {
                window.audioEngine.playNote(midi, 0.5, 0.4);
            }

            // アンサー表示時に五線譜の音符を復活させて表示
            if (this.staff) {
                if (this.staff.noteEl) {
                    this.staff.noteEl.style.display = 'block';
                }
                this.staff.setNoteByMidi(midi, true);
            }
            const staffReadout = document.getElementById('staff-readout');
            if (staffReadout) {
                const notationName = this.fretboard.getNoteNameFromMidi(midi);
                const stringNames = ['1弦', '2弦', '3弦', '4弦', '5弦', '6弦'];
                const stringLabel = stringNames[this.gameState.currentString] || `${this.gameState.currentString + 1}弦`;
                staffReadout.textContent = `${stringLabel} ${this.gameState.currentFret}フレットの音名は「 ${notationName} 」です！`;
            }

            this.updateMemorizeUI();

            this.gameState.timerId = setTimeout(() => {
                if (!this.gameState || this.gameState.activeGame !== 'memorize') return;
                this.gameState.step = 'question';
                this.nextMemorizeStep();
            }, this.gameState.nextDelay);
        }
    }

    updateMemorizeUI() {
        const panel = document.getElementById('lesson-panel');
        if (!panel) return;

        const isPaused = this.gameState.status === 'paused';
        const isQuestion = this.gameState.step === 'question';
        const currentString = this.gameState.currentString + 1;
        const currentFret = this.gameState.currentFret;
        const notationName = this.fretboard.getNoteNameFromMidi(this.gameState.currentMidi);

        const stringNames = ['1弦', '2弦', '3弦', '4弦', '5弦', '6弦'];
        const stringLabel = stringNames[this.gameState.currentString] || `${currentString}弦`;

        panel.innerHTML = `
            <div class="game-play-area">
                <div class="game-hud" style="background: rgba(15, 23, 42, 0.65);">
                    <span class="hud-item"><i class="fa-solid fa-graduation-cap"></i> 暗記モード | オートラーニング</span>
                    <span class="hud-item"><i class="fa-solid fa-guitar"></i> 位置: <span class="value" style="color: var(--accent-blue);">${stringLabel} ${currentFret}F</span></span>
                    <span class="hud-item"><i class="fa-solid fa-circle-play"></i> 状態: <span class="value" style="color: ${isPaused ? 'var(--text-muted)' : 'var(--accent-emerald)'}">${isPaused ? '一時停止中' : '自動実行中'}</span></span>
                </div>

                <div class="game-quiz-box" style="padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; text-align: center;">
                        ${isQuestion ? `
                            <div style="font-size: 1.1rem; color: #fff; font-weight: 600; margin-bottom: 5px;">
                                <span style="color: var(--accent-blue);">${stringLabel}</span> の <span style="color: var(--accent-amber);">${currentFret}フレット</span> は？
                            </div>
                            <div style="font-size: 3rem; font-weight: 800; color: var(--accent-purple); filter: drop-shadow(0 0 10px var(--accent-purple-glow)); line-height: 1; margin: 10px 0;">?</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">数秒後に音名が表示されます...</div>
                        ` : `
                            <div style="font-size: 1.1rem; color: var(--text-muted); font-weight: 600; margin-bottom: 5px;">
                                <span style="color: var(--accent-blue);">${stringLabel}</span> の <span style="color: var(--accent-amber);">${currentFret}フレット</span>
                            </div>
                            <div style="font-size: 3.5rem; font-weight: 800; color: var(--color-root); filter: drop-shadow(0 0 15px rgba(248, 113, 113, 0.4)); line-height: 1; margin: 5px 0; animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${notationName}</div>
                            <div style="font-size: 0.8rem; color: var(--accent-amber); font-weight: 600; display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                                <i class="fa-solid fa-volume-high"></i> 音声再生中
                            </div>
                        `}
                    </div>

                    <div style="width: 100%; max-width: 400px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; position: relative;">
                        <div id="memorize-progress-bar" style="height: 100%; width: 0%; background: var(--accent-blue); transition: width 0.1s linear;"></div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 15px; width: 100%; max-width: 500px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 12px; padding: 15px; margin-top: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-arrows-left-right"></i> フレット範囲</label>
                                <select id="select-memorize-range" style="background: rgba(0,0,0,0.5); border: 1px solid var(--border-glass); color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; outline: none; cursor: pointer;">
                                    <option value="0-12" ${this.gameState.fretRange === '0-12' ? 'selected' : ''}>0 〜 12 フレット (基本)</option>
                                    <option value="12-24" ${this.gameState.fretRange === '12-24' ? 'selected' : ''}>12 〜 24 フレット (ハイフレット)</option>
                                    <option value="0-24" ${this.gameState.fretRange === '0-24' ? 'selected' : ''}>すべて (0 〜 24 フレット)</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-gauge-high"></i> 表示スピード</label>
                                <select id="select-memorize-speed" style="background: rgba(0,0,0,0.5); border: 1px solid var(--border-glass); color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; outline: none; cursor: pointer;">
                                    <option value="slow" ${this.gameState.revealDelay === 3000 ? 'selected' : ''}>ゆっくり (問題3秒 / 答え2秒)</option>
                                    <option value="normal" ${this.gameState.revealDelay === 2000 ? 'selected' : ''}>ふつう (問題2秒 / 答え1.5秒)</option>
                                    <option value="fast" ${this.gameState.revealDelay === 1000 ? 'selected' : ''}>はやい (問題1秒 / 答え1秒)</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px solid var(--border-glass); padding-top: 12px; margin-top: 5px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-muted); cursor: pointer;">
                                <input type="checkbox" id="checkbox-memorize-sound" ${this.gameState.soundEnabled ? 'checked' : ''} style="accent-color: var(--accent-amber); cursor: pointer;">
                                音声を鳴らす
                            </label>

                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button class="secondary-btn" id="btn-memorize-toggle" style="padding: 6px 12px; font-size: 0.8rem;">
                                    <i class="fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}"></i> ${isPaused ? '再開' : '一時停止'}
                                </button>
                                <button class="secondary-btn" id="btn-memorize-next" style="padding: 6px 12px; font-size: 0.8rem;">
                                    <i class="fa-solid fa-forward"></i> スキップ
                                </button>
                            </div>
                        </div>
                    </div>

                    <button class="action-btn" id="btn-memorize-exit" style="background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); box-shadow: none; font-size: 0.85rem; padding: 8px 16px; margin-top: 5px;">
                        <i class="fa-solid fa-door-open"></i> 暗記モードを終了して解説に戻る
                    </button>
                </div>
            </div>
        `;

        this.attachMemorizeEvents();
        this.animateProgressBar();
    }

    attachMemorizeEvents() {
        const selectRange = document.getElementById('select-memorize-range');
        if (selectRange) {
            selectRange.addEventListener('change', (e) => {
                this.gameState.fretRange = e.target.value;
                if (this.gameState.status !== 'paused') {
                    if (this.gameState.timerId) clearTimeout(this.gameState.timerId);
                    this.gameState.step = 'question';
                    this.nextMemorizeStep();
                }
            });
        }

        const selectSpeed = document.getElementById('select-memorize-speed');
        if (selectSpeed) {
            selectSpeed.addEventListener('change', (e) => {
                const speed = e.target.value;
                if (speed === 'slow') {
                    this.gameState.revealDelay = 3000;
                    this.gameState.nextDelay = 2000;
                } else if (speed === 'normal') {
                    this.gameState.revealDelay = 2000;
                    this.gameState.nextDelay = 1500;
                } else if (speed === 'fast') {
                    this.gameState.revealDelay = 1000;
                    this.gameState.nextDelay = 1000;
                }
                if (this.gameState.status !== 'paused') {
                    if (this.gameState.timerId) clearTimeout(this.gameState.timerId);
                    this.nextMemorizeStep();
                }
            });
        }

        const checkboxSound = document.getElementById('checkbox-memorize-sound');
        if (checkboxSound) {
            checkboxSound.addEventListener('change', (e) => {
                this.gameState.soundEnabled = e.target.checked;
            });
        }

        const btnToggle = document.getElementById('btn-memorize-toggle');
        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                if (this.gameState.status === 'playing') {
                    this.gameState.status = 'paused';
                    if (this.gameState.timerId) clearTimeout(this.gameState.timerId);
                    const bar = document.getElementById('memorize-progress-bar');
                    if (bar && window.gsap) window.gsap.killTweensOf(bar);
                    this.updateMemorizeUI();
                } else {
                    this.gameState.status = 'playing';
                    this.nextMemorizeStep();
                }
            });
        }

        const btnNext = document.getElementById('btn-memorize-next');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (this.gameState.timerId) clearTimeout(this.gameState.timerId);
                this.gameState.step = 'question';
                this.gameState.status = 'playing';
                this.nextMemorizeStep();
            });
        }

        const btnExit = document.getElementById('btn-memorize-exit');
        if (btnExit) {
            btnExit.addEventListener('click', () => {
                if (this.gameState.timerId) clearTimeout(this.gameState.timerId);
                this.cleanupActiveGame();
                this.switchStep('1');
            });
        }
    }

    animateProgressBar() {
        const bar = document.getElementById('memorize-progress-bar');
        if (!bar || !this.gameState || this.gameState.activeGame !== 'memorize' || this.gameState.status === 'paused') return;

        const duration = this.gameState.step === 'question' ? this.gameState.revealDelay : this.gameState.nextDelay;

        if (window.gsap) {
            window.gsap.killTweensOf(bar);
            window.gsap.fromTo(bar, { width: '0%' }, { width: '100%', duration: duration / 1000, ease: 'none' });
        }
    }

    /* ====================================================
       【19 Lesson リニューアル・プレミアムヘルパー群】
       ==================================================== */
    syncInteractiveStageForLesson(lessonId) {
        if (!this.fretboard || !this.staff) return;
        this.fretboard.clearMarkers();
        
        switch (lessonId) {
            case 1:
                this.fretboard.addMarker(60, 'root');
                this.fretboard.renderMarkers();
                this.staff.setNoteByMidi(60, true);
                break;
            case 2:
                break;
            case 3:
                this.updateChordFormVisualization(false);
                break;
            case 4:
                this.fretboard.addMarker(48, 'root');
                this.fretboard.addMarker(55, 'scale');
                this.fretboard.addMarker(59, 'scale');
                this.fretboard.addMarker(64, 'scale');
                this.fretboard.renderMarkers();
                this.staff.setNoteByMidi(60, true);
                break;
            case 5:
                break;
            case 6:
                break;
            case 7:
                this.highlightScaleOnFretboard([55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79]);
                break;
            case 8:
                this.highlightScaleOnFretboard([55, 56, 58, 59, 61, 63, 65, 67, 68, 70, 71, 73, 75, 77, 79]);
                break;
            case 9:
                this.highlightScaleOnFretboard([55, 58, 62, 65, 67, 70, 74, 77, 79]);
                break;
            case 10:
                this.highlightScaleOnFretboard([55, 58, 60, 62, 65, 67, 70, 72, 74, 77, 79]);
                break;
            case 11:
                break;
            case 12:
            case 13:
                this.showCodeVoicingGuide('Cm7', 48, 0, 0);
                break;
            case 14:
                break;
            case 15:
                this.showTensionGrip('g79');
                break;
            case 16:
                break;
            case 17:
                break;
            case 18:
                break;
            case 19:
                break;
        }
    }

    setupDiatonicLessonEvents() {
        const container = document.getElementById('diatonic-chords-list');
        if (!container) return;

        const diatonicChords = [
            { name: 'Cmaj7', roman: 'Imaj7', notes: [60, 64, 67, 71] },
            { name: 'Dm7', roman: 'IIm7', notes: [62, 65, 69, 72] },
            { name: 'Em7', roman: 'IIIm7', notes: [64, 67, 71, 74] },
            { name: 'Fmaj7', roman: 'IVmaj7', notes: [53, 57, 60, 64] },
            { name: 'G7', roman: 'V7', notes: [55, 59, 62, 65] },
            { name: 'Am7', roman: 'VIm7', notes: [57, 60, 64, 67] },
            { name: 'Bm7(b5)', roman: 'VIIm7(b5)', notes: [59, 62, 65, 69] }
        ];

        container.innerHTML = diatonicChords.map((chord, idx) => `
            <button class="action-btn diatonic-chord-btn" data-idx="${idx}" style="padding: 8px 4px; font-size: 0.72rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
                <span style="font-weight: 800; color: #fff;">${chord.name}</span>
                <span style="font-size: 0.6rem; color: var(--text-muted); font-family: monospace;">${chord.roman}</span>
            </button>
        `).join('');

        container.querySelectorAll('.diatonic-chord-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                this.previewDiatonicChord(idx, diatonicChords);
            });
        });
    }

    previewDiatonicChord(idx, diatonicChords) {
        const chord = diatonicChords[idx];
        if (!chord) return;

        this.fretboard.clearMarkers();
        chord.notes.forEach((midi, i) => {
            const type = (i === 0) ? 'root' : 'scale';
            this.fretboard.addMarker(midi, type);
        });
        this.fretboard.renderMarkers();

        if (this.staff) {
            this.staff.setNoteByMidi(chord.notes[0], true);
        }

        window.audioEngine.playChord(chord.notes, 1.0, 0.4);

        const btn = document.querySelector(`.diatonic-chord-btn[data-idx="${idx}"]`);
        if (btn) {
            const rect = btn.getBoundingClientRect();
            this.triggerNeonFeedback(`Nice: ${chord.name}!`, rect.left + rect.width / 2, rect.top);
        }
    }

    highlightScaleOnFretboard(midiNotes) {
        if (!this.fretboard) return;
        this.fretboard.clearMarkers();
        midiNotes.forEach(midi => {
            const type = (midi % 12 === 7) ? 'root' : 'scale';
            this.fretboard.addMarker(midi, type);
        });
        this.fretboard.renderMarkers();
    }

    playResolveDemo() {
        if (!this.fretboard) return;
        this.fretboard.clearMarkers();

        const g7altNotes = [43, 53, 56, 59, 63];
        g7altNotes.forEach(n => this.fretboard.addMarker(n, 'root'));
        this.fretboard.renderMarkers();
        if (this.staff) this.staff.setNoteByMidi(43, true);
        window.audioEngine.playChord(g7altNotes, 1.0, 0.8);

        const btn = document.getElementById('btn-play-resolve-demo');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            this.triggerNeonFeedback('Tension G7alt...', rect.left + rect.width / 2, rect.top);
        }

        setTimeout(() => {
            if (this.currentLesson !== 8) return;
            this.fretboard.clearMarkers();
            const cmaj7Notes = [48, 52, 55, 59, 64];
            cmaj7Notes.forEach(n => this.fretboard.addMarker(n, 'scale'));
            this.fretboard.renderMarkers();
            if (this.staff) this.staff.setNoteByMidi(48, true);
            window.audioEngine.playChord(cmaj7Notes, 1.2, 1.0);

            if (btn) {
                const rect = btn.getBoundingClientRect();
                this.triggerNeonFeedback('Resolve to Cmaj7!', rect.left + rect.width / 2, rect.top);
            }
        }, 1200);
    }

    showModeOnFretboard(mode) {
        if (!this.fretboard) return;

        this.fretboard.clearMarkers();
        const dorianPitchClasses = [7, 9, 10, 0, 2, 4, 5];
        const mixoPitchClasses = [7, 9, 11, 0, 2, 4, 5];
        const pitchClasses = mode === 'dorian' ? dorianPitchClasses : mixoPitchClasses;

        this.fretboard.openStrings.forEach(openMidi => {
            for (let fret = 0; fret <= this.fretboard.numFrets; fret++) {
                const midi = openMidi + fret;
                const pc = midi % 12;
                if (pitchClasses.includes(pc)) {
                    const type = (pc === 7) ? 'root' : 'scale';
                    this.fretboard.addMarker(midi, type);
                }
            }
        });
        this.fretboard.renderMarkers();

        const rootMidi = 55;
        const intervals = mode === 'dorian' ? [0, 2, 3, 5, 7] : [0, 2, 4, 5, 7];
        intervals.forEach((interval, i) => {
            setTimeout(() => {
                if (this.currentLesson !== 11) return;
                window.audioEngine.playNote(rootMidi + interval, 0.4, 0.3);
            }, i * 150);
        });

        const btnId = mode === 'dorian' ? 'btn-mode-dorian' : 'btn-mode-mixo';
        const btn = document.getElementById(btnId);
        if (btn) {
            const rect = btn.getBoundingClientRect();
            const label = mode === 'dorian' ? 'Dorian (哀愁)' : 'Mixolydian (陽気)';
            this.triggerNeonFeedback(label, rect.left + rect.width / 2, rect.top);
        }
    }

    previewAnalyseChord(idx) {
        const prog = this.autumnLeavesProgression[idx];
        if (!prog) return;

        this.fretboard.clearMarkers();
        prog.notesMidi.forEach((midi, i) => {
            const type = (i === 0) ? 'root' : 'scale';
            this.fretboard.addMarker(midi, type);
        });
        this.fretboard.renderMarkers();

        if (this.staff) {
            this.staff.setNoteByMidi(prog.notesMidi[0], true);
        }

        window.audioEngine.playChord(prog.notesMidi, 1.0, 0.5);

        const btn = document.querySelector(`.analyse-chord-btn[data-chord-idx="${idx}"]`);
        if (btn) {
            const rect = btn.getBoundingClientRect();
            this.triggerNeonFeedback(`${prog.chord}!`, rect.left + rect.width / 2, rect.top);
        }
    }

    showTensionGrip(grip) {
        if (!this.fretboard) return;

        const grips = {
            'g79': { name: 'G7(9)', notes: [43, 53, 57, 59] },
            'g713': { name: 'G7(13)', notes: [43, 53, 59, 64] },
            'cmaj9': { name: 'Cmaj9', notes: [48, 52, 59, 62] }
        };

        const item = grips[grip];
        if (!item) return;

        this.fretboard.clearMarkers();
        item.notes.forEach((midi, i) => {
            const type = (i === 0) ? 'root' : 'scale';
            this.fretboard.addMarker(midi, type);
        });
        this.fretboard.renderMarkers();

        if (this.staff) {
            this.staff.setNoteByMidi(item.notes[0], true);
        }

        window.audioEngine.playChord(item.notes, 1.0, 0.4);

        const btn = document.querySelector(`.tension-select-btn[data-grip="${grip}"]`);
        if (btn) {
            const rect = btn.getBoundingClientRect();
            this.triggerNeonFeedback(`${item.name}`, rect.left + rect.width / 2, rect.top);
        }
    }

    toggleSandboxBacking() {
        const btn = document.getElementById('btn-toggle-sandbox-backing');
        if (!btn) return;

        if (window.audioEngine.isPlaying) {
            window.audioEngine.stopBackingTrack();
            btn.textContent = '伴奏を再生';
            this.fretboard.clearMarkers();
            this.highlightScaleOnFretboard([55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79]);
        } else {
            const sandboxProgression = [
                { chord: 'Gmaj7', rootMidi: 43, notesMidi: [55, 59, 62, 66], beats: 4 },
                { chord: 'Am7', rootMidi: 45, notesMidi: [57, 60, 64, 67], beats: 4 },
                { chord: 'Bm7', rootMidi: 47, notesMidi: [59, 62, 66, 69], beats: 4 },
                { chord: 'Am7', rootMidi: 45, notesMidi: [57, 60, 64, 67], beats: 4 }
            ];

            btn.textContent = '停止';
            window.audioEngine.pianoEnabled = true;

            this.highlightScaleOnFretboard([55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79]);

            window.audioEngine.startBackingTrack(sandboxProgression, (tick) => {
                const readout = document.getElementById('staff-readout');
                if (readout) {
                    readout.textContent = `伴奏進行中: ${tick.chord} (拍: ${tick.beatIndex + 1})`;
                }
            });
        }
    }

    playLickDemo() {
        const btn = document.getElementById('btn-play-lick');
        if (btn) {
            btn.setAttribute('disabled', 'true');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 再生中...';
        }

        const lick = [
            { midi: 67, delay: 0 },
            { midi: 70, delay: 250 },
            { midi: 72, delay: 500 },
            { midi: 74, delay: 750 },
            { midi: 75, delay: 1000 },
            { midi: 72, delay: 1300 },
            { midi: 69, delay: 1550 },
            { midi: 65, delay: 1800 },
            { midi: 62, delay: 2150 }
        ];

        lick.forEach((note) => {
            setTimeout(() => {
                if (this.currentLesson !== 14) return;
                window.audioEngine.playNote(note.midi, 0.5, 0.35);
                if (this.staff) this.staff.setNoteByMidi(note.midi, true);
                if (this.fretboard) {
                    this.fretboard.clearMarkers();
                    this.fretboard.addMarker(note.midi, 'root');
                    this.fretboard.renderMarkers();
                }
            }, note.delay);
        });

        setTimeout(() => {
            if (btn) {
                btn.removeAttribute('disabled');
                btn.innerHTML = '<i class="fa-solid fa-play"></i> 定番リックを再生＆ガイド表示';
            }
        }, 2600);
    }

    playIntroDemo() {
        const btn = document.getElementById('btn-play-intro');
        if (btn) {
            btn.setAttribute('disabled', 'true');
            btn.textContent = '再生中...';
        }

        const chords = [
            { name: 'Bm7(b5)', notes: [47, 53, 56, 57], delay: 0 },
            { name: 'E7alt', notes: [40, 50, 53, 56], delay: 800 },
            { name: 'Am7', notes: [45, 52, 55, 57], delay: 1600 },
            { name: 'D7alt', notes: [50, 54, 60, 63], delay: 2400 }
        ];

        chords.forEach((c) => {
            setTimeout(() => {
                if (this.currentLesson !== 17) return;
                this.fretboard.clearMarkers();
                c.notes.forEach((n, i) => this.fretboard.addMarker(n, i === 0 ? 'root' : 'scale'));
                this.fretboard.renderMarkers();
                if (this.staff) this.staff.setNoteByMidi(c.notes[0], true);
                window.audioEngine.playChord(c.notes, 1.0, 0.7);

                const container = document.getElementById('btn-play-intro');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    this.triggerNeonFeedback(c.name, rect.left + rect.width / 2, rect.top);
                }
            }, c.delay);
        });

        setTimeout(() => {
            if (btn) {
                btn.removeAttribute('disabled');
                btn.innerHTML = '<i class="fa-solid fa-headphones"></i> 逆循環イントロ進行';
            }
        }, 3400);
    }

    playEndingDemo() {
        const btn = document.getElementById('btn-play-ending');
        if (btn) {
            btn.setAttribute('disabled', 'true');
            btn.textContent = '再生中...';
        }

        const chords = [
            { name: 'Cm7', notes: [48, 55, 58, 63], delay: 0 },
            { name: 'F7', notes: [41, 53, 57, 60], delay: 800 },
            { name: 'Bbmaj7', notes: [46, 53, 57, 58], delay: 1600 },
            { name: 'Bmaj7', notes: [47, 54, 58, 59], delay: 2400 },
            { name: 'Cmaj7', notes: [48, 55, 59, 64], delay: 3000 }
        ];

        chords.forEach((c) => {
            setTimeout(() => {
                if (this.currentLesson !== 17) return;
                this.fretboard.clearMarkers();
                c.notes.forEach((n, i) => this.fretboard.addMarker(n, i === 0 ? 'root' : 'scale'));
                this.fretboard.renderMarkers();
                if (this.staff) this.staff.setNoteByMidi(c.notes[0], true);
                window.audioEngine.playChord(c.notes, 1.0, 0.85);

                const container = document.getElementById('btn-play-ending');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    this.triggerNeonFeedback(c.name, rect.left + rect.width / 2, rect.top);
                }
            }, c.delay);
        });

        setTimeout(() => {
            if (btn) {
                btn.removeAttribute('disabled');
                btn.innerHTML = '<i class="fa-solid fa-headphones"></i>  ジャズ定番エンディング';
            }
        }, 4200);
    }

    renderMannerQuiz() {
        const area = document.getElementById('manner-quiz-area');
        if (!area) return;

        this.quizState = {
            currentQuestion: 0,
            score: 0,
            questions: [
                {
                    q: 'セッションで他のフロント楽器がソロを弾いている間、ギタリストの伴奏（コンピング）はどうあるべき？',
                    choices: [
                        '自分の技術をアピールするため、フロント奏者より目立つ大きな音量で伴奏する',
                        'ソリストのメロディをよく聴き、音量を抑えてスウィングのノリをサポートする',
                        '伴奏は退屈なので、適当にスマホをいじりながら弾く'
                    ],
                    correct: 1,
                    explanation: 'ジャズは会話です！ソリストの語り口をよく聴き、邪魔しないように音量と音数をコントロールするのが極上バッカーの心得です。'
                },
                {
                    q: '他のメンバーが熱いアドリブソロを弾き終えた瞬間の、粋なマナーはどれ？',
                    choices: [
                        '自分の次のソロの準備に集中し、特に反応はしない',
                        '「今のフレーズはダサいね」とダメ出しする',
                        '小さく拍手（拍手できない時は声やうなずき）で「Yeah!」と讃える'
                    ],
                    correct: 2,
                    explanation: '素晴らしいソロにはセッション中でも声や拍手で反応するのがジャズクラブの粋な文化。バンド全体のエネルギーが高まります！'
                },
                {
                    q: 'アンプのEQ（音質）設定で、ベース奏者を邪魔しないためのジャズギターの基本設定は？',
                    choices: [
                        'ギター単体で気持ち良い太い低域を出すため、Bass（低音）ノブを最大にする',
                        'ベースの帯域と衝突するのを防ぐため、Bassは少し絞り、ミドルを豊かにする',
                        'アンプの設定は一切触らず、工場の初期状態のまま使う'
                    ],
                    correct: 1,
                    explanation: 'ギターの低域が出すぎていると、ベースの音階がぼやけてしまいます。低音を少しカットすることでアンサンブルがすっきり抜けて聞こえます。'
                }
            ]
        };

        this.showMannerQuestion();
    }

    showMannerQuestion() {
        const area = document.getElementById('manner-quiz-area');
        if (!area) return;

        const state = this.quizState;
        if (state.currentQuestion >= state.questions.length) {
            const passed = state.score >= 2;
            const points = state.score * 30;
            this.addScore(points);
            if (passed) this.triggerConfetti();

            area.innerHTML = `
                <div style="text-align: center; padding: 10px 0;">
                    <h4 style="font-family: var(--font-heading); font-size: 1.3rem; color: var(--accent-amber); margin-bottom: 8px;">
                        ${passed ? '🎉 クイズ合格！' : '☕ もう一度確認しよう'}
                    </h4>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px;">
                        あなたの正解数: <strong>${state.score} / ${state.questions.length} 問</strong><br>
                        スコア <strong>+${points} pts</strong> を獲得しました！
                    </p>
                    <button class="action-btn" onclick="window.app.renderMannerQuiz()" style="font-size: 0.75rem; padding: 6px 12px; margin-right: 8px;">もう一度挑戦</button>
                    <button class="secondary-btn" onclick="window.app.switchStep('6')" style="font-size: 0.75rem; padding: 6px 12px;">レッスン一覧へ</button>
                </div>
            `;
            return;
        }

        const qData = state.questions[state.currentQuestion];
        area.innerHTML = `
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">
                ジャム・セッション流儀クイズ (第 ${state.currentQuestion + 1} / ${state.questions.length} 問)
            </div>
            <h4 style="font-size: 0.85rem; color: #fff; font-weight: 700; margin-bottom: 12px; line-height: 1.4;">
                ${qData.q}
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;" id="manner-choices-container">
                ${qData.choices.map((choice, idx) => `
                    <button class="secondary-btn quiz-choice-btn" data-choice="${idx}" style="text-align: left; padding: 10px 14px; font-size: 0.75rem; justify-content: flex-start; width: 100%; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.01); color: var(--text-secondary); transition: all 0.2s;">
                        ${String.fromCharCode(65 + idx)}. ${choice}
                    </button>
                `).join('')}
            </div>
            <div id="quiz-explanation-box" style="margin-top: 12px; display: none; font-size: 0.75rem; padding: 10px; border-radius: 8px; line-height: 1.4;"></div>
        `;

        area.querySelectorAll('.quiz-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choice = parseInt(btn.getAttribute('data-choice'), 10);
                this.answerMannerQuiz(choice);
            });
        });
    }

    answerMannerQuiz(choiceIndex) {
        const state = this.quizState;
        const qData = state.questions[state.currentQuestion];
        const buttons = document.querySelectorAll('.quiz-choice-btn');
        const expBox = document.getElementById('quiz-explanation-box');
        
        buttons.forEach(btn => btn.setAttribute('disabled', 'true'));
        
        const isCorrect = choiceIndex === qData.correct;
        if (isCorrect) {
            state.score++;
            window.audioEngine.playCorrectSfx();
            const chosenBtn = document.querySelector(`.quiz-choice-btn[data-choice="${choiceIndex}"]`);
            if (chosenBtn) {
                chosenBtn.style.borderColor = 'var(--accent-emerald)';
                chosenBtn.style.background = 'rgba(16, 185, 129, 0.08)';
                chosenBtn.style.color = '#34d399';
                
                const rect = chosenBtn.getBoundingClientRect();
                this.triggerNeonFeedback('Swing & Correct!', rect.left + rect.width / 2, rect.top);
            }
        } else {
            window.audioEngine.playIncorrectSfx();
            const chosenBtn = document.querySelector(`.quiz-choice-btn[data-choice="${choiceIndex}"]`);
            if (chosenBtn) {
                chosenBtn.style.borderColor = 'var(--color-root)';
                chosenBtn.style.background = 'rgba(239, 68, 68, 0.08)';
                chosenBtn.style.color = '#f87171';
            }
            const correctBtn = document.querySelector(`.quiz-choice-btn[data-choice="${qData.correct}"]`);
            if (correctBtn) {
                correctBtn.style.borderColor = 'var(--accent-emerald)';
                correctBtn.style.color = '#34d399';
            }
        }

        if (expBox) {
            expBox.style.display = 'block';
            expBox.style.background = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
            expBox.style.border = isCorrect ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)';
            expBox.style.color = isCorrect ? '#34d399' : '#f87171';
            expBox.innerHTML = `<strong>${isCorrect ? '🎯 正解！' : '❌ 不正解...'}</strong> ${qData.explanation}` +
                `<button class="action-btn" id="btn-quiz-next" style="margin-top: 10px; display: block; font-size: 0.72rem; padding: 4px 10px;">` +
                `${state.currentQuestion + 1 === state.questions.length ? '結果を見る' : '次の問題へ'} <i class="fa-solid fa-chevron-right"></i>` +
                `</button>`;
            
            document.getElementById('btn-quiz-next').addEventListener('click', () => {
                state.currentQuestion++;
                this.showMannerQuestion();
            });
        }
    }

    getFretboardClientCoords(stringIndex, fret) {
        if (!this.fretboard || !this.fretboard.svg) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const svgX = fret === 0 ? 22 : (this.fretboard.getFretX(fret - 1) + this.fretboard.getFretX(fret)) / 2;
        const svgY = this.fretboard.getStringY(stringIndex);
        const rect = this.fretboard.svg.getBoundingClientRect();
        const clientX = rect.left + (svgX / 920) * rect.width;
        const clientY = rect.top + (svgY / 180) * rect.height;
        return { x: clientX, y: clientY };
    }

    triggerNeonFeedback(text, x, y) {
        const fxLayer = document.getElementById('jazz-fx-layer');
        if (!fxLayer) return;

        const popup = document.createElement('div');
        popup.className = 'jazz-feedback-popup';
        popup.textContent = text;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        fxLayer.appendChild(popup);

        setTimeout(() => popup.remove(), 800);

        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.className = 'jazz-neon-particle';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            const size = Math.random() * 5 + 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            const colors = ['#fbbf24', '#f59e0b', '#3b82f6', '#60a5fa', '#a78bfa', '#f472b6'];
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.boxShadow = `0 0 8px ${particle.style.backgroundColor}`;

            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 50 + 20;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);

            fxLayer.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
        }
    }

    triggerBandMemberSpeech(memberId, text) {
        const bubble = document.getElementById(`bubble-${memberId}`);
        if (!bubble) return;
        bubble.textContent = text;
        bubble.classList.add('show');
        setTimeout(() => {
            bubble.classList.remove('show');
        }, 1200);
    }

    startSessionPlayer() {
        this.toggleSessionPlayback();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const app = new SilentRhythmApp();
    window.app = app;
    app.init();
});
