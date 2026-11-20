import { beforeNavigate, goto } from '$app/navigation';

export interface UnsavedGuardOptions {
	isDirty: () => boolean;
	onSave: () => Promise<void>;
	onDiscard: () => void;
}

export function useUnsavedGuard(options: UnsavedGuardOptions) {
	let open = $state(false);
	let saving = $state(false);
	let pendingUrl = $state<URL | null>(null);
	let bypass = false;

	beforeNavigate(({ cancel, to }) => {
		if (bypass || !options.isDirty()) return;
		cancel();
		pendingUrl = to?.url ?? null;
		open = true;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const handler = (e: BeforeUnloadEvent) => {
			if (!options.isDirty()) return;
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});

	async function saveAndLeave() {
		if (saving) return;
		saving = true;
		try {
			await options.onSave();
			const target = pendingUrl;
			open = false;
			pendingUrl = null;
			if (target) {
				bypass = true;
				await goto(target.pathname + target.search + target.hash);
				bypass = false;
			}
		} finally {
			saving = false;
		}
	}

	async function discardAndLeave() {
		options.onDiscard();
		const target = pendingUrl;
		open = false;
		pendingUrl = null;
		if (target) {
			bypass = true;
			await goto(target.pathname + target.search + target.hash);
			bypass = false;
		}
	}

	function cancelLeave() {
		open = false;
		pendingUrl = null;
	}

	return {
		get open() {
			return open;
		},
		get saving() {
			return saving;
		},
		saveAndLeave,
		discardAndLeave,
		cancelLeave
	};
}
