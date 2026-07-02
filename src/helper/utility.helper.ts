/* eslint-disable */
import util from 'util';
const { EVM } = require('evm');
// @ts-ignore
import solc from 'solc';
import { ReturnedError, ReturnedResponse } from '../data classes';
import { ERROR_MESSAGES, RES_MSG } from '../constant/constants';

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

// Reads the CBOR length from the last 2 bytes of deployed bytecode and splits it.
// Solidity appends: [runtime_code][cbor_metadata][2-byte cbor_length]
const splitBytecodeMetadata = (
	bytecode: string,
): { metaDataHash: string; runtimeCode: string } => {
	if (bytecode.length < 8)
		return { metaDataHash: '', runtimeCode: bytecode };
	const cborLength = parseInt(bytecode.slice(-4), 16);
	const totalMetaHexLen = (cborLength + 2) * 2;
	if (totalMetaHexLen >= bytecode.length || totalMetaHexLen < 10)
		return { metaDataHash: '', runtimeCode: bytecode };
	return {
		metaDataHash: bytecode.slice(-totalMetaHexLen),
		runtimeCode: bytecode.slice(0, -totalMetaHexLen),
	};
};

// Zero out the given byte ranges (immutables / unlinked library placeholders) in a
// hex string. On-chain bytecode bakes in immutable values and library addresses that
// the compiler leaves as zeros/placeholders, so masking both sides lets them compare
// equal — this is exactly how Hardhat/Sourcify normalise before matching.
const maskByteRanges = (
	hex: string,
	ranges: { start: number; length: number }[],
): string => {
	if (!ranges.length) return hex;
	const chars = hex.split('');
	for (const { start, length } of ranges) {
		const from = start * 2;
		const to = (start + length) * 2;
		for (let i = from; i < to && i < chars.length; i++) chars[i] = '0';
	}
	return chars.join('');
};

// Flatten solc's immutableReferences + linkReferences maps into a flat list of
// { start, length } byte ranges (offsets are relative to the deployed bytecode).
const collectMaskRanges = (
	immutableReferences: any,
	linkReferences: any,
): { start: number; length: number }[] => {
	const ranges: { start: number; length: number }[] = [];
	if (immutableReferences && typeof immutableReferences === 'object')
		for (const key of Object.keys(immutableReferences))
			for (const r of immutableReferences[key] || []) ranges.push(r);
	if (linkReferences && typeof linkReferences === 'object')
		for (const file of Object.keys(linkReferences))
			for (const lib of Object.keys(linkReferences[file] || {}))
				for (const r of linkReferences[file][lib] || []) ranges.push(r);
	return ranges;
};

const applyMatch = (matched: any, contract: any) => {
	matched.contractName = contract.contractName;
	matched.fullyQualifiedName = contract.fullyQualifiedName || '';
	matched.verified = true;
	matched.abi = JSON.stringify(contract?.abi);
	matched.bytecode = contract?.deployedByteCode;
	matched.creationCode = contract?.bytecode;
};

// Does a compiled contract candidate correspond to the user-declared name?
// The Etherscan-style API expects a fully-qualified `path:Name` for
// standard-json submissions, but we also accept a bare `Name`. Comparison is
// case-insensitive and matches against BOTH the fully-qualified and bare name
// so `contracts/X.sol:CAPSolverPool`, `CAPSolverPool` all resolve the same.
const nameMatches = (candidate: any, preferredName: string): boolean => {
	if (!preferredName) return false;
	const p = preferredName.trim().toLowerCase();
	if (!p) return false;
	const fqn = (candidate.fullyQualifiedName || '').toLowerCase();
	const bare = (candidate.contractName || '').toLowerCase();
	const pBare = p.includes(':') ? p.split(':').pop()!.trim() : p;
	return p === fqn || p === bare || pBare === bare;
};

