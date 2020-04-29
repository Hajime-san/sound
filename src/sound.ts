import * as BPM from './bpm';
import * as Scale from './scale';

export const Player = {
  _audioElem: new Audio(),

  init: function () {
    this._audioElem.src = 'korobeiniki.mp3';
    this._audioElem.loop = true;
  },

  play: function () {
    this._audioElem.play();
  },

  pause: function () {
    this._audioElem.pause();
  },

  stop: function () {
    this._audioElem.pause();
    this._audioElem.currentTime = 0;
  },

}

const context = new AudioContext();

//再生するバッファを準備
const prepareBuffer = async (path: string) => {
  //2. fetch APIで音声ファイルを取得
  const res = await fetch(path);
  //ArrayBufferを取得
  const arr = await res.arrayBuffer();
  //3. 音声ファイルをデコード
  const buf = await context.decodeAudioData(arr);

  return buf;
}

const getAverageVolume = (array: Uint8Array) => {
  let values = 0;
  let average;

  let length = array.length;

  // get all the frequency amplitudes
  for (let i = 0; i < length; i++) {
    values += array[i];
  }

  average = values / length;
  return average;
}

const playAudio = () => {
  let tone,
      audioSourceNode: MediaStreamAudioSourceNode,
      analyserNode: AnalyserNode,
      tracks: MediaStreamTrack[],
      isPassFirstAuthorizationOfEnviroment = true,
      isStopAnalyze = false;

  const mainFlow = async (stream: MediaStream) => {

    /*
      like mp3, source from completed media
    */
    const source = context.createBufferSource();
    source.buffer = await prepareBuffer('./korobeiniki.mp3');

    //console.log(peaks);


    if (!isPassFirstAuthorizationOfEnviroment) {
      return;
    }

    /*
      on user's integrated media of device
    */
    //audioSourceNode && audioSourceNode.disconnect();
    //audioSourceNode = context.createMediaStreamSource(stream);
    //analyserNode && analyserNode.disconnect();

    analyserNode = context.createAnalyser();
    //analyserNode.fftSize = 32768;
    const currentHz = context.sampleRate / analyserNode.fftSize;
    const dB_range = analyserNode.maxDecibels - analyserNode.minDecibels;
    const bufferLength = new Float32Array(analyserNode.frequencyBinCount);


    /*
      like mp3, source from completed media
    */
    source.connect(analyserNode);
    analyserNode.connect(context.destination);
    source.start(0);

    /*
      on user's integrated media of device
    */
    // audioSourceNode.connect(analyserNode);

    const fourierVolumeArray = new Uint8Array(analyserNode.frequencyBinCount);

    const tickAnalyze = () => {
      analyserNode.getFloatFrequencyData(bufferLength);

      // volume
      analyserNode.getByteFrequencyData(fourierVolumeArray);
      const average = getAverageVolume(fourierVolumeArray);

      const getNormalization = (r: number) => {
        return (bufferLength[r] - analyserNode.maxDecibels) / dB_range * -1;
      }

      let extendedRange = 0;
      for (let range = 0,
              total = dB_range,
              normalized;
              range < bufferLength.length;
              range++
          )
        normalized = getNormalization(range),
        total > normalized && (total = normalized, extendedRange = range);

      for (let incrementHz = 0; incrementHz < Hz.length; incrementHz++) {
        const convertkHzToHz = extendedRange * currentHz;
        const lastHz = Hz[incrementHz];
        const overflowedIndex = incrementHz + 1;
        const overflowedHz = Hz[overflowedIndex];

        if (convertkHzToHz <= Hz[0]) {
          extendedRange = 0;
          break;
        }
        if (convertkHzToHz >= Hz[Hz.length - 1]) {
          extendedRange = Hz.length - 1;
          break;
        }
        if (convertkHzToHz >= lastHz && overflowedHz >= convertkHzToHz) {
          extendedRange = Math.abs(convertkHzToHz - lastHz) > Math.abs(convertkHzToHz - overflowedHz)
                        ? overflowedIndex
                        : incrementHz;
          break;
        }
      }
      tone = chord[extendedRange];

      if(average > 10) {
        //console.log('VOLUME:' + average); //here's the volume
        console.log(tone);
      }

      requestAnimationFrame(tickAnalyze);
    };

    tickAnalyze();
  }

    if (isStopAnalyze) {
      return;
    }

    // devide Browser implementation
    navigator.getUserMedia
      ? navigator.getUserMedia({
        video: false,
        audio: true
      }, (res) => {
        tracks = res.getTracks();
        mainFlow(res);
      }, (err) => {
        console.log(err);
      })
      : navigator
        .mediaDevices
        .getUserMedia({
          video: false,
          audio: true
        })
        .then((res) => {
          tracks = res.getTracks(),
          mainFlow(res)
        }).catch((err) => {
          console.log(err);
        })
}
// const stop = () => {
//   tracks && (tracks.forEach((a: any) => {
//     mainFlow.stop()
//   }), tracks = [], isStopAnalyze = !0)
// }

