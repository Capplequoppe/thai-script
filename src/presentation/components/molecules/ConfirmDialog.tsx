import { Button } from "@/presentation/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/presentation/components/ui/dialog";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	onConfirm: () => void;
	confirmLabel?: string;
	isDestructive?: boolean;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
	confirmLabel = "Confirm",
	isDestructive = false,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="secondary"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant={isDestructive ? "destructive" : "default"}
						onClick={() => {
							onConfirm();
							onOpenChange(false);
						}}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
