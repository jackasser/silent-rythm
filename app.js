// app.js - Main Application Logic, Gamification and State Management (GSAP & FontAwesome Integrated)

class SilentRhythmApp {
    constructor() {
        this.staff = null;
        this.fretboard = null;
        this.currentStep = '0a'; // '0a', '0b', '1', '2', '3', '4'
        this.score = 0;
        this.unlockedSteps = new Set(['0a']); // ロック解除されたステップ
        
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
                this.unlockedSteps = new Set(userData.unlockedSteps || ['0a']);
                this.nickname = userData.nickname || username;
                
                // 最後に解放されていた最新のステップを初期ステップに設定
                const steps = ['4', '3', '2', '1', '0b', '0a'];
                this.currentStep = steps.find(s => this.unlockedSteps.has(s)) || '0a';
                
                this.updateUserHeaderUI();
                return;
            }
        }
        // 未ログイン/ゲスト状態
        this.currentUser = null;
        this.score = 0;
        this.unlockedSteps = new Set(['0a']);
        this.nickname = 'ゲスト';
        this.currentStep = '0a';
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
                    unlockedSteps: ['0a']
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
        if (scoreEl) scoreEl.textContent = `${this.score} pts`;
        
        let activeTitle = this.titles[0].title;
        for (let i = 0; i < this.titles.length; i++) {
            if (this.score >= this.titles[i].score) {
                activeTitle = this.titles[i].title;
            }
        }
        
        const titleEl = document.getElementById('user-title');
        if (titleEl) titleEl.textContent = activeTitle;

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
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        this.gameState = null;
        
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
            const currentMidi = this.staff.currentNote.midi;
            this.fretboard.clearMarkers();
            this.fretboard.addMarker(currentMidi, 'root');
            this.fretboard.setOctaveHighlight(currentMidi % 12, true);
        }
    }

    updateActiveLessonText() {
        this.renderLessonPanel();
    }

    renderLessonPanel() {
        const placeholder = document.getElementById('lesson-content-placeholder');
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
                
                <div class="action-area" style="display: flex; gap: 15px;">
                    <button class="action-btn" id="btn-start-game-0a">
                        <i class="fa-solid fa-gamepad"></i> ミニゲーム『Note Run (指板音名当て)』をプレイ！
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
                音楽を形作る「コード（和音）」と「スケール（音階）」を直感的に体験しましょう。<br>
                コードは<strong>「背景のムード（絵の背景）」</strong>、スケールは<strong>「メロディを紡ぐための色（絵の具）」</strong>です。
            </p>
            
            <div class="lesson-interactive-panel">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                    <!-- 左: コードの部屋 -->
                    <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 16px; padding: 15px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3);">
                        <h3 class="section-title" style="color: var(--accent-amber); margin-bottom: 8px; font-size: 0.9rem;"><i class="fa-solid fa-cubes"></i> ① コード(和音)の部屋</h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
                            音が下から積み重なって「コードの響き」が生まれるアニメーションを聴き比べましょう。
                        </p>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                            <button class="secondary-btn" id="btn-play-cmaj7" style="padding: 6px 12px; font-size: 0.85rem;"><i class="fa-solid fa-circle-play"></i> Cmaj7 (明るい・おしゃれ)</button>
                            <button class="secondary-btn" id="btn-play-cm7" style="padding: 6px 12px; font-size: 0.85rem;"><i class="fa-solid fa-circle-play"></i> Cm7 (哀愁・哀しい)</button>
                            <button class="secondary-btn" id="btn-play-c7" style="padding: 6px 12px; font-size: 0.85rem;"><i class="fa-solid fa-circle-play"></i> C7 (不安定・ハラハラ)</button>
                        </div>
                        <div id="chord-build-readout" style="font-size: 0.85rem; color: var(--accent-amber); min-height: 20px; font-weight: 600;"></div>
                    </div>

                    <!-- 右: スケールの部屋 -->
                    <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 16px; padding: 15px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3);">
                        <h3 class="section-title" style="color: var(--accent-amber); margin-bottom: 8px; font-size: 0.9rem;"><i class="fa-solid fa-palette"></i> ② スケール(音階)の部屋</h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
                            指板上に光る「スケールの音（絵の具）」を適当にタップして、メロディをその場で「お絵描き」してみましょう！
                        </p>
                        <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                            <button class="secondary-btn" id="btn-scale-major" style="padding: 6px 12px; font-size: 0.85rem;"><i class="fa-solid fa-brush"></i> C メジャースケール</button>
                            <button class="secondary-btn" id="btn-scale-pentatonic" style="padding: 6px 12px; font-size: 0.85rem;"><i class="fa-solid fa-brush"></i> C マイナーペンタ</button>
                        </div>
                        <div id="scale-build-readout" style="font-size: 0.85rem; color: var(--accent-amber); min-height: 40px; line-height: 1.3; padding: 3px 0;"></div>
                    </div>
                </div>

                <div class="action-area" style="display: flex; gap: 15px; margin-top: 12px;">
                    <button class="action-btn" id="btn-start-game-0b" style="padding: 8px 16px; font-size: 0.9rem;">
                        <i class="fa-solid fa-gamepad"></i> ミニゲーム『Fretboard Hunter (音名ハント)』をプレイ！
                    </button>
                </div>
            </div>
        `;
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
            
            <div class="lesson-interactive-panel" style="display: grid; grid-template-columns: 1fr; gap: 20px;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-people-group"></i> アンサンブル状況切り替え</span>
                        <div style="display: flex; gap: 12px; margin-top: 8px;">
                            <button class="toggle-btn active" id="btn-piano-off"><i class="fa-solid fa-guitar"></i> ピアノ無し</button>
                            <button class="toggle-btn" id="btn-piano-on"><i class="fa-solid fa-keyboard"></i> ピアノ有り</button>
                        </div>
                    </div>
                    <div style="text-align: right; max-width: 320px;">
                        <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">現在の指示</span>
                        <div id="voicing-guide-desc" style="font-size: 0.85rem; color: var(--accent-amber); font-weight: 600; margin-top: 5px; line-height: 1.5;">
                            ルートを含む「シェルコード(3音)」を弾いてバンドを支えましょう。
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="secondary-btn" id="btn-show-gm7"><i class="fa-solid fa-music"></i> Gm7コード表示</button>
                    <button class="secondary-btn" id="btn-show-c7-voicing"><i class="fa-solid fa-music"></i> C7コード表示</button>
                    <button class="secondary-btn" id="btn-show-f7-voicing"><i class="fa-solid fa-music"></i> F7コード表示</button>
                </div>

                <div class="action-area" style="display: flex; gap: 15px; margin-top: 10px;">
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

        // Step 0-B
        const btnPlayCmaj7 = document.getElementById('btn-play-cmaj7');
        if (btnPlayCmaj7) btnPlayCmaj7.addEventListener('click', () => this.playChordBuilding('Cmaj7', [48, 52, 55, 59]));
        
        const btnPlayCm7 = document.getElementById('btn-play-cm7');
        if (btnPlayCm7) btnPlayCm7.addEventListener('click', () => this.playChordBuilding('Cm7', [48, 51, 55, 58]));

        const btnPlayC7 = document.getElementById('btn-play-c7');
        if (btnPlayC7) btnPlayC7.addEventListener('click', () => this.playChordBuilding('C7', [48, 52, 55, 58]));

        const btnScaleMajor = document.getElementById('btn-scale-major');
        if (btnScaleMajor) btnScaleMajor.addEventListener('click', () => this.showScaleGuide('major'));

        const btnScalePenta = document.getElementById('btn-scale-pentatonic');
        if (btnScalePenta) btnScalePenta.addEventListener('click', () => this.showScaleGuide('pentatonic'));

        const btnStart0b = document.getElementById('btn-start-game-0b');
        if (btnStart0b) btnStart0b.addEventListener('click', () => this.startFretboardHunterGame());

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
            });
            btnPianoOn.addEventListener('click', () => {
                btnPianoOn.classList.add('active');
                btnPianoOff.classList.remove('active');
                window.audioEngine.pianoEnabled = true;
                if (descVoicing) descVoicing.textContent = `ベースがいるためルートは省略し、3度と7度だけの「ガイドトーン(2音)」でピアノとぶつからないように弾きましょう。`;
            });
        }

        const btnShowGm7 = document.getElementById('btn-show-gm7');
        if (btnShowGm7) btnShowGm7.addEventListener('click', () => this.showCodeVoicingGuide('Gm7', 43, 3, 10));

        const btnShowC7 = document.getElementById('btn-show-c7-voicing');
        if (btnShowC7) btnShowC7.addEventListener('click', () => this.showCodeVoicingGuide('C7', 48, 4, 10));

        const btnShowF7 = document.getElementById('btn-show-f7-voicing');
        if (btnShowF7) btnShowF7.addEventListener('click', () => this.showCodeVoicingGuide('F7', 41, 3, 9));

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
        
        if (chordName === 'Gm7') {
            const root = 43;
            const third = 46;
            const seventh = 53;
            if (!isPianoOn) this.fretboard.addMarker(root, 'root');
            this.fretboard.addMarker(third, '3rd');
            this.fretboard.addMarker(seventh, '7th');
        } else if (chordName === 'C7') {
            const root = 48;
            const third = 52;
            const seventh = 58;
            if (!isPianoOn) this.fretboard.addMarker(root, 'root');
            this.fretboard.addMarker(third, '3rd');
            this.fretboard.addMarker(seventh, '7th');
        } else if (chordName === 'F7') {
            const root = 41;
            const third = 45;
            const seventh = 51;
            if (!isPianoOn) this.fretboard.addMarker(root, 'root');
            this.fretboard.addMarker(third, '3rd');
            this.fretboard.addMarker(seventh, '7th');
        }
        
        this.fretboard.renderMarkers();
        
        const activeMidi = Array.from(this.fretboard.activeMarkers.keys());
        activeMidi.sort((a,b)=>a-b).forEach((midi, i) => {
            setTimeout(() => {
                if (this.currentStep !== '2') return;
                window.audioEngine.playNote(midi, 0.5, 0.4);
            }, i * 150);
        });
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

                <div style="display: flex; gap: 15px;">
                    <button class="action-btn" id="btn-restart-noterun"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-0b" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Step 0-B へ進む</button>` : `<button class="secondary-btn" id="btn-exit-noterun"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>`}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-noterun').addEventListener('click', () => this.startNoteRunGame());
        if (passed) {
            document.getElementById('btn-go-to-0b').addEventListener('click', () => this.switchStep('0b'));
        } else {
            document.getElementById('btn-exit-noterun').addEventListener('click', () => this.switchStep('0a'));
        }
    }

    // 【ゲーム②】 Fretboard Hunter (指板音名ハント)
    startFretboardHunterGame() {
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
                    this.endHunterGame();
                }
            }
        } else {
            window.audioEngine.playIncorrectSfx();
            const panel = document.getElementById('lesson-panel');
            panel.classList.add('incorrect-pulse');
            
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

                <div style="display: flex; gap: 15px;">
                    <button class="action-btn" id="btn-restart-hunter"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-1" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Step 1 へ進む</button>` : `<button class="secondary-btn" id="btn-exit-hunter"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>`}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-hunter').addEventListener('click', () => this.startFretboardHunterGame());
        if (passed) {
            document.getElementById('btn-go-to-1').addEventListener('click', () => this.switchStep('1'));
        } else {
            document.getElementById('btn-exit-hunter').addEventListener('click', () => this.switchStep('0b'));
        }
    }

    // 【ゲーム③】 Voicing Builder (コード作り)
    startVoicingBuilderGame() {
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
            setTimeout(() => panel.classList.remove('correct-pulse'), 400);
        } else {
            window.audioEngine.playIncorrectSfx();
            this.gameState.lives--;
            panel.classList.add('incorrect-pulse');
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

                <div style="display: flex; gap: 15px;">
                    <button class="action-btn" id="btn-restart-builder"><i class="fa-solid fa-rotate-left"></i> もう一度プレイ</button>
                    ${passed ? `<button class="action-btn" id="btn-go-to-3" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><i class="fa-solid fa-chevron-right"></i> Step 3 へ進む</button>` : `<button class="secondary-btn" id="btn-exit-builder"><i class="fa-solid fa-xmark"></i> 解説に戻る</button>`}
                </div>
            </div>
        `;

        document.getElementById('btn-restart-builder').addEventListener('click', () => this.startVoicingBuilderGame());
        if (passed) {
            document.getElementById('btn-go-to-3').addEventListener('click', () => this.switchStep('3'));
        } else {
            document.getElementById('btn-exit-builder').addEventListener('click', () => this.switchStep('2'));
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const app = new SilentRhythmApp();
    window.app = app;
    app.init();
});