export const matchContractDetails = async (
	contracts: any,
	deployedByteCode: string,
	// The user-declared contract name (`path:Name` or bare `Name`). Used ONLY to
	// disambiguate when the bytecode alone matches more than one compiled contract
	// (e.g. OpenZeppelin proxies share runtime). It never overrides the bytecode:
	// a declared name that matches nothing on-chain is ignored, so we can never
	// assign a name whose bytecode doesn't actually match.
	preferredName: string = '',
) => {
	try {
		const onChain = deployedByteCode.trim().toLowerCase();

		const matchedContract = {
			contractName: '',
			fullyQualifiedName: '',
			verified: false,
			fullyVerified: false,
			// True when the bytecode matched >1 contract and the declared name did
			// NOT resolve which one — callers should treat this as "cannot name
			// confidently" (e.g. skip sibling auto-verification) rather than guess.
			ambiguous: false,
			candidates: [] as string[],
			abi: '',
			bytecode: '',
			creationCode: '',
		};

		// Bucket every compiled contract into full vs partial matches instead of
		// returning on the first hit. A full (metadata-inclusive) match uniquely
		// identifies the exact contract — including the right proxy name, since
		// each proxy's trailing CBOR metadata encodes its distinct compilationTarget.
		// Every OpenZeppelin proxy (CAPSolverPool, CAPIntentTransactions, ...)
		// compiles to the SAME runtime, so a partial (runtime-only) match is
		// inherently ambiguous and must be disambiguated deliberately, never by
		// "first in the list wins".
		const fullMatches: any[] = [];
		const partialMatches: any[] = [];

		for (const contract of contracts) {
			const compiled = (contract.deployedByteCode || '')
				.trim()
				.toLowerCase();
			if (!compiled) continue;

			// Neutralise immutables + library placeholders on both sides before comparing.
			const ranges = collectMaskRanges(
				contract.immutableReferences,
				contract.linkReferences,
			);
			const onChainMasked = maskByteRanges(onChain, ranges);
			const compiledMasked = maskByteRanges(compiled, ranges);

			// Full match: entire runtime bytecode (metadata included) is identical.
			if (onChainMasked === compiledMasked) {
				fullMatches.push(contract);
				continue;
			}

			// Partial match: identical once the trailing CBOR metadata is stripped.
			// Only the embedded source hash/settings differ — Hardhat/Sourcify treat
			// this as verified. A genuine runtime difference here is a real mismatch
			// and must NOT be collected.
			const { runtimeCode: compiledRuntime } =
				splitBytecodeMetadata(compiledMasked);
			const { runtimeCode: onChainRuntime } =
				splitBytecodeMetadata(onChainMasked);
			if (onChainRuntime === compiledRuntime) partialMatches.push(contract);
		}

		// Full matches are definitive and win over partials. Only fall back to the
		// partial pool when there is no full match at all.
		const pool = fullMatches.length ? fullMatches : partialMatches;
		const isFull = fullMatches.length > 0;
		if (!pool.length) return matchedContract; // genuine no-match → rejected

		matchedContract.candidates = pool.map(
			(c: any) => c.fullyQualifiedName || c.contractName,
		);

		let chosen: any;
		if (pool.length === 1) {
			// Unambiguous: exactly one contract matches the bytecode.
			chosen = pool[0];
		} else {
			// Ambiguous by bytecode (the shared-runtime proxy case). Resolve it with
			// the user-declared name, but only if that name is one of the matching
			// candidates. Otherwise flag ambiguity so callers don't mislabel.
			const preferred = pool.find((c: any) =>
				nameMatches(c, preferredName),
			);
			chosen = preferred || pool[0];
			matchedContract.ambiguous = !preferred;
		}

		applyMatch(matchedContract, chosen);
		matchedContract.fullyVerified = isFull;
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

/**
 * Utility function to create a Solidity compiler instance with loadRemoteVersion functionality.
 * @param version Solidity compiler version to load.
 * @returns Solidity compiler instance with loadRemoteVersion capability.
 */
export const createSolidityCompiler = async (version: string) => {
	// Load the specified Solidity compiler version remotely
	const compiler: any = await util.promisify(solc.loadRemoteVersion)(version);
	if (!compiler) {
		return new ReturnedResponse(
			`Failed to load Solidity compiler ${version}.`,
		);
	}
	// Return the compiler instance
	return compiler;
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
