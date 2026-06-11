// audio-engine.js - Web Audio API Synthetic Sound Engine

class JazzAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.isPlaying = false;
        this.volume = 0.3; // マスター音量 (0.0〜1.0)
        
        // 伴奏用パラメータ
        this.bpm = 110;
        this.chordProgression = []; // { chord: 'Dm7', beats: 4 } の配列
        this.currentStep = 0; // 現在のコードのインデックス
        this.currentBeat = 0; // 現在のコード内の拍 (0〜3)
        this.totalBeatsElapsed = 0; // 再生開始からの累計拍数
        
        // タイマー/スケジューラ
        this.schedulerTimerId = null;
        this.nextNoteTime = 0.0;
        this.scheduleAheadTime = 0.1; // 秒単位でどれくらい先までスケジュールするか
        this.lookahead = 25.0; // ミリ秒単位でどれくらいの間隔でポーリングするか
        
        // パート設定
        this.pianoEnabled = true;
        
        // イベントリスナー（拍切り替え時にUIを更新するため）
        this.onTickListener = null;
    }

    init() {
        if (this.ctx) return;
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        // マスターボリュームノード
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterVolume.connect(this.ctx.destination);
    }

    // マスター音量の変更 (AudioContext未初期化でも値を保持し、init時に反映)
    setMasterVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.ctx && this.masterVolume) {
            this.masterVolume.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                // サイレントバッファの再生によりモバイルブラウザでのオーディオコンテキストを確実にアンロックする
                try {
                    const buffer = this.ctx.createBuffer(1, 1, 22050);
                    const source = this.ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(this.ctx.destination);
                    source.start(0);
                } catch (e) {
                    console.warn("Failed to play silent buffer to unlock AudioContext:", e);
                }
            }).catch(e => {
                console.error("Failed to resume AudioContext:", e);
            });
        }
    }

    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // 単音を再生 (ギターの音を模したサイン波＋三角波のブレンド)
    playNote(midiNote, duration = 0.5, volume = 0.5) {
        this.resume();
        const t = this.ctx.currentTime;
        const freq = this.midiToFreq(midiNote);
        
        // オシレーターの作成
        const osc = this.ctx.createOscillator();
        const oscTri = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'sine';
        oscTri.type = 'triangle';
        
        osc.frequency.setValueAtTime(freq, t);
        oscTri.frequency.setValueAtTime(freq, t);
        
        // 音量エンベロープ (アタックは早く、ディケイで減衰するギター風)
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, t + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        osc.connect(gainNode);
        oscTri.connect(gainNode);
        gainNode.connect(this.masterVolume);
        
        osc.start(t);
        oscTri.start(t);
        
        osc.stop(t + duration);
        oscTri.stop(t + duration);
    }

    // 和音を再生
    playChord(midiNotes, duration = 1.0, volume = 0.3) {
        this.resume();
        midiNotes.forEach(midi => {
            this.playNote(midi, duration, volume);
        });
    }

    // 正解音 (クリーンなメジャー9thアルペジオ)
    playCorrectSfx() {
        this.resume();
        const notes = [72, 76, 79, 83]; // C5, E5, G5, B5
        const t = this.ctx.currentTime;
        notes.forEach((midi, i) => {
            setTimeout(() => {
                this.playNote(midi, 0.4, 0.2);
            }, i * 70);
        });
    }

    // 不正解音 (不協和な低いノイズ風三角波)
    playIncorrectSfx() {
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(40, t + 0.3);
        
        gainNode.gain.setValueAtTime(0.15, t);
        gainNode.gain.linearRampToValueAtTime(0.001, t + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterVolume);
        
        osc.start(t);
        osc.stop(t + 0.3);
    }

    /* ----------------------------------------------------
       自動伴奏スケジューラ (Web Audio 精密タイミング)
       ---------------------------------------------------- */

    startBackingTrack(progression, onTick) {
        this.resume();
        if (this.isPlaying) this.stopBackingTrack();
        
        this.chordProgression = progression;
        this.onTickListener = onTick;
        this.isPlaying = true;
        this.currentStep = 0;
        this.currentBeat = 0;
        this.totalBeatsElapsed = 0;
        
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.scheduler();
    }

    stopBackingTrack() {
        this.isPlaying = false;
        if (this.schedulerTimerId) {
            clearTimeout(this.schedulerTimerId);
            this.schedulerTimerId = null;
        }
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.schedulePlay(this.currentStep, this.currentBeat, this.nextNoteTime);
            this.advanceBeat();
        }
        this.schedulerTimerId = setTimeout(() => this.scheduler(), this.lookahead);
    }

    advanceBeat() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += secondsPerBeat;
        
        // ビートの更新
        this.currentBeat++;
        this.totalBeatsElapsed++;
        
        const currentChord = this.chordProgression[this.currentStep];
        if (this.currentBeat >= currentChord.beats) {
            this.currentBeat = 0;
            this.currentStep = (this.currentStep + 1) % this.chordProgression.length;
        }
    }

    // 拍（Tick）ごとの音源再生定義
    schedulePlay(stepIndex, beatIndex, time) {
        if (!this.isPlaying) return;
        
        const chordData = this.chordProgression[stepIndex];
        const chordName = chordData.chord;
        const scaleRoot = chordData.rootMidi; // ベース用のルート音MIDI
        const chordNotes = chordData.notesMidi; // ピアノ伴奏用の和音MIDI
        
        // 1. ドラム（ハイハットのシャッフルレガート）
        // 1拍目: チー (強)、2拍目: チーツー (弱・裏)、3拍目: チー、4拍目: チーツー
        this.playHihat(time, 0.15); // オンビート
        
        if (beatIndex === 1 || beatIndex === 3) {
            // スウィングの跳ねる裏拍 (シャッフル: 2/3拍目あたり)
            const swingOffset = (60.0 / this.bpm) * 0.66;
            this.playHihat(time + swingOffset, 0.06);
        }
        
        // 2. ウオーキングベース（4つ打ち）
        // 基本はルート音、4拍目は次のコードへのつなぎ音
        // コードの品質（メジャー/マイナー/ハーフディミニッシュ）に合った度数を選ぶ
        const intervals = this.getBassIntervals(chordData.quality);
        let baseMidi = scaleRoot;
        if (beatIndex === 1) baseMidi += intervals.third;
        else if (beatIndex === 2) baseMidi += intervals.fifth;
        else if (beatIndex === 3) {
            // 次の小節のルートへのアプローチノート（半音上または下）
            const nextStep = (stepIndex + (this.currentBeat === chordData.beats - 1 ? 1 : 0)) % this.chordProgression.length;
            const nextRoot = this.chordProgression[nextStep].rootMidi;
            baseMidi = nextRoot + (Math.random() > 0.5 ? 1 : -1);
        }
        this.playSynthBass(baseMidi, time, 60.0 / this.bpm);

        // 3. ピアノコンピング（シェルボイシング等での4つ打ち、またはシンコペーション）
        // ピアノ伴奏が有効かつ、1拍目と3拍目に短く鳴らす
        if (this.pianoEnabled && (beatIndex === 0 || beatIndex === 2)) {
            this.playSynthChord(chordNotes, time, 0.25);
        }

        // UI同期用にメインスレッドに通知
        // Web Audioの再生時間と同期させて遅延なく描画するため、少し早めに発火
        const secondsPerBeat = 60.0 / this.bpm;
        const delayMs = (time - this.ctx.currentTime) * 1000;
        
        setTimeout(() => {
            if (this.isPlaying && this.onTickListener) {
                this.onTickListener({
                    chord: chordName,
                    stepIndex: stepIndex,
                    beatIndex: beatIndex,
                    totalBeats: this.totalBeatsElapsed
                });
            }
        }, Math.max(0, delayMs));
    }

    // コード品質ごとのベースライン用度数（半音数）
    getBassIntervals(quality) {
        switch (quality) {
            case 'min7': return { third: 3, fifth: 7 };  // 短3度・完全5度
            case 'm7b5': return { third: 3, fifth: 6 };  // 短3度・減5度
            case 'maj7':
            case 'dom7':
            default: return { third: 4, fifth: 7 };      // 長3度・完全5度
        }
    }

    // ハイハットの金属音合成
    playHihat(time, volume) {
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // ホワイトノイズ生成
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        // 金属音っぽさを出すためのハイパスフィルター
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, time);
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        
        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterVolume);
        
        noiseNode.start(time);
        noiseNode.stop(time + 0.05);
    }

    // シンセベース音 (柔らかい三角波＋ローパスフィルター)
    playSynthBass(midiNote, time, duration) {
        // ウッドベース風にオクターブ下げる
        const freq = this.midiToFreq(midiNote - 12);
        
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, time);
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.35, time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.9);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterVolume);
        
        osc.start(time);
        osc.stop(time + duration);
    }

    // シンセコードバッキング音 (丸みのあるサイン波＋三角波ブレンド)
    playSynthChord(midiNotes, time, duration) {
        midiNotes.forEach(midi => {
            const freq = this.midiToFreq(midi);
            
            const osc = this.ctx.createOscillator();
            const oscTri = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gainNode = this.ctx.createGain();
            
            osc.type = 'sine';
            oscTri.type = 'triangle';
            
            osc.frequency.setValueAtTime(freq, time);
            oscTri.frequency.setValueAtTime(freq, time);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, time);
            
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.12, time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.connect(filter);
            oscTri.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterVolume);
            
            osc.start(time);
            oscTri.start(time);
            
            osc.stop(time + duration);
            oscTri.stop(time + duration);
        });
    }
}

// グローバルインスタンスの作成
const audioEngine = new JazzAudioEngine();
window.audioEngine = audioEngine;

// モバイル端末でのWeb Audio APIロック解除用イベント
const unlockAudio = () => {
    if (window.audioEngine) {
        window.audioEngine.resume();
    }
    // 一度実行されたらイベントリスナーを削除
    window.removeEventListener('click', unlockAudio, { capture: true });
    window.removeEventListener('touchstart', unlockAudio, { capture: true });
};
window.addEventListener('click', unlockAudio, { capture: true });
window.addEventListener('touchstart', unlockAudio, { capture: true });
