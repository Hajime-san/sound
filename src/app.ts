import * as BPM from './bpm';
import * as Scale from './scale';


document.addEventListener('DOMContentLoaded', async ()=>{

  const context = new AudioContext();

  const bpm = await BPM.analyzeAverageBMPthroughSong(context, './assets/cinderella.mp3');

  const analyze = new Scale.Analyze(context);

  analyze.analyzeScaleFromAudioFile('./assets/cinderella.mp3');

  // await analyze.analyzeScaleFromMediaStream();


  // setInterval(()=>{
  //   console.log(analyze.currentScale);
  // },500)

  const pitchElement = document.getElementById('pitch') as HTMLElement;
  const hzElement = document.getElementById('hz') as HTMLElement;
  const volumeElement = document.getElementById('volume') as HTMLElement;
  const bpmElement = document.getElementById('bpm') as HTMLElement;

  const tick = () => {
    pitchElement.textContent = `${analyze.currentScale.pitch}`;
    hzElement.textContent = `${analyze.currentScale.Hz}`;
    volumeElement.textContent = `${analyze.volume}`;
    bpmElement.textContent = `${bpm}`;
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)


})
