
// get AudioBuffer
export const prepareBuffer = async (context: AudioContext, path: string) => {
  const res = await fetch(path);
  const arr = await res.arrayBuffer();
  const buf = await context.decodeAudioData(arr);

  return buf;
}
