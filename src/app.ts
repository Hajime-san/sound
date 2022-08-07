import * as BPM from './bpm';
import * as Scale from './scale';
import * as Gui from './gui';
import * as ParticleVisualizer from './graphics/richVisualizer';
import * as Spectrum from './graphics/spectrum';

document.addEventListener('DOMContentLoaded', async ()=>{

    ParticleVisualizer.init();

    const context = new AudioContext();

    const bpm = await BPM.analyzeAverageBMPthroughSong(context, './assets/bensound-summer.mp3');;

    const analyze = new Scale.Analyze(context);

    await analyze.analyzeScaleFromAudioFile('./assets/bensound-summer.mp3', 0);

    // await analyze.analyzeScaleFromMediaStream();

    const tick = () => {
      Gui.tick(analyze.analyzedAudioData, bpm);

      ParticleVisualizer.dynamicValuesChanger(analyze.analyzedAudioData);
      ParticleVisualizer.animate();

      Spectrum.tick(analyze.analyzedAudioData, Spectrum.last(analyze.analyzedAudioData));

      requestAnimationFrame(tick);
    }

    const button = document.getElementById('play');

    button.addEventListener('click', () => {
      analyze.start();
      tick();
    });
});
