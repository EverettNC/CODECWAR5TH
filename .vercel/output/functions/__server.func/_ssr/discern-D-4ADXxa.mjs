import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { a as object, i as number, n as boolean, o as string, t as array } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/discern-D-4ADXxa.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
var discernCanals_createServerFn_handler = createServerRpc({
	id: "b4a8fb9af92c2f99b597ad1ede644ea95066afdc64dc07de116a4c422d7aafd5",
	name: "discernCanals",
	filename: "src/lib/discern.ts"
}, (opts) => discernCanals.__executeServer(opts));
var discernCanals = createServerFn({ method: "POST" }).validator((input) => object({ canals: array(CardIn).max(4) }).parse(input)).handler(discernCanals_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "Discernment is not available in this environment."
	};
	const body = data.canals.map((c, i) => {
		const f0 = c.medianF0 == null ? "null (hole, not zero)" : `${Math.round(c.medianF0)} Hz`;
		const f1 = c.lastF1 == null ? "null" : `${Math.round(c.lastF1)} Hz`;
		const f2 = c.lastF2 == null ? "null" : `${Math.round(c.lastF2)} Hz`;
		const line = c.line == null || c.line === "" ? "(empty ear — do not invent speech)" : JSON.stringify(c.line);
		return [
			`Canal ${i + 1} id=${c.id} name=${c.name} kind=${c.kind}`,
			`  line: ${line}`,
			`  duration ${c.duration.toFixed(2)}s attack ${c.attack.toFixed(3)}s decay ${c.decay == null ? "null" : c.decay.toFixed(3) + "s"} truncated=${c.truncated}`,
			`  peak RMS ${c.peakRms.toFixed(4)} mean ZCR ${c.meanZcr.toFixed(4)} voiced=${c.voiced}`,
			`  median F0 ${f0} last F1 ${f1} last F2 ${f2}`
		].join("\n");
	}).join("\n\n");
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 500,
			temperature: .2,
			messages: [{
				role: "system",
				content: "You are the discernment layer of Christman Sound. You receive independent Corti cards, one per canal. You never fuse them. Describe each canal separately as its own source. If asked what is happening in the room, answer as a list of independent sources, never as one mixed event. Empty ear stays empty — do not invent speech. A null F0 is a hole, not a zero. Do not classify beyond what the measurements support. If you cannot tell, say MODE_UNKNOWN for that canal. Keep it short. No preamble."
			}, {
				role: "user",
				content: `Discern these canals. Do not fuse.\n\n${body}`
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `xAI API error ${res.status}`
	};
	const text = (await res.json()).choices?.[0]?.message?.content?.trim() ?? "";
	if (!text) return {
		ok: false,
		error: "Empty reply."
	};
	return {
		ok: true,
		text
	};
});
//#endregion
export { discernCanals_createServerFn_handler };
