export interface Scale {
  readonly note: string,
  readonly Hz: number
}

export interface NoteFrequencyChart extends Array<Scale>{}
