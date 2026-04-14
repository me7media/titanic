import { game } from './state.js';

export function initAudio() {
    if (game.audio.active) return;
    try {
        game.audio.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // White Noise for Ocean
        const bufferSize = 4096;
        const noiseNode = game.audio.ctx.createScriptProcessor(bufferSize, 1, 1);
        let lastOut = 0;
        noiseNode.onaudioprocess = (e) => {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise
                lastOut = output[i];
                output[i] *= 4.0;
            }
        };

        const oceanFilter = game.audio.ctx.createBiquadFilter();
        oceanFilter.type = 'lowpass';
        oceanFilter.frequency.value = 400;

        const mainGain = game.audio.ctx.createGain();
        mainGain.gain.value = 0.5;

        noiseNode.connect(oceanFilter);
        oceanFilter.connect(mainGain);
        mainGain.connect(game.audio.ctx.destination);

        game.audio.active = true;
    } catch (e) {
        console.warn('Audio Init Error:', e);
    }
}
