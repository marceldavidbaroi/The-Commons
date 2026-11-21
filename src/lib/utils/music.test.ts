import { describe, expect, it } from 'vitest';
import {
	extractYoutubeId,
	getYoutubeQueueUrl,
	getYoutubeThumbnail,
	getYoutubeWatchUrl
} from './music';

describe('music utils', () => {
	it('extracts 11-char YouTube IDs from all supported URL formats', () => {
		expect(extractYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(extractYoutubeId('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RD123')).toBe('dQw4w9WgXcQ');
		expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
		expect(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('returns null for invalid YouTube inputs', () => {
		expect(extractYoutubeId('')).toBeNull();
		expect(extractYoutubeId('short')).toBeNull();
		expect(extractYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
	});

	it('builds YouTube thumbnail, watch, and queue URLs', () => {
		expect(getYoutubeThumbnail('dQw4w9WgXcQ')).toBe(
			'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
		);
		expect(getYoutubeWatchUrl('dQw4w9WgXcQ')).toBe(
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
		);
		const ids = Array.from({ length: 60 }, (_, i) => `id${String(i).padStart(9, '0')}`);
		const queueUrl = getYoutubeQueueUrl(ids);
		expect(queueUrl.startsWith('https://www.youtube.com/watch_videos?video_ids=')).toBe(true);
		expect(queueUrl.split('=')[1].split(',').length).toBe(50);
	});
});
