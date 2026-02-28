import type { PropertyType } from "../../../types";
import type { CardPool } from "../../shared/CardPool";
import { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";

export class ScriptPropertyCard extends ReviewableCard {
	constructor(
		id: string,
		question: string,
		correctAnswer: string,
		choices: readonly string[],
		schedule: SrsSchedule,
		readonly symbolCharacter: string,
		readonly property: PropertyType | "toneRule",
		readonly lessonNumber: number,
		audioUrl?: string,
	) {
		super(id, question, correctAnswer, choices, schedule, audioUrl);
	}

	get pool(): CardPool {
		return "script";
	}

	toDTO() {
		return {
			id: this.id,
			question: this.question,
			correctAnswer: this.correctAnswer,
			choices: this.choices,
			srs: this.schedule.toDTO(),
			audioUrl: this.audioUrl,
			symbolCharacter: this.symbolCharacter,
			property: this.property,
			lessonNumber: this.lessonNumber,
		};
	}

	static fromDTO(
		dto: ReturnType<ScriptPropertyCard["toDTO"]>,
	): ScriptPropertyCard {
		return new ScriptPropertyCard(
			dto.id,
			dto.question,
			dto.correctAnswer,
			dto.choices,
			SrsSchedule.fromDTO(dto.srs),
			dto.symbolCharacter,
			dto.property,
			dto.lessonNumber,
			dto.audioUrl,
		);
	}
}
