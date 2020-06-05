const fs = require('fs');

let data = {};

const create = () => {
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

  const Scales = [];

  let newBaseHz = LOWEST_HZ;
  const caluculateHz = (multiply) => {
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
  let indexOfScales = 0;
  let baseMultiplyNumber = 0;
  for (let i = 0; i < 88; i++) {
    const list = {
      note: '',
      Hz: 0
    }

    // calculate step up octave number
    if((i % OCTAVE === 0)) {
      nextOctaveStep = i + STEP;
    }

    // step octave note name
    if((i % OCTAVE) === 0) {
      indexOfScales = 0;
    }

    // step octave number
    if(i === nextOctaveStep) {
      baseOctave++;
      baseMultiplyNumber = STEP_OF_NEXT_HZ;
    }

    if(BASE_PITCH_NAMES[indexOfScales].length === 2) {
      const a = BASE_PITCH_NAMES[indexOfScales].slice(0,1);
      const b = BASE_PITCH_NAMES[indexOfScales].slice(1,2);
      list.note = `${a}${baseOctave}${b}`;
    } else {
      list.note = `${BASE_PITCH_NAMES[indexOfScales]}${baseOctave}`;
    }

    indexOfScales++;

    const currentHz = caluculateHz(baseMultiplyNumber);
    baseMultiplyNumber++

    list.Hz = currentHz;

    Scales.push(list);
  }

  return Scales;
}

data = create();

fs.writeFileSync('./src/NoteFrequencyChart/data.json',
  JSON.stringify(data, null, 4),
  {
    encoding: 'utf-8',
    replacer: null,
  }
);

module.exports = data;
