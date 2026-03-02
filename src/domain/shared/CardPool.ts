export type CardPool = "script" | "vocab" | "grammar" | "sentence";

export const CardPools = {
	SCRIPT: "script" as const,
	VOCAB: "vocab" as const,
	GRAMMAR: "grammar" as const,
	SENTENCE: "sentence" as const,

	all(): CardPool[] {
		return ["script", "vocab", "grammar", "sentence"];
	},

	isValid(value: string): value is CardPool {
		return (
			value === "script" ||
			value === "vocab" ||
			value === "grammar" ||
			value === "sentence"
		);
	},
} as const;
