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

export type AnalyzedAudioData = {
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
  private isLoopedOnece = false;
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

    const length = array.length;

    // get all the frequency amplitudes
    for (let i = 0; i < length; i++) {
      values += array[i];
    }

    average = values / length;
    return average;
  }

  private getVariousVolumePeaks = (fourierVolumeArray: Uint8Array) => {
    const lowerHalfArray = fourierVolumeArray.slice(0, (fourierVolumeArray.length / 2 ) - 1);
    const upperHalfArray = fourierVolumeArray.slice((fourierVolumeArray.length / 2 ) - 1, fourierVolumeArray.length - 1);

    const overallAvg = avg(fourierVolumeArray);
    const lowerMax = max(lowerHalfArray);
    const lowerAvg = avg(lowerHalfArray);
    const upperMax = max(upperHalfArray);
    const upperAvg = avg(upperHalfArray);

    this._analyzedAudioData.lowerMaxFr = lowerMax / lowerHalfArray.length;
    this._analyzedAudioData.lowerAvgFr = lowerAvg / lowerHalfArray.length;
    this._analyzedAudioData.upperMaxFr = upperMax / upperHalfArray.length;
    this._analyzedAudioData.upperAvgFr = upperAvg / upperHalfArray.length;
  }

  // analyze scale at real time
  private tickAnalyze(analyser: AnalyserNode, bufferArray: Float32Array, currentkiloHz: number, dBrange: number, fourierVolumeArray: Uint8Array, minVolume?: number) {
    // default min volume
    const DEFAULT_MIN_VOLUME = 10;

    if(minVolume === undefined) {
      minVolume = DEFAULT_MIN_VOLUME;
    }

    // analyser.getFloatFrequencyData(bufferArray);

    // analyze volume
    analyser.getByteFrequencyData(fourierVolumeArray);
    const average = this.getAverageVolume(fourierVolumeArray);


    // analyze 88 scale
    let exRange = 0;
    let exRange2 = 0;

    if(this.isLoopedOnece) {

      for (let index = 0; this._analyzedAudioData.limitedSpectrum.length; index++) {
        if(exRange2 >= this._analyzedAudioData.limitedSpectrum.length - 1 ) {
          this._analyzedAudioData.limitedSpectrum[index].power = fourierVolumeArray[this._analyzedAudioData.limitedSpectrum[index].cachedIndex];
          exRange2 = 0;
          break
        }

        this._analyzedAudioData.limitedSpectrum[index].power = fourierVolumeArray[this._analyzedAudioData.limitedSpectrum[index].cachedIndex];
        exRange2+= 1;
      }

    } else {
      for (let index = 0; index < fourierVolumeArray.byteLength / 2; index++) {
        const current = index * this.context.sampleRate / analyser.fftSize;
        if(exRange >= this._analyzedAudioData.limitedSpectrum.length - 1 ) {
          this._analyzedAudioData.limitedSpectrum[exRange].cachedIndex = index;
          this._analyzedAudioData.limitedSpectrum[exRange].power = fourierVolumeArray[index];
          exRange = 0;

          this.isLoopedOnece = true;

          break
        }
        if(NoteFrequencyChartData[exRange].Hz <= current && NoteFrequencyChartData[exRange + 1].Hz >= current) {
          this._analyzedAudioData.limitedSpectrum[exRange].cachedIndex = index;
          this._analyzedAudioData.limitedSpectrum[exRange].power = fourierVolumeArray[index];
          exRange+= 1;
        }
      }
    }


    // const getNormalization = (r: number) =>  (bufferArray[r] - analyser.maxDecibels) / dBrange * -1;
    // let extendedRange = 0;
    // for (let range = 0,
    //         total = dBrange,
    //         normalized;
    //         range < bufferArray.length;
    //         range++
    //     )
    //   normalized = getNormalization(range),
    //   total > normalized && (total = normalized, extendedRange = range);

    // for (let index = 0; index < NoteFrequencyChartData.length; index++) {
    //   const convertkHzToHz = extendedRange * currentkiloHz;
    //   const currentHz = NoteFrequencyChartData[index].Hz;
    //   const nextIndex = index + 1;
    //   const nextHz = NoteFrequencyChartData[nextIndex].Hz;

    //   // lowest note
    //   if (convertkHzToHz <= NoteFrequencyChartData[0].Hz) {
    //     extendedRange = 0;
    //     break;
    //   }
    //   // highest note
    //   if (convertkHzToHz >= NoteFrequencyChartData[NoteFrequencyChartData.length - 1].Hz) {
    //     extendedRange = NoteFrequencyChartData.length - 1;
    //     break;
    //   }

    //   if (convertkHzToHz >= currentHz && nextHz >= convertkHzToHz) {

    //     extendedRange = Math.abs(convertkHzToHz - currentHz) > Math.abs(convertkHzToHz - nextHz)
    //                   ? nextIndex
    //                   : index;

    //     break;
    //   }
    // }

    const update = () => {
      // if(minVolume === undefined) {
      //   return;
      // }
      if(average > minVolume) {
        // this._index = extendedRange;
        // this._currentScale = NoteFrequencyChartData[extendedRange];
        this._analyzedAudioData.averageVolume = average;
      }
    }

    requestAnimationFrame(()=> {
      this.tickAnalyze(analyser, bufferArray, currentkiloHz, dBrange, fourierVolumeArray, minVolume);
      this.getVariousVolumePeaks(fourierVolumeArray);
      update();
    });
  }

  // like mp3, source from completed media
  async analyzeScaleFromAudioFile(path: string, minVolume?: number) {
    // check user interaction
    this.authorization();

    // create resource
    const source = this.context.createBufferSource();
    source.buffer = await Fn.prepareBuffer(this.context, path);

    // set analyzer
    const analyserNode = this.context.createAnalyser();
    analyserNode.fftSize = 32768;
    const currentkiloHz = this.context.sampleRate / analyserNode.fftSize;
    const dBrange = analyserNode.maxDecibels - analyserNode.minDecibels;
    const bufferArray = new Float32Array(analyserNode.frequencyBinCount);
    const fourierVolumeArray = new Uint8Array(analyserNode.frequencyBinCount);

    // connect analyzer to audio buffer
    source.connect(analyserNode);
    analyserNode.connect(this.context.destination);
    source.start(0);

    // start analyzing!!
    this.tickAnalyze(analyserNode, bufferArray, currentkiloHz, dBrange, fourierVolumeArray, minVolume);
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
    analyserNode.fftSize = 32768;
    const currentkiloHz = this.context.sampleRate / analyserNode.fftSize;
    const dBrange = analyserNode.maxDecibels - analyserNode.minDecibels;
    const bufferLength = new Float32Array(analyserNode.frequencyBinCount);
    const fourierVolumeArray = new Uint8Array(analyserNode.frequencyBinCount);

    // connect analyzer to mediaStream buffer
    audioSourceNode.connect(analyserNode);

    // start analyzing!!
    this.tickAnalyze(analyserNode, bufferLength, currentkiloHz, dBrange, fourierVolumeArray, minVolume);
  }
}
