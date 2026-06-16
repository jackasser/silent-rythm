// staff.js - Accurate, Premium & Animated SVG Staff Component (GSAP Integrated)

class InteractiveStaff {
    constructor(containerId, onNoteChanged) {
        this.container = document.getElementById(containerId);
        this.onNoteChanged = onNoteChanged;
        
        this.width = 750;
        this.height = 280;
        this.lineSpacing = 16;
        this.topLineY = 90;
        
        this.whiteNotes = [
            { midi: 40, name: 'E2', step: -12 },
            { midi: 41, name: 'F2', step: -11 },
            { midi: 43, name: 'G2', step: -10 },
            { midi: 45, name: 'A2', step: -9 },
            { midi: 47, name: 'B2', step: -8 },
            { midi: 48, name: 'C3', step: -7 },
            { midi: 50, name: 'D3', step: -6 },
            { midi: 52, name: 'E3', step: -5 },
            { midi: 53, name: 'F3', step: -4 },
            { midi: 55, name: 'G3', step: -3 },
            { midi: 57, name: 'A3', step: -2 },
            { midi: 59, name: 'B3', step: -1 },
            { midi: 60, name: 'C4', step: 0 },  // 下第一線
            { midi: 62, name: 'D4', step: 1 },  // 下第一間
            { midi: 64, name: 'E4', step: 2 },  // 第1線
            { midi: 65, name: 'F4', step: 3 },  // 第1間
            { midi: 67, name: 'G4', step: 4 },  // 第2線
            { midi: 69, name: 'A4', step: 5 },  // 第2間
            { midi: 71, name: 'B4', step: 6 },  // 第3線
            { midi: 72, name: 'C5', step: 7 },  // 第3間
            { midi: 74, name: 'D5', step: 8 },  // 第4線
            { midi: 76, name: 'E5', step: 9 },  // 第4間
            { midi: 77, name: 'F5', step: 10 }, // 第5線
            { midi: 79, name: 'G5', step: 11 }, // 第5間
            { midi: 81, name: 'A5', step: 12 }, // 上第一線
            { midi: 83, name: 'B5', step: 13 },
            { midi: 84, name: 'C6', step: 14 },
            { midi: 86, name: 'D6', step: 15 },
            { midi: 88, name: 'E6', step: 16 },
            { midi: 89, name: 'F6', step: 17 },
            { midi: 91, name: 'G6', step: 18 },
            { midi: 93, name: 'A6', step: 19 }
        ];
        
        this.currentNote = this.whiteNotes.find(n => n.midi === 60) || this.whiteNotes[12]; // C4
        this.isDragging = false;
        this.svg = null;
        this.noteEl = null;
        this.ledgerLinesEl = null;
        
        this.notation = 'cde';
        
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.style.cursor = 'grab';
        
        this.container.appendChild(this.svg);
        
        this.createFilters();
        this.drawStaffLines();
        this.drawClef();
        
        this.ledgerLinesEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.ledgerLinesEl);
        
