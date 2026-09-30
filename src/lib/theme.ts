import { writable } from 'svelte/store';

export type ThemePalette = 'paper' | 'sage' | 'denim' | 'classic' | 'midnight';

export interface ThemeOption {
	id: ThemePalette;
	name: string;
	tagline: string;
	bgHex: string;
	accentHex: string;
	inkHex: string;
}

export const THEME_PALETTES: ThemeOption[] = [
	{
		id: 'paper',
		name: 'Warm Linen',
		tagline: 'Sepia Parchment • Low Eye Strain',
		bgHex: '#F6F4EE',
		accentHex: '#9E5A3C',
		inkHex: '#2C2825'
	},
	{
		id: 'sage',
		name: 'Botanical Sage',
		tagline: 'Morning Mist • Earthy & Calming',
		bgHex: '#F3F4F1',
		accentHex: '#3A6053',
		inkHex: '#1E2522'
	},
	{
		id: 'denim',
		name: 'Quiet Denim',
		tagline: 'Soft Slate • Gentle Daylight',
		bgHex: '#F6F7F9',
		accentHex: '#415E78',
		inkHex: '#1F2633'
	},
	{
		id: 'classic',
		name: 'Sanctuary Classic',
		tagline: 'Editorial Broadside • Heritage Blue',
		bgHex: '#FAF8F5',
		accentHex: '#3368A0',
		inkHex: '#1E293B'
	},
	{
		id: 'midnight',
		name: 'Midnight Basalt',
		tagline: 'Warm Obsidian • Night Reading',
		bgHex: '#181716',
		accentHex: '#D49B55',
		inkHex: '#EDE8DF'
	}
];

const THEME_STORAGE_KEY = 'the-commons-theme-palette';

function createThemeStore() {
	const initialTheme: ThemePalette =
		typeof window !== 'undefined'
			? ((localStorage.getItem(THEME_STORAGE_KEY) as ThemePalette) || 'paper')
			: 'paper';

	const { subscribe, set, update } = writable<ThemePalette>(initialTheme);

	return {
		subscribe,
		setTheme: (theme: ThemePalette) => {
			if (typeof window !== 'undefined') {
				localStorage.setItem(THEME_STORAGE_KEY, theme);
				document.documentElement.setAttribute('data-theme', theme);
				if (theme === 'midnight') {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}
			set(theme);
		},
		init: () => {
			if (typeof window !== 'undefined') {
				const saved = (localStorage.getItem(THEME_STORAGE_KEY) as ThemePalette) || 'paper';
				document.documentElement.setAttribute('data-theme', saved);
				if (saved === 'midnight') {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
				set(saved);
			}
		}
	};
}

export const themeStore = createThemeStore();
