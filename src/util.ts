
// get AudioBuffer
export const prepareBuffer = async (path: string, context: AudioContext) => {
  const res = await fetch(path);
  const arr = await res.arrayBuffer();
  const buf = await context.decodeAudioData(arr);

  return buf;
}
