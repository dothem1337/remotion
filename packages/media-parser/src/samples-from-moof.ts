import type {SamplePosition} from './get-sample-positions';
import type {AnySegment, IsoBaseMediaBox} from './parse-result';
import {getTfdtBox, getTfhdBox, getTrunBoxes} from './traversal';

const getSamplesFromTraf = (
	trafSegment: IsoBaseMediaBox,
	moofOffset: number,
): SamplePosition[] => {
	if (trafSegment.type !== 'regular-box' || trafSegment.boxType !== 'traf') {
		throw new Error('Expected traf-box');
	}

	const tfhdBox = getTfhdBox(trafSegment);
	const defaultSampleDuration = tfhdBox?.defaultSampleDuration ?? null;
	const defaultSampleSize = tfhdBox?.defaultSampleSize ?? null;
	const defaultSampleFalgs = tfhdBox?.defaultSampleFlags ?? null;

	const tfdtBox = getTfdtBox(trafSegment);
	const trunBoxes = getTrunBoxes(trafSegment);

	let offset = 0;
	let time = 0;

	const samples: SamplePosition[] = [];

	for (const trunBox of trunBoxes) {
		let i = -1;
		for (const sample of trunBox.samples) {
			i++;
			const duration = sample.sampleDuration ?? defaultSampleDuration;
			if (duration === null) {
				throw new Error('Expected duration');
			}

			const size = sample.sampleSize ?? defaultSampleSize;
			if (size === null) {
				throw new Error('Expected size');
			}

			const isFirstSample = i === 0;
			const sampleFlags = sample.sampleFlags
				? sample.sampleFlags
				: isFirstSample && trunBox.firstSampleFlags !== null
					? trunBox.firstSampleFlags
					: defaultSampleFalgs;
			if (sampleFlags === null) {
				throw new Error('Expected sample flags');
			}

			const keyframe = !((sampleFlags >> 16) & 0x1);

			const samplePosition: SamplePosition = {
				offset: offset + (trunBox.dataOffset ?? 0) + (moofOffset ?? 0),
				dts: time + (tfdtBox?.baseMediaDecodeTime ?? 0),
				cts: time + (tfdtBox?.baseMediaDecodeTime ?? 0),
				duration,
				isKeyframe: keyframe,
				size,
			};
			samples.push(samplePosition);
			offset += size;
			time += duration;
		}
	}

	return samples;
};

export const getSamplesFromMoof = ({
	segment,
	trackId,
}: {
	segment: AnySegment;
	trackId: number;
}) => {
	if (segment.type !== 'regular-box') {
		throw new Error('Expected moof-box');
	}

	const trafs = segment.children.filter(
		(c) => c.type === 'regular-box' && c.boxType === 'traf',
	) as IsoBaseMediaBox[];

	const mapped = trafs.map((traf) => {
		const tfhdBox = getTfhdBox(traf);

		return tfhdBox?.trackId === trackId
			? getSamplesFromTraf(traf, segment.offset)
			: [];
	});
	return mapped.flat(1);
};
