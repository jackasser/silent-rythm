// app.js - Main Application Logic, Gamification and State Management (GSAP & FontAwesome Integrated)

class SilentRhythmApp {
    constructor() {
        this.staff = null;
        this.fretboard = null;
        this.currentStep = '0b'; // デフォルトでコード＆スケール(0b)から開始
        this.score = 0;
        this.unlockedSteps = new Set(['0a', '0b', '1', '2', '3', '4']); // すべての機能を最初から解放
        
        // Step 0-B builder state
        this.builderState = {
            step: 1, // 1: Root, 2: 3rd, 3: 5th, 4: 7th, 5: Scale
            rootMidi: 48, // C3
            rootName: 'C',
            thirdType: 'major', // 'major' | 'minor'
            seventhType: 'maj7', // 'maj7' | 'min7' | 'dom7'
            scaleType: 'major' // 'major' | 'pentatonic'
        };

        // Step 2 Chord Form Explorer state
        this.chordFormState = {
            root: 'G',
            string: '6', // '6' | '5'
            type: 'min7' // 'maj7' | 'min7' | 'dom7'
        };
        
        // ユーザー称号の定義
        this.titles = [
            { score: 0, title: '未熟なギタリスト' },
            { score: 100, title: '指板の放浪者' },
            { score: 300, title: '五線譜の読手' },
            { score: 600, title: 'スウィングの探求者' },
            { score: 1000, title: 'セッションの常連' },
            { score: 1500, title: 'ジャズマスター' }
        ];

        // 共通教材：『枯葉 (Autumn Leaves)』のコード進行定義 (Key: G minor, BPM 110)
        this.autumnLeavesProgression = [
            { chord: 'Cm7', rootMidi: 48, notesMidi: [60, 63, 67, 70], beats: 4 },
            { chord: 'F7', rootMidi: 41, notesMidi: [57, 61, 65, 69], beats: 4 },
            { chord: 'B♭maj7', rootMidi: 46, notesMidi: [58, 62, 65, 69], beats: 4 },
            { chord: 'E♭maj7', rootMidi: 51, notesMidi: [55, 59, 63, 67], beats: 4 },
            { chord: 'Am7(♭5)', rootMidi: 45, notesMidi: [57, 60, 63, 67], beats: 4 },
            { chord: 'D7', rootMidi: 50, notesMidi: [54, 57, 60, 64], beats: 4 },
            { chord: 'Gm7', rootMidi: 43, notesMidi: [55, 58, 62, 65], beats: 4 },
            { chord: 'G7', rootMidi: 43, notesMidi: [55, 59, 62, 65], beats: 4 }
        ];

        this.gameInterval = null;
        this.gameTimer = 0;
        this.gameState = null;
    }

