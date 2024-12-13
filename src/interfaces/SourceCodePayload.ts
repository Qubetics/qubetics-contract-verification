/* eslint-disable */
export interface SourceCodePayload {
	// required
	contractaddress: string;
	codeformat: string;
	compilerversion: string;
	licenseType: string;
	sourceCode: any;
	contractname: string;
	optimizationUsed: boolean;
	apikey: string;
	module: string;
	action: string;
	// optional
	isVerified?: boolean;
	abi?: string;
	files?: any[];
	constructorArguements?: any[];
	evmVersion?: string;
	// iff optimizationUsed is true
	runs: number;
}
