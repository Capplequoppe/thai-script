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
		readonly wordThai: string,
		readonly property: string,
		audioUrl?: string,
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
			wordThai: this.wordThai,
			property: this.property,
		};
	}

	static fromDTO(dto: {
		id: string;
		question: string;
		correctAnswer: string;
		choices: readonly string[];
		srs: ReturnType<SrsSchedule["toDTO"]>;
		wordThai: string;
		property: string;
		audioUrl?: string;
	}): VocabCard {
		return new VocabCard(
			dto.id,
			dto.question,
			dto.correctAnswer,
			dto.choices,
			SrsSchedule.fromDTO(dto.srs),
			dto.wordThai,
			dto.property,
			dto.audioUrl,
		);
	}
}
