import * as BPM from './bpm';
import * as Scale from './scale';


document.addEventListener('DOMContentLoaded', async ()=>{

  const context = new AudioContext();

  const bpm = await BPM.analyzeAverageBMPthroughSong(context, './korobeiniki.mp3');

  const analyze = new Scale.Analyze(context);

  //analyze.analyzeScaleFromAudioFile('./korobeiniki.mp3');

  const analyzer = await analyze.analyzeScaleFromMediaStream();

  console.log(analyzer);

})
