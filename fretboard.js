// fretboard.js - Ultra-Premium & Animated SVG Fretboard Component (GSAP Integrated)

class InteractiveFretboard {
    constructor(containerId, onFretClicked) {
        this.container = document.getElementById(containerId);
        this.onFretClicked = onFretClicked;
        
        this.width = 920;
        this.height = 180;
        this.numFrets = 24;
        
        this.openStrings = [64, 59, 55, 50, 45, 40]; // E4, B3, G3, D3, A2, E2
        this.activeMarkers = new Map();
        this.showAllNotes = false; // 全音表示モード用
        this.displayMode = 'notes'; // 'notes' or 'degrees'
        
        this.showOctaves = false;
        this.selectedPitchClass = null;
        
        this.svg = null;
        this.markersGroup = null;
        this.clickMarkersGroup = null;
        this.octaveLinesGroup = null;
        this.cagedGroup = null;
        
        this.notation = 'cde';
        this.lastClickedKey = null; // 最後にクリックした位置(弦-フレット)の常時表示用
        
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.style.borderRadius = '12px';
        this.svg.style.background = '#0b0d13';
        this.svg.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        
        this.createDefs();
        this.drawFretboardWood();
        this.drawFretsAndStrings();
        
        this.octaveLinesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.octaveLinesGroup);
        
