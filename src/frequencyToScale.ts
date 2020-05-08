
export type PitchName = { pitch: string; Hz: number };

export const create = () => {
  const LOWEST_HZ = 27.5;
  const BASE_PITCH_NAMES = [
    'A',
    'A#',
    'B',
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
  ];
  const OCTAVE = BASE_PITCH_NAMES.length;
  const STEP = 3;
  const STEP_OF_NEXT_HZ = -OCTAVE + STEP;

  const PitchNames: Array<PitchName> = [];

  let newBaseHz = LOWEST_HZ;
  const caluculateHz = (multiply: number) => {
    if (multiply === STEP_OF_NEXT_HZ) {
      newBaseHz = newBaseHz * 2;
    }

    if(multiply === 0) {
      return newBaseHz;
    } else {
      return newBaseHz * Math.pow(2, multiply / OCTAVE);
    }
  };


  let baseOctave = 0;
  let nextOctaveStep = 3;
  let indexOfPitchNames = 0;
  let baseMultiplyNumber = 0;
  for (let i = 0; i < 88; i++) {
    const list = {
      pitch: '',
      Hz: 0
    }

    // calculate step up octave number
    if((i % OCTAVE === 0)) {
      nextOctaveStep = i + STEP;
    }

    // step octave pitch name
    if((i % OCTAVE) === 0) {
      indexOfPitchNames = 0;
    }

    // step octave number
    if(i === nextOctaveStep) {
      baseOctave++;
      baseMultiplyNumber = STEP_OF_NEXT_HZ;
    }

    list.pitch = `${BASE_PITCH_NAMES[indexOfPitchNames]}${baseOctave}`;
    indexOfPitchNames++;

    const currentHz = caluculateHz(baseMultiplyNumber);
    baseMultiplyNumber++

    list.Hz = currentHz;

    PitchNames.push(list);
  }

  return PitchNames;
}
