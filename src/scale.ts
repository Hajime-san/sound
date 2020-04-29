import * as PitchName2freq from './PitchName2freq';

// ealry create pitch name resource
const pitchName2freq = PitchName2freq.create();

export class Analyze {
  private context: AudioContext;
  tracks: MediaStreamTrack[];
  isPassFirstAuthorizationOfEnviroment: boolean;
  isStopAnalyze: boolean;
  currentPitch: PitchName2freq.PitchName;
  constructor(
    audioContext: AudioContext
    ) {
    this.context = audioContext;
    this.tracks = [];
    this.isPassFirstAuthorizationOfEnviroment = false;
    this.isStopAnalyze = false;
    this.currentPitch = { pitch: 'A0', Hz: 27.5 };
  }

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

  private authorization() {
    if (!this.isPassFirstAuthorizationOfEnviroment) {
      return;
    }
  }

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

  private tickAnalyze(analyser: AnalyserNode, bufferLength: Float32Array, currentHz: number, dBrange: number, fourierVolumeArray: Uint8Array) {

    analyser.getFloatFrequencyData(bufferLength);

    // volume
    analyser.getByteFrequencyData(fourierVolumeArray);
    const average = this.getAverageVolume(fourierVolumeArray);

    const getNormalization = (r: number) => {
      return (bufferLength[r] - analyser.maxDecibels) / dBrange * -1;
    }

    let extendedRange = 0;
    for (let range = 0,
            total = dBrange,
            normalized;
            range < bufferLength.length;
            range++
        )
      normalized = getNormalization(range),
      total > normalized && (total = normalized, extendedRange = range);

    for (let incrementHz = 0; incrementHz < pitchName2freq.length; incrementHz++) {
      const convertkHzToHz = extendedRange * currentHz;
      const lastHz = pitchName2freq[incrementHz].Hz;
      const overflowedIndex = incrementHz + 1;
      const overflowedHz = pitchName2freq[overflowedIndex].Hz;

      if (convertkHzToHz <= pitchName2freq[0].Hz) {
        extendedRange = 0;
        break;
      }
      if (convertkHzToHz >= pitchName2freq[pitchName2freq.length - 1].Hz) {
        extendedRange = pitchName2freq.length - 1;
        break;
      }
      if (convertkHzToHz >= lastHz && overflowedHz >= convertkHzToHz) {
        extendedRange = Math.abs(convertkHzToHz - lastHz) > Math.abs(convertkHzToHz - overflowedHz)
                      ? overflowedIndex
                      : incrementHz;
        break;
      }
    }
    this.currentPitch = pitchName2freq[extendedRange];

    if(average > 10) {
      //console.log('VOLUME:' + average); //here's the volume
      //console.log(tone);

      console.log(this.currentPitch.pitch);

    }

    requestAnimationFrame(()=> this.tickAnalyze(analyser, bufferLength, currentHz, dBrange, fourierVolumeArray));
  }

  // sound from user's integrated media of device
  async analyzeScaleFromMediaStream() {
    // check user interaction
    this.authorization();

    // get mediaStream after authorization
    const mediaStream = await this.initMediaStream();

    if(!mediaStream) {
      return
    }

    // create mediaStream from user device
    const audioSourceNode = this.context.createMediaStreamSource(mediaStream);

    // set analyzer
    const analyserNode = this.context.createAnalyser();
    const currentHz = this.context.sampleRate / analyserNode.fftSize;
    const dB_range = analyserNode.maxDecibels - analyserNode.minDecibels;
    const bufferLength = new Float32Array(analyserNode.frequencyBinCount);
    const fourierVolumeArray = new Uint8Array(analyserNode.frequencyBinCount);

    // connect analyzer to mediaStream
    audioSourceNode.connect(analyserNode);

    // start analyzing!!
    this.tickAnalyze(analyserNode, bufferLength, currentHz, dB_range, fourierVolumeArray);


  }
}
