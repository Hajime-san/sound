import * as BPM from './bpm';
import * as Scale from './scale';
import * as Gui from './gui';
import * as Graphics from './graphics';

document.addEventListener('DOMContentLoaded', async ()=>{

    Graphics.init();

    const context = new AudioContext();

    const bpm = await BPM.analyzeAverageBMPthroughSong(context, './assets/bensound-summer.mp3');

    const analyze = new Scale.Analyze(context);

    await analyze.analyzeScaleFromAudioFile('./assets/bensound-summer.mp3', 0);

    // // await analyze.analyzeScaleFromMediaStream();

    const tick = () => {
      Gui.tick(analyze.currentScale, analyze.normalizedHz, analyze.volume, bpm, analyze.lowerMaxFr, analyze.lowerAvgFr, analyze.upperMaxFr, analyze.upperAvgFr);
      Graphics.dynamicValuesChanger(analyze.currentScale, analyze.volume);
      Graphics.animate();
      requestAnimationFrame(tick);
    }

    tick();
});
