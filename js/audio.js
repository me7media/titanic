import { game } from './state.js';

let mainCtx = null;
let showMessageFn = null;

export function initAudio(showMsg) {
    showMessageFn = showMsg;
    
    if (!mainCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        mainCtx = new AudioContext();
    }

    const ctx = mainCtx;

    function createEngineSound() {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 100;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.45;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();
    }

    // ... melody functions ...
    function playMelody() {
        // "My Heart Will Go On" (truncated for brevity here but keeping logic)
        const melody = [
            { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 64, dur: 0.5 }, { note: 65, dur: 1.5 },
            { note: 65, dur: 0.5 }, { note: 64, dur: 0.5 }, { note: 65, dur: 1.0 }, { note: 67, dur: 1.0 }, { note: 69, dur: 1.0 }, { note: 67, dur: 2.0 },
            { note: 65, dur: 1.0 }, { note: 60, dur: 3.0 }
        ];

        const bpm = 90;
        const beatLen = 60 / bpm;

        function playLoop() {
            if (ctx.state !== 'running') return;
            let t = ctx.currentTime + 0.1;
            melody.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = 440 * Math.pow(2, (n.note - 69) / 12);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.06, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + (n.dur * beatLen) - 0.05);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(t); osc.stop(t + (n.dur * beatLen));
                t += n.dur * beatLen;
            });
            setTimeout(playLoop, (t - ctx.currentTime + 1) * 1000);
        }
        playLoop();
    }

    const startAudio = async () => {
        try {
            if (ctx.state === 'suspended') await ctx.resume();
            createEngineSound();
            playMelody();
            if (showMessageFn) showMessageFn("Звук: ПРАЦЮЄ ✅");
        } catch (e) {
            if (showMessageFn) showMessageFn("Звук: ТРЕБА ДОТИК 👆");
        }
    };

    // Global helper for mobile touch re-activation
    window.resumeAudio = () => {
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                if (ctx.state === 'running') {
                    startAudio();
                }
            });
        }
    };

    startAudio();
}
