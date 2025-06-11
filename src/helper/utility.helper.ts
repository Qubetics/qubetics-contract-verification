import { fork } from 'child_process';
import path from 'path';
import util from 'util';
import { LRUCache } from 'lru-cache';
import solc from 'solc';
import { ERROR_MESSAGES, RES_MSG } from '../constant/constants';
import { ReturnedError, ReturnedResponse } from '../data classes';

const { EVM } = require('evm');

// Function to convert a Buffer to a string using UTF-8 encoding
export const bufferToString = (
	buffer: Buffer,
	encoding: BufferEncoding = 'utf-8',
): string => {
	// Convert the buffer to a string using the appropriate encoding
	const fileContent = buffer.toString(encoding);
	return fileContent;
};

// Function to convert an array of files to a JSON object
export const filesToCompilerJson = (filesArray: any[], isString = false) => {
	try {
		const filesJSON: any = {};
		if (filesArray.length) {
			// Iterate through filesArray to convert each file to JSON format
			filesArray.forEach((file: any) => {
				// Convert file buffer to string
				const fileContent: string = isString
					? file.buffer
					: bufferToString(Buffer.from(file.buffer.data));
				const filename = file.originalname;
				// Add file content to filesJSON with filename as key
				filesJSON[filename] = { content: fileContent };
			});
		} else {
			// Return an error if filesArray is empty
			return new ReturnedResponse(ERROR_MESSAGES.FILE_REQUIRED);
		}
		return filesJSON;
	} catch (err: any) {
		console.log('Error in filesTo Comparison:', err);
		return new ReturnedResponse(RES_MSG.STANDARD_JSON_INPUT_FAILED);
	}
};

export const convertToStandardJson = (
	sources: any,
	optimizationUsed: boolean = false,
	runs: number = 200,
	evmVersion?: string,
) => {
	try {
		if (!sources) return new ReturnedResponse(RES_MSG.SOURCES_CANTBE_NULL);
		if (
			typeof sources !== 'object' ||
			sources?.length === 0 ||
			sources?.length
		)
			return new ReturnedResponse(RES_MSG.SOURCES_TYPE);
		if (!Object.keys(sources).length)
			return new ReturnedResponse(RES_MSG.SOURCES_CANTBE_EMPTY);

		const standardInputJsonFormat = {
			language: 'Solidity',
			sources: {
				...sources,
			},
			settings: {
				optimizer: {
					enabled: optimizationUsed,
					runs,
				},
				outputSelection: {
					'*': {
						'*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
					},
				},
				evmVersion,
			},
		};

		if (evmVersion === 'default')
			delete standardInputJsonFormat.settings.evmVersion;

		return new ReturnedResponse(
			'',
			JSON.stringify(standardInputJsonFormat),
		);
	} catch (err: any) {
		console.log('Error in convertToStandardJson:', err);
		return new ReturnedResponse(RES_MSG.STANDARD_JSON_INPUT_FAILED);
	}
};

export const matchContractDetails = (
	contracts: any,
	deployedByteCode: string,
) => {
	try {
		// 108 is length of characters of hash
		const metaDataHash = deployedByteCode
			.slice(deployedByteCode.length - 108)
			.trim();
		const actualDeployedByteCode = deployedByteCode
			.slice(0, deployedByteCode.length - 108)
			.trim();
		const matchedContract = {
			contractName: '',
			verified: false,
			fullyVerified: false,
			abi: '',
			bytecode: '',
			creationCode: '',
		};
		for (const contract of contracts) {
			const compiledByteCode = contract.deployedByteCode;
			const metaDataHashCompiled = compiledByteCode
				.slice(compiledByteCode.length - 108)
				.trim();
			const actualByteCodeCompiled = compiledByteCode
				.slice(0, compiledByteCode.length - 108)
				.trim();

			if (actualByteCodeCompiled.length !== actualDeployedByteCode.length)
				continue;
			// opcodes matching
			const originalOpcodes = getOpcodes(actualDeployedByteCode);
			const compiledOpcodes = getOpcodes(actualByteCodeCompiled);
			const isByteCodeMatched = isArraysAreIdentical(
				originalOpcodes,
				compiledOpcodes,
			);

			// light matching
			if (
				actualByteCodeCompiled === actualDeployedByteCode ||
				isByteCodeMatched
			) {
				matchedContract.contractName = contract.contractName;
				matchedContract.verified = true;
				matchedContract.abi = JSON.stringify(contract?.abi);
				matchedContract.bytecode = contract?.deployedByteCode;
				matchedContract.creationCode = contract?.bytecode;
				// match metadata hash
				if (metaDataHashCompiled === metaDataHash)
					matchedContract.fullyVerified = true;
				break;
			}
		}
		return matchedContract;
	} catch (err: any) {
		console.log('Error in matchContractDetails: ', err);
		return new ReturnedResponse(
			RES_MSG.STANDARD_JSON_INPUT_FAILED,
			null,
			err,
		);
	}
};

const compilerCache = new LRUCache<string, typeof solc>({
	max: 20, // Max versions to cache
	ttl: 1000 * 60 * 60, // 1 hour TTL
});

/**
 * Utility function to create a Solidity compiler instance with loadRemoteVersion functionality.
 * @param version Solidity compiler version to load.
 * @returns Solidity compiler instance with loadRemoteVersion capability.
 */
export const createSolidityCompiler = async (
	version: string,
	inputJson: any,
) => {
	// return new Promise((resolve, reject) => {
	// 	const child = fork(
	// 		path.resolve(__dirname, '../workers/compilerChild.ts'),
	// 	);

	// 	child.send({ version, input: inputJson });

	// 	child.on('message', (output) => {
	// 		console.log('output : ', output);
	// 		resolve('');

	// 		// error ? reject(new Error(error)) : resolve(output);
	// 	});

	// 	child.on('error', (e) => {
	// 		console.log('error from child : ', e);
	// 		reject;
	// 	});
	// 	child.on('exit', (code) => {
	// 		if (code !== 0)
	// 			reject(new Error(`Compiler process exited with code ${code}`));
	// 	});
	// });

	// if (cached) return cached;

	// Load the specified Solidity compiler version remotely
	const compiler: any = await util.promisify(solc.loadRemoteVersion)(
		version,
	);
	compilerCache.set(version, compiler);

	const used: any = process.memoryUsage();
	console.log('Inside createSolidityCompiler : ');
	for (const key in used) {
		console.log(
			`${key} ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`,
		);
	}

	if (!compiler) {
		return new ReturnedResponse(
			`Failed to load Solidity compiler ${version}.`,
		);
	}
	const output = compiler.compile(inputJson);
	console.log('output : ', output);
	
	// Return the compiler instance
	return output;
};

export const getOpcodes = async (bytecode: string) => {
	try {
		const evm = new EVM(bytecode);
		const opcodes: any = evm.getOpcodes();
		const opcodeNames = opcodes.map((opcode: any) => opcode?.name);
		return new ReturnedResponse('', opcodeNames);
	} catch (err) {
		console.log('Error in getOpcodes', err);

		return new ReturnedResponse('', [], new ReturnedError(err));
	}
};

// Function to check if two arrays are identical
export const isArraysAreIdentical = (arr1: any, arr2: any) => {
	// Check if arrays have the same length
	if (arr1.length !== arr2.length) return false;

	// Check each corresponding element
	for (let i = 0; i < arr1.length; i++) {
		if (arr1[i] !== arr2[i]) {
			return false;
		}
	}

	// If all elements match, return true
	return true;
};
