import { game } from './state.js';

export function initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();

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
        filter.frequency.value = 100; // Low rumble

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.2; // SIGNIFICANTLY QUIETER engine sound (was 0.5)

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();
    }

    function playMelody() {
        // "My Heart Will Go On" Procedural MIDI Sequence (Chorus)
        const melody = [
            { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 64, dur: 0.5 }, { note: 65, dur: 1.5 },
            { note: 65, dur: 0.5 }, { note: 64, dur: 0.5 }, { note: 65, dur: 1.0 }, { note: 67, dur: 1.0 }, { note: 69, dur: 1.0 }, { note: 67, dur: 2.0 },
            { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 65, dur: 0.5 }, { note: 64, dur: 0.5 }, { note: 65, dur: 1.5 },
            { note: 65, dur: 1.0 }, { note: 60, dur: 3.0 },
            { note: 0, dur: 1.0 },
            { note: 65, dur: 2.0 }, { note: 67, dur: 2.0 }, { note: 60, dur: 2.0 }, { note: 72, dur: 1.0 }, { note: 70, dur: 0.5 }, { note: 69, dur: 0.5 }, { note: 67, dur: 1.0 },
            { note: 69, dur: 1.0 }, { note: 70, dur: 0.5 }, { note: 69, dur: 1.0 }, { note: 67, dur: 1.0 }, { note: 65, dur: 1.0 }, { note: 64, dur: 0.5 }, { note: 65, dur: 1.5 },
            { note: 64, dur: 1.0 }, { note: 60, dur: 0.5 }, { note: 62, dur: 2.5 },
            { note: 0, dur: 3.0 }
        ];

        const bpm = 90;
        const beatLen = 60 / bpm;

        function playLoop() {
            let t = ctx.currentTime + 1.0;
            melody.forEach(n => {
                if (n.note > 0) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    // Elegant music-box / triangle sine style
                    osc.type = 'triangle';
                    osc.frequency.value = 440 * Math.pow(2, (n.note - 69) / 12);

                    const actualDur = n.dur * beatLen;

                    // Gentle envelope for a pleasant quiet melody
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.06, t + 0.05); // attack
                    gain.gain.exponentialRampToValueAtTime(0.001, t + actualDur - 0.05); // decay/release

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(t);
                    osc.stop(t + actualDur);
                }
                t += n.dur * beatLen;
            });

            // Loop forever
            setTimeout(playLoop, (t - ctx.currentTime + 2) * 1000);
        }

        playLoop();
    }

    const startAudio = () => {
        if (ctx.state === 'suspended') ctx.resume();
        createEngineSound();
        playMelody(); // Start the background music
        document.removeEventListener('click', startAudio);
        document.removeEventListener('keydown', startAudio);
    };

    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);
}
