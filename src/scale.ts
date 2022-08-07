import * as Fn from './util';
import { Scale } from './NoteFrequencyChart/';
import NoteFrequencyChartData from './NoteFrequencyChart/data.json';


const fractionate = (val: number, minVal: number, maxVal: number) => (val - minVal) / (maxVal - minVal);

const modulate = (val: number, minVal: number, maxVal: number, outMin: number, outMax: number) => {
  const fr = fractionate(val, minVal, maxVal);
  const delta = outMax - outMin;
  return outMin + (fr * delta);
}

const avg = (arr: Uint8Array) => {
  const total = arr.reduce((sum, b) => sum + b );
  return (total / arr.length);
}

const max = (arr: Uint8Array) => arr.reduce((a, b) =>  Math.max(a, b));


interface LimitedSpectrum extends Scale {
  power: number,
  cachedIndex: number,
};

export interface AnalyzedAudioData {
  averageVolume: number,
  lowerMaxFr: number,
  lowerAvgFr: number,
  upperMaxFr: number,
  upperAvgFr: number,
  limitedSpectrum: Array<LimitedSpectrum>
};

export class Analyze {
  private context: AudioContext;
  tracks: MediaStreamTrack[];
  isPasssUserAuthorization: boolean;
  isStopAnalyze: boolean;
  private _analyzedAudioData: AnalyzedAudioData;
  private LARGEST_FFT_SIZE = 32768;
  private source: AudioBufferSourceNode;
  constructor(
    audioContext: AudioContext
    ) {
    this.context = audioContext;
    this.tracks = [];
    this.isPasssUserAuthorization = false;
    this.isStopAnalyze = false;
    this._analyzedAudioData = {
      averageVolume: 0,
      lowerMaxFr: 0,
      lowerAvgFr: 0,
      upperMaxFr: 0,
      upperAvgFr: 0,
      limitedSpectrum: this.initializeSpectrumArray()
    }
  }

  // getter
  get analyzedAudioData() {
    return this._analyzedAudioData;
  }

  private initializeSpectrumArray () {
    const array = NoteFrequencyChartData.map(((x: LimitedSpectrum) => {
      x.power = 0;
      x.cachedIndex = 0;
      return x;
    }));

    return array;
  }

  // initialize media devices
  private async initMediaStream() {
    let stream = null;

    const mediaOptions: MediaStreamConstraints = {
      video: false,
      audio: true
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(mediaOptions);
    } catch(error) {
      console.error('Error accessing media devices.', error);
    }

    return stream;
  }

  // check user acknowledgment
  private authorization() {
    if (!this.isPasssUserAuthorization) {
      return;
    }
  }

  // calculate volume method
  private getAverageVolume = (array: Uint8Array) => {
    let values = 0;
    let average: number;

    const length = array.length / 2;

    // get all the frequency amplitudes
    for (let i = 0; i < length; i++) {
      values += array[i];
    }

    average = values / length;
    return average;
  }

  private getVariousVolumePeaks = (frequencyData: Uint8Array) => {
    const lowerHalfArray = frequencyData.slice(0, (frequencyData.length / 2 ) - 1);
    const upperHalfArray = frequencyData.slice((frequencyData.length / 2 ) - 1, frequencyData.length - 1);

    const overallAvg = avg(frequencyData);
    const lowerMax = max(lowerHalfArray);
    const lowerAvg = avg(lowerHalfArray);
    const upperMax = max(upperHalfArray);
    const upperAvg = avg(upperHalfArray);

    this._analyzedAudioData.lowerMaxFr = lowerMax / lowerHalfArray.length;
    this._analyzedAudioData.lowerAvgFr = lowerAvg / lowerHalfArray.length;
    this._analyzedAudioData.upperMaxFr = upperMax / upperHalfArray.length;
    this._analyzedAudioData.upperAvgFr = upperAvg / upperHalfArray.length;
  }

