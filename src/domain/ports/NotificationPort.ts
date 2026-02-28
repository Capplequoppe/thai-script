export interface NotificationPort {
	readonly permission: string;
	scheduleNext(date: Date, count: number): void;
	cancel(): void;
}