    init() {
        this.initComponents();
        this.setupAppEvents();
        this.loadCurrentUser();
        this.setupLoginEvents();
        this.switchStep(this.currentStep, false); // 初期起動時はアニメーションなし
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
                this.unlockedSteps = new Set(['0a', '0b', '1', '2', '3', '4']); // すべて強制解放
                this.nickname = userData.nickname || username;
                
                // ロックを無効化するため、デフォルトで0bを優先にするか、既存ステップをそのままロード
                const steps = ['4', '3', '2', '1', '0b', '0a'];
                this.currentStep = steps.find(s => this.unlockedSteps.has(s)) || '0b';
                
                this.updateUserHeaderUI();
                return;
            }
        }
        // 未ログイン/ゲスト状態
        this.currentUser = null;
        this.score = 0;
        this.unlockedSteps = new Set(['0a', '0b', '1', '2', '3', '4']); // すべて解放
        this.nickname = 'ゲスト';
        this.currentStep = '0b'; // 0bから開始
        this.updateUserHeaderUI();
    }

    saveCurrentUserData() {
        if (!this.currentUser) return; // ゲスト状態では登録DBへ保存しない
        const users = JSON.parse(localStorage.getItem('sr_users') || '{}');
        if (users[this.currentUser]) {
            users[this.currentUser].score = this.score;
            users[this.currentUser].unlockedSteps = Array.from(this.unlockedSteps);
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
        const steps = ['0a', '0b', '1', '2', '3', '4'];
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
                    if (icon) icon.innerHTML = '<i class="fa-solid fa-lock"></i>';
                }
            }
        });

        if (levelEl) {
            levelEl.textContent = `Step ${this.currentStep.toUpperCase()}`;
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
                this.switchStep('0a');
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
                    unlockedSteps: ['0a', '0b', '1', '2', '3', '4']
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
                
                this.switchStep('0a');
                alert(`登録が完了し、自動ログインしました。ようこそ、${nickname}さん！`);
            });
        }
    }

    initComponents() {
        this.staff = new window.InteractiveStaff('svg-staff-wrapper', (midi) => {
            window.audioEngine.playNote(midi, 0.4, 0.4);
            this.fretboard.clearMarkers();
            this.fretboard.addMarker(midi, 'root');
            const pitchClass = midi % 12;
            this.fretboard.setOctaveHighlight(pitchClass, true);
        });

        this.fretboard = new window.InteractiveFretboard('svg-fretboard-wrapper', (midi, stringIndex, fret) => {
            window.audioEngine.playNote(midi, 0.4, 0.4);

            // ゲーム中でない場合のみ、五線譜が滑らかにスナップ＆マーカーとオクターブ点線を更新
            if (!this.gameState || !this.gameState.activeGame) {
                this.staff.setNoteByMidi(midi, true);
                this.fretboard.clearMarkers();
                this.fretboard.addMarker(midi, 'root');
                const pitchClass = midi % 12;
                this.fretboard.setOctaveHighlight(pitchClass, true);
            }

            if (this.currentStep === '0a' && this.gameState && this.gameState.activeGame === 'noterun') {
                this.handleNoteRunClick(midi, stringIndex, fret);
            }

            if (this.currentStep === '0b' && this.gameState && this.gameState.activeGame === 'hunter') {
                this.handleHunterClick(midi, stringIndex, fret);
            }
            
            if (this.currentStep === '2' && this.gameState && this.gameState.activeGame === 'builder') {
                this.handleBuilderClick(midi);
            }
        });
    }

    setupAppEvents() {
        const steps = ['0a', '0b', '1', '2', '3', '4'];
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
        if (unlockEl) unlockEl.textContent = `Step ${step.toUpperCase()}`;

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
        
        window.audioEngine.stopBackingTrack();
        this.cleanupActiveGame();
        
        this.fretboard.clearMarkers();
        
        // プレミアム・モーション・トランジション（Linear風）
        const panel = document.getElementById('lesson-panel');
        if (animate && panel && window.gsap) {
            window.gsap.fromTo(panel, 
                { opacity: 0, y: 15 }, 
                { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
            );
        }
        
        this.renderLessonPanel();
        
        // ステップ切り替え時に現在の五線譜の音を指板に同期
        if (this.staff && this.fretboard) {
            this.staff.drawNote(false);
            const currentMidi = this.staff.currentNote.midi;
            this.fretboard.clearMarkers();
            this.fretboard.addMarker(currentMidi, 'root');
            this.fretboard.setOctaveHighlight(currentMidi % 12, true);
        }
    }

    updateActiveLessonText() {
        if (this.gameState && this.gameState.activeGame) {
            const active = this.gameState.activeGame;
            if (active === 'memorize') {
                this.updateMemorizeUI();
            } else if (active === 'noterun') {
                this.updateNoteRunUI();
            } else if (active === 'hunter') {
                this.updateHunterGameUI();
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
        
        let html = '';
        switch (this.currentStep) {
            case '0a':
                html = this.getStep0AContent();
                break;
            case '0b':
                html = this.getStep0BContent();
                break;
            case '1':
                html = this.getStep1Content();
                break;
            case '2':
                html = this.getStep2Content();
                break;
            case '3':
                html = this.getStep3Content();
                break;
            case '4':
                html = this.getStep4Content();
                break;
        }
        
        placeholder.innerHTML = html;
        this.attachLessonEvents();
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
        if (this.currentStep !== '0b') return;
        
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

    getStep1Content() {
        return `
            <div class="lesson-header">
                <span class="lesson-badge"><i class="fa-solid fa-bolt"></i> Step 1</span>
                <h2 class="lesson-title">Step 1: ロストしないタイム感 (2・4拍スウィング)</h2>
            </div>
            <p class="lesson-desc">
                ジャズセッションの最重要ルールは「迷子にならない（ロストしない）こと」です。<br>
                ジャズのスウィングは、ドラムのハイハットが<strong>2拍目・4拍目（裏拍）</strong>で鳴ることで心地よいノリを作ります。
                メトロノームに合わせて、小節の頭を意識しながら手拍子やコードを刻みましょう。
            </p>
            
            <div class="lesson-interactive-panel">
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 16px; border: 1px solid var(--border-glass); margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-gauge-high"></i> TEMPO CONTROL</span>
                        <div style="display: flex; align-items: center; gap: 20px; margin-top: 8px;">
                            <input type="range" id="slider-bpm" min="70" max="160" value="110" style="width: 150px; accent-color: var(--accent-amber);">
                            <span id="label-bpm" style="font-family: var(--font-heading); font-weight: 800; color: var(--accent-amber); font-size: 1.2rem;">110 BPM</span>
                        </div>
                    </div>
                    
                    <button class="action-btn" id="btn-toggle-swing">
                        <i class="fa-solid fa-play"></i> スウィングメトロノーム 再生
                    </button>
                </div>

                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px; letter-spacing: 1px;"><i class="fa-solid fa-wave-square"></i> BEAT TRACKER (1小節 = 4拍)</div>
                    <div style="display: flex; justify-content: center; gap: 20px;" id="beat-tracker-dots">
                        <div class="beat-dot" id="dot-1" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border-glass); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700;">1</div>
                        <div class="beat-dot" id="dot-2" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border-glass); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700;">2</div>
                        <div class="beat-dot" id="dot-3" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border-glass); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700;">3</div>
                        <div class="beat-dot" id="dot-4" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border-glass); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700;">4</div>
                    </div>
                    <div id="swing-beat-status" style="margin-top: 15px; font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: var(--accent-amber);">1小節目 / 4拍</div>
                </div>

                <div class="action-area" style="display: flex; gap: 15px;">
                    <button class="secondary-btn" id="btn-next-step-1">
                        <i class="fa-solid fa-chevron-right"></i> 拍感が掴めたので、Step 2（コード伴奏）へ進む
                    </button>
                </div>
            </div>
        `;
    }

    getStep2Content() {
        return `
            <div class="lesson-header">
                <span class="lesson-badge"><i class="fa-solid fa-bolt"></i> Step 2</span>
                <h2 class="lesson-title">Step 2: 邪魔しないバッキング (シェル＆ガイドトーン)</h2>
            </div>
            <p class="lesson-desc">
                セッションでは、他の楽器の音域を邪魔しないことがマナーです。<br>
                ルート(R) + 3度 + 7度で構成される「<strong>シェルボイシング</strong>」や、3度+7度だけの「<strong>ガイドトーン</strong>」を学びます。
                ピアノ伴奏のOn/Offを切り替えて、アンサンブルに合わせたコードフォームの違いを確認しましょう。
            </p>
            
            <div class="lesson-interactive-panel" style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                <!-- アンサンブル状況切り替え -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 16px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2); gap: 15px; flex-wrap: wrap;">
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-people-group"></i> アンサンブル状況切り替え</span>
                        <div style="display: flex; gap: 12px; margin-top: 8px;">
                            <button class="toggle-btn active" id="btn-piano-off"><i class="fa-solid fa-guitar"></i> ピアノ無し (ドラム&ベースのみ)</button>
                            <button class="toggle-btn" id="btn-piano-on"><i class="fa-solid fa-keyboard"></i> ピアノ有り (鍵盤伴奏つき)</button>
                        </div>
                    </div>
                    <div style="text-align: right; max-width: 320px; min-width: 200px;">
                        <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">現在のバッキング指示</span>
                        <div id="voicing-guide-desc" style="font-size: 0.85rem; color: var(--accent-amber); font-weight: 600; margin-top: 5px; line-height: 1.4;">
                            ルートを含む「シェルコード(3音)」を弾いてバンドを支えましょう。
                        </div>
                    </div>
                </div>

                <!-- 実践コードフォーム・エクスプローラー -->
                <div class="voicing-explorer-card" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 16px; padding: 20px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 15px;">
                    <h3 style="color: var(--accent-amber); font-size: 1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-guitar"></i> 🎸 実践コードフォーム・エクスプローラー
                    </h3>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                        ジャズバッキングでプロが多用する、他とぶつからない実用的な「シェル・コードフォーム（3声和音）」を学びましょう。<br>
                        トグルを切り替えると、指板上の押さえ方・五線譜の音・運指ガイドが連動して変化します。
                    </p>

                    <!-- コントロール群 -->
                    <div style="display: flex; flex-direction: column; gap: 12px; padding: 12px; background: rgba(0,0,0,0.15); border-radius: 12px; border: 1px solid rgba(255,255,255,0.02);">
                        <!-- ルート音選択 -->
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; width: 85px;">1. ルート音:</span>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                ${['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note => `
                                    <button class="form-root-btn ${this.chordFormState.root === note ? 'active' : ''}" data-note="${note}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid ${this.chordFormState.root === note ? 'var(--accent-amber)' : 'var(--border-glass)'}; background: ${this.chordFormState.root === note ? 'var(--accent-amber-glow)' : 'transparent'}; color: #fff; font-weight: bold; cursor: pointer; font-size: 0.85rem; transition: all 0.2s ease;">
                                        ${note}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- ルート弦選択 -->
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; width: 85px;">2. ルートの弦:</span>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button class="toggle-btn ${this.chordFormState.string === '6' ? 'active' : ''}" id="btn-form-string-6" style="padding: 6px 12px; font-size: 0.8rem;">6弦ルート (低音側)</button>
                                <button class="toggle-btn ${this.chordFormState.string === '5' ? 'active' : ''}" id="btn-form-string-5" style="padding: 6px 12px; font-size: 0.8rem;">5弦ルート (中音側)</button>
                            </div>
                        </div>

                        <!-- コードタイプ選択 -->
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; width: 85px;">3. タイプ:</span>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button class="toggle-btn ${this.chordFormState.type === 'maj7' ? 'active' : ''}" id="btn-form-type-maj7" style="padding: 6px 12px; font-size: 0.8rem;">メジャー7th (Maj7)</button>
                                <button class="toggle-btn ${this.chordFormState.type === 'min7' ? 'active' : ''}" id="btn-form-type-min7" style="padding: 6px 12px; font-size: 0.8rem;">マイナー7th (m7)</button>
                                <button class="toggle-btn ${this.chordFormState.type === 'dom7' ? 'active' : ''}" id="btn-form-type-dom7" style="padding: 6px 12px; font-size: 0.8rem;">ドミナント7th (7)</button>
                            </div>
                        </div>
                    </div>

                    <!-- 動的運指ガイダンス -->
                    <div id="chord-form-guidance" style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(251, 191, 36, 0.2); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem; line-height: 1.45;">
                        <!-- JSで動的に詳細と運指のコツを描画 -->
                    </div>
                </div>

                <div class="action-area" style="display: flex; gap: 15px; margin-top: 5px;">
                    <button class="action-btn" id="btn-start-game-2">
                        <i class="fa-solid fa-gamepad"></i> ミニゲーム『Voicing Builder (コード作り)』に挑戦！
                    </button>
                </div>
            </div>
        `;
    }

    getStep3Content() {
        return `
            <div class="lesson-header">
                <span class="lesson-badge"><i class="fa-solid fa-bolt"></i> Step 3</span>
                <h2 class="lesson-title">Step 3: アドリブソロ (ペンタ ＋ ターゲットノート)</h2>
            </div>
            <p class="lesson-desc">
                ジャズのアドリブは、難しいスケール理論を使わなくても成立します。<br>
                基本は弾き慣れた「<strong>Gマイナーペンタトニック</strong>」を弾き、コードが変わる瞬間に、そのコードの「<strong>3度または7度の音（ターゲットノート）</strong>」に着地するだけで、進行に完璧に沿ったジャジーなソロになります。
            </p>
            
            <div class="lesson-interactive-panel">
                <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 16px; border: 1px solid var(--border-glass); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-music"></i> アドリブ練習用バッキング再生 (枯葉進行)</span>
                        <div id="target-chord-readout" style="font-family: var(--font-heading); font-weight: 800; font-size: 1.6rem; color: var(--accent-amber); margin-top: 5px;">
                            STOPPED
                        </div>
                    </div>
                    <button class="action-btn" id="btn-toggle-target-playback">
                        <i class="fa-solid fa-play"></i> バッキング再生
                    </button>
                </div>

                <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);">
                    <h4 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px; font-weight: 700;"><i class="fa-solid fa-circle-check" style="color: var(--accent-amber);"></i> ターゲットノート・ルール</h4>
                    <ul style="font-size: 0.85rem; margin-left: 20px; display: flex; flex-direction: column; gap: 8px; list-style-type: square; color: var(--text-secondary);">
                        <li>基本スケール: <strong>Gマイナーペンタトニック</strong> (構成音: G, B♭, C, D, F / ソ, シ♭, ド, レ, ファ) が指板に黄色の丸で表示されます。</li>
                        <li>コードが切り替わる「1拍前（4拍目）」になると、次のコードの「3度または7度の音（ターゲット着地音）」が<strong>赤く点滅</strong>します。</li>
                        <li>まずは黄色い音を適当にパラパラと弾きながら、コードが切り替わる瞬間だけ赤い音を狙って着地してみましょう！</li>
                    </ul>
                </div>

                <div class="action-area" style="display: flex; gap: 15px;">
                    <button class="secondary-btn" id="btn-next-step-3">
                        <i class="fa-solid fa-chevron-right"></i> コツを掴んだので、Step 4（バーチャル・セッション）へ進む
                    </button>
                </div>
            </div>
        `;
    }

    getStep4Content() {
        return `
            <div class="lesson-header">
                <span class="lesson-badge"><i class="fa-solid fa-bolt"></i> Step 4</span>
                <h2 class="lesson-title">Step 4: バーチャル・セッションシミュレーター</h2>
            </div>
            <p class="lesson-desc">
                最後のステップです！セッション全体の流れと、マナーを体験しましょう。<br>
                定番曲『枯葉 (Autumn Leaves)』の進行に合わせ、<strong>テーマ（メロディ） ⇔ コンピング（伴奏） ⇔ ソロ（アドリブ）</strong>の役割分担を画面の指示に従ってプレイします。
            </p>
            
            <div class="lesson-interactive-panel">
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 16px; border: 1px solid var(--border-glass); margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-microphone-lines"></i> SESSION PLAYER</span>
                        <div style="display: flex; align-items: center; gap: 20px; margin-top: 5px;">
                            <span id="session-chord" style="font-family: var(--font-heading); font-weight: 800; font-size: 1.8rem; color: var(--accent-amber);">STOPPED</span>
                            <span id="session-bar-count" style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">0 / 32小節</span>
                        </div>
                    </div>
                    
                    <button class="action-btn" id="btn-start-session" style="background: linear-gradient(135deg, var(--accent-purple) 0%, #6366f1 100%); box-shadow: 0 4px 20px rgba(99, 102, 241, 0.45);">
                        <i class="fa-solid fa-trumpets"></i> 🎺 セッションを開始する！
                    </button>
                </div>

                <!-- ロール・指示インジケーター -->
                <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 20px; padding: 25px; text-align: center; margin-bottom: 20px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);" id="session-role-card">
                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">現在の役割</span>
                    <h3 id="session-role-title" style="font-family: var(--font-heading); font-size: 1.8rem; font-weight: 800; margin: 10px 0; color: #fff;">
                        セッション待機中
                    </h3>
                    <p id="session-role-instruction" style="font-size: 0.9rem; color: var(--text-muted);">
                        ボタンを押すと、ドラム・ベース・ピアノ伴奏による「枯葉」のセッションがスタートします。
                    </p>
                </div>

                <div id="session-tips-box" style="font-size: 0.85rem; color: var(--text-secondary); background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; min-height: 40px; line-height: 1.6;">
                    <i class="fa-solid fa-circle-question" style="color: var(--accent-blue);"></i> <strong>現場のマナー</strong>: イントロからテーマの演奏中は、キーボードの音やフロントのフレーズをよく聴きながら、自分の音量を控えめにするのが美しいアンサンブルの第一歩です。
                </div>
            </div>
        `;
    }

    attachLessonEvents() {
        // Step 0-A
        const btnStart0a = document.getElementById('btn-start-game-0a');
        if (btnStart0a) btnStart0a.addEventListener('click', () => this.startNoteRunGame());

        const btnStartMemorize0a = document.getElementById('btn-start-memorize-0a');
        if (btnStartMemorize0a) btnStartMemorize0a.addEventListener('click', () => this.startMemorizeMode());

        // Step 0-B
        if (this.currentStep === '0b') {
            this.setupStep0BBuilder();
        }

        // Step 1
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

        const btnNextStep1 = document.getElementById('btn-next-step-1');
        if (btnNextStep1) btnNextStep1.addEventListener('click', () => { this.unlockStep('2'); this.switchStep('2'); });

        // Step 2
        const btnPianoOff = document.getElementById('btn-piano-off');
        const btnPianoOn = document.getElementById('btn-piano-on');
        const descVoicing = document.getElementById('voicing-guide-desc');
        
        if (btnPianoOff && btnPianoOn) {
            btnPianoOff.addEventListener('click', () => {
                btnPianoOff.classList.add('active');
                btnPianoOn.classList.remove('active');
                window.audioEngine.pianoEnabled = false;
                if (descVoicing) descVoicing.textContent = `ルート音を含む「シェルコード(3音)」を弾いてバンドを支えましょう。`;
                if (this.currentStep === '2') {
                    this.updateChordFormVisualization(false);
                }
            });
            btnPianoOn.addEventListener('click', () => {
                btnPianoOn.classList.add('active');
                btnPianoOff.classList.remove('active');
                window.audioEngine.pianoEnabled = true;
                if (descVoicing) descVoicing.textContent = `ベースがいるためルートは省略し、3度と7度だけの「ガイドトーン(2音)」でピアノとぶつからないように弾きましょう。`;
                if (this.currentStep === '2') {
                    this.updateChordFormVisualization(false);
                }
            });
        }

        if (this.currentStep === '2') {
            this.setupChordFormExplorerEvents();
        }

        const btnStartGame2 = document.getElementById('btn-start-game-2');
        if (btnStartGame2) btnStartGame2.addEventListener('click', () => this.startVoicingBuilderGame());

        // Step 3
        const btnToggleTarget = document.getElementById('btn-toggle-target-playback');
        if (btnToggleTarget) btnToggleTarget.addEventListener('click', () => this.toggleTargetPlayback());

        const btnNextStep3 = document.getElementById('btn-next-step-3');
        if (btnNextStep3) btnNextStep3.addEventListener('click', () => { this.unlockStep('4'); this.switchStep('4'); });

        // Step 4
        const btnStartSession = document.getElementById('btn-start-session');
        if (btnStartSession) btnStartSession.addEventListener('click', () => this.toggleSessionPlayback());
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
                if (this.currentStep !== '0b') return;
                
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
            if (this.currentStep !== '0b') return;
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
                if (this.currentStep !== '0b') return;
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
        
        const activeMidi = Array.from(this.fretboard.activeMarkers.keys());
        activeMidi.sort((a,b)=>a-b).forEach((midi, i) => {
            setTimeout(() => {
                if (this.currentStep !== '2' && this.currentStep !== '4') return;
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
        if (this.currentStep !== '2') return;

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
        
        // ピアノ伴奏がOnのときはベース音が省略される（ガイドトーン）
        const isPianoOn = window.audioEngine.pianoEnabled;
        
        midiStack.forEach((midiVal, idx) => {
            const locKey = locKeys[idx];
            const degree = degreeStack[idx];
            
            if (degree === 'root') {
                if (!isPianoOn) {
                    this.fretboard.addMarker(locKey, 'root');
                }
            } else {
                this.fretboard.addMarker(locKey, degree);
            }
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
        const isPianoOn = window.audioEngine.pianoEnabled;
        let startFret = rootFret;
        let playedNotes = [];
        let mutedStrings = [true, true, true, true, true, true]; // index 0 to 5 (1st to 6th string)

        if (string === '6') {
            const rootFretVal = rootFret;
            const fret4 = (type === 'maj7') ? rootFretVal + 1 : rootFretVal;
            const fret3 = (type === 'min7') ? rootFretVal : rootFretVal + 1;

            startFret = rootFretVal;

            if (!isPianoOn) {
                playedNotes.push({ stringIndex: 5, fret: rootFretVal, label: 'R', color: 'var(--color-root)' });
                mutedStrings[5] = false;
            } else {
                mutedStrings[5] = true;
            }
            
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

            const activeFrets = [fret4, fret3];
            if (!isPianoOn) activeFrets.push(rootFretVal);
            startFret = Math.min(...activeFrets);

            if (!isPianoOn) {
                playedNotes.push({ stringIndex: 4, fret: rootFretVal, label: 'R', color: 'var(--color-root)' });
                mutedStrings[4] = false;
            } else {
                mutedStrings[4] = true;
            }

            playedNotes.push({ stringIndex: 3, fret: fret4, label: '3', color: 'var(--color-3rd)' });
            mutedStrings[3] = false;

            playedNotes.push({ stringIndex: 2, fret: fret3, label: '7', color: 'var(--color-7th)' });
            mutedStrings[2] = false;

            mutedStrings[5] = true;
            mutedStrings[1] = true;
            mutedStrings[0] = true;
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
            const relFret = note.fret - startFret + 1;
            const y = topMargin + (relFret - 0.5) * fretHeight;

            svgHtml += `
                <circle cx="${x}" cy="${y}" r="6" fill="${note.color}" filter="drop-shadow(0 0 2px rgba(0,0,0,0.5))" />
                <text x="${x}" y="${y + 3}" fill="#000" font-size="8" font-weight="bold" font-family="sans-serif" text-anchor="middle">${note.label}</text>
            `;
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
        } else {
            btn.innerHTML = '<i class="fa-solid fa-square"></i> 停止';
            window.audioEngine.pianoEnabled = true;
            window.audioEngine.startBackingTrack(this.autumnLeavesProgression, (tick) => {
                this.updateAdlibFretboardGuide(tick.chord, tick.beatIndex, tick.stepIndex);
            });
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
            alert('セッション1コーラス完了！おめでとうございます！ 150 pts を獲得しました！');
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
                this.switchStep('0a');
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

        if (isCorrect) {
            if (!this.gameState.foundLocations.has(locKey)) {
                this.gameState.foundLocations.add(locKey);
                
                // 正解した場所にのみ緑のマーカーを表示
                this.fretboard.addMarker(locKey, '3rd');
                this.fretboard.renderMarkers();
                this.updateNoteRunUI();
                
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
        if (passed) this.unlockStep('0b');
        
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
                    ${passed ? '合格ライン(5音名クリア以上)をクリア！次のステップ「Step 0-B: コード＆スケール」が解放されました。' : '惜しい！5音名以上のクリアで合格となり、次のステップが解放されます。繰り返し練習してみましょう！'}
                </p>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-restart-noterun"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    <button class="secondary-btn" id="btn-exit-noterun"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-0b" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Step 0-B へ進む</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-noterun').addEventListener('click', () => this.startNoteRunGame());
        document.getElementById('btn-exit-noterun').addEventListener('click', () => this.switchStep('0a'));
        if (passed) {
            document.getElementById('btn-go-to-0b').addEventListener('click', () => this.switchStep('0b'));
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
                this.switchStep('0b');
            });
        }
    }

    handleHunterClick(midi, stringIndex, fret) {
        if (!this.gameState || this.gameState.activeGame !== 'hunter') return;
        if (fret > 12) return; // 12フレットを超える位置のクリックは無効

        const locKey = `${stringIndex}-${fret}`;
        const isCorrect = (midi % 12) === this.gameState.targetPitchClass;
        
        if (isCorrect) {
            if (!this.gameState.foundLocations.has(locKey)) {
                this.gameState.foundLocations.add(locKey);
                window.audioEngine.playCorrectSfx();
                this.fretboard.addMarker(locKey, '3rd'); // 指定座標に緑マーカー表示
                this.fretboard.renderMarkers();
                this.updateHunterGameUI();
                
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
        if (passed) this.unlockStep('1');

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
                    ${passed ? '合格ライン(80%以上ハント)をクリア！「Step 1: タイム＆スウィング」が解放されました。' : '惜しい！80%以上のハントで次のステップが解放されます。もう一度指板の幾何学パターンを意識して探してみましょう。'}
                </p>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-restart-hunter"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    <button class="secondary-btn" id="btn-exit-hunter"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-1" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Step 1 へ進む</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-hunter').addEventListener('click', () => this.startFretboardHunterGame());
        document.getElementById('btn-exit-hunter').addEventListener('click', () => this.switchStep('0b'));
        if (passed) {
            document.getElementById('btn-go-to-1').addEventListener('click', () => this.switchStep('1'));
        }
    }

    // 【ゲーム③】 Voicing Builder (コード作り)
    startVoicingBuilderGame() {
        this.cleanupActiveGame();
        this.fretboard.clearMarkers();
        this.fretboard.setOctaveHighlight(null, false);
        
        const questions = [
            { chord: 'Gm7 (シェル・ボイシング)', correctMidis: [43, 46, 53] },
            { chord: 'C7 (シェル・ボイシング)', correctMidis: [48, 52, 58] },
            { chord: 'F7 (シェル・ボイシング)', correctMidis: [41, 45, 51] }
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
                        必要な3音（ルート、3度、7度）を指板上でタップしてください。
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
                this.switchStep('2');
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
            const allCorrect = q.correctMidis.every(midiVal => this.gameState.selectedMidis.has(midiVal));
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
        }

        this.gameState.currentQuestionIndex++;
        setTimeout(() => { this.nextBuilderQuestion(); }, 800);
    }

    endBuilderGame() {
        const total = this.gameState.questions.length;
        const correct = this.gameState.score;
        const passed = correct === total;
        this.addScore(correct * 50);
        
        if (passed) this.unlockStep('3');

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
                    ${passed ? '全問正解で合格！「Step 3: アドリブ・着地」が解放されました。' : 'ライフが尽きるか、間違えた問題があります。全問正解で次のステップに進めます！練習してもう一度挑みましょう。'}
                </p>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="action-btn" id="btn-restart-builder"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    <button class="secondary-btn" id="btn-exit-builder"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-3" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Step 3 へ進む</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-builder').addEventListener('click', () => this.startVoicingBuilderGame());
        document.getElementById('btn-exit-builder').addEventListener('click', () => this.switchStep('2'));
        if (passed) {
            document.getElementById('btn-go-to-3').addEventListener('click', () => this.switchStep('3'));
        }
    }

    /* ゴールド紙吹雪（Confetti）エフェクトの実行 */
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
                const stringNames = ['1弦 (E)', '2弦 (B)', '3弦 (G)', '4弦 (D)', '5弦 (A)', '6弦 (E)'];
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
                const stringNames = ['1弦 (E)', '2弦 (B)', '3弦 (G)', '4弦 (D)', '5弦 (A)', '6弦 (E)'];
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

        const stringNames = ['1弦 (E)', '2弦 (B)', '3弦 (G)', '4弦 (D)', '5弦 (A)', '6弦 (E)'];
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
                this.switchStep('0a');
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
}

window.addEventListener('DOMContentLoaded', () => {
    const app = new SilentRhythmApp();
    window.app = app;
    app.init();
});
