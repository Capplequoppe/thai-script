export type CardPool = "script" | "vocab" | "grammar";

export const CardPools = {
	SCRIPT: "script" as const,
	VOCAB: "vocab" as const,
	GRAMMAR: "grammar" as const,

	all(): CardPool[] {
		return ["script", "vocab", "grammar"];
	},

	isValid(value: string): value is CardPool {
		return value === "script" || value === "vocab" || value === "grammar";
	},
} as const;
