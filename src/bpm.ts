import * as Fn from './util';

type Peaks = { position: number; volume: number; }[];

const getPeaks = (data: Float32Array, sampleRate: number) => {
  // What we're going to do here, is to divide up our audio into parts.

  // We will then identify, for each part, what the loudest sample is in that
  // part.

  // It's implied that that sample would represent the most likely 'beat'
  // within that part.

  // Each part is 0.5 seconds long - or 22,050 samples.

  // This will give us 60 'beats' - we will only take the loudest half of
  // those.

  // This will allow us to ignore breaks, and allow us to address tracks with
  // a BPM below 120.

  const partSize = sampleRate / 2,
        parts = data.length / partSize;
  let peaks = [];

  for (let i = 0; i < parts; i++) {
    const max = {
      position: 0,
      volume: 0
    }
    for (let j = i * partSize; j < (i + 1) * partSize; j++) {
      const v =  Math.abs(data[j]);
      if (!max || (v > max.volume)) {
        max.position = j;
        max.volume = v;
      }
    }
    peaks.push(max);
  }

  // We then sort the peaks according to volume...

  peaks.sort((a, b) =>  b.volume - a.volume);

  // ...take the loundest half of those...

  peaks = peaks.splice(0, peaks.length * 0.5);

  // ...and re-sort it back based on position.

  peaks.sort((a, b) => a.position - b.position);

  return peaks;
}

const getIntervals = (peaks: Peaks, sampleRate: number) => {

  // What we now do is get all of our peaks, and then measure the distance to
  // other peaks, to create intervals.  Then based on the distance between
  // those peaks (the distance of the intervals) we can calculate the BPM of
  // that particular interval.

  // The interval that is seen the most should have the BPM that corresponds
  // to the track itself.
  type Groups = { tempo: number; count: number; }[];

  const groups: Groups = [];

  peaks.forEach(function(peak, index) {
    for (let i = 1; (index + i) < peaks.length && i < 10; i++) {
      const group = {
        tempo: (60 * sampleRate) / (peaks[index + i].position - peak.position),
        count: 1
      };

      while (group.tempo < 90) {
        group.tempo *= 2;
      }

      while (group.tempo > 180) {
        group.tempo /= 2;
      }

      group.tempo = Math.round(group.tempo);

      if (!(groups.some((interval) => {
        return (interval.tempo === group.tempo ? interval.count++ : 0);
      }))) {
        groups.push(group);
      }
    }
  });

  groups.sort((a, b) =>  b.count - a.count);

  return groups;
}


const filterAudioBuffer = async (buffer: AudioBuffer) => {

  const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);

  const source = offlineContext.createBufferSource();
  source.buffer = buffer;

  // Beats, or kicks, generally occur around the 100 to 150 hz range.
  // Below this is often the bassline.  So let's focus just on that.

  // First a lowpass to remove most of the song.
  const lowpass = offlineContext.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 150;
  lowpass.Q.value = 1;

  // Now a highpass to remove the bassline.
  const highpass = offlineContext.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 100;
  highpass.Q.value = 1;

  // Run the output of the source
  source.connect(lowpass);
  lowpass.connect(highpass);
  highpass.connect(offlineContext.destination);

  // Start the source, and render the output into the offline conext.
  source.start(0);

  return offlineContext.startRendering();
}

export const analyzeBMPthroughOneSong = async (path: string, context: AudioContext) => {
  const buffer = await Fn.prepareBuffer(path, context);
  const filteredAudioBuffer = await filterAudioBuffer(buffer);
  const peaks = getPeaks(filteredAudioBuffer.getChannelData(0), filteredAudioBuffer.sampleRate);
  const groups = getIntervals(peaks, filteredAudioBuffer.sampleRate);

  // return most recorded tempo
  return groups[0].tempo;
}
