import { AnalyzedAudioData } from '../scale';

const volumeElement = document.getElementById('volume') as HTMLElement;
const bpmElement = document.getElementById('bpm') as HTMLElement;
const lafElement = document.getElementById('lowerAvgFr') as HTMLElement;
const lmfElement = document.getElementById('lowerMaxFr') as HTMLElement;
const uafElement = document.getElementById('upperMaxFr') as HTMLElement;
const umfElement = document.getElementById('upperAvgFr') as HTMLElement;

export const tick = (data: AnalyzedAudioData, bpm: number) => {
  volumeElement.textContent = `${data.averageVolume}`;
  bpmElement.textContent = `${bpm}`;
  lafElement.textContent = `${data.lowerMaxFr}`;
  lmfElement.textContent = `${data.lowerAvgFr}`;
  uafElement.textContent = `${data.upperMaxFr}`;
  umfElement.textContent = `${data.upperAvgFr}`;
}
