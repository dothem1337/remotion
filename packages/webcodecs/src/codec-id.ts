const availableContainers = ['webm', 'mp4'] as const;
export type ConvertMediaContainer = (typeof availableContainers)[number];

export const getAvailableContainers = (): readonly ConvertMediaContainer[] => {
	return availableContainers;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const availableVideoCodecs = ['vp8', 'vp9', 'h264'] as const;
export type ConvertMediaVideoCodec = (typeof availableVideoCodecs)[number];

export const getAvailableVideoCodecs = (
	container: ConvertMediaContainer,
): ConvertMediaVideoCodec[] => {
	if (container === 'mp4') {
		return ['h264'];
	}

	if (container === 'webm') {
		return ['vp8', 'vp9'];
	}

	throw new Error(`Unsupported container: ${container satisfies never}`);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const availableAudioCodecs = ['opus', 'aac'] as const;
export const getAvailableAudioCodecs = (
	container: ConvertMediaContainer,
): ConvertMediaAudioCodec[] => {
	if (container === 'mp4') {
		return ['aac'];
	}

	if (container === 'webm') {
		return ['opus'];
	}

	throw new Error(`Unsupported container: ${container satisfies never}`);
};

export type ConvertMediaAudioCodec = (typeof availableAudioCodecs)[number];
