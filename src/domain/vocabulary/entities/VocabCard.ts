import type { CardPool } from "../../shared/CardPool";
import { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";

export class VocabCard extends ReviewableCard {
	constructor(
		id: string,
		question: string,
		correctAnswer: string,
		choices: readonly string[],
		schedule: SrsSchedule,
		readonly promptWord: string,
		readonly property: string,
		audioUrl?: string,
		readonly mnemonic?: string | null,
		readonly syllables?: { text: string; tone: string }[],
	) {
		super(id, question, correctAnswer, choices, schedule, audioUrl);
	}

	get pool(): CardPool {
		return "vocab";
	}

	toDTO() {
		return {
			id: this.id,
			question: this.question,
			correctAnswer: this.correctAnswer,
			choices: this.choices,
			srs: this.schedule.toDTO(),
			audioUrl: this.audioUrl,
			promptWord: this.promptWord,
			property: this.property,
			...(this.mnemonic != null && { mnemonic: this.mnemonic }),
			...(this.syllables != null && { syllables: this.syllables }),
		};
	}

	static fromDTO(dto: {
		id: string;
		question: string;
		correctAnswer: string;
		choices: readonly string[];
		srs: ReturnType<SrsSchedule["toDTO"]>;
		promptWord: string;
		property: string;
		audioUrl?: string;
		mnemonic?: string | null;
		syllables?: { text: string; tone: string }[];
	}): VocabCard {
		return new VocabCard(
			dto.id,
			dto.question,
			dto.correctAnswer,
			dto.choices,
			SrsSchedule.fromDTO(dto.srs),
			dto.promptWord,
			dto.property,
			dto.audioUrl,
			dto.mnemonic,
			dto.syllables,
		);
	}
}
