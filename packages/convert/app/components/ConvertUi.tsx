import {Button} from '@/components/ui/button';
import {CardTitle} from '@/components/ui/card';
import {Label} from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {fetchReader} from '@remotion/media-parser/fetch';
import {webFileReader} from '@remotion/media-parser/web-file';
import {convertMedia} from '@remotion/webcodecs';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ConvertState, Source} from '~/lib/convert-state';
import {Container, getNewName} from '~/lib/generate-new-name';
import {ConvertProgress, convertProgressRef} from './ConvertProgress';
import {ErrorState} from './ErrorState';
import {Badge} from './ui/badge';

export default function ConvertUI({src}: {readonly src: Source}) {
	const [container, setContainer] = useState<Container>('webm');
	const [videoCodec, setVideoCodec] = useState('vp8');
	const [audioCodec, setAudioCodec] = useState('opus');
	const [state, setState] = useState<ConvertState>({type: 'idle'});
	const [name, setName] = useState<string | null>(null);

	const abortSignal = useRef<AbortController | null>(null);

	const onClick = useCallback(() => {
		const abortController = new AbortController();
		abortSignal.current = abortController;

		let _n: string | null = null;

		let videoFrames = 0;

		convertMedia({
			src: src.type === 'url' ? src.url : src.file,
			reader: src.type === 'file' ? webFileReader : fetchReader,
			onVideoFrame: (frame) => {
				if (videoFrames % 15 === 0) {
					convertProgressRef.current?.draw(frame);
				}

				videoFrames++;
				return Promise.resolve();
			},
			logLevel: 'verbose',
			onMediaStateUpdate: (s) => {
				setState({
					type: 'in-progress',
					state: s,
					abortConversion: () => {
						abortController.abort();
					},
				});
			},
			videoCodec: videoCodec as 'vp8',
			audioCodec: audioCodec as 'opus',
			to: container as 'webm',
			signal: abortController.signal,
			fields: {
				name: true,
			},
			onName: (n) => {
				_n = n;
				setName(n);
			},
		})
			.then(({save}) => {
				// TODO: When to remove?
				setState((prevState) => {
					if (prevState.type !== 'in-progress') {
						throw new Error('Invalid state transition');
					}
					return {
						type: 'done',
						download: async () => {
							if (!_n) {
								throw new Error('No name');
							}

							const file = await save();
							const a = document.createElement('a');
							a.href = URL.createObjectURL(file);
							a.download = getNewName(_n!, container);
							a.click();
							URL.revokeObjectURL(a.href);
						},
						state: prevState.state,
					};
				});
			})
			.catch((e) => {
				if ((e as Error).stack?.toLowerCase()?.includes('aborted')) {
					setState({type: 'idle'});
					return;
				}

				console.error(e);
				setState({type: 'error', error: e as Error});
			});

		return () => {
			abortController.abort();
		};
	}, [src, videoCodec, audioCodec, container]);

	const cancel = useCallback(() => {
		if (state.type !== 'in-progress') {
			throw new Error('Cannot cancel when not in progress');
		}

		state.abortConversion();
		setState({type: 'idle'});
	}, [state]);

	const dimissError = useCallback(() => {
		setState({type: 'idle'});
	}, []);

	const onDownload = useCallback(async () => {
		if (state.type !== 'done') {
			throw new Error('Cannot download when not done');
		}

		try {
			await state.download();
		} catch (e) {
			console.error(e);
			setState({type: 'error', error: e as Error});
		}
	}, [state]);

	useEffect(() => {
		return () => {
			if (abortSignal.current) {
				abortSignal.current.abort();
			}
		};
	}, []);

	return (
		<div className="w-full lg:w-[350px]">
			<div className="gap-4">
				{state.type === 'error' ? (
					<>
						<ErrorState error={state.error} />
						<div className="h-4" />
						<Button
							className="block w-full"
							type="button"
							onClick={dimissError}
						>
							Dismiss
						</Button>
					</>
				) : state.type === 'in-progress' ? (
					<>
						<ConvertProgress
							state={state.state}
							name={name}
							container={container}
						/>
						<div className="h-2" />
						<Button className="block w-full" type="button" onClick={cancel}>
							Cancel
						</Button>
					</>
				) : state.type === 'done' ? (
					<>
						<ConvertProgress
							state={state.state}
							name={name}
							container={container}
						/>
						<div className="h-2" />
						<Button className="block w-full" type="button" onClick={onDownload}>
							Download
						</Button>
					</>
				) : (
					<>
						<div className="grid w-full items-center gap-4">
							<div className="flex flex-row">
								<CardTitle>Convert video</CardTitle>
								<div className="w-2" />
								<Badge variant="default">Alpha</Badge>
							</div>
							<div>
								<Label htmlFor="container">Container</Label>
								<Select
									value={container}
									onValueChange={(v) => setContainer(v as Container)}
								>
									<SelectTrigger id="container">
										<SelectValue placeholder="Select a container" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="webm">WebM</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="videoCodec">Video codec</Label>
								<Select value={videoCodec} onValueChange={setVideoCodec}>
									<SelectTrigger id="videoCodec">
										<SelectValue placeholder="Select a video codec" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="vp8">VP8</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="audioCodec">Audio codec</Label>
								<Select value={audioCodec} onValueChange={setAudioCodec}>
									<SelectTrigger id="audioCodec">
										<SelectValue placeholder="Select a audio codec" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="opus">Opus</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="h-4" />
						<Button
							className="block w-full font-brand"
							type="button"
							variant="brand"
							onClick={onClick}
						>
							Convert
						</Button>
					</>
				)}
			</div>
		</div>
	);
}
