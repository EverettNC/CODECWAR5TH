import { SAMPLE_RATE } from "./dsp.ts";

function hashNoise(i: number, seed: number) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(seed + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x >>> 0) / 4294967295) * 2 - 1;
}

export function kettlePcm(seconds = 6): Float32Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const pcm = new Float32Array(n);
  let hp = 0;
  let bp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const white = hashNoise(i, 11);
    hp = 0.97 * (hp + white - (pcm[i - 1] ?? 0));
    const whistle = Math.sin(2 * Math.PI * (2480 + 40 * Math.sin(2 * Math.PI * 0.7 * t)) * t);
    const hiss = hp * 0.35;
    bp = 0.92 * bp + 0.08 * whistle;
    const swell = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.13 * t));
    pcm[i] = (hiss + bp * 0.28) * swell * 0.55;
  }
  return pcm;
}

export function hvacPcm(seconds = 6): Float32Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const pcm = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const white = hashNoise(i, 23);
    lp = 0.995 * lp + 0.005 * white;
    const thump = Math.max(0, Math.sin(2 * Math.PI * 1.7 * t)) ** 8 * 0.12;
    pcm[i] = lp * 0.9 + thump + hashNoise(i, 41) * 0.02;
  }
  let peak = 1e-6;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(pcm[i]!));
  const g = 0.35 / peak;
  for (let i = 0; i < n; i++) pcm[i]! *= g;
  return pcm;
}