        this.drawNote(false); // 初期化時はアニメーションなし
        this.setupEvents();
    }

    createFilters() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        glow.setAttribute('id', 'note-glow');
        glow.setAttribute('x', '-50%');
        glow.setAttribute('y', '-50%');
        glow.setAttribute('width', '200%');
        glow.setAttribute('height', '200%');
        
        const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        blur.setAttribute('stdDeviation', '4');
        blur.setAttribute('result', 'coloredBlur');
        
        const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        mergeNode1.setAttribute('in', 'coloredBlur');
        const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        mergeNode2.setAttribute('in', 'SourceGraphic');
        
        merge.appendChild(mergeNode1);
        merge.appendChild(mergeNode2);
        glow.appendChild(blur);
        glow.appendChild(merge);
        
        const grad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        grad.setAttribute('id', 'note-grad');
        grad.setAttribute('cx', '35%');
        grad.setAttribute('cy', '35%');
        grad.setAttribute('r', '60%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#ffffff');
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', 'var(--accent-amber)');
        
        grad.appendChild(stop1);
        grad.appendChild(stop2);
        
        defs.appendChild(glow);
        defs.appendChild(grad);
        this.svg.appendChild(defs);
    }

    drawStaffLines() {
        for (let i = 0; i < 5; i++) {
            const y = this.topLineY + i * this.lineSpacing;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '30');
            line.setAttribute('y1', y);
            line.setAttribute('x2', this.width - 30);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', 'rgba(255, 255, 255, 0.35)');
            line.setAttribute('stroke-width', '2');
            this.svg.appendChild(line);
        }
    }

    drawClef() {
        const clefGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const clef = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        clef.setAttribute('d', 'M32.108,45.02C31.428,42.709,30.78,40.425,30.195,38.209C34.229,34.433,37.429,29.413,37.5,21.283C37.536,17.06,37.032,12.006,33.025,6.535C31.843,4.922,29.604,4.519,27.934,5.621C23.985,8.227,20,14.457,20,22.5C20,26.253,20.699,30.663,21.782,35.411C20.949,36.021,20.077,36.63,19.177,37.259C12.86,41.667,5,47.153,5,60C5,74.084,16.44,82.5,27.5,82.5C29.658,82.5,31.729,82.271,33.677,81.841C33.684,82.066,33.688,82.285,33.688,82.5C33.688,85.257,31.445,87.5,28.688,87.5C27.352,87.5,26.096,86.98,25.153,86.036L19.848,91.339C22.209,93.7,25.348,95,28.688,95C35.581,95,41.188,89.393,41.188,82.5C41.188,81.387,41.118,80.206,40.986,78.964C46.528,75.615,50,70.154,50,63.75C50,53.699,42.05,45.47,32.108,45.02ZM29.244,15.311C29.86,17.224,30.017,19.139,30,21.218C29.973,24.421,29.287,26.889,28.125,28.943C27.729,26.582,27.5,24.41,27.5,22.5C27.5,19.607,28.264,17.158,29.244,15.311ZM27.5,75C20.229,75,12.5,69.743,12.5,60C12.5,51.065,17.341,47.686,23.469,43.409C23.573,43.337,23.677,43.264,23.781,43.192C24.103,44.346,24.438,45.509,24.78,46.677C19.873,49.271,16.188,54.53,16.188,60C16.188,63.338,17.488,66.477,19.848,68.838L25.153,63.535C24.209,62.59,23.688,61.335,23.688,59.999C23.688,57.909,25.121,55.645,27.027,54.157C27.096,54.384,27.166,54.611,27.234,54.838C29.303,61.627,31.419,68.566,32.64,74.372C31.05,74.78,29.322,75,27.5,75ZM39.503,70.664C38.239,65.243,36.406,59.209,34.508,52.981C39.128,54.381,42.5,58.679,42.5,63.75C42.5,67.625,41.348,71.216,39.503,70.664Z');
        clef.setAttribute('fill', 'var(--accent-amber)');
        clef.setAttribute('filter', 'drop-shadow(0px 0px 5px rgba(251, 191, 36, 0.45))');
        
        const g4Y = this.getNoteY(4);
        const scale = 1.0;
        const clefCenterY = 60 * scale; 
        const translateY = g4Y - clefCenterY;
        
        clefGroup.setAttribute('transform', `translate(40, ${translateY}) scale(${scale})`);
        clefGroup.appendChild(clef);
        this.svg.appendChild(clefGroup);
    }

    getNoteY(step) {
        const firstLineY = this.topLineY + 4 * this.lineSpacing;
        const stepHeight = this.lineSpacing / 2;
        return firstLineY - (step - 2) * stepHeight;
    }

    getNoteName(note) {
        const nameMapCDE = {
            'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A', 'B': 'B'
        };
        const nameMapDoReMi = {
            'C': 'ド', 'D': 'レ', 'E': 'ミ', 'F': 'ファ', 'G': 'ソ', 'A': 'ラ', 'B': 'シ'
        };
        
        const baseName = note.name.substring(0, 1);
        const hasSharp = note.name.includes('#');
        const octave = note.name.replace(/[^0-9]/g, '');
        const suffix = hasSharp ? '#' : '';
        
        if (this.notation === 'doremi') {
            return nameMapDoReMi[baseName] + suffix + octave;
        } else {
            return nameMapCDE[baseName] + suffix + octave;
        }
    }

    // 音符の描画 (GSAP を用いた滑らかなスナップ・イージングに対応)
    drawNote(animate = true) {
        // If the current noteEl is a chord stack group, remove it and reconstruct a single draggable note
        if (this.noteEl && this.noteEl.classList && !this.noteEl.classList.contains('draggable-note')) {
            if (this.noteEl.parentNode) {
                this.noteEl.parentNode.removeChild(this.noteEl);
            }
            this.noteEl = null;
        }

        const x = this.width / 2 + 30;
        const targetY = this.getNoteY(this.currentNote.step);
        
        let head, stem, label, accidental;

        // 初回描画、または音符グループが無い場合は新しく作成
        if (!this.noteEl) {
            this.noteEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            this.noteEl.setAttribute('class', 'draggable-note');
            
            // 符頭
            head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            head.setAttribute('id', 'note-head-shape');
            head.setAttribute('cx', x);
            head.setAttribute('cy', targetY);
            head.setAttribute('rx', this.lineSpacing * 0.72);
            head.setAttribute('ry', this.lineSpacing * 0.48);
            head.setAttribute('fill', 'url(#note-grad)');
            head.setAttribute('filter', 'url(#note-glow)');
            head.setAttribute('transform', `rotate(-28, ${x}, ${targetY})`);
            
            // 変化記号 (シャープ)
            accidental = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            accidental.setAttribute('id', 'note-accidental-shape');
            accidental.setAttribute('fill', '#ffffff');
            accidental.setAttribute('font-family', 'var(--font-heading)');
            accidental.setAttribute('font-weight', '800');
            accidental.setAttribute('font-size', '26px');
            accidental.setAttribute('text-anchor', 'middle');
            
            // 符尾
            stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            stem.setAttribute('id', 'note-stem-shape');
            stem.setAttribute('stroke', '#ffffff');
            stem.setAttribute('stroke-width', '2.5');
            stem.setAttribute('stroke-linecap', 'round');
            
            // ラベル
            label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('id', 'note-label-shape');
            label.setAttribute('x', x + 30);
            label.setAttribute('y', targetY + 6);
            label.setAttribute('fill', 'var(--accent-amber)');
            label.setAttribute('font-family', 'var(--font-heading)');
            label.setAttribute('font-weight', '800');
            label.setAttribute('font-size', '20px');
            label.setAttribute('filter', 'drop-shadow(0 0 6px var(--accent-amber-glow))');
            
            this.noteEl.appendChild(head);
            this.noteEl.appendChild(accidental);
            this.noteEl.appendChild(stem);
            this.noteEl.appendChild(label);
            this.svg.appendChild(this.noteEl);
        } else {
            head = this.noteEl.querySelector ? this.noteEl.querySelector('#note-head-shape') : document.getElementById('note-head-shape');
            stem = this.noteEl.querySelector ? this.noteEl.querySelector('#note-stem-shape') : document.getElementById('note-stem-shape');
            label = this.noteEl.querySelector ? this.noteEl.querySelector('#note-label-shape') : document.getElementById('note-label-shape');
            accidental = this.noteEl.querySelector ? this.noteEl.querySelector('#note-accidental-shape') : document.getElementById('note-accidental-shape');
        }
        
        // 符尾の長さと向きの計算
        const stemLength = this.lineSpacing * 3.5;
        const stemX = x + this.lineSpacing * 0.65;
        
        let sX1, sY1, sX2, sY2;
        if (this.currentNote.step >= 6) {
            sX1 = x - this.lineSpacing * 0.65;
            sY1 = targetY;
            sX2 = x - this.lineSpacing * 0.65;
            sY2 = targetY + stemLength;
        } else {
            sX1 = stemX;
            sY1 = targetY;
            sX2 = stemX;
            sY2 = targetY - stemLength;
        }

        // 変化記号 (シャープ) の表示と位置合わせ
        if (accidental) {
            accidental.textContent = this.currentNote.isSharp ? '♯' : '';
            const accX = x - this.lineSpacing * 1.8;
            const accY = targetY + 8;
            if (animate && window.gsap) {
                window.gsap.to(accidental, { attr: { x: accX, y: accY }, duration: 0.45, ease: "elastic.out(1, 0.6)" });
            } else {
                accidental.setAttribute('x', accX);
                accidental.setAttribute('y', accY);
            }
        }

        // GSAP を用いたウルトラスムーズアニメーション (スナップ時や外部同期時に elastic イージング)
        if (animate && window.gsap) {
            // スナップ時のプニッとした心地よいイージング
            window.gsap.to(head, { attr: { cy: targetY }, duration: 0.45, ease: "elastic.out(1, 0.6)" });
            window.gsap.to(head, { attr: { transform: `rotate(-28, ${x}, ${targetY})` }, duration: 0.45, ease: "elastic.out(1, 0.6)" });
            window.gsap.to(stem, { attr: { x1: sX1, y1: sY1, x2: sX2, y2: sY2 }, duration: 0.45, ease: "elastic.out(1, 0.6)" });
            window.gsap.to(label, { attr: { y: targetY + 6 }, duration: 0.45, ease: "elastic.out(1, 0.6)" });
        } else {
            // ドラッグ中の即時反映 (ラグを防止)
            head.setAttribute('cy', targetY);
            head.setAttribute('transform', `rotate(-28, ${x}, ${targetY})`);
            stem.setAttribute('x1', sX1);
            stem.setAttribute('y1', sY1);
            stem.setAttribute('x2', sX2);
            stem.setAttribute('y2', sY2);
            label.setAttribute('y', targetY + 6);
        }

        // 音名ラベルの更新
        label.textContent = this.getNoteName(this.currentNote);
        
        // 加線の描画
        this.drawLedgerLines(x, targetY);
    }

    drawLedgerLines(x, y) {
        this.ledgerLinesEl.innerHTML = '';
        const step = this.currentNote.step;
        
        if (step <= 0) {
            for (let s = 0; s >= step; s -= 2) {
                this.createLedgerLine(x, this.getNoteY(s));
            }
        }
        
        if (step >= 12) {
            for (let s = 12; s <= step; s += 2) {
                this.createLedgerLine(x, this.getNoteY(s));
            }
        }
    }

    createLedgerLine(x, y) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x - 22);
        line.setAttribute('y1', y);
        line.setAttribute('x2', x + 22);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#ffffff');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');
        this.ledgerLinesEl.appendChild(line);
    }

    getNoteFromY(y) {
        const firstLineY = this.topLineY + 4 * this.lineSpacing;
        const stepHeight = this.lineSpacing / 2;
        const rawStep = Math.round((firstLineY - y) / stepHeight) + 2;
        
        const minStep = -12;
        const maxStep = 19;
        const step = Math.max(minStep, Math.min(maxStep, rawStep));
        
        return this.whiteNotes.find(n => n.step === step) || this.currentNote;
    }

    setupEvents() {
        const handleStart = (clientX, clientY) => {
            this.isDragging = true;
            this.svg.style.cursor = 'grabbing';
            this.updateNoteFromEvent(clientY, false); // ドラッグ中は即時反映
        };

        const handleMove = (clientX, clientY) => {
            if (!this.isDragging) return;
            this.updateNoteFromEvent(clientY, false); // ドラッグ中も即時反映
        };

        const handleEnd = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.svg.style.cursor = 'grab';
                this.drawNote(true); // マウスを離したスナップ時にGSAPでプニッと吸い付く
            }
        };

        this.svg.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleStart(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            handleEnd();
        });

        // タッチ
        this.svg.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        }, { passive: false });

        window.addEventListener('touchend', () => {
            handleEnd();
        });
    }

    updateNoteFromEvent(clientY, animate = false) {
        const rect = this.svg.getBoundingClientRect();
        const relativeY = ((clientY - rect.top) / rect.height) * this.height;
        
        const note = this.getNoteFromY(relativeY);
        if (note.midi !== this.currentNote.midi) {
            this.currentNote = note;
            this.drawNote(animate);
            
            const readout = document.getElementById('staff-readout');
            if (readout) {
                readout.textContent = `選択された音: ${this.getNoteName(note)}`;
            }
            
            if (this.onNoteChanged) {
                this.onNoteChanged(note.midi);
            }
        }
    }

    setNoteByMidi(midi, animate = true) {
        const sharps = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A# in pitch classes
        const pitchClass = midi % 12;
        const isSharp = sharps.includes(pitchClass);
        
        let targetMidi = midi;
        if (isSharp) {
            targetMidi = midi - 1; // Map to the natural note below
        }
        
        let baseNote = this.whiteNotes.find(n => n.midi === targetMidi);
        if (!baseNote) {
            let minDiff = 999;
            this.whiteNotes.forEach(n => {
                const diff = Math.abs(n.midi - midi);
                if (diff < minDiff) {
                    minDiff = diff;
                    baseNote = n;
                }
            });
        }
        
        if (baseNote) {
            const hasSharpName = baseNote.name.substring(0, 1) + (isSharp ? '#' : '') + baseNote.name.substring(1);
            this.currentNote = {
                midi: midi,
                step: baseNote.step,
                isSharp: isSharp,
                name: hasSharpName
            };
            
            this.drawNote(animate);
            
            const readout = document.getElementById('staff-readout');
            if (readout) {
                readout.textContent = `選択された音: ${this.getNoteName(this.currentNote)}`;
            }
        }
    }

    setNotation(type) {
        this.notation = type;
        this.drawNote(false);
    }

    setChordNotes(midiNotes, degrees = []) {
        // Clear existing note elements and ledger lines
        if (this.noteEl) {
            this.svg.removeChild(this.noteEl);
            this.noteEl = null;
        }
        this.ledgerLinesEl.innerHTML = '';

        if (midiNotes.length === 0) return;

        // Create group container for chord notes
        this.noteEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.noteEl.setAttribute('class', 'chord-stack-group');

        const x = this.width / 2 + 30;

        midiNotes.forEach((midi, index) => {
            const sharps = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A# in pitch classes
            const pitchClass = midi % 12;
            const isSharp = sharps.includes(pitchClass);
            
            let targetMidi = midi;
            if (isSharp) {
                targetMidi = midi - 1; // Map to the natural note below
            }
            
            let baseNote = this.whiteNotes.find(n => n.midi === targetMidi);
            if (!baseNote) {
                let minDiff = 999;
                this.whiteNotes.forEach(n => {
                    const diff = Math.abs(n.midi - midi);
                    if (diff < minDiff) {
                        minDiff = diff;
                        baseNote = n;
                    }
                });
            }
            
            if (baseNote) {
                const targetY = this.getNoteY(baseNote.step);
                
                // Color note heads by their degree role
                const degreeColors = {
                    'root': 'var(--color-root)',
                    '3rd': 'var(--color-3rd)',
                    '5th': 'var(--color-5th)',
                    'b5th': 'var(--color-b5th)',
                    '7th': 'var(--color-7th)',
                    '9th': 'var(--color-scale)',
                    'scale': 'var(--color-scale)'
                };
                const color = degreeColors[degrees[index]] || 'url(#note-grad)';
                
                // Draw head
                const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                head.setAttribute('cx', x);
                head.setAttribute('cy', targetY);
                head.setAttribute('rx', this.lineSpacing * 0.72);
                head.setAttribute('ry', this.lineSpacing * 0.48);
                head.setAttribute('fill', color);
                head.setAttribute('filter', 'url(#note-glow)');
                head.setAttribute('transform', `rotate(-28, ${x}, ${targetY})`);
                this.noteEl.appendChild(head);
                
                // Draw accidental (sharp)
                if (isSharp) {
                    const accidental = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    accidental.setAttribute('fill', '#ffffff');
                    accidental.setAttribute('font-family', 'var(--font-heading)');
                    accidental.setAttribute('font-weight', '800');
                    accidental.setAttribute('font-size', '26px');
                    accidental.setAttribute('text-anchor', 'middle');
                    accidental.textContent = '♯';
                    accidental.setAttribute('x', x - this.lineSpacing * 1.8);
                    accidental.setAttribute('y', targetY + 9);
                    this.noteEl.appendChild(accidental);
                }
                
                // Add ledger lines
                this.drawLedgerLinesForStep(x, baseNote.step);
            }
        });

        this.svg.appendChild(this.noteEl);
    }

    drawLedgerLinesForStep(x, step) {
        if (step <= 0) {
            for (let s = 0; s >= step; s -= 2) {
                this.createLedgerLine(x, this.getNoteY(s));
            }
        }
        if (step >= 12) {
            for (let s = 12; s <= step; s += 2) {
                this.createLedgerLine(x, this.getNoteY(s));
            }
        }
    }
}

window.InteractiveStaff = InteractiveStaff;
