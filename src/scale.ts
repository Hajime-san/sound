import * as frequencyToScaleData from './frequencyToScale';
import * as Fn from './util';

// ealry create pitch name resource
const frequencyToScale = frequencyToScaleData.create();


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

export class Analyze {
  private context: AudioContext;
  tracks: MediaStreamTrack[];
  isPassFirstAuthorizationOfEnviroment: boolean;
  isStopAnalyze: boolean;
  private _currentScale: frequencyToScaleData.PitchName;
  private _volume: number;
  private _index: number;
  private _lowerMaxFr: number;
  private _lowerAvgFr: number;
  private _upperMaxFr: number;
  private _upperAvgFr: number;
  private _limitedSpectrum = [...Array(frequencyToScale.length)].map((x)=> x = 0);
  constructor(
    audioContext: AudioContext
    ) {
    this.context = audioContext;
    this.tracks = [];
    this.isPassFirstAuthorizationOfEnviroment = false;
    this.isStopAnalyze = false;
    this._currentScale = { pitch: frequencyToScale[0].pitch, Hz: frequencyToScale[0].Hz };
    this._volume = 0;
    this._index = 0;
    this._lowerMaxFr = 0;
    this._lowerAvgFr = 0;
    this._upperMaxFr = 0;
    this._upperAvgFr = 0;
  }

  // getter
  get currentScale() {
    return this._currentScale;
  }

  get limitedSpectrum() {
    return this._limitedSpectrum;
  }

  get volume() {
    return this._volume;
  }

  get lowerMaxFr() {
    return this._lowerMaxFr;
  }

  get lowerAvgFr() {
    return this._lowerAvgFr;
  }

  get upperMaxFr() {
    return this._upperMaxFr;
  }

  get upperAvgFr() {
    return this._upperAvgFr;
  }

  get normalizedHz() {
    const MIN = 0;
    return (this._index - MIN) / ((frequencyToScale.length - 1) - MIN);
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
    if (!this.isPassFirstAuthorizationOfEnviroment) {
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

    this._lowerMaxFr = lowerMax / lowerHalfArray.length;
    this._lowerAvgFr = lowerAvg / lowerHalfArray.length;
    this._upperMaxFr = upperMax / upperHalfArray.length;
    this._upperAvgFr = upperAvg / upperHalfArray.length;
  }

  // analyze scale at real time
  private tickAnalyze(analyser: AnalyserNode, bufferArray: Float32Array, currentkiloHz: number, dBrange: number, fourierVolumeArray: Uint8Array, minVolume?: number) {
    // default min volume
    const DEFAULT_MIN_VOLUME = 10;

    if(minVolume === undefined) {
      minVolume = DEFAULT_MIN_VOLUME;
    }

    analyser.getFloatFrequencyData(bufferArray);

    // analyze volume
    analyser.getByteFrequencyData(fourierVolumeArray);
    const average = this.getAverageVolume(fourierVolumeArray);


    const getNormalization = (r: number) =>  (bufferArray[r] - analyser.maxDecibels) / dBrange * -1;

    let exRange = 0;

    for (let index = 0; index < fourierVolumeArray.byteLength / 2; index++) {
      const current = index * this.context.sampleRate / analyser.fftSize;
      if(exRange >= frequencyToScale.length - 1 ) {
        exRange = 0;
        break
      }
      if(frequencyToScale[exRange].Hz <= current && frequencyToScale[exRange + 1].Hz >= current) {
        this._limitedSpectrum[exRange] = fourierVolumeArray[index];
        exRange+= 1;
      }
    }


    let extendedRange = 0;
    for (let range = 0,
            total = dBrange,
            normalized;
            range < bufferArray.length;
            range++
        )
      normalized = getNormalization(range),
      total > normalized && (total = normalized, extendedRange = range);

    for (let index = 0; index < frequencyToScale.length; index++) {
      const convertkHzToHz = extendedRange * currentkiloHz;
      const currentHz = frequencyToScale[index].Hz;
      const nextIndex = index + 1;
      const nextHz = frequencyToScale[nextIndex].Hz;

      // lowest pitch
      if (convertkHzToHz <= frequencyToScale[0].Hz) {
        extendedRange = 0;
        break;
      }
      // highest pitch
      if (convertkHzToHz >= frequencyToScale[frequencyToScale.length - 1].Hz) {
        extendedRange = frequencyToScale.length - 1;
        break;
      }

      if (convertkHzToHz >= currentHz && nextHz >= convertkHzToHz) {

        extendedRange = Math.abs(convertkHzToHz - currentHz) > Math.abs(convertkHzToHz - nextHz)
                      ? nextIndex
                      : index;

        break;
      }
    }

    const update = () => {
      // if(minVolume === undefined) {
      //   return;
      // }
      if(average > minVolume) {
        this._index = extendedRange;
        this._currentScale = frequencyToScale[extendedRange];
        this._volume = average;
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
