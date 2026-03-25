import { describe, it, expect } from 'vitest';
import sampleRoutePoints from '../sampleRoutePoints.js';

describe('sampleRoutePoints', () => {
	it('returns empty arrays when coordinates are empty', () => {
		const result = sampleRoutePoints([], [100, 200], 5);

		expect(result).toEqual({ coords: [], etas: [] });
	});

	it('samples evenly across the route and interpolates ETAs', () => {
		const coordinates = [
			[-111.79, 43.82],
			[-112.0, 44.0],
			[-113.0, 45.0],
			[-114.0, 46.0],
			[-116.78, 47.67]
		];
		const etas = [1000, 2000];

		const result = sampleRoutePoints(coordinates, etas, 5);

		expect(result.coords).toEqual([
			{ lat: 43.82, lng: -111.79 },
			{ lat: 44.0, lng: -112.0 },
			{ lat: 45.0, lng: -113.0 },
			{ lat: 46.0, lng: -114.0 },
			{ lat: 47.67, lng: -116.78 }
		]);
		expect(result.etas).toEqual([1000, 1250, 1500, 1750, 2000]);
	});

	it('reuses available coordinates when numSamples exceeds coordinate count', () => {
		const coordinates = [
			[-111.79, 43.82],
			[-116.78, 47.67]
		];
		const etas = [500, 800];

		const result = sampleRoutePoints(coordinates, etas, 4);

		expect(result.coords).toEqual([
			{ lat: 43.82, lng: -111.79 },
			{ lat: 43.82, lng: -111.79 },
			{ lat: 43.82, lng: -111.79 },
			{ lat: 47.67, lng: -116.78 }
		]);
		expect(result.etas).toEqual([500, 600, 700, 800]);
	});
});