  private getIndexOfNearestHzBasedOnChart = (analyserNode: AnalyserNode,frequencyData: Uint8Array) => {
    let loopCounter = 0;

    for (let index = 0; index < frequencyData.byteLength / 2; index++) {
      const currentHz = index * this.context.sampleRate / analyserNode.fftSize;

      if(loopCounter < this._analyzedAudioData.limitedSpectrum.length - 1 ) {

        if(NoteFrequencyChartData[loopCounter].Hz <= currentHz && NoteFrequencyChartData[loopCounter + 1].Hz >= currentHz) {

          this._analyzedAudioData.limitedSpectrum[loopCounter].cachedIndex = index;
          this._analyzedAudioData.limitedSpectrum[loopCounter].power = frequencyData[index];

          loopCounter+= 1;
        }
      } else {
        if(NoteFrequencyChartData[loopCounter].Hz <= currentHz) {
          this._analyzedAudioData.limitedSpectrum[loopCounter].cachedIndex = index;
          this._analyzedAudioData.limitedSpectrum[loopCounter].power = frequencyData[index];

          break
        }

      }
    }
  }

  // analyze scale at real time
  private tickAnalyze(analyser: AnalyserNode, frequencyData: Uint8Array, minVolume?: number) {
    // default min volume
    const DEFAULT_MIN_VOLUME = 10;

    if(minVolume === undefined) {
      minVolume = DEFAULT_MIN_VOLUME;
    }

    // analyze volume
    analyser.getByteFrequencyData(frequencyData);
    const average = this.getAverageVolume(frequencyData);


    // analyze power
    let loopCounter = 0;

    for (let index = 0; this._analyzedAudioData.limitedSpectrum.length; index++) {
      if(loopCounter >= this._analyzedAudioData.limitedSpectrum.length - 1 ) {
        this._analyzedAudioData.limitedSpectrum[index].power = frequencyData[this._analyzedAudioData.limitedSpectrum[index].cachedIndex];
        loopCounter = 0;
        break
      }

      this._analyzedAudioData.limitedSpectrum[index].power = frequencyData[this._analyzedAudioData.limitedSpectrum[index].cachedIndex];
      loopCounter+= 1;
    }

    const update = () => {
      // if(minVolume === undefined) {
      //   return;
      // }
      if(average > minVolume) {
        this._analyzedAudioData.averageVolume = average;
      }
    }

    requestAnimationFrame(()=> {
      this.tickAnalyze(analyser, frequencyData, minVolume);
      this.getVariousVolumePeaks(frequencyData);
      update();
    });
  }

  // like mp3, source from completed media
  async analyzeScaleFromAudioFile(path: string, minVolume?: number) {
    // check user interaction
    this.authorization();

    // create resource
    this.source = this.context.createBufferSource();
    this.source.buffer = await Fn.prepareBuffer(this.context, path);

    // set analyzer
    const analyserNode = this.context.createAnalyser();
    analyserNode.fftSize = this.LARGEST_FFT_SIZE;
    const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

    // check what frequencyData's index is the nearest of the NoteFrequencyChart's hz.
    this.getIndexOfNearestHzBasedOnChart(analyserNode, frequencyData);

    // connect analyzer to audio buffer
    this.source.connect(analyserNode);
    analyserNode.connect(this.context.destination);

    // start analyzing!!
    this.tickAnalyze(analyserNode, frequencyData, minVolume);
  }

  // sound from user's integrated media of device
  async analyzeScaleFromMediaStream(minVolume?: number) {
    // check user interaction
    this.authorization();

    // get mediaStream after authorization
    const mediaStream = await this.initMediaStream();

    if(!mediaStream) {
      return
    }

    // create resource
    const audioSourceNode = this.context.createMediaStreamSource(mediaStream);

    // set analyzer
    const analyserNode = this.context.createAnalyser();
    analyserNode.fftSize = this.LARGEST_FFT_SIZE;
    const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

    // check what frequencyData's index is the nearest of the NoteFrequencyChart's hz.
    this.getIndexOfNearestHzBasedOnChart(analyserNode, frequencyData);

    // connect analyzer to mediaStream buffer
    audioSourceNode.connect(analyserNode);

    // start analyzing!!
    this.tickAnalyze(analyserNode, frequencyData, minVolume);
  }

  public start() {
    this.source.start(0);
  }
}
