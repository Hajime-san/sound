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

    //await analyze.analyzeScaleFromMediaStream();

    const spectrumCanvas = document.getElementById('spectrum') as HTMLCanvasElement;
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    spectrumCanvas.width = cw;
    spectrumCanvas.height = ch;
    const ctx = spectrumCanvas.getContext('2d');
    ctx.font = "9px serif";

    const width = 8;
    const last = width * analyze.analyzedAudioData.limitedSpectrum.length;


    const tick = () => {
      Gui.tick(analyze.analyzedAudioData, bpm);
      Graphics.dynamicValuesChanger(analyze.analyzedAudioData);
      Graphics.animate();

      ctx.clearRect(0,0,cw,ch)
      for (let index = 0; index < analyze.analyzedAudioData.limitedSpectrum.length; index++) {
        ctx.fillRect((cw / 2 - last) + width * 2 * index, 610, width / 2, - analyze.analyzedAudioData.limitedSpectrum[index].power);
        const textWidth =  ctx.measureText(analyze.analyzedAudioData.limitedSpectrum[index].note).width;
        ctx.fillText(analyze.analyzedAudioData.limitedSpectrum[index].note,  (cw / 2 - last) + width * 2 * index - textWidth / 4, 620)
      }

      requestAnimationFrame(tick);
    }

    tick();
});
