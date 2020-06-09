import * as Scale from '../scale';

const spectrumCanvas = document.getElementById('spectrum') as HTMLCanvasElement;
const cw = window.innerWidth;
const ch = window.innerHeight;
spectrumCanvas.width = cw;
spectrumCanvas.height = ch;
const ctx = spectrumCanvas.getContext('2d');
ctx.font = "9px serif";

const width = 8;

export const last = (analyze: Scale.AnalyzedAudioData) => width * analyze.limitedSpectrum.length;

export const tick = (analyze: Scale.AnalyzedAudioData, last: number) => {
  ctx.clearRect(0,0,cw,ch);

  for (let index = 0; index < analyze.limitedSpectrum.length; index++) {
    ctx.fillRect((cw / 2 - last) + width * 2 * index, 610, width / 2, - analyze.limitedSpectrum[index].power);
    const textWidth =  ctx.measureText(analyze.limitedSpectrum[index].note).width;
    ctx.fillText(analyze.limitedSpectrum[index].note,  (cw / 2 - last) + width * 2 * index - textWidth / 4, 620)
  }
}