        this.cagedGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.cagedGroup);
        
        this.markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.markersGroup);
        
        this.clickMarkersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.clickMarkersGroup);
        
        this.container.appendChild(this.svg);
        this.setupEvents();
    }

    createDefs() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        const woodGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        woodGrad.setAttribute('id', 'ebony-wood');
        woodGrad.setAttribute('x1', '0%');
        woodGrad.setAttribute('y1', '0%');
        woodGrad.setAttribute('x2', '100%');
        woodGrad.setAttribute('y2', '0%');
        
        const woodStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        woodStop1.setAttribute('offset', '0%');
        woodStop1.setAttribute('stop-color', '#12141c');
        const woodStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        woodStop2.setAttribute('offset', '50%');
        woodStop2.setAttribute('stop-color', '#1c1f2b');
        const woodStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        woodStop3.setAttribute('offset', '100%');
        woodStop3.setAttribute('stop-color', '#12141c');
        
        woodGrad.appendChild(woodStop1);
        woodGrad.appendChild(woodStop2);
        woodGrad.appendChild(woodStop3);
        
        const fretGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        fretGrad.setAttribute('id', 'fret-metal');
        fretGrad.setAttribute('x1', '0%');
        fretGrad.setAttribute('y1', '0%');
        fretGrad.setAttribute('x2', '0%');
        fretGrad.setAttribute('y2', '100%');
        
        const fretStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        fretStop1.setAttribute('offset', '0%');
        fretStop1.setAttribute('stop-color', '#d1d5db');
        const fretStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        fretStop2.setAttribute('offset', '50%');
        fretStop2.setAttribute('stop-color', '#f3f4f6');
        const fretStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        fretStop3.setAttribute('offset', '100%');
        fretStop3.setAttribute('stop-color', '#9ca3af');
        
        fretGrad.appendChild(fretStop1);
        fretGrad.appendChild(fretStop2);
        fretGrad.appendChild(fretStop3);
        
        const nutGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        nutGrad.setAttribute('id', 'nut-ivory');
        nutGrad.setAttribute('x1', '0%');
        nutGrad.setAttribute('y1', '0%');
        nutGrad.setAttribute('x2', '100%');
        nutGrad.setAttribute('y2', '0%');
        
        const nutStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        nutStop1.setAttribute('offset', '0%');
        nutStop1.setAttribute('stop-color', '#e5e7eb');
        const nutStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        nutStop2.setAttribute('offset', '50%');
        nutStop2.setAttribute('stop-color', '#fef3c7');
        const nutStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        nutStop3.setAttribute('offset', '100%');
        nutStop3.setAttribute('stop-color', '#d1d5db');
        
        nutGrad.appendChild(nutStop1);
        nutGrad.appendChild(nutStop2);
        nutGrad.appendChild(nutStop3);

        const abaloneGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        abaloneGrad.setAttribute('id', 'abalone-inlay');
        abaloneGrad.setAttribute('cx', '50%');
        abaloneGrad.setAttribute('cy', '50%');
        abaloneGrad.setAttribute('r', '50%');
        
        const abStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        abStop1.setAttribute('offset', '0%');
        abStop1.setAttribute('stop-color', '#ffffff');
        const abStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        abStop2.setAttribute('offset', '70%');
        abStop2.setAttribute('stop-color', '#e2e8f0');
        const abStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        abStop3.setAttribute('offset', '100%');
        abStop3.setAttribute('stop-color', '#cbd5e1');
        
        abaloneGrad.appendChild(abStop1);
        abaloneGrad.appendChild(abStop2);
        abaloneGrad.appendChild(abStop3);
        
        defs.appendChild(woodGrad);
        defs.appendChild(fretGrad);
        defs.appendChild(nutGrad);
        defs.appendChild(abaloneGrad);
        this.svg.appendChild(defs);
    }

    drawFretboardWood() {
        const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        board.setAttribute('x', '0');
        board.setAttribute('y', '0');
        board.setAttribute('width', this.width);
        board.setAttribute('height', this.height);
        board.setAttribute('fill', 'url(#ebony-wood)');
        this.svg.appendChild(board);
        
        const bindTop = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bindTop.setAttribute('x1', '0');
        bindTop.setAttribute('y1', '10');
        bindTop.setAttribute('x2', this.width);
        bindTop.setAttribute('y2', '10');
        bindTop.setAttribute('stroke', 'rgba(251, 191, 36, 0.4)');
        bindTop.setAttribute('stroke-width', '1.5');
        
        const bindBottom = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bindBottom.setAttribute('x1', '0');
        bindBottom.setAttribute('y1', this.height - 10);
        bindBottom.setAttribute('x2', this.width);
        bindBottom.setAttribute('y2', this.height - 10);
        bindBottom.setAttribute('stroke', 'rgba(251, 191, 36, 0.4)');
        bindBottom.setAttribute('stroke-width', '1.5');
        
        this.svg.appendChild(bindTop);
        this.svg.appendChild(bindBottom);
    }

    getFretX(fretNum) {
        const margin = 45;
        const activeWidth = this.width - margin - 25;
        const scaleLength = 1.0 / (1.0 - Math.pow(1 / 1.059463, this.numFrets + 1));
        const factor = scaleLength * (1.0 - Math.pow(1 / 1.059463, fretNum));
        return margin + factor * activeWidth;
    }

    getStringY(stringIndex) {
        const padding = 20;
        const spacing = (this.height - padding * 2) / 5;
        return padding + stringIndex * spacing;
    }

    drawFretsAndStrings() {
        const margin = 45;
        
        const dotFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
        dotFrets.forEach(fret => {
            const x1 = this.getFretX(fret - 1);
            const x2 = this.getFretX(fret);
            const centerX = (x1 + x2) / 2;
            const centerY = this.height / 2;
            
            if (fret === 12 || fret === 24) {
                const y1 = this.getStringY(1) + 13;
                const y2 = this.getStringY(3) + 13;
                
                [y1, y2].forEach(y => {
                    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    dot.setAttribute('cx', centerX);
                    dot.setAttribute('cy', y);
                    dot.setAttribute('r', '6');
                    dot.setAttribute('fill', 'url(#abalone-inlay)');
                    dot.setAttribute('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))');
                    this.svg.appendChild(dot);
                });
            } else {
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', centerX);
                dot.setAttribute('cy', centerY);
                dot.setAttribute('r', '6');
                dot.setAttribute('fill', 'url(#abalone-inlay)');
                dot.setAttribute('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))');
                this.svg.appendChild(dot);
            }
        });
        
        for (let i = 0; i <= this.numFrets; i++) {
            const x = this.getFretX(i);
            
            if (i === 0) {
                const nut = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                nut.setAttribute('x', x - 3);
                nut.setAttribute('y', '9');
                nut.setAttribute('width', '6');
                nut.setAttribute('height', this.height - 18);
                nut.setAttribute('fill', 'url(#nut-ivory)');
                nut.setAttribute('rx', '1');
                nut.setAttribute('filter', 'drop-shadow(2px 0px 4px rgba(0,0,0,0.4))');
                this.svg.appendChild(nut);
            } else {
                // フレットの左側のハイライト線（立体感強化）
                const lineHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                lineHighlight.setAttribute('x1', x - 1);
                lineHighlight.setAttribute('y1', '10');
                lineHighlight.setAttribute('x2', x - 1);
                lineHighlight.setAttribute('y2', this.height - 10);
                lineHighlight.setAttribute('stroke', 'rgba(255, 255, 255, 0.25)');
                lineHighlight.setAttribute('stroke-width', '1');
                this.svg.appendChild(lineHighlight);

                // メインのメタルフレット線（明るいメタルシルバーに固定）
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x);
                line.setAttribute('y1', '10');
                line.setAttribute('x2', x);
                line.setAttribute('y2', this.height - 10);
                line.setAttribute('stroke', '#a1a6b0');
                line.setAttribute('stroke-width', '3');
                this.svg.appendChild(line);
                
                // フレットの右側の影
                const lineShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                lineShadow.setAttribute('x1', x + 1.5);
                lineShadow.setAttribute('y1', '10');
                lineShadow.setAttribute('x2', x + 1.5);
                lineShadow.setAttribute('y2', this.height - 10);
                lineShadow.setAttribute('stroke', 'rgba(0,0,0,0.6)');
                lineShadow.setAttribute('stroke-width', '1.5');
                this.svg.appendChild(lineShadow);
            }
            
            if (i > 0) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                const prevX = this.getFretX(i - 1);
                label.setAttribute('x', (prevX + x) / 2);
                label.setAttribute('y', this.height - 2);
                label.setAttribute('fill', 'var(--text-muted)');
                label.setAttribute('font-family', 'var(--font-heading)');
                label.setAttribute('font-weight', '600');
                label.setAttribute('font-size', '11px');
                label.setAttribute('text-anchor', 'middle');
                label.textContent = i;
                this.svg.appendChild(label);
            }
        }
        
        for (let i = 0; i < 6; i++) {
            const y = this.getStringY(i);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '10');
            line.setAttribute('y1', y);
            line.setAttribute('x2', this.width - 10);
            line.setAttribute('y2', y);
            
            const thickness = 1.0 + (5 - i) * 0.5;
            line.setAttribute('stroke', '#e5e7eb');
            line.setAttribute('stroke-width', thickness);
            line.setAttribute('opacity', '0.85');
            line.setAttribute('filter', 'drop-shadow(0px 2px 2px rgba(0,0,0,0.6))');
            this.svg.appendChild(line);
        }
    }

    getNoteNameFromMidi(midi) {
        const cdeNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const doremiNames = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
        const noteIndex = midi % 12;
        return this.notation === 'doremi' ? doremiNames[noteIndex] : cdeNames[noteIndex];
    }

    setupEvents() {
        const handleInteraction = (clientX, clientY) => {
            const rect = this.svg.getBoundingClientRect();
            const relativeX = ((clientX - rect.left) / rect.width) * this.width;
            const relativeY = ((clientY - rect.top) / rect.height) * this.height;
            
            let closestStringIndex = 0;
            let minDistanceY = 999;
            for (let i = 0; i < 6; i++) {
                const dist = Math.abs(relativeY - this.getStringY(i));
                if (dist < minDistanceY) {
                    minDistanceY = dist;
                    closestStringIndex = i;
                }
            }
            
            let targetFret = 0;
            const margin = 45;
            
            if (relativeX < margin) {
                targetFret = 0;
            } else {
                for (let i = 1; i <= this.numFrets; i++) {
                    const prevX = this.getFretX(i - 1);
                    const currX = this.getFretX(i);
                    if (relativeX >= prevX && relativeX <= currX) {
                        targetFret = i;
                        break;
                    }
                }
            }
            
            const midi = this.openStrings[closestStringIndex] + targetFret;
            this.lastClickedKey = `${closestStringIndex}-${targetFret}`;
            this.renderMarkers();
            this.showClickMarker(closestStringIndex, targetFret, midi);
            
            if (this.onFretClicked) {
                this.onFretClicked(midi, closestStringIndex, targetFret);
            }
        };

        this.svg.addEventListener('mousedown', (e) => {
            handleInteraction(e.clientX, e.clientY);
        });

        this.svg.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleInteraction(touch.clientX, touch.clientY);
        }, { passive: false });
    }

    showClickMarker(stringIndex, fret, midi) {
        const isActive = this.activeMarkers.has(midi) || this.activeMarkers.has(`${stringIndex}-${fret}`);
        
        const x = fret === 0 ? 22 : (this.getFretX(fret - 1) + this.getFretX(fret)) / 2;
        const y = this.getStringY(stringIndex);
        
        // ハイフレットでのサークル重なりを防ぐ動的サイズ調整
        const fretWidth = fret === 0 ? 45 : (this.getFretX(fret) - this.getFretX(fret - 1));
        let r = 12.5; // 弦の間隔 28px に対し、直径 25px とすることで重なりを防止
        let fontSize = 11;
        let textYOffset = 3.5;
        if (fretWidth < 28) {
            r = Math.max(9.0, fretWidth * 0.45);
            fontSize = Math.max(8, fretWidth * 0.35);
            textYOffset = fontSize * 0.35;
        }
        
        // 1. タップ時に周囲に広がる光の波紋エフェクトを追加（常に表示）
        const ripple = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ripple.setAttribute('cx', x);
        ripple.setAttribute('cy', y);
        ripple.setAttribute('r', r);
        ripple.setAttribute('fill', 'none');
        ripple.setAttribute('stroke', 'var(--accent-amber)');
        ripple.setAttribute('stroke-width', '2');
        ripple.setAttribute('filter', 'drop-shadow(0 0 6px var(--accent-amber))');
        this.clickMarkersGroup.appendChild(ripple);
        
        if (window.gsap) {
            window.gsap.to(ripple, {
                scale: 2.2,
                transformOrigin: `${x}px ${y}px`,
                opacity: 0,
                duration: 0.45,
                ease: "power2.out",
                onComplete: () => {
                    try { this.clickMarkersGroup.removeChild(ripple); } catch(e) {}
                }
            });
        } else {
            setTimeout(() => {
                try { this.clickMarkersGroup.removeChild(ripple); } catch(e) {}
            }, 450);
        }
        
        // 2. 既にアクティブなマーカーがある場合は、その既存マーカーをポップ（アニメーション）させて終了
        if (isActive) {
            const existingGroup = this.markersGroup.querySelector(`[data-loc="${stringIndex}-${fret}"]`);
            if (existingGroup && window.gsap) {
                window.gsap.to(existingGroup, {
                    scale: 1.3,
                    duration: 0.12,
                    yoyo: true,
                    repeat: 1,
                    transformOrigin: `${x}px ${y}px`
                });
            }
            return;
        }
        
        // 3. アクティブでない場合は、一時的な白マーカーを表示する
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', 'rgba(255, 255, 255, 0.45)');
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'drop-shadow(0 0 5px rgba(255,255,255,0.6))');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + textYOffset);
        text.setAttribute('fill', '#000');
        text.setAttribute('font-family', 'var(--font-heading)');
        text.setAttribute('font-size', `${fontSize}px`);
        text.setAttribute('font-weight', '800');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = this.getNoteNameFromMidi(midi);
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.appendChild(circle);
        group.appendChild(text);
        this.clickMarkersGroup.appendChild(group);
        
        if (window.gsap) {
            window.gsap.from(group, { scale: 0, transformOrigin: `${x}px ${y}px`, duration: 0.25, ease: "back.out(2)" });
            setTimeout(() => {
                window.gsap.to(group, { opacity: 0, scale: 0.5, transformOrigin: `${x}px ${y}px`, duration: 0.2, onComplete: () => {
                    try { this.clickMarkersGroup.removeChild(group); } catch(e) {}
                }});
            }, 250);
        } else {
            group.style.transition = 'opacity 0.25s';
            group.style.opacity = '0';
            setTimeout(() => {
                try { this.clickMarkersGroup.removeChild(group); } catch(e) {}
            }, 250);
        }
    }

    setDisplayMode(mode) {
        this.displayMode = mode;
    }

    clearMarkers() {
        this.activeMarkers.clear();
        this.lastClickedKey = null;
        this.markersGroup.innerHTML = '';
        this.clickMarkersGroup.innerHTML = '';
        this.octaveLinesGroup.innerHTML = '';
        if (this.showAllNotes) {
            this.renderMarkers();
        }
    }

    addMarker(midi, type) {
        this.activeMarkers.set(midi, type);
    }

    renderMarkers() {
        this.markersGroup.innerHTML = '';
        this.octaveLinesGroup.innerHTML = '';
        
        const renderedCoordsByPitchClass = {};
        
        for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
            for (let fret = 0; fret <= this.numFrets; fret++) {
                const midi = this.openStrings[stringIndex] + fret;
                const pitchClass = midi % 12;
                const locKey = `${stringIndex}-${fret}`;
                const isLastClicked = (locKey === this.lastClickedKey);
                const isMarkerActive = this.activeMarkers.has(midi) || 
                                       this.activeMarkers.has(locKey) || 
                                       isLastClicked ||
                                       (this.showOctaves && pitchClass === this.selectedPitchClass);
                
                if (isMarkerActive || this.showAllNotes) {
                    let type = this.activeMarkers.get(midi) || this.activeMarkers.get(locKey);
                    
                    if (!type && isLastClicked) {
                        type = 'last-clicked';
                    }
                    if (!type && this.showOctaves && pitchClass === this.selectedPitchClass) {
                        type = 'scale';
                    }
                    
                    const x = fret === 0 ? 22 : (this.getFretX(fret - 1) + this.getFretX(fret)) / 2;
                    const y = this.getStringY(stringIndex);
                    
                    // ハイフレットでのサークル重なりを防ぐ動的サイズ調整
                    const fretWidth = fret === 0 ? 45 : (this.getFretX(fret) - this.getFretX(fret - 1));
                    let r = 12.5; // 弦の間隔 28px に対し、直径 25px とすることで重なりを防止
                    let fontSize = 11;
                    let textYOffset = 3.5;
                    if (fretWidth < 28) {
                        r = Math.max(9.0, fretWidth * 0.45);
                        fontSize = Math.max(8, fretWidth * 0.35);
                        textYOffset = fontSize * 0.35;
                    }
                    
                    let markerColor;
                    let opacity = "1.0";
                    let strokeColor = "#fff";
                    let glowFilter = "";
                    let isCustomActive = isMarkerActive;
                    
                    if (isCustomActive) {
                        const colorMap = {
                            'root': 'var(--color-root)',
                            '3rd': 'var(--color-3rd)',
                            '5th': 'var(--color-5th)',
                            '7th': 'var(--color-7th)',
                            'scale': 'var(--color-scale)',
                            'question': 'var(--accent-purple)',
                            'last-clicked': 'var(--accent-amber)'
                        };
                        markerColor = colorMap[type] || 'var(--accent-amber)';
                        glowFilter = `drop-shadow(0px 0px 6px ${markerColor})`;
                    } else {
                        // 全音表示だが、アクティブ選択されていないフレット
                        markerColor = 'rgba(255, 255, 255, 0.08)'; 
                        strokeColor = 'rgba(255, 255, 255, 0.35)';
                        opacity = "0.85";
                    }
                    
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', x);
                    circle.setAttribute('cy', y);
                    circle.setAttribute('r', r);
                    circle.setAttribute('fill', markerColor);
                    circle.setAttribute('stroke', strokeColor);
                    circle.setAttribute('stroke-width', '1.5');
                    circle.setAttribute('opacity', opacity);
                    if (glowFilter) circle.setAttribute('filter', glowFilter);
                    
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', x);
                    text.setAttribute('y', y + textYOffset);
                    text.setAttribute('fill', isCustomActive ? '#fff' : 'rgba(255, 255, 255, 0.85)');
                    text.setAttribute('font-family', 'var(--font-heading)');
                    text.setAttribute('font-size', `${fontSize}px`);
                    text.setAttribute('font-weight', '800');
                    text.setAttribute('opacity', opacity);
                    text.setAttribute('text-anchor', 'middle');
                    let labelText = this.getNoteNameFromMidi(midi);
                    if (this.displayMode === 'degrees') {
                        const degreeLabels = {
                            'root': 'R',
                            '3rd': '3',
                            '5th': '5',
                            '7th': '7',
                            'scale': 'S'
                        };
                        labelText = degreeLabels[type] || '•';
                    }
                    text.textContent = type === 'question' ? '?' : labelText;
                    
                    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    group.setAttribute('data-loc', locKey);
                    group.setAttribute('data-midi', midi);
                    group.appendChild(circle);
                    group.appendChild(text);
                    this.markersGroup.appendChild(group);
                    
                    // GSAP によるポップアップ（全音表示の定常音はうるさいので、アクティブ音のみアニメーション）
                    if (isCustomActive && window.gsap) {
                        window.gsap.from(group, {
                            scale: 0,
                            transformOrigin: `${x}px ${y}px`,
                            duration: 0.35,
                            ease: "back.out(1.8)"
                        });
                    }
                    
                    if (isCustomActive && this.showOctaves && pitchClass === this.selectedPitchClass) {
                        if (!renderedCoordsByPitchClass[pitchClass]) {
                            renderedCoordsByPitchClass[pitchClass] = [];
                        }
                        renderedCoordsByPitchClass[pitchClass].push({ x, y });
                    }
                }
            }
        }
        
        if (this.showOctaves && this.selectedPitchClass !== null) {
            const coords = renderedCoordsByPitchClass[this.selectedPitchClass] || [];
            coords.sort((a, b) => a.x - b.x);
            
            for (let i = 0; i < coords.length - 1; i++) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', coords[i].x);
                line.setAttribute('y1', coords[i].y);
                line.setAttribute('x2', coords[i+1].x);
                line.setAttribute('y2', coords[i+1].y);
                
                line.setAttribute('stroke', 'rgba(255, 255, 255, 0.45)');
                line.setAttribute('stroke-width', '1.5');
                line.setAttribute('stroke-dasharray', '4 4');
                line.setAttribute('filter', 'drop-shadow(0 0 2px rgba(255,255,255,0.4))');
                this.octaveLinesGroup.appendChild(line);
                
                // GSAP で点線がスッと伸びていく線引きアニメーション
                if (window.gsap) {
                    window.gsap.from(line, {
                        strokeDashoffset: 20,
                        duration: 0.4,
                        ease: "power2.out"
                    });
                }
            }
        }
    }

    setShowAllNotes(active) {
        this.showAllNotes = active;
        this.renderMarkers();
    }

    setOctaveHighlight(pitchClass, active = true) {
        this.showOctaves = active;
        this.selectedPitchClass = pitchClass;
        this.renderMarkers();
    }

    setNotation(type) {
        this.notation = type;
        this.renderMarkers();
    }

    showCAGED(rootName) {
        this.hideCAGED();
        if (!rootName) return;

        const rootFrets6 = { 'C': 8, 'D': 10, 'E': 12, 'F': 1, 'G': 3, 'A': 5, 'B': 7 };
        let r6 = rootFrets6[rootName];
        if (!r6) return;

        const configurations = [
            { name: 'E Block', offset: 0, range: [-1, 2], color: 'rgba(167, 139, 250, 0.03)', border: 'rgba(167, 139, 250, 0.25)' },
            { name: 'D Block', offset: 2, range: [-1, 3], color: 'rgba(251, 113, 133, 0.03)', border: 'rgba(251, 113, 133, 0.25)' },
            { name: 'C Block', offset: 5, range: [-2, 1], color: 'rgba(251, 191, 36, 0.03)', border: 'rgba(251, 191, 36, 0.25)' },
            { name: 'A Block', offset: 7, range: [-1, 3], color: 'rgba(56, 189, 248, 0.03)', border: 'rgba(56, 189, 248, 0.25)' },
            { name: 'G Block', offset: 10, range: [-3, 1], color: 'rgba(52, 211, 153, 0.03)', border: 'rgba(52, 211, 153, 0.25)' }
        ];

        configurations.forEach(cfg => {
            let baseCenter = (r6 + cfg.offset) % 12;
            if (baseCenter <= 0) baseCenter += 12;

            const centers = [baseCenter - 12, baseCenter, baseCenter + 12, baseCenter + 24];
            centers.forEach(center => {
                let start = center + cfg.range[0];
                let end = center + cfg.range[1];

                if (start < 0) start = 0;
                if (end > 24) end = 24;
                if (start > 24 || end < 0 || start > end) return;

                const xStart = start === 0 ? 45 : this.getFretX(start - 1);
                const xEnd = this.getFretX(end);
                const width = xEnd - xStart;

                if (width <= 0) return;

                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', xStart);
                rect.setAttribute('y', 10);
                rect.setAttribute('width', width);
                rect.setAttribute('height', this.height - 20);
                rect.setAttribute('fill', cfg.color);
                rect.setAttribute('stroke', cfg.border);
                rect.setAttribute('stroke-width', '1.5');
                rect.setAttribute('stroke-dasharray', '4 4');
                rect.setAttribute('rx', '6');
                this.cagedGroup.appendChild(rect);

                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', xStart + width / 2);
                text.setAttribute('y', this.height - 14);
                text.setAttribute('fill', cfg.border);
                text.setAttribute('font-family', 'var(--font-heading)');
                text.setAttribute('font-size', '9px');
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('text-anchor', 'middle');
                text.textContent = cfg.name;
                this.cagedGroup.appendChild(text);
            });
        });
    }

    hideCAGED() {
        if (this.cagedGroup) {
            this.cagedGroup.innerHTML = '';
        }
    }
}

window.InteractiveFretboard = InteractiveFretboard;