const Hz = [
    27.5,
    29.13523509488062,
    30.867706328507758,
    32.703195662574835,
    34.64782887210901,
    36.70809598967595,
    38.890872965260115,
    41.20344461410875,
    43.653528929125486,
    46.24930283895431,
    48.999429497718666,
    51.913087197493155,
    55,
    58.27047018976124,
    61.73541265701553,
    65.40639132514967,
    69.29565774421803,
    73.41619197935191,
    77.78174593052024,
    82.40688922821751,
    87.30705785825099,
    92.49860567790861,
    97.99885899543735,
    103.82617439498632,
    110.00000000000003,
    116.54094037952251,
    123.47082531403106,
    130.8127826502994,
    138.59131548843607,
    146.83238395870382,
    155.56349186104052,
    164.81377845643502,
    174.614115716502,
    184.99721135581726,
    195.99771799087472,
    207.65234878997268,
    220.00000000000009,
    233.08188075904502,
    246.94165062806215,
    261.6255653005988,
    277.1826309768722,
    293.6647679174077,
    311.12698372208104,
    329.62755691287015,
    349.228231433004,
    369.9944227116345,
    391.99543598174955,
    415.30469757994535,
    440.00000000000017,
    466.16376151809015,
    493.8833012561244,
    523.2511306011976,
    554.3652619537445,
    587.3295358348154,
    622.2539674441622,
    659.2551138257404,
    698.4564628660082,
    739.9888454232693,
    783.9908719634991,
    830.6093951598909,
    880.0000000000003,
    932.3275230361803,
    987.766602512249,
    1046.5022612023952,
    1108.7305239074892,
    1174.6590716696312,
    1244.5079348883246,
    1318.5102276514808,
    1396.9129257320167,
    1479.9776908465387,
    1567.9817439269984,
    1661.2187903197819,
    1760.0000000000016,
    1864.6550460723613,
    1975.533205024498,
    2093.0045224047913,
    2217.4610478149784,
    2349.3181433392624,
    2489.0158697766497,
    2637.0204553029616,
    2793.825851464034,
    2959.955381693078,
    3135.9634878539973,
    3322.4375806395647,
    3520.000000000003,
    3729.3100921447226,
    3951.066410048997,
    4186.0090448095825
  ],
  chord = [
    "A0",
    "A#0",
    "B0",
    "C1",
    "C#1",
    "D1",
    "D#1",
    "E1",
    "F1",
    "F#1",
    "G1",
    "G#1",
    "A1",
    "A#1",
    "B1",
    "C2",
    "C#2",
    "D2",
    "D#2",
    "E2",
    "F2",
    "F#2",
    "G2",
    "G#2",
    "A2",
    "A#2",
    "B2",
    "C3",
    "C#3",
    "D3",
    "D#3",
    "E3",
    "F3",
    "F#3",
    "G3",
    "G#3",
    "A3",
    "A#3",
    "B3",
    "C4",
    "C#4",
    "D4",
    "D#4",
    "E4",
    "F4",
    "F#4",
    "G4",
    "G#4",
    "A4",
    "A#4",
    "B4",
    "C5",
    "C#5",
    "D5",
    "D#5",
    "E5",
    "F5",
    "F#5",
    "G5",
    "G#5",
    "A5",
    "A#5",
    "B5",
    "C6",
    "C#6",
    "D6",
    "D#6",
    "E6",
    "F6",
    "F#6",
    "G6",
    "G#6",
    "A6",
    "A#6",
    "B6",
    "C7",
    "C#7",
    "D7",
    "D#7",
    "E7",
    "F7",
    "F#7",
    "G7",
    "G#7",
    "A7",
    "A#7",
    "B7",
    "C8"
  ];


window.addEventListener('load', async ()=>{
  //playAudio();
  const context = new AudioContext();
  const bpm = await BPM.analyzeBMPthroughOneSong('./korobeiniki.mp3', context);

  const analyze = new Scale.Analyze(context);

  analyze.analyzeScaleFromMediaStream();

  console.log(bpm);

})
