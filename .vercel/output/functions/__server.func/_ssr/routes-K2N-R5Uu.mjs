import { i as __toESM } from "../_runtime.mjs";
import { R as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as object, i as number, n as boolean, o as string, t as array } from "../_libs/zod.mjs";
import { a as RotateCcw, c as Copy, i as Square, l as ArrowRight, n as Upload, o as Mic, s as MicOff, t as Volume2, u as ArrowDown } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-K2N-R5Uu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Panel({ title, kicker, action, className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("flex min-h-0 min-w-0 flex-col rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]", className),
		children: [(title || action || kicker) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mb-3 flex items-baseline justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [kicker ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-widest text-subtle uppercase",
				children: kicker
			}) : null, title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium tracking-tight text-fg",
				children: title
			}) : null] }), action]
		}), children]
	});
}
function Stat({ label, value, hot }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-widest text-subtle uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: cn("mt-1 truncate font-mono text-sm tabular-nums", hot ? "text-signal" : "text-fg"),
			children: value
		})]
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linen/50 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			primary: "bg-linen text-bg hover:opacity-90",
			ghost: "bg-transparent text-fg hover:bg-elevated",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
			signal: "bg-signal text-bg hover:opacity-90",
			quiet: "bg-elevated text-fg hover:bg-elevated/80",
			danger: "bg-danger text-fg hover:opacity-90"
		},
		size: {
			sm: "h-9 rounded-sm px-3 text-sm",
			md: "h-11 rounded-md px-4 text-sm",
			lg: "h-12 rounded-md px-5 text-base",
			icon: "size-11 rounded-md"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
var Button = (0, import_react.forwardRef)(({ className, variant, size, type = "button", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
	ref,
	type,
	className: cn(buttonVariants({
		variant,
		size
	}), className),
	...props
}));
Button.displayName = "Button";
/** Kaldi-standard 16 kHz front-end: 25 ms Hamming, 10 ms hop, 80-dim fbank. */
var SAMPLE_RATE = 16e3;
var FRAME_SEC = 160 / SAMPLE_RATE;
var MEL_HI = 7600;
function hzToMel(hz) {
	return 1127 * Math.log(1 + hz / 700);
}
function melToHz(mel) {
	return 700 * (Math.exp(mel / 1127) - 1);
}
var hamming = /* @__PURE__ */ new Float32Array(400);
for (let i = 0; i < 400; i++) hamming[i] = .54 - .46 * Math.cos(2 * Math.PI * i / 399);
var fftRe = /* @__PURE__ */ new Float32Array(512);
var fftIm = /* @__PURE__ */ new Float32Array(512);
var twiddleRe = /* @__PURE__ */ new Float32Array(512);
var twiddleIm = /* @__PURE__ */ new Float32Array(512);
for (let i = 0; i < 512; i++) {
	const a = -2 * Math.PI * i / 512;
	twiddleRe[i] = Math.cos(a);
	twiddleIm[i] = Math.sin(a);
}
function fftRadix2(re, im) {
	const n = re.length;
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			let tmp = re[i];
			re[i] = re[j];
			re[j] = tmp;
			tmp = im[i];
			im[i] = im[j];
			im[j] = tmp;
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const half = len >> 1;
		const step = n / len;
		for (let i = 0; i < n; i += len) for (let k = 0; k < half; k++) {
			const t = k * step;
			const wr = twiddleRe[t];
			const wi = twiddleIm[t];
			const ur = re[i + k];
			const ui = im[i + k];
			const vr = re[i + k + half];
			const vi = im[i + k + half];
			const tr = wr * vr - wi * vi;
			const ti = wr * vi + wi * vr;
			re[i + k] = ur + tr;
			im[i + k] = ui + ti;
			re[i + k + half] = ur - tr;
			im[i + k + half] = ui - ti;
		}
	}
}
function makeMelBank() {
	const lo = hzToMel(20);
	const hi = hzToMel(MEL_HI);
	const points = 82;
	const mels = new Float32Array(points);
	for (let i = 0; i < points; i++) mels[i] = lo + (hi - lo) * i / 81;
	const freqs = new Float32Array(points);
	for (let i = 0; i < points; i++) freqs[i] = melToHz(mels[i]);
	const bins = new Float32Array(points);
	for (let i = 0; i < points; i++) bins[i] = Math.floor(513 * freqs[i] / SAMPLE_RATE);
	const bank = Array.from({ length: 80 }, () => /* @__PURE__ */ new Float32Array(256));
	for (let m = 1; m <= 80; m++) {
		const left = bins[m - 1];
		const center = bins[m];
		const right = bins[m + 1];
		const row = bank[m - 1];
		for (let k = left; k < center; k++) if (k >= 0 && k < 256 && center !== left) row[k] = (k - left) / (center - left);
		for (let k = center; k < right; k++) if (k >= 0 && k < 256 && right !== center) row[k] = (right - k) / (right - center);
	}
	return bank;
}
var MEL_BANK = makeMelBank();
var dct = /* @__PURE__ */ new Float32Array(1040);
for (let k = 0; k < 13; k++) for (let n = 0; n < 80; n++) dct[k * 80 + n] = Math.cos(Math.PI * k * (n + .5) / 80) * (k === 0 ? Math.sqrt(1 / 80) : Math.sqrt(2 / 80));
function resampleLinear(input, fromRate, toRate = SAMPLE_RATE) {
	if (fromRate === toRate) return input;
	const ratio = fromRate / toRate;
	const n = Math.floor(input.length / ratio);
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const x = i * ratio;
		const i0 = Math.floor(x);
		const i1 = Math.min(i0 + 1, input.length - 1);
		const f = x - i0;
		out[i] = input[i0] * (1 - f) + input[i1] * f;
	}
	return out;
}
function frameCount(n) {
	if (n < 400) return 0;
	return 1 + Math.floor((n - 400) / 160);
}
function powerSpectrum(windowed) {
	fftRe.fill(0);
	fftIm.fill(0);
	fftRe.set(windowed);
	fftRadix2(fftRe, fftIm);
	const spec = /* @__PURE__ */ new Float32Array(256);
	for (let k = 0; k < 256; k++) spec[k] = fftRe[k] * fftRe[k] + fftIm[k] * fftIm[k];
	return spec;
}
function melsFromSpec(spec) {
	const mel = /* @__PURE__ */ new Float32Array(80);
	for (let m = 0; m < 80; m++) {
		const row = MEL_BANK[m];
		let s = 0;
		for (let k = 0; k < 256; k++) s += row[k] * spec[k];
		mel[m] = Math.log(Math.max(s, 1e-10));
	}
	return mel;
}
function mfccFromMel(mel) {
	const c = /* @__PURE__ */ new Float32Array(13);
	for (let k = 0; k < 13; k++) {
		let s = 0;
		for (let n = 0; n < 80; n++) s += dct[k * 80 + n] * mel[n];
		c[k] = s;
	}
	return c;
}
function spectralCentroid(spec) {
	let num = 0;
	let den = 0;
	for (let k = 0; k < 256; k++) {
		const f = k * SAMPLE_RATE / 512;
		num += f * spec[k];
		den += spec[k];
	}
	return den > 0 ? num / den : 0;
}
function zeroCrossing(buf, off) {
	let z = 0;
	for (let i = 1; i < 400; i++) {
		const a = buf[off + i - 1];
		const b = buf[off + i];
		if (a >= 0 && b < 0 || a < 0 && b >= 0) z++;
	}
	return z / 400;
}
/** YIN-lite pitch in Hz. 0 if unvoiced. */
function pitchYin(buf, off, n = 400) {
	const tauMax = Math.min(200, Math.floor(n / 2));
	const tauMin = 32;
	const d = new Float32Array(tauMax + 1);
	for (let tau = tauMin; tau <= tauMax; tau++) {
		let s = 0;
		const lim = n - tau;
		for (let j = 0; j < lim; j++) {
			const diff = buf[off + j] - buf[off + j + tau];
			s += diff * diff;
		}
		d[tau] = s;
	}
	let run = 0;
	let bestTau = 0;
	let bestCm = 1;
	for (let tau = tauMin; tau <= tauMax; tau++) {
		run += d[tau];
		const cm = d[tau] * (tau - tauMin + 1) / (run + 1e-12);
		if (cm < bestCm) {
			bestCm = cm;
			bestTau = tau;
		}
	}
	if (bestCm > .22 || bestTau === 0) return {
		f0: 0,
		cm: bestCm
	};
	return {
		f0: SAMPLE_RATE / bestTau,
		cm: bestCm
	};
}
/** Two-formant estimate from spectral peaks in the voiced band. */
function formants(spec) {
	const peaks = [];
	const kHi = Math.floor(1638400 / SAMPLE_RATE);
	for (let k = 7; k < kHi; k++) {
		const v = spec[k];
		if (v > spec[k - 1] && v >= spec[k + 1]) peaks.push({
			k,
			v
		});
	}
	peaks.sort((a, b) => b.v - a.v);
	const hz = (k) => k * SAMPLE_RATE / 512;
	let f1 = 0;
	let f2 = 0;
	for (const p of peaks) {
		const f = hz(p.k);
		if (!f1 && f < 1200) f1 = f;
		else if (!f2 && f > (f1 || 400) + 200) f2 = f;
		if (f1 && f2) break;
	}
	return {
		f1,
		f2
	};
}
function extractFrame(pcm, off) {
	const windowed = /* @__PURE__ */ new Float32Array(400);
	let power = 0;
	for (let i = 0; i < 400; i++) {
		const s = pcm[off + i] ?? 0;
		const w = s * hamming[i];
		windowed[i] = w;
		power += s * s;
	}
	power = Math.sqrt(power / 400);
	const spec = powerSpectrum(windowed);
	const mel = melsFromSpec(spec);
	const mfcc = mfccFromMel(mel);
	const { f0, cm } = pitchYin(pcm, off);
	const { f1, f2 } = formants(spec);
	return {
		mel,
		mfcc,
		power,
		centroid: spectralCentroid(spec),
		zcr: zeroCrossing(pcm, off),
		f0,
		voiced: f0 > 0 ? 1 - cm : 0,
		f1,
		f2
	};
}
function extractFrames(pcm) {
	const n = frameCount(pcm.length);
	const frames = new Array(n);
	for (let t = 0; t < n; t++) frames[t] = extractFrame(pcm, t * 160);
	return frames;
}
function cmvn(mels) {
	if (mels.length === 0) return mels;
	const mean = /* @__PURE__ */ new Float32Array(80);
	const std = /* @__PURE__ */ new Float32Array(80);
	for (const m of mels) for (let i = 0; i < 80; i++) mean[i] += m[i];
	for (let i = 0; i < 80; i++) mean[i] /= mels.length;
	for (const m of mels) for (let i = 0; i < 80; i++) {
		const d = m[i] - mean[i];
		std[i] += d * d;
	}
	for (let i = 0; i < 80; i++) std[i] = Math.sqrt(std[i] / mels.length + 1e-5);
	return mels.map((m) => {
		const o = /* @__PURE__ */ new Float32Array(80);
		for (let i = 0; i < 80; i++) o[i] = (m[i] - mean[i]) / std[i];
		return o;
	});
}
function deltas(seq, order = 2) {
	const T = seq.length;
	if (T === 0) return seq;
	const D = seq[0].length;
	const out = seq.map(() => new Float32Array(D));
	const denom = 2 * (order * (order + 1) * (2 * order + 1) / 6);
	for (let t = 0; t < T; t++) {
		for (let n = 1; n <= order; n++) {
			const a = seq[Math.min(T - 1, t + n)];
			const b = seq[Math.max(0, t - n)];
			const row = out[t];
			for (let i = 0; i < D; i++) row[i] += n * (a[i] - b[i]);
		}
		const row = out[t];
		for (let i = 0; i < D; i++) row[i] /= denom;
	}
	return out;
}
function rms(pcm) {
	let s = 0;
	for (let i = 0; i < pcm.length; i++) s += pcm[i] * pcm[i];
	return Math.sqrt(s / Math.max(1, pcm.length));
}
var PHONES = [
	{
		id: "SIL",
		g: "∅",
		kind: "sil",
		f1: 200,
		f2: 900,
		f3: 2200,
		bw1: 90,
		bw2: 120,
		voiced: false,
		dur: .06
	},
	{
		id: "AA",
		g: "ɑ",
		kind: "vowel",
		f1: 730,
		f2: 1090,
		f3: 2440,
		bw1: 70,
		bw2: 90,
		voiced: true,
		dur: .1
	},
	{
		id: "AE",
		g: "æ",
		kind: "vowel",
		f1: 660,
		f2: 1720,
		f3: 2410,
		bw1: 70,
		bw2: 100,
		voiced: true,
		dur: .1
	},
	{
		id: "AH",
		g: "ʌ",
		kind: "vowel",
		f1: 640,
		f2: 1190,
		f3: 2390,
		bw1: 80,
		bw2: 90,
		voiced: true,
		dur: .07
	},
	{
		id: "AO",
		g: "ɔ",
		kind: "vowel",
		f1: 570,
		f2: 840,
		f3: 2410,
		bw1: 70,
		bw2: 80,
		voiced: true,
		dur: .1
	},
	{
		id: "AW",
		g: "aʊ",
		kind: "vowel",
		f1: 570,
		f2: 980,
		f3: 2300,
		bw1: 80,
		bw2: 90,
		voiced: true,
		dur: .14
	},
	{
		id: "AY",
		g: "aɪ",
		kind: "vowel",
		f1: 660,
		f2: 1720,
		f3: 2410,
		bw1: 80,
		bw2: 100,
		voiced: true,
		dur: .14
	},
	{
		id: "EH",
		g: "ɛ",
		kind: "vowel",
		f1: 530,
		f2: 1840,
		f3: 2480,
		bw1: 70,
		bw2: 90,
		voiced: true,
		dur: .08
	},
	{
		id: "ER",
		g: "ɝ",
		kind: "vowel",
		f1: 490,
		f2: 1350,
		f3: 1690,
		bw1: 80,
		bw2: 90,
		voiced: true,
		dur: .12
	},
	{
		id: "EY",
		g: "eɪ",
		kind: "vowel",
		f1: 400,
		f2: 2e3,
		f3: 2550,
		bw1: 60,
		bw2: 90,
		voiced: true,
		dur: .13
	},
	{
		id: "IH",
		g: "ɪ",
		kind: "vowel",
		f1: 390,
		f2: 1990,
		f3: 2550,
		bw1: 50,
		bw2: 90,
		voiced: true,
		dur: .07
	},
	{
		id: "IY",
		g: "i",
		kind: "vowel",
		f1: 270,
		f2: 2290,
		f3: 3010,
		bw1: 50,
		bw2: 90,
		voiced: true,
		dur: .1
	},
	{
		id: "OW",
		g: "oʊ",
		kind: "vowel",
		f1: 430,
		f2: 980,
		f3: 2300,
		bw1: 70,
		bw2: 80,
		voiced: true,
		dur: .13
	},
	{
		id: "OY",
		g: "ɔɪ",
		kind: "vowel",
		f1: 550,
		f2: 920,
		f3: 2400,
		bw1: 70,
		bw2: 90,
		voiced: true,
		dur: .14
	},
	{
		id: "UH",
		g: "ʊ",
		kind: "vowel",
		f1: 440,
		f2: 1020,
		f3: 2240,
		bw1: 70,
		bw2: 80,
		voiced: true,
		dur: .07
	},
	{
		id: "UW",
		g: "u",
		kind: "vowel",
		f1: 300,
		f2: 870,
		f3: 2240,
		bw1: 60,
		bw2: 80,
		voiced: true,
		dur: .1
	},
	{
		id: "B",
		g: "b",
		kind: "stop",
		f1: 200,
		f2: 720,
		f3: 2400,
		bw1: 60,
		bw2: 90,
		voiced: true,
		dur: .06
	},
	{
		id: "D",
		g: "d",
		kind: "stop",
		f1: 200,
		f2: 1700,
		f3: 2600,
		bw1: 60,
		bw2: 100,
		voiced: true,
		dur: .05
	},
	{
		id: "G",
		g: "g",
		kind: "stop",
		f1: 200,
		f2: 1400,
		f3: 2200,
		bw1: 80,
		bw2: 120,
		voiced: true,
		dur: .06
	},
	{
		id: "P",
		g: "p",
		kind: "stop",
		f1: 200,
		f2: 720,
		f3: 2400,
		bw1: 80,
		bw2: 120,
		voiced: false,
		dur: .06
	},
	{
		id: "T",
		g: "t",
		kind: "stop",
		f1: 200,
		f2: 1700,
		f3: 2600,
		bw1: 80,
		bw2: 140,
		voiced: false,
		dur: .05
	},
	{
		id: "K",
		g: "k",
		kind: "stop",
		f1: 200,
		f2: 1400,
		f3: 2200,
		bw1: 100,
		bw2: 140,
		voiced: false,
		dur: .06
	},
	{
		id: "F",
		g: "f",
		kind: "fric",
		f1: 400,
		f2: 1100,
		f3: 3800,
		bw1: 200,
		bw2: 400,
		voiced: false,
		dur: .09
	},
	{
		id: "V",
		g: "v",
		kind: "fric",
		f1: 300,
		f2: 1100,
		f3: 2800,
		bw1: 120,
		bw2: 200,
		voiced: true,
		dur: .07
	},
	{
		id: "TH",
		g: "θ",
		kind: "fric",
		f1: 400,
		f2: 1400,
		f3: 3600,
		bw1: 180,
		bw2: 300,
		voiced: false,
		dur: .08
	},
	{
		id: "DH",
		g: "ð",
		kind: "fric",
		f1: 300,
		f2: 1400,
		f3: 2700,
		bw1: 120,
		bw2: 180,
		voiced: true,
		dur: .06
	},
	{
		id: "S",
		g: "s",
		kind: "fric",
		f1: 500,
		f2: 1800,
		f3: 7e3,
		bw1: 200,
		bw2: 400,
		voiced: false,
		dur: .09
	},
	{
		id: "Z",
		g: "z",
		kind: "fric",
		f1: 300,
		f2: 1700,
		f3: 5e3,
		bw1: 140,
		bw2: 250,
		voiced: true,
		dur: .07
	},
	{
		id: "SH",
		g: "ʃ",
		kind: "fric",
		f1: 400,
		f2: 1800,
		f3: 3500,
		bw1: 180,
		bw2: 280,
		voiced: false,
		dur: .1
	},
	{
		id: "ZH",
		g: "ʒ",
		kind: "fric",
		f1: 350,
		f2: 1800,
		f3: 3200,
		bw1: 140,
		bw2: 220,
		voiced: true,
		dur: .08
	},
	{
		id: "HH",
		g: "h",
		kind: "fric",
		f1: 500,
		f2: 1500,
		f3: 2500,
		bw1: 300,
		bw2: 400,
		voiced: false,
		dur: .06
	},
	{
		id: "CH",
		g: "tʃ",
		kind: "affric",
		f1: 300,
		f2: 1800,
		f3: 2800,
		bw1: 120,
		bw2: 200,
		voiced: false,
		dur: .09
	},
	{
		id: "JH",
		g: "dʒ",
		kind: "affric",
		f1: 300,
		f2: 1800,
		f3: 2700,
		bw1: 100,
		bw2: 180,
		voiced: true,
		dur: .08
	},
	{
		id: "M",
		g: "m",
		kind: "nasal",
		f1: 250,
		f2: 1e3,
		f3: 2200,
		bw1: 60,
		bw2: 80,
		voiced: true,
		dur: .07
	},
	{
		id: "N",
		g: "n",
		kind: "nasal",
		f1: 250,
		f2: 1600,
		f3: 2500,
		bw1: 60,
		bw2: 80,
		voiced: true,
		dur: .07
	},
	{
		id: "NG",
		g: "ŋ",
		kind: "nasal",
		f1: 250,
		f2: 1200,
		f3: 2300,
		bw1: 70,
		bw2: 90,
		voiced: true,
		dur: .08
	},
	{
		id: "L",
		g: "l",
		kind: "liq",
		f1: 360,
		f2: 1200,
		f3: 2600,
		bw1: 50,
		bw2: 80,
		voiced: true,
		dur: .07
	},
	{
		id: "R",
		g: "r",
		kind: "liq",
		f1: 400,
		f2: 1100,
		f3: 1600,
		bw1: 70,
		bw2: 80,
		voiced: true,
		dur: .07
	},
	{
		id: "W",
		g: "w",
		kind: "glide",
		f1: 300,
		f2: 700,
		f3: 2200,
		bw1: 60,
		bw2: 80,
		voiced: true,
		dur: .07
	},
	{
		id: "Y",
		g: "j",
		kind: "glide",
		f1: 300,
		f2: 2100,
		f3: 3e3,
		bw1: 50,
		bw2: 90,
		voiced: true,
		dur: .07
	}
];
var PHONE_INDEX = Object.fromEntries(PHONES.map((p, i) => [p.id, i]));
var N_PHONES = PHONES.length;
var LEXICON = {
	the: ["DH", "AH"],
	encoder: [
		"EH",
		"N",
		"K",
		"OW",
		"D",
		"ER"
	],
	replaced: [
		"R",
		"IH",
		"P",
		"L",
		"EY",
		"S",
		"T"
	],
	kaldi: [
		"K",
		"AE",
		"L",
		"D",
		"IY"
	],
	filament: [
		"F",
		"IH",
		"L",
		"AH",
		"M",
		"AH",
		"N",
		"T"
	],
	booth: [
		"B",
		"UW",
		"TH"
	],
	a: ["AH"],
	is: ["IH", "Z"],
	listening: [
		"L",
		"IH",
		"S",
		"AH",
		"N",
		"IH",
		"NG"
	],
	speaking: [
		"S",
		"P",
		"IY",
		"K",
		"IH",
		"NG"
	],
	ready: [
		"R",
		"EH",
		"D",
		"IY"
	],
	hello: [
		"HH",
		"AH",
		"L",
		"OW"
	],
	this: [
		"DH",
		"IH",
		"S"
	],
	speech: [
		"S",
		"P",
		"IY",
		"CH"
	],
	neural: [
		"N",
		"UH",
		"R",
		"AH",
		"L"
	],
	stack: [
		"S",
		"T",
		"AE",
		"K"
	],
	zipformer: [
		"Z",
		"IH",
		"P",
		"F",
		"AO",
		"R",
		"M",
		"ER"
	],
	retired: [
		"R",
		"IH",
		"T",
		"AY",
		"ER",
		"D"
	],
	and: [
		"AE",
		"N",
		"D"
	],
	to: ["T", "UW"],
	of: ["AH", "V"],
	for: [
		"F",
		"AO",
		"R"
	],
	you: ["Y", "UW"],
	i: ["AY"],
	we: ["W", "IY"],
	can: [
		"K",
		"AE",
		"N"
	],
	do: ["D", "UW"],
	that: [
		"DH",
		"AE",
		"T"
	],
	want: [
		"W",
		"AA",
		"N",
		"T"
	],
	an: ["AE", "N"],
	replace: [
		"R",
		"IH",
		"P",
		"L",
		"EY",
		"S"
	],
	voice: [
		"V",
		"OY",
		"S"
	],
	studio: [
		"S",
		"T",
		"UW",
		"D",
		"IY",
		"OW"
	],
	lattice: [
		"L",
		"AE",
		"T",
		"AH",
		"S"
	],
	listen: [
		"L",
		"IH",
		"S",
		"AH",
		"N"
	],
	speak: [
		"S",
		"P",
		"IY",
		"K"
	],
	codec: [
		"K",
		"OW",
		"D",
		"EH",
		"K"
	],
	in: ["IH", "N"],
	out: ["AW", "T"],
	middle: [
		"M",
		"IH",
		"D",
		"AH",
		"L"
	],
	decoder: [
		"D",
		"IY",
		"K",
		"OW",
		"D",
		"ER"
	],
	captions: [
		"K",
		"AE",
		"P",
		"SH",
		"AH",
		"N",
		"Z"
	],
	audio: [
		"AO",
		"D",
		"IY",
		"OW"
	],
	file: [
		"F",
		"AY",
		"L"
	],
	demo: [
		"D",
		"EH",
		"M",
		"OW"
	],
	line: [
		"L",
		"AY",
		"N"
	],
	unknown: [
		"AH",
		"N",
		"N",
		"OW",
		"N"
	],
	words: [
		"W",
		"ER",
		"D",
		"Z"
	],
	from: [
		"F",
		"R",
		"AH",
		"M"
	],
	with: [
		"W",
		"IH",
		"DH"
	],
	on: ["AA", "N"],
	it: ["IH", "T"],
	not: [
		"N",
		"AA",
		"T"
	],
	be: ["B", "IY"],
	are: ["AA", "R"],
	was: [
		"W",
		"AA",
		"Z"
	],
	have: [
		"HH",
		"AE",
		"V"
	],
	has: [
		"HH",
		"AE",
		"Z"
	],
	yes: [
		"Y",
		"EH",
		"S"
	],
	no: ["N", "OW"],
	ok: [
		"OW",
		"K",
		"EY"
	],
	please: [
		"P",
		"L",
		"IY",
		"Z"
	],
	thanks: [
		"TH",
		"AE",
		"NG",
		"K",
		"S"
	],
	time: [
		"T",
		"AY",
		"M"
	],
	now: ["N", "AW"],
	go: ["G", "OW"],
	stop: [
		"S",
		"T",
		"AA",
		"P"
	],
	start: [
		"S",
		"T",
		"AA",
		"R",
		"T"
	],
	record: [
		"R",
		"EH",
		"K",
		"ER",
		"D"
	],
	play: [
		"P",
		"L",
		"EY"
	],
	byte: [
		"B",
		"AY",
		"T"
	],
	hex: [
		"HH",
		"EH",
		"K",
		"S"
	],
	text: [
		"T",
		"EH",
		"K",
		"S",
		"T"
	],
	unicode: [
		"Y",
		"UW",
		"N",
		"IH",
		"K",
		"OW",
		"D"
	],
	kettle: [
		"K",
		"EH",
		"T",
		"AH",
		"L"
	],
	already: [
		"AO",
		"L",
		"R",
		"EH",
		"D",
		"IY"
	],
	heard: [
		"HH",
		"ER",
		"D"
	],
	stay: [
		"S",
		"T",
		"EY"
	],
	me: ["M", "IY"],
	get: [
		"G",
		"EH",
		"T"
	],
	house: [
		"HH",
		"AW",
		"S"
	],
	am: ["AE", "M"],
	here: [
		"HH",
		"IY",
		"R"
	],
	canal: [
		"K",
		"AH",
		"N",
		"AE",
		"L"
	],
	canals: [
		"K",
		"AH",
		"N",
		"AE",
		"L",
		"Z"
	],
	fused: [
		"F",
		"Y",
		"UW",
		"Z",
		"D"
	],
	sealed: [
		"S",
		"IY",
		"L",
		"D"
	],
	keep: [
		"K",
		"IY",
		"P"
	],
	them: [
		"DH",
		"EH",
		"M"
	],
	apart: [
		"AH",
		"P",
		"AA",
		"R",
		"T"
	],
	many: [
		"M",
		"EH",
		"N",
		"IY"
	],
	none: [
		"N",
		"AH",
		"N"
	],
	without: [
		"W",
		"IH",
		"TH",
		"AW",
		"T"
	],
	into: [
		"IH",
		"N",
		"T",
		"UW"
	],
	one: [
		"W",
		"AH",
		"N"
	],
	voices: [
		"V",
		"OY",
		"S",
		"IH",
		"Z"
	],
	room: [
		"R",
		"UW",
		"M"
	],
	table: [
		"T",
		"EY",
		"B",
		"AH",
		"L"
	],
	overlap: [
		"OW",
		"V",
		"ER",
		"L",
		"AE",
		"P"
	],
	refuse: [
		"R",
		"IH",
		"F",
		"Y",
		"UW",
		"Z"
	],
	mix: [
		"M",
		"IH",
		"K",
		"S"
	],
	bus: [
		"B",
		"AH",
		"S"
	],
	dispersion: [
		"D",
		"IH",
		"S",
		"P",
		"ER",
		"ZH",
		"AH",
		"N"
	],
	discernment: [
		"D",
		"IH",
		"S",
		"ER",
		"N",
		"M",
		"AH",
		"N",
		"T"
	],
	streams: [
		"S",
		"T",
		"R",
		"IY",
		"M",
		"Z"
	],
	confusing: [
		"K",
		"AH",
		"N",
		"F",
		"Y",
		"UW",
		"Z",
		"IH",
		"NG"
	],
	kitchen: [
		"K",
		"IH",
		"CH",
		"AH",
		"N"
	],
	crisis: [
		"K",
		"R",
		"AY",
		"S",
		"IH",
		"S"
	],
	empty: [
		"EH",
		"M",
		"P",
		"T",
		"IY"
	],
	ear: ["IY", "R"],
	stays: [
		"S",
		"T",
		"EY",
		"Z"
	],
	measure: [
		"M",
		"EH",
		"ZH",
		"ER"
	],
	classify: [
		"K",
		"L",
		"AE",
		"S",
		"IH",
		"F",
		"AY"
	]
};
var LETTER = {
	a: ["AE"],
	b: ["B"],
	c: ["K"],
	d: ["D"],
	e: ["EH"],
	f: ["F"],
	g: ["G"],
	h: ["HH"],
	i: ["IH"],
	j: ["JH"],
	k: ["K"],
	l: ["L"],
	m: ["M"],
	n: ["N"],
	o: ["OW"],
	p: ["P"],
	q: ["K"],
	r: ["R"],
	s: ["S"],
	t: ["T"],
	u: ["AH"],
	v: ["V"],
	w: ["W"],
	x: ["K", "S"],
	y: ["Y"],
	z: ["Z"]
};
function g2p(word) {
	const w = word.toLowerCase().replace(/[^a-z']/g, "");
	if (!w) return [];
	if (LEXICON[w]) return LEXICON[w];
	const out = [];
	for (const ch of w) {
		const p = LETTER[ch];
		if (p) out.push(...p);
	}
	return out.length ? out : ["AH"];
}
function textToPhones(text) {
	const words = text.trim().split(/\s+/).filter(Boolean);
	const out = [];
	let t = .12;
	out.push({
		id: "SIL",
		start: 0,
		dur: t
	});
	for (const raw of words) {
		const word = raw.replace(/[^a-zA-Z'-]/g, "");
		if (!word) continue;
		const phones = g2p(word);
		phones.forEach((id, i) => {
			const dur = PHONES[PHONE_INDEX[id] ?? 0].dur * (i === 0 || i === phones.length - 1 ? 1.05 : .95);
			out.push({
				id,
				start: t,
				dur,
				word
			});
			t += dur;
		});
		out.push({
			id: "SIL",
			start: t,
			dur: .08
		});
		t += .08;
	}
	return out;
}
function collapseCtc(ids) {
	const out = [];
	let prev = 0;
	for (const id of ids) {
		if (id !== prev && id !== 0) out.push(id);
		prev = id;
	}
	return out;
}
/** Klatt-lite source-filter TTS. Same phone table the encoder classifies. */
function glottal(phase) {
	if (phase < .62) {
		const x = phase / .62;
		return 3 * x * x - 2 * x * x * x;
	}
	const x = (phase - .62) / .38;
	return 1 - x * x;
}
function hashNoise$1(i, seed) {
	let x = Math.imul(i + 1, 374761393) ^ Math.imul(seed + 1, 668265263);
	x = Math.imul(x ^ x >>> 13, 1274126177);
	return (x >>> 0) / 4294967295 * 2 - 1;
}
function synthesizePhones(phonesIn, opts) {
	const f0 = opts?.f0 ?? 148;
	const phones = phonesIn.map((p) => ({ ...p }));
	let t = 0;
	for (const p of phones) {
		p.start = t;
		t += p.dur;
	}
	const n = Math.max(1, Math.floor(t * SAMPLE_RATE) + Math.floor(SAMPLE_RATE / 12));
	const pcm = new Float32Array(n);
	let phase = 0;
	for (let i = 0; i < n; i++) {
		const time = i / SAMPLE_RATE;
		let phone = phones[0];
		for (const ph of phones) if (time >= ph.start) phone = ph;
		const pidx = PHONE_INDEX[phone.id] ?? 0;
		const proto = PHONES[pidx];
		const local = (time - phone.start) / Math.max(phone.dur, 1e-4);
		let env = 0;
		if (proto.kind === "sil") env = 0;
		else if (proto.kind === "stop") env = local < .5 ? .015 : Math.exp(-(((local - .5) * 8) ** 2));
		else env = .3 + .7 * Math.sin(Math.min(1, local) * Math.PI);
		const f0i = f0 * (1 + .012 * Math.sin(2 * Math.PI * 5.1 * time));
		phase += (proto.voiced ? f0i : 0) / SAMPLE_RATE;
		phase -= Math.floor(phase);
		const noise = hashNoise$1(i, pidx);
		let source = 0;
		if (proto.kind === "sil") source = noise * .002;
		else if (!proto.voiced) source = noise * (proto.kind === "fric" ? .38 : .24);
		else if (proto.kind === "fric" || proto.kind === "affric") source = glottal(phase) * .2 + noise * .28;
		else source = glottal(phase) * .72 + noise * .025;
		pcm[i] = source * env;
	}
	filterCascade(pcm, phones);
	const fade = Math.min(400, Math.floor(n / 20));
	for (let i = 0; i < fade; i++) {
		pcm[i] *= i / fade;
		pcm[n - 1 - i] *= i / fade;
	}
	let peak = 1e-6;
	for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(pcm[i]));
	const g = .7 / peak;
	for (let i = 0; i < n; i++) pcm[i] *= g;
	return {
		pcm,
		phones,
		duration: n / SAMPLE_RATE
	};
}
function synthesizePhone(id, dur = .2, f0 = 148) {
	return synthesizePhones([
		{
			id: "SIL",
			start: 0,
			dur: .03
		},
		{
			id,
			start: 0,
			dur
		},
		{
			id: "SIL",
			start: 0,
			dur: .03
		}
	], { f0 });
}
function synthesize(text, opts) {
	const rate = Math.max(.6, Math.min(1.6, opts?.rate ?? 1));
	return synthesizePhones(textToPhones(text).map((p) => ({
		...p,
		dur: p.dur / rate,
		start: 0
	})), { f0: opts?.f0 });
}
function filterCascade(pcm, phones) {
	let y1a = 0, y1b = 0, y2a = 0, y2b = 0, y3a = 0, y3b = 0, rad = 0;
	let f1 = 500, f2 = 1500, f3 = 2500, b1 = 80, b2 = 100;
	const pole = (freq, bw) => {
		const r = Math.exp(-Math.PI * bw / SAMPLE_RATE);
		return {
			a: 2 * r * Math.cos(2 * Math.PI * freq / SAMPLE_RATE),
			b: -r * r,
			g: 1 - r
		};
	};
	for (let i = 0; i < pcm.length; i++) {
		const time = i / SAMPLE_RATE;
		let phone = phones[0];
		for (const ph of phones) if (time >= ph.start) phone = ph;
		const proto = PHONES[PHONE_INDEX[phone.id] ?? 0];
		f1 += .14 * (proto.f1 - f1);
		f2 += .14 * (proto.f2 - f2);
		f3 += .1 * (proto.f3 - f3);
		b1 += .1 * (proto.bw1 - b1);
		b2 += .1 * (proto.bw2 - b2);
		const p1 = pole(f1, b1);
		const p2 = pole(f2, b2);
		const p3 = pole(f3, 160);
		const n1 = pcm[i] * p1.g + p1.a * y1a + p1.b * y1b;
		y1b = y1a;
		y1a = n1;
		const n2 = n1 * p2.g + p2.a * y2a + p2.b * y2b;
		y2b = y2a;
		y2a = n2;
		const n3 = n2 * p3.g + p3.a * y3a + p3.b * y3b;
		y3b = y3a;
		y3a = n3;
		const radiated = n3 - .92 * rad;
		rad = n3;
		pcm[i] = radiated;
	}
}
var DEMO_LINE$1 = "Filament in. Codec. Booth out.";
var STACKS = [
	{
		name: "conv-embed",
		rate: 1
	},
	{
		name: "stack-1 · 50 Hz",
		rate: 1
	},
	{
		name: "stack-2 · 25 Hz",
		rate: 2
	},
	{
		name: "stack-3 · 12 Hz",
		rate: 4
	},
	{
		name: "stack-4 · 25 Hz",
		rate: 2
	},
	{
		name: "out-proj",
		rate: 1
	}
];
var BANDS = [
	[0, 20],
	[16, 48],
	[40, 80],
	[0, 80]
];
function cosineBand(a, b, lo, hi) {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = lo; i < hi; i++) {
		const x = a[i];
		const y = b[i];
		dot += x * y;
		na += x * x;
		nb += y * y;
	}
	return dot / (Math.sqrt(na * nb) + 1e-8);
}
function softmax(scores) {
	let max = -Infinity;
	for (let i = 0; i < scores.length; i++) if (scores[i] > max) max = scores[i];
	let sum = 0;
	for (let i = 0; i < scores.length; i++) {
		const e = Math.exp((scores[i] - max) * 8);
		scores[i] = e;
		sum += e;
	}
	const inv = 1 / (sum + 1e-12);
	for (let i = 0; i < scores.length; i++) scores[i] *= inv;
}
function pool2(seq) {
	const out = [];
	for (let i = 0; i < seq.length; i += 2) {
		const a = seq[i];
		const b = seq[i + 1] ?? a;
		const m = new Float32Array(a.length);
		for (let k = 0; k < a.length; k++) m[k] = .5 * (a[k] + b[k]);
		out.push(m);
	}
	return out.length ? out : seq;
}
function upsample2(seq, target) {
	const out = [];
	for (const row of seq) {
		out.push(row);
		if (out.length < target) out.push(new Float32Array(row));
	}
	while (out.length < target) out.push(new Float32Array(seq[seq.length - 1] ?? 64));
	return out.slice(0, target);
}
function mix(a, b, wa = .65, wb = .35) {
	return a.map((row, i) => {
		const other = b[Math.min(i, b.length - 1)];
		const o = new Float32Array(row.length);
		for (let k = 0; k < row.length; k++) o[k] = wa * row[k] + wb * (other[k] ?? 0);
		return o;
	});
}
function convTemporal(seq, kernel = [
	.08,
	.2,
	.44,
	.2,
	.08
]) {
	const T = seq.length;
	const D = seq[0]?.length ?? 0;
	const half = kernel.length - 1 >> 1;
	const out = new Array(T);
	for (let t = 0; t < T; t++) {
		const row = new Float32Array(D);
		for (let k = 0; k < kernel.length; k++) {
			const src = seq[Math.max(0, Math.min(T - 1, t + k - half))];
			const w = kernel[k];
			for (let d = 0; d < D; d++) row[d] += w * src[d];
		}
		out[t] = row;
	}
	return out;
}
function projectMel(mel, extra) {
	const o = /* @__PURE__ */ new Float32Array(64);
	const srcLen = 80 + extra.length;
	for (let d = 0; d < 64; d++) {
		let s = 0;
		for (let i = 0; i < 80; i++) {
			const w = Math.cos(Math.PI * (d + .5) * (i + .5) / srcLen);
			s += w * mel[i];
		}
		for (let i = 0; i < extra.length; i++) {
			const w = Math.cos(Math.PI * (d + .5) * (80 + i + .5) / srcLen);
			s += w * extra[i];
		}
		o[d] = s * Math.sqrt(2 / srcLen);
	}
	return o;
}
function attend(seq, mels) {
	const T = seq.length;
	const attn = new Float32Array(T * T);
	const out = new Array(T);
	const scores = new Float32Array(T);
	for (let i = 0; i < T; i++) {
		const mi = mels[Math.min(i, mels.length - 1)];
		for (let j = 0; j < T; j++) {
			const mj = mels[Math.min(j, mels.length - 1)];
			let s = 0;
			for (const [lo, hi] of BANDS) s += cosineBand(mi, mj, lo, hi);
			s /= BANDS.length;
			const dist = i - j;
			const local = Math.exp(-dist * dist / 200);
			scores[j] = s * .75 + local * .25;
		}
		softmax(scores);
		const acc = /* @__PURE__ */ new Float32Array(64);
		for (let j = 0; j < T; j++) {
			const a = scores[j];
			attn[i * T + j] = a;
			const v = seq[j];
			for (let d = 0; d < 64; d++) acc[d] += a * v[d];
		}
		const bypass = seq[i];
		const mixed = /* @__PURE__ */ new Float32Array(64);
		for (let d = 0; d < 64; d++) mixed[d] = .55 * bypass[d] + .45 * acc[d];
		out[i] = mixed;
	}
	return {
		out,
		attn
	};
}
function phoneDistance(frame, phone) {
	const f1 = frame.f1 || 500;
	const f2 = frame.f2 || 1500;
	const df1 = (f1 - phone.f1) / 400;
	const df2 = (f2 - phone.f2) / 600;
	const vDiff = frame.voiced - (phone.voiced ? 1 : 0);
	const z = frame.zcr;
	let kind = 0;
	if (phone.kind === "fric" || phone.kind === "affric") kind += Math.abs(z - .18) * 4;
	else kind += Math.abs(z - .04) * 3;
	if (phone.kind === "sil") return frame.power * 40 + .4;
	const energy = frame.power < .01 ? 2.5 : 0;
	return df1 * df1 + df2 * df2 + vDiff * vDiff * .6 + kind + energy;
}
var PROTO_DIM = 17;
var PROTOS = null;
function frameVec(f) {
	const v = new Float32Array(PROTO_DIM);
	v.set(f.mfcc);
	v[13] = Math.log(f.power + 1e-6);
	v[14] = f.zcr * 8;
	v[15] = f.voiced * 2;
	v[16] = (f.f1 || 500) / 800;
	return v;
}
function buildProtos() {
	if (PROTOS) return PROTOS;
	PROTOS = PHONES.map((p) => {
		const { pcm } = synthesizePhone(p.id, p.kind === "sil" ? .12 : .22);
		const frames = extractFrames(pcm);
		const voiced = frames.filter((f) => p.kind === "sil" ? f.power < .04 : f.power > .02);
		const use = voiced.length ? voiced : frames;
		const mean = new Float32Array(PROTO_DIM);
		if (!use.length) return mean;
		for (const f of use) {
			const v = frameVec(f);
			for (let i = 0; i < PROTO_DIM; i++) mean[i] += v[i];
		}
		for (let i = 0; i < PROTO_DIM; i++) mean[i] /= use.length;
		return mean;
	});
	return PROTOS;
}
function protoDistance(frame, i) {
	const protos = buildProtos();
	const v = frameVec(frame);
	const p = protos[i];
	let s = 0;
	for (let k = 0; k < 13; k++) {
		const d = v[k] - p[k];
		s += d * d;
	}
	for (let k = 13; k < PROTO_DIM; k++) {
		const d = v[k] - p[k];
		s += .45 * d * d;
	}
	return s + .2 * phoneDistance(frame, PHONES[i]);
}
function softmaxNegDist(dists, temp = .28) {
	let min = Infinity;
	for (let i = 0; i < dists.length; i++) if (dists[i] < min) min = dists[i];
	let sum = 0;
	const out = new Float32Array(dists.length);
	for (let i = 0; i < dists.length; i++) {
		const e = Math.exp(-(dists[i] - min) / temp);
		out[i] = e;
		sum += e;
	}
	for (let i = 0; i < out.length; i++) out[i] /= sum + 1e-12;
	return out;
}
function classifyFrames(frames, smooth) {
	buildProtos();
	const raw = frames.map((f) => {
		const d = new Float32Array(N_PHONES);
		for (let i = 0; i < N_PHONES; i++) d[i] = protoDistance(f, i);
		return softmaxNegDist(d);
	});
	if (smooth <= 0) return raw;
	const T = raw.length;
	const out = new Array(T);
	for (let t = 0; t < T; t++) {
		const acc = new Float32Array(N_PHONES);
		let wsum = 0;
		for (let k = -smooth; k <= smooth; k++) {
			const i = t + k;
			if (i < 0 || i >= T) continue;
			const w = 1 - Math.abs(k) / (smooth + 1);
			const row = raw[i];
			for (let p = 0; p < N_PHONES; p++) acc[p] += w * row[p];
			wsum += w;
		}
		for (let p = 0; p < N_PHONES; p++) acc[p] /= wsum;
		out[t] = acc;
	}
	return out;
}
function argmaxPath(posts) {
	return posts.map((row) => {
		let best = 0;
		let v = -1;
		for (let i = 0; i < row.length; i++) if (row[i] > v) {
			v = row[i];
			best = i;
		}
		return best;
	});
}
function idsToGlyphs(ids) {
	return collapseCtc(ids).map((id) => PHONES[id]?.g ?? "∅");
}
function statsPool(seq) {
	const D = seq[0]?.length ?? 64;
	const mean = new Float32Array(D);
	const std = new Float32Array(D);
	if (!seq.length) return new Float32Array(D * 2);
	for (const row of seq) for (let i = 0; i < D; i++) mean[i] += row[i];
	for (let i = 0; i < D; i++) mean[i] /= seq.length;
	for (const row of seq) for (let i = 0; i < D; i++) {
		const d = row[i] - mean[i];
		std[i] += d * d;
	}
	const emb = new Float32Array(D * 2);
	for (let i = 0; i < D; i++) {
		emb[i] = mean[i];
		emb[D + i] = Math.sqrt(std[i] / seq.length + 1e-6);
	}
	let n = 0;
	for (let i = 0; i < emb.length; i++) n += emb[i] * emb[i];
	n = Math.sqrt(n) + 1e-8;
	for (let i = 0; i < emb.length; i++) emb[i] /= n;
	return emb;
}
function encode(frames) {
	if (frames.length < 4) return {
		stacks: [],
		out: [],
		attn: /* @__PURE__ */ new Float32Array(0),
		attnN: 0,
		posteriors: [],
		kaldiPost: [],
		ctcPath: [],
		kaldiPath: [],
		phones: [],
		kaldiPhones: [],
		embedding: /* @__PURE__ */ new Float32Array(128)
	};
	const mels = cmvn(frames.map((f) => f.mel));
	const dMel = deltas(mels);
	const extraOf = (i) => {
		const f = frames[i];
		const d = dMel[i];
		let dNorm = 0;
		for (let k = 0; k < Math.min(8, d.length); k++) dNorm += d[k] * d[k];
		return [
			Math.log(f.power + 1e-6) * .5,
			(f.f0 ? Math.log(f.f0) - 5 : 0) * .4,
			f.voiced * 2 - 1,
			f.zcr * 8 - 1,
			f.centroid / 4e3,
			Math.sqrt(dNorm)
		];
	};
	const embed = mels.map((m, i) => projectMel(m, extraOf(i)));
	const { out: s1a, attn } = attend(convTemporal(embed), mels);
	const s2 = convTemporal(pool2(s1a), [
		.15,
		.7,
		.15
	]);
	const s3 = convTemporal(pool2(s2), [
		.2,
		.6,
		.2
	]);
	const s4 = mix(s2, upsample2(s3, s2.length), .6, .4);
	const out = mix(s1a, upsample2(s4, s1a.length), .7, .3);
	const kaldiPost = classifyFrames(frames, 0);
	const posteriors = classifyFrames(frames, 3);
	const ctcPath = argmaxPath(posteriors);
	const kaldiPath = argmaxPath(kaldiPost);
	return {
		stacks: [
			{
				name: STACKS[0].name,
				frames: embed
			},
			{
				name: STACKS[1].name,
				frames: s1a
			},
			{
				name: STACKS[2].name,
				frames: s2
			},
			{
				name: STACKS[3].name,
				frames: s3
			},
			{
				name: STACKS[4].name,
				frames: s4
			},
			{
				name: STACKS[5].name,
				frames: out
			}
		],
		out,
		attn,
		attnN: s1a.length,
		posteriors,
		kaldiPost,
		ctcPath,
		kaldiPath,
		phones: idsToGlyphs(ctcPath),
		kaldiPhones: idsToGlyphs(kaldiPath),
		embedding: statsPool(out)
	};
}
function cosine(a, b) {
	const n = Math.min(a.length, b.length);
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < n; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return dot / (Math.sqrt(na * nb) + 1e-8);
}
/**
* In-tab recognizer. No checkpoint.
*
* Unknown audio → energy islands → DTW against Klatt word templates
* (the same mouth Booth uses). Times from the island. CTC path still
* feeds force-align when we already have words (host STT / a known line).
*/
function spansFromPath(path, hop = FRAME_SEC) {
	const out = [];
	let i = 0;
	while (i < path.length) {
		const id = path[i];
		let j = i + 1;
		while (j < path.length && path[j] === id) j++;
		if (id !== 0) out.push({
			id,
			start: i * hop,
			end: j * hop
		});
		i = j;
	}
	return out;
}
function levenshtein(a, b) {
	const n = a.length;
	const m = b.length;
	const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
	for (let i = 0; i <= n; i++) dp[i][0] = i;
	for (let j = 0; j <= m; j++) dp[0][j] = j;
	for (let i = 1; i <= n; i++) {
		const row = dp[i];
		const prev = dp[i - 1];
		const ai = a[i - 1];
		for (let j = 1; j <= m; j++) {
			const c = ai === b[j - 1] ? 0 : 1;
			row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + c);
		}
	}
	return dp[n][m];
}
var LEX_ITEMS = null;
function lexItems() {
	if (LEX_ITEMS) return LEX_ITEMS;
	LEX_ITEMS = Object.entries(LEXICON).map(([word, ph]) => ({
		word,
		ids: ph.map((p) => PHONE_INDEX[p] ?? 0).filter((id) => id > 0)
	})).filter((it) => it.ids.length > 0).sort((a, b) => b.ids.length - a.ids.length);
	return LEX_ITEMS;
}
function decodePath(path, hop = FRAME_SEC) {
	const spans = spansFromPath(path, hop);
	const ids = spans.map((s) => s.id);
	const phones = ids.map((id) => PHONES[id]?.g ?? "?");
	if (!ids.length) return {
		transcript: "",
		aligned: [],
		phones
	};
	const items = lexItems();
	const aligned = [];
	let i = 0;
	while (i < ids.length) {
		let best = null;
		for (const it of items) {
			const maxN = Math.min(ids.length - i, it.ids.length + 2);
			const minN = Math.max(1, it.ids.length - 1);
			for (let n = minN; n <= maxN; n++) {
				const slice = ids.slice(i, i + n);
				const d = levenshtein(slice, it.ids);
				if (d / Math.max(it.ids.length, slice.length) > .4) continue;
				const quality = it.ids.length - d * 1.4 - (n !== it.ids.length ? .15 : 0);
				if (!best || quality > best.quality) best = {
					word: it.word,
					n,
					quality
				};
			}
		}
		if (best) {
			const start = spans[i].start;
			const end = spans[i + best.n - 1].end;
			const last = aligned[aligned.length - 1];
			if (last && last.word === best.word && start - last.end < .12) last.end = end;
			else aligned.push({
				word: best.word,
				start,
				end
			});
			i += best.n;
		} else {
			aligned.push({
				word: PHONES[ids[i]].g,
				start: spans[i].start,
				end: spans[i].end
			});
			i += 1;
		}
	}
	return {
		transcript: aligned.map((w) => w.word).join(" "),
		aligned,
		phones
	};
}
function cmvnSeq(seq) {
	if (!seq.length) return seq;
	const D = seq[0].length;
	const T = seq.length;
	const mean = new Float32Array(D);
	const std = new Float32Array(D);
	for (const row of seq) for (let i = 0; i < D; i++) mean[i] += row[i];
	for (let i = 0; i < D; i++) mean[i] /= T;
	for (const row of seq) for (let i = 0; i < D; i++) {
		const d = row[i] - mean[i];
		std[i] += d * d;
	}
	for (let i = 0; i < D; i++) std[i] = Math.sqrt(std[i] / T + 1e-5);
	return seq.map((row) => {
		const o = new Float32Array(D);
		for (let i = 0; i < D; i++) o[i] = (row[i] - mean[i]) / std[i];
		return o;
	});
}
var TEMPLATES = null;
function templates() {
	if (TEMPLATES) return TEMPLATES;
	TEMPLATES = Object.keys(LEXICON).map((word) => {
		const { pcm } = synthesize(word, {
			f0: 148,
			rate: 1
		});
		return {
			word,
			mfcc: cmvnSeq(extractFrames(pcm).filter((f) => f.power > .018).map((f) => f.mfcc))
		};
	}).filter((t) => t.mfcc.length >= 4).sort((a, b) => b.mfcc.length - a.mfcc.length);
	return TEMPLATES;
}
function mfccDist(a, b) {
	const n = Math.min(a.length, b.length);
	let s = 0;
	for (let i = 0; i < n; i++) {
		const d = a[i] - b[i];
		s += d * d;
	}
	return s;
}
function dtw(a, b) {
	const n = a.length;
	const m = b.length;
	if (!n || !m) return 1e9;
	const dp = Array.from({ length: n + 1 }, () => {
		const row = new Float32Array(m + 1);
		row.fill(1e9);
		return row;
	});
	dp[0][0] = 0;
	for (let i = 1; i <= n; i++) {
		const row = dp[i];
		const prev = dp[i - 1];
		const ai = a[i - 1];
		for (let j = 1; j <= m; j++) {
			const cost = mfccDist(ai, b[j - 1]);
			row[j] = cost + Math.min(prev[j], row[j - 1], prev[j - 1]);
		}
	}
	return dp[n][m] / (n + m);
}
function recognizeFrames(frames, result, hop = FRAME_SEC) {
	const phones = result?.phones ?? [];
	if (frames.length < 4) return {
		transcript: "",
		aligned: [],
		phones
	};
	const tpl = templates();
	const norm = cmvnSeq(frames.map((f) => f.mfcc));
	const aligned = [];
	let i = 0;
	while (i < frames.length && frames[i].power < .02) i++;
	const lastVoiced = (() => {
		for (let k = frames.length - 1; k >= 0; k--) if (frames[k].power >= .02) return k + 1;
		return frames.length;
	})();
	while (i < lastVoiced - 4) {
		while (i < lastVoiced && frames[i].power < .018) i++;
		if (i >= lastVoiced - 4) break;
		const remaining = lastVoiced - i;
		let best = null;
		for (const t of tpl) {
			const nMin = Math.max(4, Math.floor(t.mfcc.length * .7));
			const nMax = Math.min(remaining, Math.ceil(t.mfcc.length * 1.35));
			if (nMax < nMin) continue;
			for (let n = nMin; n <= nMax; n += 2) {
				const cost = dtw(norm.slice(i, i + n), t.mfcc) - t.mfcc.length * .015;
				if (!best || cost < best.cost) best = {
					word: t.word,
					n,
					cost
				};
			}
		}
		if (best && best.cost < 8) {
			aligned.push({
				word: best.word,
				start: i * hop,
				end: (i + best.n) * hop
			});
			i += best.n;
		} else i += 3;
	}
	if (aligned.length) return {
		transcript: aligned.map((w) => w.word).join(" "),
		aligned,
		phones
	};
	if (result?.ctcPath.length) return decodePath(result.ctcPath, hop);
	return {
		transcript: "",
		aligned: [],
		phones
	};
}
function forceAlign(text, path, hop = FRAME_SEC) {
	const words = text.trim().split(/\s+/).map((w) => w.replace(/[^a-zA-Z'-]/g, "")).filter(Boolean);
	if (!words.length || !path.length) return [];
	const units = [];
	for (const raw of words) {
		const word = raw.toLowerCase();
		for (const p of g2p(word)) {
			const id = PHONE_INDEX[p] ?? 0;
			if (id) units.push({
				word,
				id
			});
		}
	}
	if (!units.length) return [];
	const T = path.length;
	const U = units.length;
	const INF = 1e9;
	const dp = Array.from({ length: U + 1 }, () => {
		const row = new Float32Array(T + 1);
		row.fill(INF);
		return row;
	});
	dp[0][0] = 0;
	for (let t = 1; t <= T; t++) dp[0][t] = dp[0][t - 1] + (path[t - 1] === 0 ? .05 : .35);
	for (let u = 1; u <= U; u++) {
		const uid = units[u - 1].id;
		const row = dp[u];
		const prev = dp[u - 1];
		for (let t = 1; t <= T; t++) {
			const pid = path[t - 1];
			const match = uid === pid ? 0 : pid === 0 ? .2 : 1;
			const extra = pid === 0 ? .05 : .25;
			row[t] = Math.min(prev[t - 1] + match, row[t - 1] + extra, prev[t] + .85);
		}
	}
	const first = new Int32Array(U);
	const last = new Int32Array(U);
	first.fill(-1);
	last.fill(-1);
	let u = U;
	let t = T;
	while (u > 0 && t > 0) {
		const pid = path[t - 1];
		const match = units[u - 1].id === pid ? 0 : pid === 0 ? .2 : 1;
		const extra = pid === 0 ? .05 : .25;
		const v = dp[u][t];
		const diag = dp[u - 1][t - 1] + match;
		const left = dp[u][t - 1] + extra;
		const up = dp[u - 1][t] + .85;
		if (Math.abs(v - diag) <= Math.abs(v - left) && Math.abs(v - diag) <= Math.abs(v - up)) {
			last[u - 1] = Math.max(last[u - 1], t - 1);
			if (first[u - 1] < 0 || t - 1 < first[u - 1]) first[u - 1] = t - 1;
			u--;
			t--;
		} else if (Math.abs(v - left) <= Math.abs(v - up)) {
			last[u - 1] = Math.max(last[u - 1], t - 1);
			if (first[u - 1] < 0 || t - 1 < first[u - 1]) first[u - 1] = t - 1;
			t--;
		} else u--;
	}
	const aligned = [];
	for (let i = 0; i < U; i++) {
		const word = units[i].word;
		const t0 = first[i] < 0 ? 0 : first[i];
		const t1 = last[i] < 0 ? t0 : last[i];
		const start = t0 * hop;
		const end = (t1 + 1) * hop;
		const prev = aligned[aligned.length - 1];
		if (prev && prev.word === word) prev.end = Math.max(prev.end, end);
		else aligned.push({
			word,
			start,
			end
		});
	}
	return aligned;
}
var MAX_SAMPLES = SAMPLE_RATE * 8;
function emptySnap$1() {
	return {
		pcm: /* @__PURE__ */ new Float32Array(0),
		frames: [],
		result: null,
		playhead: 0,
		duration: 0,
		energy: 0,
		f0: 0,
		vad: false,
		source: "idle",
		transcript: "",
		aligned: []
	};
}
var AudioEngine = class {
	snap = emptySnap$1();
	listeners = /* @__PURE__ */ new Set();
	ctx = null;
	stream = null;
	processor = null;
	mute = null;
	sourceNode = null;
	playing = null;
	raf = 0;
	rec = new Float32Array(MAX_SAMPLES);
	recWrite = 0;
	recoding = false;
	lastRecAt = 0;
	listening = false;
	lastError = null;
	subscribe(fn) {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}
	emit() {
		for (const fn of this.listeners) fn();
	}
	async ensureCtx() {
		if (!this.ctx) this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
		if (this.ctx.state === "suspended") await this.ctx.resume();
		return this.ctx;
	}
	commit(pcm, extra) {
		const frames = extractFrames(pcm);
		const result = frames.length ? encode(frames) : null;
		let energy = rms(pcm);
		let f0 = 0;
		let voiced = 0;
		if (frames.length) {
			const tail = frames.slice(-20);
			energy = tail.reduce((s, f) => s + f.power, 0) / tail.length;
			const voicedFrames = tail.filter((f) => f.f0 > 0);
			f0 = voicedFrames.length ? voicedFrames.reduce((s, f) => s + f.f0, 0) / voicedFrames.length : 0;
			voiced = voicedFrames.length / tail.length;
		}
		let rec;
		if (extra.transcript !== void 0) rec = {
			transcript: extra.transcript,
			aligned: extra.aligned ?? [],
			phones: result?.phones ?? []
		};
		else {
			const isMic = extra.source === "mic" || extra.source === void 0 && this.snap.source === "mic";
			const now = typeof performance !== "undefined" ? performance.now() : Date.now();
			if (!isMic || now - this.lastRecAt > 280) {
				this.lastRecAt = now;
				rec = recognizeFrames(frames, result ?? void 0);
			} else rec = {
				transcript: this.snap.transcript,
				aligned: this.snap.aligned,
				phones: result?.phones ?? this.snap.result?.phones ?? []
			};
		}
		this.snap = {
			...this.snap,
			pcm,
			frames,
			result,
			duration: pcm.length / SAMPLE_RATE,
			energy,
			f0,
			vad: energy > .02 && voiced > .15,
			transcript: rec.transcript,
			aligned: rec.aligned,
			...extra
		};
		this.emit();
	}
	async runDemo(line = DEMO_LINE$1) {
		await this.stopMic();
		this.stopPlayback();
		const { pcm, phones } = synthesize(line, {
			f0: 142,
			rate: 1.02
		});
		const aligned = [];
		for (const p of phones) {
			if (!p.word) continue;
			const last = aligned[aligned.length - 1];
			if (last && last.word === p.word) last.end = p.start + p.dur;
			else aligned.push({
				word: p.word,
				start: p.start,
				end: p.start + p.dur
			});
		}
		this.commit(pcm, {
			source: "demo",
			transcript: line,
			aligned,
			playhead: 0
		});
		await this.playPcm(pcm);
	}
	async speakBooth(text, voice) {
		this.stopPlayback();
		const { pcm, phones } = synthesize(text, voice);
		const aligned = [];
		for (const p of phones) {
			if (!p.word) continue;
			const last = aligned[aligned.length - 1];
			if (last && last.word === p.word) last.end = p.start + p.dur;
			else aligned.push({
				word: p.word,
				start: p.start,
				end: p.start + p.dur
			});
		}
		this.commit(pcm, {
			source: "booth",
			transcript: text,
			aligned,
			playhead: 0
		});
		await this.playPcm(pcm);
	}
	async loadFile(file) {
		await this.stopMic();
		this.stopPlayback();
		const ctx = await this.ensureCtx();
		const buf = await file.arrayBuffer();
		const decoded = await ctx.decodeAudioData(buf.slice(0));
		const ch = decoded.getChannelData(0);
		const pcm = resampleLinear(new Float32Array(ch), decoded.sampleRate, SAMPLE_RATE).slice(0, MAX_SAMPLES);
		this.commit(pcm, {
			source: "file",
			playhead: 0
		});
		await this.playPcm(pcm);
	}
	async playPcm(pcm) {
		const ctx = await this.ensureCtx();
		this.stopPlayback();
		const audioBuf = ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
		audioBuf.copyToChannel(new Float32Array(pcm), 0);
		const src = ctx.createBufferSource();
		src.buffer = audioBuf;
		src.connect(ctx.destination);
		const startAt = ctx.currentTime;
		src.onended = () => {
			if (this.playing === src) {
				this.snap = {
					...this.snap,
					playhead: 1
				};
				this.emit();
			}
		};
		src.start();
		this.playing = src;
		const tick = () => {
			if (this.playing !== src) return;
			const t = (ctx.currentTime - startAt) / audioBuf.duration;
			this.snap = {
				...this.snap,
				playhead: Math.min(1, t)
			};
			this.emit();
			if (t < 1) this.raf = requestAnimationFrame(tick);
		};
		this.raf = requestAnimationFrame(tick);
	}
	stopPlayback() {
		cancelAnimationFrame(this.raf);
		try {
			this.playing?.stop();
		} catch {}
		this.playing = null;
	}
	async startMic() {
		this.lastError = null;
		try {
			await this.stopMic();
			this.stopPlayback();
			const ctx = await this.ensureCtx();
			const stream = await navigator.mediaDevices.getUserMedia({ audio: {
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true
			} });
			this.stream = stream;
			const src = ctx.createMediaStreamSource(stream);
			const proc = ctx.createScriptProcessor(2048, 1, 1);
			const mute = ctx.createGain();
			mute.gain.value = 0;
			this.rec = new Float32Array(MAX_SAMPLES);
			this.recWrite = 0;
			this.recoding = true;
			this.listening = true;
			proc.onaudioprocess = (ev) => {
				if (!this.recoding) return;
				const input = ev.inputBuffer.getChannelData(0);
				const rate = ev.inputBuffer.sampleRate;
				const srcSamples = new Float32Array(input);
				const chunk = rate === 16e3 ? srcSamples : resampleLinear(srcSamples, rate, SAMPLE_RATE);
				const room = MAX_SAMPLES - this.recWrite;
				if (room <= 0) {
					this.rec.copyWithin(0, chunk.length);
					this.rec.set(chunk, MAX_SAMPLES - chunk.length);
				} else if (chunk.length >= room) {
					this.rec.set(chunk.subarray(0, room), this.recWrite);
					const rest = chunk.subarray(room);
					this.rec.copyWithin(0, rest.length);
					this.rec.set(rest, MAX_SAMPLES - rest.length);
					this.recWrite = MAX_SAMPLES;
				} else {
					this.rec.set(chunk, this.recWrite);
					this.recWrite += chunk.length;
				}
				const used = Math.min(this.recWrite, MAX_SAMPLES);
				const pcm = this.rec.subarray(Math.max(0, used - SAMPLE_RATE * 4), used);
				this.commit(new Float32Array(pcm), {
					source: "mic",
					playhead: 1
				});
			};
			src.connect(proc);
			proc.connect(mute);
			mute.connect(ctx.destination);
			this.sourceNode = src;
			this.processor = proc;
			this.mute = mute;
			this.snap = {
				...this.snap,
				source: "mic"
			};
			this.emit();
		} catch (err) {
			this.listening = false;
			this.lastError = err instanceof Error ? err.message : "Microphone is not available.";
			this.emit();
		}
	}
	async stopMic() {
		this.recoding = false;
		this.listening = false;
		try {
			this.processor?.disconnect();
			this.mute?.disconnect();
			this.sourceNode?.disconnect();
		} catch {}
		this.processor = null;
		this.mute = null;
		this.sourceNode = null;
		this.stream?.getTracks().forEach((t) => t.stop());
		this.stream = null;
	}
	matchSpeaker(enrolled) {
		const emb = this.snap.result?.embedding;
		if (!emb || !enrolled.length) return null;
		let best = null;
		for (const e of enrolled) {
			const score = cosine(emb, Float32Array.from(e.emb));
			if (!best || score > best.score) best = {
				name: e.name,
				score
			};
		}
		return best;
	}
};
var engine$1 = new AudioEngine();
function Waveform({ pcm, height = 88, ink = "signal", playhead }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let raf = 0;
		const paint = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
				canvas.width = Math.floor(w * dpr);
				canvas.height = Math.floor(h * dpr);
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const styles = getComputedStyle(document.documentElement);
			const bg = styles.getPropertyValue("--color-elevated").trim() || "#1d1d19";
			const token = ink === "linen" ? "--color-linen" : ink === "warn" ? "--color-warn" : "--color-signal";
			const fg = styles.getPropertyValue(token).trim() || "#9aaf98";
			const mute = styles.getPropertyValue("--color-subtle").trim() || "#5c5a54";
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, w, h);
			ctx.strokeStyle = mute;
			ctx.globalAlpha = .4;
			ctx.beginPath();
			ctx.moveTo(0, h / 2);
			ctx.lineTo(w, h / 2);
			ctx.stroke();
			ctx.globalAlpha = 1;
			const samples = pcm ?? engine$1.snap.pcm;
			const head = playhead ?? engine$1.snap.playhead;
			if (samples.length > 1) {
				const step = Math.max(1, Math.floor(samples.length / w));
				let peak = 1e-4;
				for (let x = 0; x < w; x++) {
					const i = Math.min(samples.length - 1, x * step);
					peak = Math.max(peak, Math.abs(samples[i]));
				}
				const g = h * .42 / peak;
				ctx.strokeStyle = fg;
				ctx.lineWidth = 1.25;
				ctx.beginPath();
				for (let x = 0; x < w; x++) {
					const i = Math.min(samples.length - 1, x * step);
					const y = h / 2 - samples[i] * g;
					if (x === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
				ctx.stroke();
				if (head > 0 && head < 1) {
					ctx.strokeStyle = styles.getPropertyValue("--color-linen").trim() || "#d8d3c6";
					ctx.globalAlpha = .7;
					ctx.beginPath();
					ctx.moveTo(head * w, 0);
					ctx.lineTo(head * w, h);
					ctx.stroke();
					ctx.globalAlpha = 1;
				}
			}
			raf = requestAnimationFrame(paint);
		};
		raf = requestAnimationFrame(paint);
		return () => cancelAnimationFrame(raf);
	}, [
		pcm,
		ink,
		playhead
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className: "block h-full w-full",
		style: { height },
		"aria-hidden": true
	});
}
var LEAD_MIN = 55296;
var LEAD_MAX = 56319;
var TRAIL_MIN = 56320;
var TRAIL_MAX = 57343;
var ENCODINGS = [
	{
		id: "utf-8",
		label: "UTF-8",
		note: "Unicode, 1–4 bytes"
	},
	{
		id: "utf-16le",
		label: "UTF-16LE",
		note: "Surrogate pairs, little-endian"
	},
	{
		id: "utf-16be",
		label: "UTF-16BE",
		note: "Surrogate pairs, big-endian"
	},
	{
		id: "utf-32le",
		label: "UTF-32LE",
		note: "One code point, four bytes"
	},
	{
		id: "utf-32be",
		label: "UTF-32BE",
		note: "One code point, four bytes"
	},
	{
		id: "ascii",
		label: "ASCII",
		note: "7-bit, replacement on high bytes"
	},
	{
		id: "latin1",
		label: "Latin-1",
		note: "ISO-8859-1, byte = code point"
	},
	{
		id: "windows-1252",
		label: "Windows-1252",
		note: "Latin-1 with 0x80–0x9F"
	},
	{
		id: "gb18030",
		label: "GB18030",
		note: "4-byte Unicode mapping"
	}
];
var ENCODING_IDS = new Set(ENCODINGS.map((e) => e.id));
function isEncodingId(v) {
	return typeof v === "string" && ENCODING_IDS.has(v);
}
/** CP1252 overrides for 0x80–0x9F (rest matches Latin-1). */
var CP1252_FROM = [
	8364,
	129,
	8218,
	402,
	8222,
	8230,
	8224,
	8225,
	710,
	8240,
	352,
	8249,
	338,
	141,
	381,
	143,
	144,
	8216,
	8217,
	8220,
	8221,
	8226,
	8211,
	8212,
	732,
	8482,
	353,
	8250,
	339,
	157,
	382,
	376
];
var CP1252_TO = /* @__PURE__ */ new Map();
CP1252_FROM.forEach((cp, i) => {
	if (cp !== 128 + i) CP1252_TO.set(cp, 128 + i);
});
var REPLACEMENT = 65533;
var DEF_BYTE = 63;
var CP_CHUNK = 8192;
function fromCodePoints(cps) {
	if (cps.length === 0) return "";
	if (cps.length <= CP_CHUNK) return String.fromCodePoint(...cps);
	let out = "";
	for (let i = 0; i < cps.length; i += CP_CHUNK) out += String.fromCodePoint(...cps.slice(i, i + CP_CHUNK));
	return out;
}
function pushByte(out, b) {
	out.push(b & 255);
}
function pushU16(out, cp, le) {
	if (le) {
		pushByte(out, cp);
		pushByte(out, cp >> 8);
	} else {
		pushByte(out, cp >> 8);
		pushByte(out, cp);
	}
}
function pushU32(out, cp, le) {
	if (le) {
		pushByte(out, cp);
		pushByte(out, cp >> 8);
		pushByte(out, cp >> 16);
		pushByte(out, cp >> 24);
	} else {
		pushByte(out, cp >> 24);
		pushByte(out, cp >> 16);
		pushByte(out, cp >> 8);
		pushByte(out, cp);
	}
}
function encodeUtf8(cp, out) {
	if (cp < 128) pushByte(out, cp);
	else if (cp < 2048) {
		pushByte(out, 192 | cp >> 6);
		pushByte(out, 128 | cp & 63);
	} else if (cp < 65536) {
		pushByte(out, 224 | cp >> 12);
		pushByte(out, 128 | cp >> 6 & 63);
		pushByte(out, 128 | cp & 63);
	} else {
		pushByte(out, 240 | cp >> 18);
		pushByte(out, 128 | cp >> 12 & 63);
		pushByte(out, 128 | cp >> 6 & 63);
		pushByte(out, 128 | cp & 63);
	}
}
/** Range starts: Unicode, matching 4-byte pointer. Binary search like the codec. */
var GB_U = [128, 65536];
var GB_P = [0, 189e3];
function findIdx(table, val) {
	if (!table.length || table[0] > val) return -1;
	let l = 0;
	let r = table.length;
	while (l < r - 1) {
		const mid = l + (r - l + 1 >> 1);
		if (table[mid] <= val) l = mid;
		else r = mid;
	}
	return l;
}
function gb18030Bytes(cp, out) {
	if (cp < 128) {
		pushByte(out, cp);
		return;
	}
	const idx = findIdx(GB_U, cp);
	if (idx < 0) {
		pushByte(out, DEF_BYTE);
		return;
	}
	let n = GB_P[idx] + (cp - GB_U[idx]);
	const b1 = 129 + Math.floor(n / 12600);
	n %= 12600;
	const b2 = 48 + Math.floor(n / 1260);
	n %= 1260;
	const b3 = 129 + Math.floor(n / 10);
	const b4 = 48 + n % 10;
	if (b1 > 254 || b3 > 254 || b2 > 57 || b4 > 57) {
		pushByte(out, DEF_BYTE);
		return;
	}
	pushByte(out, b1);
	pushByte(out, b2);
	pushByte(out, b3);
	pushByte(out, b4);
}
function encodeCodePoint(cp, enc, out) {
	if (cp < 0) return false;
	switch (enc) {
		case "utf-8":
			encodeUtf8(cp, out);
			return true;
		case "utf-16le":
		case "utf-16be": {
			const le = enc === "utf-16le";
			if (cp < 65536) pushU16(out, cp, le);
			else {
				const u = cp - 65536;
				pushU16(out, 55296 | u >> 10, le);
				pushU16(out, 56320 | u & 1023, le);
			}
			return true;
		}
		case "utf-32le":
			pushU32(out, cp, true);
			return true;
		case "utf-32be":
			pushU32(out, cp, false);
			return true;
		case "ascii":
			if (cp < 128) pushByte(out, cp);
			else return false;
			return true;
		case "latin1":
			if (cp < 256) pushByte(out, cp);
			else return false;
			return true;
		case "windows-1252":
			if (cp < 128 || cp < 256 && cp > 159) pushByte(out, cp);
			else if (CP1252_TO.has(cp)) pushByte(out, CP1252_TO.get(cp));
			else return false;
			return true;
		case "gb18030":
			gb18030Bytes(cp, out);
			return true;
	}
}
var StreamEncoder = class {
	leadSurrogate = -1;
	replacements = 0;
	units = 0;
	encoding;
	constructor(encoding) {
		this.encoding = encoding;
	}
	write(str) {
		const out = [];
		let lead = this.leadSurrogate;
		let nextChar = -1;
		let i = 0;
		while (true) {
			let uCode;
			if (nextChar === -1) {
				if (i === str.length) break;
				uCode = str.charCodeAt(i++);
			} else {
				uCode = nextChar;
				nextChar = -1;
			}
			if (uCode >= LEAD_MIN && uCode < 57344) {
				if (uCode <= LEAD_MAX) {
					if (lead === -1) {
						lead = uCode;
						continue;
					}
					lead = uCode;
					uCode = -1;
				} else if (lead !== -1) {
					uCode = 65536 + (lead - LEAD_MIN) * 1024 + (uCode - TRAIL_MIN);
					lead = -1;
				} else uCode = -1;
			} else if (lead !== -1) {
				nextChar = uCode;
				uCode = -1;
				lead = -1;
			}
			this.units++;
			if (uCode === -1 || !encodeCodePoint(uCode, this.encoding, out)) {
				this.replacements++;
				pushByte(out, DEF_BYTE);
			}
		}
		this.leadSurrogate = lead;
		return Uint8Array.from(out);
	}
	end() {
		const out = [];
		if (this.leadSurrogate !== -1) {
			this.replacements++;
			pushByte(out, DEF_BYTE);
			this.leadSurrogate = -1;
		}
		return Uint8Array.from(out);
	}
	state() {
		return {
			leadSurrogate: this.leadSurrogate,
			replacements: this.replacements,
			units: this.units
		};
	}
};
function encodeText(str, encoding) {
	const enc = new StreamEncoder(encoding);
	const a = enc.write(str);
	const b = enc.end();
	const bytes = new Uint8Array(a.length + b.length);
	bytes.set(a, 0);
	bytes.set(b, a.length);
	return {
		bytes,
		state: enc.state()
	};
}
function readU16(buf, i, le) {
	return le ? buf[i] | buf[i + 1] << 8 : buf[i] << 8 | buf[i + 1];
}
function readU32(buf, i, le) {
	return le ? buf[i] | buf[i + 1] << 8 | buf[i + 2] << 16 | buf[i + 3] << 24 : buf[i] << 24 | buf[i + 1] << 16 | buf[i + 2] << 8 | buf[i + 3];
}
function concatPending(pending, buf) {
	if (pending.length === 0) return buf;
	const data = new Uint8Array(pending.length + buf.length);
	data.set(pending, 0);
	data.set(buf, pending.length);
	return data;
}
function tryGb18030(bytes) {
	try {
		return new TextDecoder("gb18030", { fatal: false }).decode(bytes);
	} catch {
		return null;
	}
}
function gb18030PointerToCp(ptr) {
	const idx = findIdx(GB_P, ptr);
	if (idx < 0) return REPLACEMENT;
	return GB_U[idx] + ptr - GB_P[idx];
}
var StreamDecoder = class {
	pendingBytes = [];
	leadSurrogate = -1;
	replacements = 0;
	units = 0;
	encoding;
	constructor(encoding) {
		this.encoding = encoding;
	}
	write(buf) {
		const data = concatPending(this.pendingBytes, buf);
		this.pendingBytes = [];
		const cps = [];
		const enc = this.encoding;
		if (enc === "utf-8") this.decodeUtf8(data, cps);
		else if (enc === "utf-16le" || enc === "utf-16be") this.decodeUtf16(data, cps, enc === "utf-16le");
		else if (enc === "utf-32le" || enc === "utf-32be") this.decodeUtf32(data, cps, enc === "utf-32le");
		else if (enc === "ascii" || enc === "latin1") this.decodeLatin(data, cps, enc === "ascii");
		else if (enc === "windows-1252") this.decodeCp1252(data, cps);
		else this.decodeGb18030(data, cps);
		this.units += cps.length;
		return fromCodePoints(cps);
	}
	end() {
		const cps = [];
		if (this.encoding === "gb18030" && this.pendingBytes.length) {
			const via = tryGb18030(Uint8Array.from(this.pendingBytes));
			if (via !== null) {
				this.pendingBytes = [];
				this.units += via.length;
				return via;
			}
		}
		if (this.leadSurrogate !== -1) {
			cps.push(REPLACEMENT);
			this.replacements++;
			this.leadSurrogate = -1;
		}
		if (this.pendingBytes.length) {
			cps.push(REPLACEMENT);
			this.replacements++;
			this.pendingBytes = [];
		}
		this.units += cps.length;
		return fromCodePoints(cps);
	}
	state() {
		return {
			pending: this.pendingBytes.length,
			leadSurrogate: this.leadSurrogate,
			replacements: this.replacements,
			units: this.units
		};
	}
	replace(cps) {
		cps.push(REPLACEMENT);
		this.replacements++;
	}
	decodeUtf8(data, cps) {
		let i = 0;
		while (i < data.length) {
			const b = data[i];
			let need = 0;
			let cp = 0;
			if (b < 128) {
				cps.push(b);
				i += 1;
				continue;
			}
			if (b < 194 || b >= 245) {
				this.replace(cps);
				i += 1;
				continue;
			}
			if (b < 224) {
				need = 1;
				cp = b & 31;
			} else if (b < 240) {
				need = 2;
				cp = b & 15;
			} else {
				need = 3;
				cp = b & 7;
			}
			if (i + need >= data.length) {
				this.pendingBytes = Array.from(data.subarray(i));
				break;
			}
			let ok = true;
			for (let k = 1; k <= need; k++) {
				const c = data[i + k];
				if ((c & 192) !== 128) {
					ok = false;
					break;
				}
				cp = cp << 6 | c & 63;
			}
			if (!ok) {
				this.replace(cps);
				i += 1;
				continue;
			}
			if (cp < (need === 1 ? 128 : need === 2 ? 2048 : 65536) || cp > 1114111 || cp >= LEAD_MIN && cp <= TRAIL_MAX) {
				this.replace(cps);
				i += 1 + need;
				continue;
			}
			cps.push(cp);
			i += 1 + need;
		}
	}
	decodeUtf16(data, cps, le) {
		let i = 0;
		if (this.leadSurrogate !== -1) {
			if (i + 1 >= data.length) {
				this.pendingBytes = Array.from(data);
				return;
			}
			const v = readU16(data, i, le);
			if (v >= TRAIL_MIN && v <= TRAIL_MAX) {
				cps.push(65536 + (this.leadSurrogate - LEAD_MIN << 10) + (v - TRAIL_MIN));
				this.leadSurrogate = -1;
				i += 2;
			} else {
				this.replace(cps);
				this.leadSurrogate = -1;
			}
		}
		while (i + 1 < data.length) {
			const u = readU16(data, i, le);
			i += 2;
			if (u >= LEAD_MIN && u <= LEAD_MAX) {
				if (i + 1 < data.length) {
					const v = readU16(data, i, le);
					if (v >= TRAIL_MIN && v <= TRAIL_MAX) {
						cps.push(65536 + (u - LEAD_MIN << 10) + (v - TRAIL_MIN));
						i += 2;
					} else this.replace(cps);
				} else this.leadSurrogate = u;
			} else if (u >= TRAIL_MIN && u <= TRAIL_MAX) this.replace(cps);
			else cps.push(u);
		}
		if (i < data.length) this.pendingBytes = [data[i]];
	}
	decodeUtf32(data, cps, le) {
		let i = 0;
		while (i + 3 < data.length) {
			const u = readU32(data, i, le) >>> 0;
			i += 4;
			if (u > 1114111 || u >= LEAD_MIN && u <= TRAIL_MAX) this.replace(cps);
			else cps.push(u);
		}
		if (i < data.length) this.pendingBytes = Array.from(data.subarray(i));
	}
	decodeLatin(data, cps, ascii) {
		for (let i = 0; i < data.length; i++) {
			const b = data[i];
			if (ascii && b > 127) this.replace(cps);
			else cps.push(b);
		}
	}
	decodeCp1252(data, cps) {
		for (let i = 0; i < data.length; i++) {
			const b = data[i];
			cps.push(b >= 128 && b <= 159 ? CP1252_FROM[b - 128] : b);
		}
	}
	decodeGb18030(data, cps) {
		let i = 0;
		while (i < data.length) {
			const b = data[i];
			if (b < 128) {
				cps.push(b);
				i += 1;
				continue;
			}
			if (i + 1 >= data.length) {
				this.pendingBytes = Array.from(data.subarray(i));
				break;
			}
			const b2 = data[i + 1];
			if (b >= 129 && b <= 254 && b2 >= 48 && b2 <= 57) {
				if (i + 3 >= data.length) {
					this.pendingBytes = Array.from(data.subarray(i));
					break;
				}
				const b3 = data[i + 2];
				const b4 = data[i + 3];
				const via = tryGb18030(data.subarray(i, i + 4));
				if (via !== null && via !== "�") for (const ch of via) cps.push(ch.codePointAt(0) ?? REPLACEMENT);
				else if (b3 >= 129 && b3 <= 254 && b4 >= 48 && b4 <= 57) {
					const cp = gb18030PointerToCp((b - 129) * 12600 + (b2 - 48) * 1260 + (b3 - 129) * 10 + (b4 - 48));
					if (cp === REPLACEMENT) this.replace(cps);
					else cps.push(cp);
				} else {
					this.replace(cps);
					i += 1;
					continue;
				}
				i += 4;
				continue;
			}
			if (b >= 129 && b <= 254 && (b2 >= 64 && b2 <= 126 || b2 >= 128 && b2 <= 254)) {
				const via = tryGb18030(data.subarray(i, i + 2));
				if (via !== null) for (const ch of via) cps.push(ch.codePointAt(0) ?? REPLACEMENT);
				else this.replace(cps);
				i += 2;
				continue;
			}
			this.replace(cps);
			i += 1;
		}
	}
};
function decodeBytes(buf, encoding) {
	const dec = new StreamDecoder(encoding);
	return {
		text: dec.write(buf) + dec.end(),
		replacements: dec.replacements
	};
}
function hexDump(bytes, width = 16) {
	const rows = [];
	for (let i = 0; i < bytes.length; i += width) {
		const slice = bytes.subarray(i, i + width);
		const hex = Array.from(slice, (b) => b.toString(16).padStart(2, "0"));
		const ascii = Array.from(slice, (b) => b >= 32 && b < 127 ? String.fromCharCode(b) : "·").join("");
		rows.push({
			offset: i,
			hex,
			ascii
		});
	}
	return rows;
}
function parseHex(input) {
	const clean = input.replace(/0x/gi, " ").replace(/[^0-9a-f]/gi, "");
	const padded = clean.length % 2 ? clean + "0" : clean;
	const bytes = new Uint8Array(padded.length / 2);
	for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
	return bytes;
}
function inspectText(str, encoding) {
	const out = [];
	for (const ch of str) {
		const cp = ch.codePointAt(0) ?? 0;
		const units = [];
		if (cp > 65535) {
			const u = cp - 65536;
			units.push(55296 | u >> 10, 56320 | u & 1023);
		} else units.push(cp);
		const buf = [];
		encodeCodePoint(cp, encoding, buf);
		out.push({
			cp,
			glyph: ch,
			units,
			bytes: buf,
			surrogate: units.length === 2 ? [units[0], units[1]] : void 0
		});
	}
	return out;
}
var DEMO_LINE = "Filament in. Codec. Booth out.";
var PERSIST_KEY = "codec.studio";
var useStudio = create((set) => ({
	room: "war",
	setRoom: (room) => set({ room }),
	face: "encoder",
	setFace: (face) => set({ face }),
	encoderText: DEMO_LINE,
	setEncoderText: (encoderText) => set({ encoderText }),
	hexIn: "",
	setHexIn: (hexIn) => set({ hexIn }),
	encoding: "utf-8",
	setEncoding: (encoding) => set({ encoding }),
	listening: false,
	setListening: (listening) => set({ listening }),
	filamentText: "",
	filamentPartial: "",
	setFilament: (filamentText, filamentPartial) => set({
		filamentText,
		filamentPartial
	}),
	boothText: DEMO_LINE,
	setBoothText: (boothText) => set({ boothText }),
	boothF0: 148,
	boothRate: 1,
	setBoothVoice: (boothF0, boothRate) => set({
		boothF0,
		boothRate
	}),
	useHostVoice: false,
	setUseHostVoice: (useHostVoice) => set({ useHostVoice }),
	view: "field",
	setView: (view) => set({ view }),
	scene: "kitchen",
	setScene: (scene) => set({ scene }),
	showFused: false,
	setShowFused: (showFused) => set({ showFused }),
	discerning: false,
	setDiscerning: (discerning) => set({ discerning }),
	discernment: null,
	discernError: null,
	setDiscernment: (discernment, discernError) => set({
		discernment,
		discernError
	})
}));
function isRoom(v) {
	return v === "filament" || v === "codec" || v === "booth" || v === "dispersion" || v === "war";
}
function hydrateStudio() {
	if (typeof window === "undefined") return;
	try {
		const raw = localStorage.getItem(PERSIST_KEY);
		if (!raw) return;
		const d = JSON.parse(raw);
		useStudio.setState({
			encoding: isEncodingId(d.encoding) ? d.encoding : "utf-8",
			face: d.face === "decoder" ? "decoder" : "encoder",
			boothF0: typeof d.boothF0 === "number" && d.boothF0 >= 90 && d.boothF0 <= 240 ? d.boothF0 : 148,
			boothRate: typeof d.boothRate === "number" && d.boothRate >= .7 && d.boothRate <= 1.4 ? d.boothRate : 1,
			useHostVoice: d.useHostVoice === true,
			room: isRoom(d.room) ? d.room : "war",
			view: d.view === "canals" || d.view === "refused" ? d.view : "field",
			scene: d.scene === "two-booths" || d.scene === "crisis" ? d.scene : "kitchen"
		});
	} catch {}
}
function persistStudio(s) {
	if (typeof window === "undefined") return;
	const payload = {
		encoding: s.encoding,
		face: s.face,
		boothF0: s.boothF0,
		boothRate: s.boothRate,
		useHostVoice: s.useHostVoice,
		room: s.room,
		view: s.view,
		scene: s.scene
	};
	localStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
}
function BoothRoom() {
	const text = useStudio((s) => s.boothText);
	const setText = useStudio((s) => s.setBoothText);
	const f0 = useStudio((s) => s.boothF0);
	const rate = useStudio((s) => s.boothRate);
	const setVoice = useStudio((s) => s.setBoothVoice);
	const host = useStudio((s) => s.useHostVoice);
	const setHost = useStudio((s) => s.setUseHostVoice);
	const encoderText = useStudio((s) => s.encoderText);
	const [, setTick] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		return engine$1.subscribe(() => setTick((n) => n + 1));
	}, []);
	const speak = async () => {
		const line = text.trim();
		if (!line) return;
		if (host && typeof window !== "undefined" && window.speechSynthesis) {
			window.speechSynthesis.cancel();
			const u = new SpeechSynthesisUtterance(line);
			u.rate = rate;
			u.pitch = Math.min(2, Math.max(.5, f0 / 148));
			window.speechSynthesis.speak(u);
			return;
		}
		await engine$1.speakBooth(line, {
			f0,
			rate
		});
	};
	const stop = () => {
		engine$1.stopPlayback();
		if (typeof window !== "undefined") window.speechSynthesis?.cancel();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid min-w-0 gap-4 lg:grid-cols-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "booth",
				title: "Speak",
				className: "lg:col-span-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "booth-text",
						className: "sr-only",
						children: "Text for Booth to speak"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "booth-text",
						value: text,
						onChange: (e) => setText(e.target.value),
						rows: 6,
						className: "min-h-36 w-full resize-y rounded-md bg-elevated px-3 py-3 text-base leading-relaxed text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-[var(--motion-quick)] focus:shadow-[var(--shadow-border-hover)]",
						placeholder: "Booth reads this."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: () => void speak(),
								disabled: !text.trim(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, {}), "Speak"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "quiet",
								onClick: stop,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" }), "Stop"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								onClick: () => setText(encoderText),
								disabled: !encoderText,
								children: "Take encoder text"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "voice",
				title: "Source",
				className: "lg:col-span-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						role: "radiogroup",
						"aria-label": "Voice source",
						className: "flex gap-1 rounded-md bg-elevated p-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							role: "radio",
							"aria-checked": !host,
							className: cn("h-11 flex-1 rounded-sm text-sm transition-colors duration-[var(--motion-quick)]", !host ? "bg-linen text-bg" : "text-muted hover:text-fg"),
							onClick: () => setHost(false),
							children: "Booth engine"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							role: "radio",
							"aria-checked": host,
							className: cn("h-11 flex-1 rounded-sm text-sm transition-colors duration-[var(--motion-quick)]", host ? "bg-linen text-bg" : "text-muted hover:text-fg"),
							onClick: () => setHost(true),
							children: "Host voice"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-5 block",
						htmlFor: "booth-pitch",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-xs tracking-widest text-subtle uppercase",
							children: [
								"Pitch ",
								f0,
								" Hz"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "booth-pitch",
							type: "range",
							min: 90,
							max: 240,
							value: f0,
							onChange: (e) => setVoice(Number(e.target.value), rate),
							className: "mt-1 h-11 w-full accent-signal"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-2 block",
						htmlFor: "booth-rate",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-xs tracking-widest text-subtle uppercase",
							children: [
								"Rate ",
								rate.toFixed(2),
								"×"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "booth-rate",
							type: "range",
							min: 70,
							max: 140,
							value: Math.round(rate * 100),
							onChange: (e) => setVoice(f0, Number(e.target.value) / 100),
							className: "mt-1 h-11 w-full accent-signal"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid grid-cols-2 gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "engine",
							value: host ? "host" : "formant"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "source",
							value: engine$1.snap.source
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "out",
				title: "Tape",
				className: "lg:col-span-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-hidden rounded-md bg-elevated",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waveform, { height: 100 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Booth is the mouth — the out. Codec sits in the middle and hands it a string. Host voice uses the system synthesizer when you want a familiar speaker."
				})]
			})
		]
	});
}
var EMPTY_LIVE = {
	rms: 0,
	zcr: 0,
	f0: null,
	f1: null,
	f2: null,
	centroid: 0,
	voiced: false
};
var EMPTY_CARD = {
	duration: 0,
	attack: 0,
	decay: null,
	peakRms: 0,
	medianF0: null,
	lastF1: null,
	lastF2: null,
	meanZcr: 0,
	voiced: false,
	truncated: false
};
function median(xs) {
	if (!xs.length) return null;
	const s = [...xs].sort((a, b) => a - b);
	const mid = Math.floor(s.length / 2);
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function liveFromFrame(frame) {
	if (!frame) return { ...EMPTY_LIVE };
	const voiced = frame.f0 > 0 && frame.voiced > .2;
	return {
		rms: frame.power,
		zcr: frame.zcr,
		f0: voiced ? frame.f0 : null,
		f1: frame.f1 > 0 ? frame.f1 : null,
		f2: frame.f2 > 0 ? frame.f2 : null,
		centroid: frame.centroid,
		voiced
	};
}
function cardFromFrames(frames) {
	if (!frames.length) return { ...EMPTY_CARD };
	const truncated = frames.length > 360;
	const used = truncated ? frames.slice(0, 360) : frames;
	const duration = used.length * FRAME_SEC;
	let peakRms = 0;
	let peakAt = 0;
	let zcrSum = 0;
	const f0s = [];
	let lastF1 = null;
	let lastF2 = null;
	for (let i = 0; i < used.length; i++) {
		const f = used[i];
		zcrSum += f.zcr;
		if (f.power > peakRms) {
			peakRms = f.power;
			peakAt = i;
		}
		if (f.f0 > 0 && f.voiced > .2) f0s.push(f.f0);
		if (f.f1 > 0) lastF1 = f.f1;
		if (f.f2 > 0) lastF2 = f.f2;
	}
	let decay = null;
	const half = peakRms * .5;
	for (let i = peakAt + 1; i < used.length; i++) if (used[i].power <= half) {
		decay = (i - peakAt) * FRAME_SEC;
		break;
	}
	if (truncated && decay === null) decay = null;
	const medianF0 = median(f0s);
	return {
		duration,
		attack: peakAt * FRAME_SEC,
		decay,
		peakRms,
		medianF0,
		lastF1,
		lastF2,
		meanZcr: zcrSum / used.length,
		voiced: medianF0 !== null,
		truncated
	};
}
function tapeFromFrames(frames) {
	return (frames.length > 360 ? frames.slice(0, 360) : frames).map((f, i) => ({
		t: Math.round(i * FRAME_SEC * 1e3),
		rms: f.power,
		zcr: f.zcr,
		f0: f.f0 > 0 && f.voiced > .2 ? f.f0 : null
	}));
}
/** Sum independent canals in JS. Analysis of this mix is the refused path. */
function fusePcm(canals) {
	if (!canals.length) return /* @__PURE__ */ new Float32Array(0);
	const n = Math.max(...canals.map((c) => c.length));
	const out = new Float32Array(n);
	for (const pcm of canals) {
		if (!pcm.length) continue;
		for (let i = 0; i < n; i++) out[i] += pcm[i % pcm.length];
	}
	const g = 1 / Math.max(1, canals.length);
	for (let i = 0; i < n; i++) out[i] *= g;
	return out;
}
function formatHz(v) {
	if (v == null || !Number.isFinite(v) || v <= 0) return "—";
	return `${Math.round(v)} Hz`;
}
function formatRms(v) {
	if (!Number.isFinite(v) || v <= 0) return "—";
	return v.toFixed(3);
}
function hashNoise(i, seed) {
	let x = Math.imul(i + 1, 374761393) ^ Math.imul(seed + 1, 668265263);
	x = Math.imul(x ^ x >>> 13, 1274126177);
	return (x >>> 0) / 4294967295 * 2 - 1;
}
function kettlePcm(seconds = 6) {
	const n = Math.floor(seconds * SAMPLE_RATE);
	const pcm = new Float32Array(n);
	let hp = 0;
	let bp = 0;
	for (let i = 0; i < n; i++) {
		const t = i / SAMPLE_RATE;
		const white = hashNoise(i, 11);
		hp = .97 * (hp + white - (pcm[i - 1] ?? 0));
		const whistle = Math.sin(2 * Math.PI * (2480 + 40 * Math.sin(2 * Math.PI * .7 * t)) * t);
		const hiss = hp * .35;
		bp = .92 * bp + .08 * whistle;
		const swell = .45 + .55 * (.5 + .5 * Math.sin(2 * Math.PI * .13 * t));
		pcm[i] = (hiss + bp * .28) * swell * .55;
	}
	return pcm;
}
function hvacPcm(seconds = 6) {
	const n = Math.floor(seconds * SAMPLE_RATE);
	const pcm = new Float32Array(n);
	let lp = 0;
	for (let i = 0; i < n; i++) {
		const t = i / SAMPLE_RATE;
		const white = hashNoise(i, 23);
		lp = .995 * lp + .005 * white;
		const thump = Math.max(0, Math.sin(2 * Math.PI * 1.7 * t)) ** 8 * .12;
		pcm[i] = lp * .9 + thump + hashNoise(i, 41) * .02;
	}
	let peak = 1e-6;
	for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(pcm[i]));
	const g = .35 / peak;
	for (let i = 0; i < n; i++) pcm[i] *= g;
	return pcm;
}
var SCENES = [
	{
		id: "kitchen",
		label: "Kitchen table",
		role: "room",
		blurb: "Two mouths and a kettle. The room is one. The canals are three.",
		canals: [
			{
				id: "a",
				name: "Voice A",
				kind: "voice",
				line: "The kettle is on.",
				f0: 118,
				rate: .96,
				noise: "none",
				ink: "linen"
			},
			{
				id: "b",
				name: "Voice B",
				kind: "voice",
				line: "I already heard you.",
				f0: 196,
				rate: 1.04,
				noise: "none",
				ink: "signal"
			},
			{
				id: "c",
				name: "Kettle",
				kind: "noise",
				line: null,
				f0: null,
				noise: "kettle",
				ink: "warn"
			}
		]
	},
	{
		id: "two-booths",
		label: "Two booths",
		role: "house",
		blurb: "The house line, said twice, by two mouths. Codec does not get one string.",
		canals: [{
			id: "a",
			name: "Booth A",
			kind: "voice",
			line: "Filament in.",
			f0: 142,
			rate: 1,
			noise: "none",
			ink: "linen"
		}, {
			id: "b",
			name: "Booth B",
			kind: "voice",
			line: "Booth out.",
			f0: 198,
			rate: 1.06,
			noise: "none",
			ink: "signal"
		}]
	},
	{
		id: "crisis",
		label: "Crisis overlap",
		role: "law",
		blurb: "Output is a singleton. Input is not. Three canals. Fusion is the danger.",
		canals: [
			{
				id: "a",
				name: "Voice A",
				kind: "voice",
				line: "Stay with me.",
				f0: 110,
				rate: .92,
				noise: "none",
				ink: "linen"
			},
			{
				id: "b",
				name: "Voice B",
				kind: "voice",
				line: "Get out of the house.",
				f0: 190,
				rate: 1.08,
				noise: "none",
				ink: "signal"
			},
			{
				id: "c",
				name: "Voice C",
				kind: "voice",
				line: "I am here.",
				f0: 155,
				rate: 1,
				noise: "none",
				ink: "warn"
			}
		]
	}
];
function sceneById(id) {
	return SCENES.find((s) => s.id === id) ?? SCENES[0];
}
var MAX_CANALS = 4;
var FILAMENT_CAP = 90;
var FUSED_ID = "__fused__";
function emptySnap() {
	return {
		canals: [],
		selected: null,
		playing: false,
		scene: null,
		fused: null,
		lastError: null,
		playhead: 0,
		playMode: "canals"
	};
}
function specToPcm(spec) {
	if (spec.noise === "kettle") return kettlePcm(6.4);
	if (spec.noise === "hvac") return hvacPcm(6.4);
	const { pcm } = synthesize(spec.line ?? "", {
		f0: spec.f0 ?? 148,
		rate: spec.rate ?? 1
	});
	return pcm;
}
function canalFromPcm(spec, pcm) {
	const frames = extractFrames(pcm);
	return {
		...spec,
		pcm,
		frames,
		card: cardFromFrames(frames),
		tape: tapeFromFrames(frames),
		live: liveFromFrame(frames[0]),
		muted: false,
		solo: false,
		duration: pcm.length / SAMPLE_RATE
	};
}
var DispersionEngine = class {
	snap = emptySnap();
	filaments = {};
	listeners = /* @__PURE__ */ new Set();
	ctx = null;
	nodes = [];
	mic = null;
	raf = 0;
	startedAt = 0;
	loopDur = 1;
	wantFused = false;
	subscribe(fn) {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}
	emit() {
		for (const fn of this.listeners) fn();
	}
	async ensureCtx() {
		if (!this.ctx) this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
		if (this.ctx.state === "suspended") await this.ctx.resume();
		return this.ctx;
	}
	select(id) {
		this.snap = {
			...this.snap,
			selected: id
		};
		this.emit();
	}
	setMuted(id, muted) {
		this.snap = {
			...this.snap,
			canals: this.snap.canals.map((c) => c.id === id ? {
				...c,
				muted
			} : c)
		};
		this.applyGains();
		this.emit();
	}
	setSolo(id, solo) {
		this.snap = {
			...this.snap,
			canals: this.snap.canals.map((c) => c.id === id ? {
				...c,
				solo
			} : c)
		};
		this.applyGains();
		this.emit();
	}
	audible(c) {
		if (this.snap.canals.some((x) => x.solo)) return c.solo && !c.muted;
		return !c.muted;
	}
	applyGains() {
		for (const n of this.nodes) {
			if (n.id === FUSED_ID) {
				n.gain.gain.value = this.snap.playing && this.snap.playMode === "fused" ? 1 : 0;
				continue;
			}
			const canal = this.snap.canals.find((c) => c.id === n.id);
			n.gain.gain.value = canal && this.audible(canal) && this.snap.playing ? 1 : 0;
		}
	}
	async openScene(id, opts) {
		this.lastStop();
		this.snap.lastError = null;
		const canals = sceneById(id).canals.map((spec) => canalFromPcm({
			id: spec.id,
			name: spec.name,
			kind: spec.kind,
			line: spec.line,
			ink: spec.ink
		}, specToPcm(spec)));
		this.filaments = {};
		for (const c of canals) this.filaments[c.id] = [];
		this.snap = {
			canals,
			selected: canals[0]?.id ?? null,
			playing: false,
			scene: id,
			fused: null,
			lastError: null,
			playhead: 0,
			playMode: "canals"
		};
		this.emit();
		if (opts?.play === false) return;
		await this.play();
	}
	async addMic() {
		if (this.snap.canals.length >= MAX_CANALS) {
			this.snap = {
				...this.snap,
				lastError: "Four canals. That's the cap. Fusion is not the overflow."
			};
			this.emit();
			return;
		}
		try {
			const ctx = await this.ensureCtx();
			const stream = await navigator.mediaDevices.getUserMedia({ audio: {
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true
			} });
			const source = ctx.createMediaStreamSource(stream);
			const silent = ctx.createGain();
			silent.gain.value = 0;
			source.connect(silent);
			silent.connect(ctx.destination);
			this.mic = {
				stream,
				source
			};
			const id = `mic-${Date.now().toString(36)}`;
			const canal = canalFromPcm({
				id,
				name: "Mic",
				kind: "mic",
				line: null,
				ink: "linen"
			}, new Float32Array(SAMPLE_RATE));
			this.filaments[id] = [];
			this.snap = {
				...this.snap,
				canals: [...this.snap.canals, canal],
				selected: id,
				lastError: null
			};
			this.emit();
		} catch (err) {
			this.snap = {
				...this.snap,
				lastError: err instanceof Error ? err.message : "Microphone is not available."
			};
			this.emit();
		}
	}
	async addFile(file) {
		if (this.snap.canals.length >= MAX_CANALS) {
			this.snap = {
				...this.snap,
				lastError: "Four canals. That's the cap. Fusion is not the overflow."
			};
			this.emit();
			return;
		}
		try {
			const ctx = await this.ensureCtx();
			const buf = await file.arrayBuffer();
			const decoded = await ctx.decodeAudioData(buf.slice(0));
			const ch = decoded.getChannelData(0);
			const pcm = resampleLinear(new Float32Array(ch), decoded.sampleRate, SAMPLE_RATE).slice(0, SAMPLE_RATE * 8);
			const id = `file-${Date.now().toString(36)}`;
			const canal = canalFromPcm({
				id,
				name: file.name.replace(/\.[^.]+$/, "") || "File",
				kind: "file",
				line: null,
				ink: this.snap.canals.length === 0 ? "linen" : this.snap.canals.length === 1 ? "signal" : "warn"
			}, pcm);
			this.filaments[id] = [];
			const canals = [...this.snap.canals, canal];
			this.snap = {
				...this.snap,
				canals,
				selected: id,
				lastError: null
			};
			this.emit();
			if (this.snap.playing) await this.play();
		} catch (err) {
			this.snap = {
				...this.snap,
				lastError: err instanceof Error ? err.message : "That file did not decode."
			};
			this.emit();
		}
	}
	removeCanal(id) {
		const canals = this.snap.canals.filter((c) => c.id !== id);
		delete this.filaments[id];
		this.snap = {
			...this.snap,
			canals,
			selected: this.snap.selected === id ? canals[0]?.id ?? null : this.snap.selected
		};
		this.emit();
		if (this.snap.playing) this.play();
	}
	async play() {
		this.stopNodes();
		const ctx = await this.ensureCtx();
		this.loopDur = Math.max(1, ...this.snap.canals.map((c) => c.duration || 1));
		this.startedAt = ctx.currentTime;
		this.nodes = [];
		for (const canal of this.snap.canals) {
			if (canal.kind === "mic" || canal.pcm.length < 32) continue;
			const audioBuf = ctx.createBuffer(1, canal.pcm.length, SAMPLE_RATE);
			audioBuf.copyToChannel(new Float32Array(canal.pcm), 0);
			const source = ctx.createBufferSource();
			source.buffer = audioBuf;
			source.loop = true;
			const gain = ctx.createGain();
			gain.gain.value = 0;
			source.connect(gain);
			gain.connect(ctx.destination);
			source.start();
			this.nodes.push({
				id: canal.id,
				source,
				gain
			});
		}
		this.snap = {
			...this.snap,
			playing: true,
			playMode: "canals"
		};
		this.applyGains();
		this.tick();
		this.emit();
	}
	async playFused() {
		const ghost = this.computeFused();
		if (!ghost || ghost.pcm.length < 32) {
			this.snap = {
				...this.snap,
				lastError: "Need two canals to mix. Fusion is the danger, not the overflow."
			};
			this.emit();
			return;
		}
		this.stopNodes();
		const ctx = await this.ensureCtx();
		this.loopDur = Math.max(1, ghost.pcm.length / SAMPLE_RATE);
		this.startedAt = ctx.currentTime;
		const audioBuf = ctx.createBuffer(1, ghost.pcm.length, SAMPLE_RATE);
		audioBuf.copyToChannel(new Float32Array(ghost.pcm), 0);
		const source = ctx.createBufferSource();
		source.buffer = audioBuf;
		source.loop = true;
		const gain = ctx.createGain();
		gain.gain.value = 0;
		source.connect(gain);
		gain.connect(ctx.destination);
		source.start();
		this.nodes = [{
			id: FUSED_ID,
			source,
			gain
		}];
		this.wantFused = true;
		this.snap = {
			...this.snap,
			playing: true,
			playMode: "fused",
			fused: ghost,
			lastError: null
		};
		this.applyGains();
		this.tick();
		this.emit();
	}
	stop() {
		this.snap = {
			...this.snap,
			playing: false,
			playhead: 0
		};
		this.applyGains();
		cancelAnimationFrame(this.raf);
		this.emit();
	}
	lastStop() {
		this.stop();
		this.stopNodes();
		this.mic?.stream.getTracks().forEach((t) => t.stop());
		this.mic = null;
	}
	stopNodes() {
		cancelAnimationFrame(this.raf);
		for (const n of this.nodes) {
			try {
				n.source.stop();
			} catch {}
			try {
				n.source.disconnect();
				n.gain.disconnect();
			} catch {}
		}
		this.nodes = [];
	}
	computeFused() {
		const pcms = this.snap.canals.filter((c) => c.pcm.length > 32).map((c) => c.pcm);
		if (pcms.length < 2) return null;
		const pcm = fusePcm(pcms);
		const frames = extractFrames(pcm);
		const ctx = this.ctx;
		const t = ctx && this.snap.playing ? (ctx.currentTime - this.startedAt) % this.loopDur : 0;
		const live = liveFromFrame(extractFrame(pcm, Math.min(Math.max(0, Math.floor(t * SAMPLE_RATE)), Math.max(0, pcm.length - 400))));
		return {
			card: cardFromFrames(frames),
			live,
			pcm
		};
	}
	tick = () => {
		if (!this.snap.playing) return;
		const ctx = this.ctx;
		if (!ctx) return;
		const t = (ctx.currentTime - this.startedAt) % this.loopDur;
		const canals = this.snap.canals.map((canal) => {
			if (canal.pcm.length < 400) return canal;
			const off = Math.min(Math.max(0, Math.floor(t % Math.max(.01, canal.duration) * SAMPLE_RATE)), canal.pcm.length - 400);
			const live = liveFromFrame(extractFrame(canal.pcm, off));
			const trail = this.filaments[canal.id] ?? [];
			const x = Math.min(1, Math.max(0, live.centroid / 3600));
			const y = live.f0 == null ? .08 : Math.min(1, Math.max(0, (live.f0 - 70) / 230));
			trail.push({
				id: canal.id,
				ink: canal.ink,
				x,
				y,
				voiced: live.voiced
			});
			if (trail.length > FILAMENT_CAP) trail.splice(0, trail.length - FILAMENT_CAP);
			this.filaments[canal.id] = trail;
			return {
				...canal,
				live
			};
		});
		this.snap = {
			...this.snap,
			canals,
			playhead: t / this.loopDur
		};
		if (this.wantFused && canals.length > 1) this.snap.fused = this.computeFused();
		else this.snap.fused = null;
		this.raf = requestAnimationFrame(this.tick);
		this.emit();
	};
};
var engine = new DispersionEngine();
function inkDot$1(ink) {
	return ink === "linen" ? "bg-linen" : ink === "warn" ? "bg-warn" : "bg-signal";
}
function CanalCard({ canal, selected, playhead, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: onSelect,
		className: cn("w-full rounded-lg bg-elevated p-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)]", selected ? "shadow-[var(--shadow-border-hover)]" : ""),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-2 shrink-0 rounded-full", inkDot$1(canal.ink)) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-sm font-medium text-fg",
						children: canal.name
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs tracking-widest text-subtle uppercase",
					children: canal.kind
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden rounded-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waveform, {
					pcm: canal.pcm,
					height: 56,
					ink: canal.ink,
					playhead
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 min-h-10 text-sm leading-snug text-muted",
				children: canal.line ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-subtle",
					children: "Empty ear. No invented speech."
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid grid-cols-2 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "F0",
						value: formatHz(canal.live.f0),
						hot: canal.live.voiced
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "RMS",
						value: formatRms(canal.live.rms)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "F1 / F2",
						value: `${formatHz(canal.live.f1)} · ${formatHz(canal.live.f2)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "voiced",
						value: canal.live.voiced ? "yes" : "no",
						hot: canal.live.voiced
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex gap-1",
				onClick: (e) => e.stopPropagation(),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: canal.muted ? "quiet" : "ghost",
					onClick: () => engine.setMuted(canal.id, !canal.muted),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, {}), canal.muted ? "Muted" : "Mute"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: canal.solo ? "signal" : "ghost",
					onClick: () => engine.setSolo(canal.id, !canal.solo),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, {}), "Solo"]
				})]
			})
		]
	});
}
function CanalRack({ playhead }) {
	const { canals, selected } = engine.snap;
	if (!canals.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		kicker: "canals",
		title: "Rack",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Nothing is picked yet."
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
		children: canals.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CanalCard, {
			canal: c,
			selected: selected === c.id,
			playhead,
			onSelect: () => engine.select(c.id)
		}, c.id))
	});
}
function SelectedCard() {
	const { canals, selected } = engine.snap;
	const canal = canals.find((c) => c.id === selected) ?? canals[0];
	if (!canal) return null;
	const card = canal.card;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		kicker: "corti",
		title: `Card · ${canal.name}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-4 sm:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "duration",
					value: `${card.duration.toFixed(2)} s`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "attack",
					value: `${card.attack.toFixed(2)} s`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "decay",
					value: card.decay == null ? card.truncated ? "null (tail gone)" : "—" : `${card.decay.toFixed(2)} s`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "peak RMS",
					value: formatRms(card.peakRms)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "median F0",
					value: formatHz(card.medianF0),
					hot: card.voiced
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "last F1",
					value: formatHz(card.lastF1)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "last F2",
					value: formatHz(card.lastF2)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "mean ZCR",
					value: card.meanZcr.toFixed(3)
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-4 font-mono text-xs leading-relaxed text-subtle",
			children: [
				card.truncated ? "Tape truncated. Cap dropped the tail." : "Tape intact.",
				" ",
				card.medianF0 == null ? "F0 is a hole, not a zero." : null
			]
		})]
	});
}
var INK = {
	linen: "--color-linen",
	signal: "--color-signal",
	warn: "--color-warn"
};
function DispersionField({ showFused }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let raf = 0;
		const paint = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			if (w < 8 || h < 8) {
				raf = requestAnimationFrame(paint);
				return;
			}
			if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
				canvas.width = Math.floor(w * dpr);
				canvas.height = Math.floor(h * dpr);
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const styles = getComputedStyle(document.documentElement);
			const bg = styles.getPropertyValue("--color-elevated").trim() || "#1d1d19";
			const grid = styles.getPropertyValue("--color-border").trim() || "#2a2a26";
			const subtle = styles.getPropertyValue("--color-subtle").trim() || "#5c5a54";
			const danger = styles.getPropertyValue("--color-danger").trim() || "#c45c4a";
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, w, h);
			ctx.strokeStyle = grid;
			ctx.lineWidth = 1;
			ctx.globalAlpha = .7;
			for (let i = 1; i < 4; i++) {
				const x = w * i / 4;
				const y = h * i / 4;
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, h);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(w, y);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			ctx.fillStyle = subtle;
			ctx.font = "11px 'IBM Plex Mono', monospace";
			ctx.fillText("centroid →", 10, h - 10);
			ctx.save();
			ctx.translate(12, h - 28);
			ctx.rotate(-Math.PI / 2);
			ctx.fillText("F0", 0, 0);
			ctx.restore();
			const pad = 18;
			const innerW = w - 36;
			const innerH = h - 36;
			if (showFused && engine.snap.fused) {
				const ghost = engine.snap.fused;
				if (ghost) {
					const x = pad + Math.min(1, ghost.live.centroid / 3600) * innerW;
					const y = pad + innerH - (ghost.live.f0 == null ? .08 : Math.min(1, Math.max(0, (ghost.live.f0 - 70) / 230))) * innerH;
					ctx.fillStyle = danger;
					ctx.globalAlpha = .12;
					ctx.beginPath();
					ctx.arc(x, y, 28, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = .55;
					ctx.beginPath();
					ctx.arc(x, y, 5, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = 1;
					ctx.fillStyle = danger;
					ctx.font = "10px 'IBM Plex Mono', monospace";
					const label = "FUSED";
					const tw = ctx.measureText(label).width;
					const labelX = Math.min(w - tw - 8, Math.max(8, x + 8));
					const labelY = Math.max(14, Math.min(h - 6, y - 8));
					ctx.fillText(label, labelX, labelY);
				}
			}
			for (const canal of engine.snap.canals) {
				const trail = engine.filaments[canal.id] ?? [];
				const color = styles.getPropertyValue(INK[canal.ink]).trim();
				ctx.strokeStyle = color;
				ctx.fillStyle = color;
				ctx.lineWidth = 1.5;
				ctx.globalAlpha = canal.muted ? .25 : .9;
				if (trail.length > 1) {
					ctx.beginPath();
					trail.forEach((p, i) => {
						const x = pad + p.x * innerW;
						const y = pad + innerH - p.y * innerH;
						if (i === 0) ctx.moveTo(x, y);
						else ctx.lineTo(x, y);
					});
					ctx.stroke();
				}
				const last = trail[trail.length - 1];
				if (last) {
					const x = pad + last.x * innerW;
					const y = pad + innerH - last.y * innerH;
					ctx.beginPath();
					ctx.arc(x, y, last.voiced ? 4.5 : 3, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.globalAlpha = 1;
			}
			raf = requestAnimationFrame(paint);
		};
		raf = requestAnimationFrame(paint);
		return () => cancelAnimationFrame(raf);
	}, [showFused]);
	const empty = engine.snap.canals.length === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative overflow-hidden rounded-md bg-elevated",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref,
			className: "block h-[280px] w-full sm:h-[380px]",
			"aria-label": "Dispersion field. Each canal is its own filament. They do not merge."
		}), empty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted",
			children: "Nothing is picked yet. Open a room. Canals stay canals."
		}) : null]
	});
}
function RefusedPath() {
	const canals = engine.snap.canals;
	const ghost = engine.snap.fused ?? (canals.length > 1 ? engine.computeFused() : null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				kicker: "law",
				title: "This path is sealed",
				className: "lg:col-span-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "max-w-2xl text-sm leading-relaxed text-muted",
					children: "Filament in. Codec in the middle. Booth out. That pipeline is one canal. Dispersion is what happens when the room has more than one. Mixing the PCM and measuring the mix is how three people become one mouth. Sierra already forbids two voices on the way out. This layer forbids one measurement on the way in."
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				kicker: "dispersed",
				title: "Each canal",
				className: "lg:col-span-6",
				children: canals.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Nothing is picked yet."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-3",
					children: canals.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md bg-elevated p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-fg",
								children: c.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: c.line ?? "Empty ear."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "F0",
									value: formatHz(c.card.medianF0),
									hot: c.card.voiced
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "peak RMS",
									value: formatRms(c.card.peakRms)
								})]
							})
						]
					}, c.id))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				kicker: "refused",
				title: "If we fused",
				className: "lg:col-span-6",
				children: !ghost ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Need two or more canals to show the lie."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-hidden rounded-md",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waveform, {
							pcm: ghost.pcm,
							height: 72,
							ink: "warn"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid grid-cols-2 gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "F0",
								value: formatHz(ghost.card.medianF0)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "peak RMS",
								value: formatRms(ghost.card.peakRms)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "voiced",
								value: ghost.card.voiced ? "muddied" : "no"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "canals lost",
								value: String(canals.length - 1)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-4 text-sm leading-relaxed text-danger",
						children: [
							"One F0. One RMS. One card. ",
							canals.length,
							" sources became a mouth that none of them spoke. This is the measurement we do not take."
						]
					})
				] })
			})
		]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var CardIn = object({
	id: string(),
	name: string(),
	kind: string(),
	line: string().nullable(),
	duration: number(),
	attack: number(),
	decay: number().nullable(),
	peakRms: number(),
	medianF0: number().nullable(),
	lastF1: number().nullable(),
	lastF2: number().nullable(),
	meanZcr: number(),
	voiced: boolean(),
	truncated: boolean()
});
var discernCanals = createServerFn({ method: "POST" }).validator((input) => object({ canals: array(CardIn).max(4) }).parse(input)).handler(createSsrRpc("b4a8fb9af92c2f99b597ad1ede644ea95066afdc64dc07de116a4c422d7aafd5"));
var VIEWS = [
	{
		id: "field",
		label: "Field",
		role: "see"
	},
	{
		id: "canals",
		label: "Canals",
		role: "each"
	},
	{
		id: "refused",
		label: "Refused",
		role: "law"
	}
];
function DispersionRoom() {
	const view = useStudio((s) => s.view);
	const setView = useStudio((s) => s.setView);
	const scene = useStudio((s) => s.scene);
	const setScene = useStudio((s) => s.setScene);
	const showFused = useStudio((s) => s.showFused);
	const setShowFused = useStudio((s) => s.setShowFused);
	const discerning = useStudio((s) => s.discerning);
	const setDiscerning = useStudio((s) => s.setDiscerning);
	const discernment = useStudio((s) => s.discernment);
	const discernError = useStudio((s) => s.discernError);
	const setDiscernment = useStudio((s) => s.setDiscernment);
	const [, setTick] = (0, import_react.useState)(0);
	const fileRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		return engine.subscribe(() => setTick((n) => n + 1));
	}, []);
	(0, import_react.useEffect)(() => {
		return () => engine.lastStop();
	}, []);
	(0, import_react.useEffect)(() => {
		engine.wantFused = showFused || view === "refused";
	}, [showFused, view]);
	const snap = engine.snap;
	const n = snap.canals.length;
	const open = async (id) => {
		setScene(id);
		setDiscernment(null, null);
		await engine.openScene(id);
	};
	const onDiscern = async () => {
		if (!snap.canals.length || discerning) return;
		setDiscerning(true);
		setDiscernment(null, null);
		try {
			const result = await discernCanals({ data: { canals: snap.canals.map((c) => ({
				id: c.id,
				name: c.name,
				kind: c.kind,
				line: c.line,
				duration: c.card.duration,
				attack: c.card.attack,
				decay: c.card.decay,
				peakRms: c.card.peakRms,
				medianF0: c.card.medianF0,
				lastF1: c.card.lastF1,
				lastF2: c.card.lastF2,
				meanZcr: c.card.meanZcr,
				voiced: c.card.voiced,
				truncated: c.card.truncated
			})) } });
			if (result.ok) setDiscernment(result.text, null);
			else setDiscernment(null, result.error);
		} catch (err) {
			setDiscernment(null, err instanceof Error ? err.message : "Discernment failed.");
		} finally {
			setDiscerning(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid min-w-0 gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-2xl text-sm leading-relaxed text-muted",
				children: "One canal is Filament → Codec → Booth. This room keeps many. Speakers may mix. Analysis never shares a bus."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				role: "tablist",
				"aria-label": "Dispersion face",
				className: "inline-flex h-11 w-fit rounded-md bg-elevated p-1",
				children: VIEWS.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "tab",
					"aria-selected": view === v.id,
					onClick: () => setView(v.id),
					className: cn("h-9 rounded-sm px-4 text-sm transition-colors duration-[var(--motion-quick)]", view === v.id ? "bg-linen text-bg" : "text-muted hover:text-fg"),
					children: v.label
				}, v.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1 overflow-x-auto pb-1",
				children: SCENES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => void open(s.id),
					className: cn("h-11 shrink-0 rounded-md px-4 text-sm transition-colors duration-[var(--motion-quick)]", snap.scene === s.id && snap.canals.length ? "bg-linen text-bg" : "bg-elevated text-muted hover:text-fg"),
					children: s.label
				}, s.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					snap.playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "quiet",
						onClick: () => engine.stop(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" }), "Stop"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => {
							if (snap.canals.length) engine.play();
							else open(scene);
						},
						children: "Open the room"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						onClick: () => void engine.addMic(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {}), "Mic canal"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						onClick: () => fileRef.current?.click(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {}), "File canal"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: "audio/*,.wav,.mp3,.ogg,.m4a",
						className: "hidden",
						onChange: (e) => {
							const f = e.target.files?.[0];
							if (f) engine.addFile(f);
							e.target.value = "";
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: showFused ? "quiet" : "ghost",
						onClick: () => setShowFused(!showFused),
						disabled: n < 2,
						children: showFused ? "Hide refused ghost" : "Show refused ghost"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => void onDiscern(),
						disabled: !n || discerning,
						children: discerning ? "Discerning…" : "Discern canals"
					})
				]
			}),
			snap.lastError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-warn",
				role: "status",
				children: snap.lastError
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-mono text-xs tracking-widest text-subtle uppercase",
				children: [
					n,
					" canal",
					n === 1 ? "" : "s",
					" · 0 fused · mix analysis sealed"
				]
			}),
			view === "field" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
						kicker: "dispersion",
						title: "Field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DispersionField, { showFused }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: SCENES.find((s) => s.id === (snap.scene ?? scene))?.blurb ?? "Each filament is one canal. They do not join."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectedCard, {}),
					n > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-2 overflow-x-auto pb-1",
						children: snap.canals.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => engine.select(c.id),
							className: cn("h-11 shrink-0 rounded-md px-3 text-sm", snap.selected === c.id ? "bg-linen text-bg" : "bg-elevated text-muted"),
							children: [c.name, c.live.voiced ? " · live" : ""]
						}, c.id))
					}) : null
				]
			}) : null,
			view === "canals" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CanalRack, { playhead: snap.playhead }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectedCard, {})]
			}) : null,
			view === "refused" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefusedPath, {}) : null,
			discernment || discernError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				kicker: "discernment",
				title: "Each canal, named",
				children: discernError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-warn",
					children: discernError
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg",
					children: discernment
				})
			}) : null
		]
	});
}
function ByteTape({ bytes, active }) {
	const shown = bytes.length > 256 ? bytes.subarray(0, 256) : bytes;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap gap-1",
		children: [shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono text-xs text-subtle",
			children: "no bytes"
		}) : Array.from(shown, (b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-1 font-mono text-xs tabular-nums", i === active ? "bg-linen text-bg" : b === 63 ? "bg-elevated text-warn" : b < 32 || b > 126 ? "bg-elevated text-signal" : "bg-elevated text-fg"),
			title: `offset ${i} · ${b}`,
			children: b.toString(16).padStart(2, "0")
		}, i)), bytes.length > shown.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "inline-flex h-8 items-center px-2 font-mono text-xs text-subtle",
			children: ["+", bytes.length - shown.length]
		}) : null]
	});
}
function HexRows({ bytes }) {
	const width = 16;
	const rows = Math.ceil(Math.min(bytes.length, 512) / width) || 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "max-w-full overflow-x-auto font-mono text-xs leading-6 text-muted",
		children: Array.from({ length: rows }, (_, r) => {
			const off = r * width;
			const slice = bytes.subarray(off, off + width);
			if (slice.length === 0 && r > 0) return null;
			const hex = Array.from(slice, (b) => b.toString(16).padStart(2, "0"));
			while (hex.length < width) hex.push("  ");
			const ascii = Array.from(slice, (b) => b >= 32 && b < 127 ? String.fromCharCode(b) : "·").join("");
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-4 whitespace-nowrap",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-10 text-subtle tabular-nums",
						children: off.toString(16).padStart(4, "0")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-fg",
						children: hex.join(" ")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-signal",
						children: ascii
					})
				]
			}, r);
		})
	});
}
function EncodingPicker({ encoding, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "radiogroup",
		"aria-label": "Encoding",
		className: "flex flex-wrap gap-1.5",
		children: ENCODINGS.map((enc) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			role: "radio",
			"aria-checked": encoding === enc.id,
			"aria-label": `${enc.label}. ${enc.note}`,
			title: enc.note,
			onClick: () => onChange(enc.id),
			className: cn("h-11 shrink-0 rounded-sm px-3 font-mono text-xs tracking-wide transition-colors duration-[var(--motion-quick)]", encoding === enc.id ? "bg-linen text-bg" : "bg-elevated text-muted hover:text-fg"),
			children: enc.label
		}, enc.id))
	});
}
function EncoderRoom() {
	const text = useStudio((s) => s.encoderText);
	const setText = useStudio((s) => s.setEncoderText);
	const encoding = useStudio((s) => s.encoding);
	const setEncoding = useStudio((s) => s.setEncoding);
	const setBooth = useStudio((s) => s.setBoothText);
	const face = useStudio((s) => s.face);
	const setFace = useStudio((s) => s.setFace);
	const hexIn = useStudio((s) => s.hexIn);
	const setHexIn = useStudio((s) => s.setHexIn);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const encoded = (0, import_react.useMemo)(() => {
		const result = encodeText(text, encoding);
		const units = inspectText(text, encoding);
		const decoded = decodeBytes(result.bytes, encoding);
		return {
			...result,
			units,
			decoded
		};
	}, [text, encoding]);
	const fromHex = (0, import_react.useMemo)(() => {
		if (!hexIn.trim()) return {
			buf: /* @__PURE__ */ new Uint8Array(0),
			live: "",
			flushed: "",
			pending: 0,
			leadSurrogate: -1,
			replacements: 0,
			units: 0
		};
		const buf = parseHex(hexIn);
		const dec = new StreamDecoder(encoding);
		const live = dec.write(buf);
		const liveState = dec.state();
		return {
			buf,
			live,
			flushed: live + dec.end(),
			...liveState
		};
	}, [hexIn, encoding]);
	const tape = face === "decoder" ? fromHex.buf : encoded.bytes;
	const units = face === "decoder" ? inspectText(fromHex.flushed, encoding) : encoded.units;
	const copyHex = async () => {
		const dump = hexDump(tape).map((r) => r.hex.join(" ")).join("\n");
		try {
			await navigator.clipboard.writeText(dump);
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		} catch {}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid min-w-0 gap-4 lg:grid-cols-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-3 lg:col-span-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					role: "tablist",
					"aria-label": "Codec face",
					className: "inline-flex h-11 w-fit rounded-md bg-elevated p-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": face === "encoder",
						onClick: () => setFace("encoder"),
						className: cn("h-9 rounded-sm px-4 text-sm transition-colors duration-[var(--motion-quick)]", face === "encoder" ? "bg-linen text-bg" : "text-muted hover:text-fg"),
						children: "Encoder"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": face === "decoder",
						onClick: () => setFace("decoder"),
						className: cn("h-9 rounded-sm px-4 text-sm transition-colors duration-[var(--motion-quick)]", face === "decoder" ? "bg-linen text-bg" : "text-muted hover:text-fg"),
						children: "Decoder"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EncodingPicker, {
					encoding,
					onChange: setEncoding
				})]
			}),
			face === "encoder" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "encoder.write",
				title: "Unicode in",
				className: "lg:col-span-5",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 font-mono text-xs text-muted hover:text-fg",
					onClick: () => setText(DEMO_LINE),
					children: "reset"
				}),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "codec-unicode",
						className: "sr-only",
						children: "Unicode to encode"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "codec-unicode",
						value: text,
						onChange: (e) => setText(e.target.value),
						spellCheck: false,
						rows: 7,
						className: "min-h-40 w-full resize-y rounded-md bg-elevated px-3 py-3 text-base leading-relaxed text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-[var(--motion-quick)] focus:shadow-[var(--shadow-border-hover)]",
						placeholder: "Type, paste, or take from Filament."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-1.5",
						children: [
							["Demo", DEMO_LINE],
							["你好", "你好 · Codec"],
							["𝄞", "𝄞"]
						].map(([label, sample]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setText(sample),
							className: "h-11 rounded-sm bg-elevated px-3 font-mono text-xs text-muted hover:text-fg",
							children: label
						}, label))
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "encoder.state",
				title: "Streaming encoder",
				className: "lg:col-span-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4 sm:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "bytes",
								value: String(encoded.bytes.length)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "units",
								value: String(encoded.state.units)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "lead surrogate",
								value: encoded.state.leadSurrogate === -1 ? "clean" : "0x" + encoded.state.leadSurrogate.toString(16),
								hot: encoded.state.leadSurrogate !== -1
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "replacement",
								value: String(encoded.state.replacements),
								hot: encoded.state.replacements > 0
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 font-mono text-xs tracking-widest text-subtle uppercase",
						children: "byte tape"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ByteTape, { bytes: encoded.bytes })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "quiet",
								onClick: copyHex,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {}), copied ? "Copied" : "Copy hex"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "quiet",
								onClick: () => setBooth(encoded.decoded.text),
								children: "Send to Booth"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								onClick: () => {
									setText("");
									setHexIn("");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {}), "Clear"]
							})
						]
					})
				]
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "decoder.write",
				title: "Bytes in",
				className: "lg:col-span-5",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs text-subtle",
					children: encoding
				}),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "codec-hex",
						className: "sr-only",
						children: "Hex bytes to decode"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "codec-hex",
						value: hexIn,
						onChange: (e) => setHexIn(e.target.value),
						spellCheck: false,
						rows: 7,
						className: "min-h-40 w-full resize-y rounded-md bg-elevated px-3 py-3 font-mono text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-[var(--motion-quick)] focus:shadow-[var(--shadow-border-hover)]",
						placeholder: "Paste hex — 48 65 6c 6c 6f"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-1.5",
						children: [
							["Hello", "48 65 6c 6c 6f"],
							["𝄞 UTF-16LE", "34 d8 1e dd"],
							["From encoder", hexDump(encoded.bytes).map((r) => r.hex.join(" ")).join(" ")]
						].map(([label, sample]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setHexIn(sample),
							className: "h-11 rounded-sm bg-elevated px-3 font-mono text-xs text-muted hover:text-fg",
							children: label
						}, label))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-start gap-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "mt-0.5 size-4 shrink-0 text-subtle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "min-w-0 break-words text-fg",
							children: hexIn.trim() ? fromHex.live || "Waiting on the rest of the sequence." : "Decoder waits on a tape."
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "decoder.state",
				title: "Streaming decoder",
				className: "lg:col-span-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4 sm:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "bytes",
								value: String(fromHex.buf.length)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "pending",
								value: String(fromHex.pending),
								hot: fromHex.pending > 0
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "lead surrogate",
								value: fromHex.leadSurrogate === -1 ? "clean" : "0x" + fromHex.leadSurrogate.toString(16),
								hot: fromHex.leadSurrogate !== -1
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "replacement",
								value: String(fromHex.replacements),
								hot: fromHex.replacements > 0
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 font-mono text-xs tracking-widest text-subtle uppercase",
						children: "byte tape"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ByteTape, { bytes: fromHex.buf })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "quiet",
								onClick: copyHex,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {}), copied ? "Copied" : "Copy hex"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "quiet",
								onClick: () => setBooth(fromHex.flushed),
								disabled: !fromHex.flushed,
								children: "Send to Booth"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								onClick: () => {
									setHexIn("");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {}), "Clear"]
							})
						]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				kicker: "code points",
				title: "Surrogates & units",
				className: "lg:col-span-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1",
					children: units.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: face === "decoder" ? "Nothing to decode." : "Nothing to encode."
					}) : units.slice(0, 80).map((u, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-20 shrink-0 rounded-md bg-elevated p-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "h-7 text-center text-lg leading-7 text-fg",
								children: u.glyph === " " ? "␣" : u.glyph === "\n" ? "↵" : u.glyph
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-center font-mono text-xs text-signal tabular-nums",
								children: ["U+", u.cp.toString(16).toUpperCase().padStart(4, "0")]
							}),
							u.surrogate ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-center font-mono text-xs text-warn",
								children: u.surrogate.map((s) => s.toString(16)).join("·")
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-center font-mono text-xs text-subtle",
								children: u.bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ")
							})
						]
					}, i))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "dump",
				title: "Hex",
				className: "lg:col-span-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HexRows, { bytes: tape }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: face === "encoder" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						"Round-trip ",
						encoded.decoded.replacements ? "with replacements" : "clean",
						":",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fg",
							children: encoded.decoded.text || "—"
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						"Flushed ",
						fromHex.replacements ? "with replacements" : "clean",
						":",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fg",
							children: fromHex.flushed || "—"
						})
					] })
				})]
			})
		]
	});
}
function getRecog() {
	if (typeof window === "undefined") return null;
	const W = window;
	const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
	return Ctor ? new Ctor() : null;
}
function FilamentRoom() {
	const listening = useStudio((s) => s.listening);
	const setListening = useStudio((s) => s.setListening);
	const text = useStudio((s) => s.filamentText);
	const partial = useStudio((s) => s.filamentPartial);
	const setFilament = useStudio((s) => s.setFilament);
	const setEncoderText = useStudio((s) => s.setEncoderText);
	const setRoom = useStudio((s) => s.setRoom);
	const [error, setError] = (0, import_react.useState)(null);
	const [tick, setTick] = (0, import_react.useState)(0);
	const recogRef = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const hostRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		return engine$1.subscribe(() => setTick((n) => n + 1));
	}, []);
	(0, import_react.useEffect)(() => {
		return () => {
			recogRef.current?.abort();
			engine$1.stopMic();
		};
	}, []);
	const snap = engine$1.snap;
	const captions = (0, import_react.useMemo)(() => {
		const path = snap.result?.ctcPath;
		if (hostRef.current && text.trim() && path && path.length) return forceAlign(text, path, FRAME_SEC);
		return snap.aligned;
	}, [
		text,
		snap.result,
		snap.aligned
	]);
	const start = async () => {
		setError(null);
		hostRef.current = false;
		await engine$1.startMic();
		if (engine$1.lastError) {
			setError(engine$1.lastError);
			setListening(false);
			return;
		}
		setListening(true);
		const rec = getRecog();
		if (!rec) {
			setError(null);
			return;
		}
		rec.continuous = true;
		rec.interimResults = true;
		rec.lang = "en-US";
		rec.onresult = (ev) => {
			let final = "";
			let inter = "";
			for (let i = ev.resultIndex; i < ev.results.length; i++) {
				const row = ev.results[i];
				if (row.isFinal) final += row[0].transcript;
				else inter += row[0].transcript;
			}
			const prev = useStudio.getState().filamentText;
			const next = (prev + (final ? (prev ? " " : "") + final.trim() : "")).trim();
			hostRef.current = true;
			setFilament(next, inter.trim());
		};
		rec.onerror = (ev) => {
			if (ev.error !== "no-speech" && ev.error !== "aborted") setError(ev.error);
		};
		rec.onend = () => {
			if (useStudio.getState().listening) try {
				rec.start();
			} catch {}
		};
		try {
			rec.start();
			recogRef.current = rec;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Recognizer failed.");
		}
	};
	const stop = async () => {
		setListening(false);
		recogRef.current?.stop();
		recogRef.current = null;
		await engine$1.stopMic();
	};
	(0, import_react.useEffect)(() => {
		if (snap.source === "mic" && listening && !hostRef.current && snap.transcript) setFilament(snap.transcript, "");
	}, [
		snap.transcript,
		snap.source,
		listening,
		setFilament
	]);
	const sendToCodec = () => {
		const line = text || snap.transcript;
		if (!line) return;
		setEncoderText(line);
		setRoom("codec");
	};
	const tPlay = snap.playhead * snap.duration;
	const display = text || snap.transcript;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid min-w-0 gap-4 lg:grid-cols-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "filament",
				title: "Listen",
				className: "lg:col-span-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-hidden rounded-md bg-elevated",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waveform, { height: 120 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1",
						children: captions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-1 text-sm text-muted",
							children: "No captions yet."
						}) : captions.map((w, i) => {
							const on = tPlay >= w.start && tPlay < w.end;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("inline-flex h-11 shrink-0 items-center rounded-sm px-3 text-sm", on ? "bg-linen text-bg" : "bg-elevated text-muted"),
								title: `${w.start.toFixed(2)}–${w.end.toFixed(2)}s`,
								children: w.word
							}, `${w.word}-${i}`);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap items-center gap-2",
						children: [
							listening ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "signal",
								onClick: stop,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, {}), "Stop"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: start,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {}), "Listen"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "quiet",
								onClick: () => {
									const line = DEMO_LINE;
									setFilament(line, "");
									engine$1.runDemo(line);
								},
								children: "Demo line"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								onClick: () => fileRef.current?.click(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {}), "Audio file"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: fileRef,
								type: "file",
								accept: "audio/*,.wav,.mp3,.ogg,.m4a",
								className: "hidden",
								onChange: (e) => {
									const f = e.target.files?.[0];
									if (!f) return;
									engine$1.loadFile(f).then(() => {
										setFilament(engine$1.snap.transcript, "");
									});
									e.target.value = "";
								}
							})
						]
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-warn",
						role: "status",
						children: error
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "meter",
				title: "Ear",
				className: "lg:col-span-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "source",
								value: snap.source
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "voicing",
								value: snap.vad ? "live" : "idle",
								hot: snap.vad
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "F0",
								value: snap.vad && snap.f0 ? `${Math.round(snap.f0)} Hz` : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "captions",
								value: String(captions.length)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 font-mono text-xs leading-relaxed text-signal",
						children: snap.result?.phones.slice(0, 24).join(" ") || "∅"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm leading-relaxed text-muted",
						children: "Unknown audio is decoded in this tab against the Klatt lexicon — the same mouth as Booth. Times come from the encoder. Host recognizer, if present, supplies the words; we align them."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "transcript",
				title: "Taken down",
				className: "lg:col-span-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "min-h-24 text-xl leading-snug tracking-tight text-fg",
					"aria-live": "polite",
					children: [display || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Waiting on Filament."
					}), partial ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: [" ", partial]
					}) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: sendToCodec,
						disabled: !display,
						children: "Send to codec"
					})
				})]
			})
		]
	});
}
/** Honest mash of what was said. No invented speech. */
function fusedClaim(lines) {
	const said = lines.map((l) => typeof l === "string" ? l.trim() : "").filter((l) => l.length > 0);
	if (!said.length) return null;
	return said.join(" ");
}
function sourcesKept(n, mode) {
	if (n <= 0) return 0;
	return mode === "fused" ? 1 : n;
}
function sourcesLost(n, mode) {
	return Math.max(0, n - sourcesKept(n, mode));
}
function inkDot(ink) {
	return ink === "linen" ? "bg-linen" : ink === "warn" ? "bg-warn" : "bg-signal";
}
function WarRoom() {
	const [, setTick] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		return engine.subscribe(() => setTick((n) => n + 1));
	}, []);
	(0, import_react.useLayoutEffect)(() => {
		engine.wantFused = true;
		if (engine.snap.scene !== "crisis" || engine.snap.canals.length < 2) engine.openScene("crisis", { play: false });
		return () => {
			engine.wantFused = false;
			engine.lastStop();
		};
	}, []);
	const snap = engine.snap;
	const n = snap.canals.length;
	const ghost = snap.fused ?? (n > 1 ? engine.computeFused() : null);
	const claim = fusedClaim(snap.canals.map((c) => c.line));
	const mode = snap.playing ? snap.playMode : "canals";
	const kept = sourcesKept(n, mode);
	const lost = sourcesLost(n, mode);
	const mixLive = snap.playing && snap.playMode === "fused";
	const houseLive = snap.playing && snap.playMode === "canals";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid min-w-0 gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-2xl text-sm leading-relaxed text-muted",
				children: "Filament in. Codec. Booth out. Dispersion keeps canals. The war is what happens when the mix is allowed. Three mouths. One measurement. The house keeps three. The mix keeps one."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					snap.playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "quiet",
						onClick: () => engine.stop(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" }), "Stop"]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: houseLive ? "signal" : "primary",
						onClick: () => {
							if (!n) engine.openScene("crisis");
							else engine.play();
						},
						children: "Play the house"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: mixLive ? "danger" : "outline",
						disabled: n < 2,
						onClick: () => void engine.playFused(),
						children: "Play the mix"
					})
				]
			}),
			snap.lastError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-warn",
				role: "status",
				children: snap.lastError
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-mono text-xs tracking-widest text-subtle uppercase",
				children: [
					n,
					" canals · ",
					kept,
					" kept · ",
					lost,
					" lost · mix analysis sealed"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "field",
				title: "Crisis overlap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DispersionField, { showFused: mixLive || Boolean(ghost) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Output is a singleton. Input is not. Three canals. Fusion is the danger."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					kicker: "house",
					title: "Three canals",
					action: houseLive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs tracking-widest text-signal uppercase",
						children: "live"
					}) : null,
					children: n === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Nothing is on the field yet."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-3",
						children: snap.canals.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-md bg-elevated p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-2 shrink-0 rounded-full", inkDot(c.ink)) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-medium text-fg",
										children: c.name
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm text-muted",
									children: c.line ?? "Empty ear."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
										label: "F0",
										value: formatHz(houseLive ? c.live.f0 : c.card.medianF0),
										hot: houseLive ? c.live.voiced : c.card.voiced
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
										label: "peak RMS",
										value: formatRms(houseLive ? c.live.rms : c.card.peakRms)
									})]
								})
							]
						}, c.id))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					kicker: "mix",
					title: "One mouth",
					action: mixLive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs tracking-widest text-danger uppercase",
						children: "live"
					}) : null,
					children: !ghost ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Need two or more canals to show the lie."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-hidden rounded-md",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waveform, {
								pcm: ghost.pcm,
								height: 72,
								ink: "warn",
								playhead: mixLive ? snap.playhead : 0
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm leading-relaxed text-danger",
							children: claim ?? "Empty ear. No invented speech."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "One string. None of them said this as a mouth."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "F0",
									value: formatHz(mixLive ? ghost.live.f0 : ghost.card.medianF0)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "peak RMS",
									value: formatRms(mixLive ? ghost.live.rms : ghost.card.peakRms)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "voiced",
									value: ghost.card.voiced ? "muddied" : "no"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "canals lost",
									value: String(sourcesLost(n, "fused"))
								})
							]
						})
					] })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				kicker: "verdict",
				title: "The mix loses sources",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-4 sm:grid-cols-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "on the field",
							value: String(n)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "house keeps",
							value: String(sourcesKept(n, "canals")),
							hot: houseLive
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "mix keeps",
							value: n > 1 ? "1" : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "lost to fusion",
							value: n > 1 ? String(sourcesLost(n, "fused")) : "—"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-relaxed text-muted",
					children: "Mixing the PCM and measuring the mix is how three people become one mouth. Sierra already forbids two voices on the way out. This layer forbids one measurement on the way in."
				})]
			})
		]
	});
}
var ROOMS = [
	{
		id: "filament",
		label: "Filament",
		role: "in"
	},
	{
		id: "codec",
		label: "Codec",
		role: "middle"
	},
	{
		id: "booth",
		label: "Booth",
		role: "out"
	},
	{
		id: "dispersion",
		label: "Dispersion",
		role: "canals"
	},
	{
		id: "war",
		label: "War",
		role: "proof"
	}
];
function Studio() {
	const room = useStudio((s) => s.room);
	const setRoom = useStudio((s) => s.setRoom);
	const listening = useStudio((s) => s.listening);
	(0, import_react.useEffect)(() => {
		hydrateStudio();
		return useStudio.subscribe((s) => persistStudio(s));
	}, []);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const t = e.target;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
			if (e.key === "1") setRoom("filament");
			if (e.key === "2") setRoom("codec");
			if (e.key === "3") setRoom("booth");
			if (e.key === "4") setRoom("dispersion");
			if (e.key === "5") setRoom("war");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [setRoom]);
	const go = (next) => {
		if (next !== "filament" && next !== "booth") {
			engine$1.stopMic();
			engine$1.stopPlayback();
			useStudio.getState().setListening(false);
		}
		if (next !== "dispersion" && next !== "war") engine.lastStop();
		setRoom(next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col overflow-x-clip bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "border-b border-border px-4 py-4 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl items-center justify-between gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs tracking-widest text-subtle uppercase",
								children: "Studio"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-lg font-semibold tracking-widest text-fg uppercase",
								children: "Codec War"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "hidden items-center lg:flex",
							"aria-label": "Pipeline",
							children: ROOMS.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center",
								children: [r.id === "war" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mx-2 h-5 w-px bg-border",
									"aria-hidden": true
								}) : i > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
									className: "mx-1 size-4 text-subtle",
									"aria-hidden": true,
									strokeWidth: 1.5
								}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => go(r.id),
									"aria-current": room === r.id ? "page" : void 0,
									className: cn("h-11 rounded-md px-3 text-sm transition-colors duration-[var(--motion-quick)]", room === r.id ? "bg-linen text-bg" : "text-muted hover:bg-elevated hover:text-fg"),
									children: r.label
								})]
							}, r.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hidden font-mono text-xs text-subtle sm:block lg:hidden",
							children: "5 rooms"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hidden font-mono text-xs text-subtle lg:block",
							children: listening ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-signal",
								children: "filament live"
							}) : room === "war" ? "the mix loses sources" : "in · middle · out · canals · proof"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "mx-auto mt-3 hidden max-w-6xl min-w-0 items-center overflow-x-auto sm:flex lg:hidden",
					"aria-label": "Pipeline",
					children: ROOMS.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center",
						children: [r.id === "war" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mx-1.5 h-4 w-px bg-border",
							"aria-hidden": true
						}) : i > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
							className: "mx-0.5 size-3.5 text-subtle",
							"aria-hidden": true,
							strokeWidth: 1.5
						}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => go(r.id),
							"aria-current": room === r.id ? "page" : void 0,
							className: cn("h-11 rounded-md px-2.5 text-sm transition-colors duration-[var(--motion-quick)]", room === r.id ? "bg-linen text-bg" : "text-muted hover:bg-elevated hover:text-fg"),
							children: r.label
						})]
					}, r.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-8",
				children: [
					room !== "dispersion" && room !== "war" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-5 max-w-2xl text-sm leading-relaxed text-muted",
						children: "Filament in. Codec in the middle. Booth out. That is one canal. Dispersion is the room that keeps many. War is the proof."
					}) : null,
					room === "filament" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilamentRoom, {}) : null,
					room === "codec" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EncoderRoom, {}) : null,
					room === "booth" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoothRoom, {}) : null,
					room === "dispersion" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DispersionRoom, {}) : null,
					room === "war" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WarRoom, {}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-1.5 pt-1.5 pb-[max(2.75rem,calc(0.5rem+env(safe-area-inset-bottom)))] sm:hidden",
				"aria-label": "Pipeline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-5 gap-0.5",
					children: ROOMS.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => go(r.id),
						"aria-current": room === r.id ? "page" : void 0,
						className: cn("flex h-12 min-w-0 flex-col items-center justify-center rounded-md px-0.5", room === r.id ? "bg-linen text-bg" : "text-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs leading-none tracking-widest uppercase",
							children: r.role
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-0.5 w-full truncate text-center text-xs font-medium leading-tight",
							children: r.label
						})]
					}, r.id))
				})
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Studio, {});
}
//#endregion
export { Home as component };
