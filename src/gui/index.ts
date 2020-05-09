import * as frequencyToScaleData from '../frequencyToScale';

const pitchElement = document.getElementById('pitch') as HTMLElement;
const hzElement = document.getElementById('hz') as HTMLElement;
const volumeElement = document.getElementById('volume') as HTMLElement;
const bpmElement = document.getElementById('bpm') as HTMLElement;

export const tick = (currentScale: frequencyToScaleData.PitchName, volume: number, bpm: number ) => {
  pitchElement.textContent = `${currentScale.pitch}`;
  hzElement.textContent = `${currentScale.Hz}`;
  volumeElement.textContent = `${volume}`;
  bpmElement.textContent = `${bpm}`;
}
