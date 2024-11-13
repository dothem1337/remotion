import {combineUint8Arrays} from '../../boxes/webm/make-header';
import {addSize, stringsToUint8Array} from './primitives';

export const createUrlAtom = () => {
	return addSize(
		combineUint8Arrays([
			// type
			stringsToUint8Array('url '),
			// version
			new Uint8Array([0]),
			// flags
			new Uint8Array([0, 0, 1]),
		]),
	);
};
