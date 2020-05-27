import * as frequencyToScaleData from '../frequencyToScale';

const pitchElement = document.getElementById('pitch') as HTMLElement;
const hzElement = document.getElementById('hz') as HTMLElement;
const normalizedElement = document.getElementById('normalizedHz') as HTMLElement;
const volumeElement = document.getElementById('volume') as HTMLElement;
const bpmElement = document.getElementById('bpm') as HTMLElement;
const lafElement = document.getElementById('lowerAvgFr') as HTMLElement;
const lmfElement = document.getElementById('lowerMaxFr') as HTMLElement;
const uafElement = document.getElementById('upperMaxFr') as HTMLElement;
const umfElement = document.getElementById('upperAvgFr') as HTMLElement;

export const tick = (currentScale: frequencyToScaleData.PitchName, normalizedHz: number, volume: number, bpm: number, lowerMaxFr: number, lowerAvgFr: number, upperMaxFr: number, upperAvgFr: number) => {
  pitchElement.textContent = `${currentScale.pitch}`;
  hzElement.textContent = `${currentScale.Hz}`;
  normalizedElement.textContent = `${normalizedHz}`;
  volumeElement.textContent = `${volume}`;
  bpmElement.textContent = `${bpm}`;
  lafElement.textContent = `${lowerMaxFr}`;
  lmfElement.textContent = `${lowerAvgFr}`;
  uafElement.textContent = `${upperMaxFr}`;
  umfElement.textContent = `${upperAvgFr}`;
}
