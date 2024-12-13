/* eslint-disable */
declare module 'solc' {
	export interface Solc {
		compile(input: string): any;
		loadRemoteVersion(
			version: string,
			callback: (err: any, solc: any) => void,
		): void;
		// Add other methods if needed
	}

	const solc: Solc;
	export = solc;
}
