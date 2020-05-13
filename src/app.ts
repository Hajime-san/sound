import * as BPM from './bpm';
import * as Scale from './scale';
import * as Gui from './gui';
import * as Graphics from './graphics';

document.addEventListener('DOMContentLoaded', async ()=>{

    const context = new AudioContext();

    const bpm = await BPM.analyzeAverageBMPthroughSong(context, './assets/cyborg.mp3');

    const analyze = new Scale.Analyze(context);

    await analyze.analyzeScaleFromAudioFile('./assets/cyborg.mp3', 0);

    // // await analyze.analyzeScaleFromMediaStream();

    Graphics.init();

    Graphics.initPosition(analyze.volume);

    Graphics.initComputeRenderer(analyze.normalizedHz, analyze.volume);

    const tick = () => {
      Gui.tick(analyze.currentScale, analyze.volume, bpm);
      Graphics.dynamicValuesChanger(analyze.currentScale, analyze.volume);
      Graphics.animate(analyze.currentScale, analyze.volume);
      requestAnimationFrame(tick);
    }

    tick();
});
