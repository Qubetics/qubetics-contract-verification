import web3Helper from '../../helper/web3.helper';
import { SourceCodePayload } from '../../interfaces/index';
import {
	COMPILATION_TYPE,
	ERROR_CODES,
	ERROR_MESSAGES,
	RABBITMQ_QUEUES,
	TABLE_NAME,
	VERIFICATION_TYPE,
} from '../../constant/constants';
import { databaseService, rabbitMqService } from '../../service/index';
import {
	convertToStandardJson,
	createSolidityCompiler,
	filesToCompilerJson,
	matchContractDetails,
} from '../../helper/utility.helper';
import { updateRecord } from '../../helper/crud.helper';
import { ReturnedError, ReturnedResponse } from '../../data classes';
import amqp from 'amqplib';
import logger from '../../lib/logger';
import rabbitmqService from '../../service/rabbitmq.service';
import dbService from '../../service/db.service';

class ContractConsumers {
	/**
	 * Compile the contracts standard-json-input
	 * @param standardJsonInput
	 * @param compilerVersion
	 * @returns
	 */
	compileContract = async (
		standardJsonInput: string,
		compilerVersion: string,
	) => {
		try {
			const solc = await createSolidityCompiler(compilerVersion);
			const compiled = JSON.parse(solc.compile(standardJsonInput));
			let compilationErrorsAndWarnings: {
				errors: any[];
				warnings: any[];
			} = { errors: [], warnings: [] };

			// if contract compilation has error then parse the error and sent them back to user
			if (!compiled?.contracts || compiled?.errors) {
				compiled?.errors.forEach((errorItem: any) => {
					if (errorItem.type === 'Warning') {
						compilationErrorsAndWarnings.warnings.push(errorItem);
					} else {
						compilationErrorsAndWarnings.errors.push(errorItem);
					}
				});
			}

			// extract the contract for current single filr
			const contracts: any = [];
			let abis: any = [];
			for (const key in compiled?.contracts) {
				let compiledContract = compiled?.contracts[key];
				if (!compiledContract)
					throw new Error(ERROR_MESSAGES.COMPILED_CONTRACT_NOT_FOUND);

				for (let contractName of Object.keys(compiledContract)) {
					const contract = compiledContract[contractName];

					if (!contract) continue;
					const abi = contract.abi;
					if (abi.length) abis.push(abi);
					const bytecode = contract.evm.bytecode.object;
					const deployedBytecode = contract.evm.deployedBytecode;
					const deployedByteCode = deployedBytecode.object;
					const contractDetails = {
						contractName,
						abi,
						deployedByteCode,
						bytecode,
						// needed to mask immutables / library links during bytecode matching
						immutableReferences:
							deployedBytecode.immutableReferences,
						linkReferences: deployedBytecode.linkReferences,
					};
					contracts.push(contractDetails);
				}
			}

			// write the compiled output to standard-out.json file
			// if compiled again previous changes is over writed
			return new ReturnedResponse('', {
				contracts,
				abis,
				compilationErrorsAndWarnings,
			});
		} catch (err: any) {
			console.log('Error while compiling contract:', err);
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.CONTRACT_COMPILATION),
			);
		}
	};

	/**
	 * verify contract
	 * @param data
	 * @returns
	 */
	verifyContract = async (data: SourceCodePayload) => {
		try {
			let soliditySources = null;
			let constructorArray: any = [];
			const files = data.files ? data.files : [];
			let contractAddress: string = data.contractaddress || '';
			if (!contractAddress) return new ReturnedResponse('');
			const contractDetails =
				await dbService.prisma.contractVerification.findUnique({
					where: { contractAddress },
				});
			if (!contractDetails) return new ReturnedResponse('');

			// convert the single flaten and multiple solidity files to compiler source json
			if (contractDetails.codeformat === COMPILATION_TYPE.MULTI_FILE) {
				soliditySources = filesToCompilerJson(files);
			} else if (
				contractDetails.codeformat === COMPILATION_TYPE.SINGLE_FILE
			) {
				soliditySources = filesToCompilerJson(
					[
						{
							buffer: contractDetails.sourceCode,
							originalname: contractDetails.contractname
								? `${contractDetails.contractname}.sol`
								: 'contract.sol',
						},
					],
					true,
				);
			}

			const solidityJsonInput =
				contractDetails.codeformat ===
				COMPILATION_TYPE.JSON_STANDARD_INPUT
					? contractDetails.sourceCode
					: convertToStandardJson(
							soliditySources,
							!!Number(contractDetails.optimizationUsed),
							Number(contractDetails.runs) || 200,
							contractDetails.evmVersion,
						).data;

			if (!solidityJsonInput)
				throw new Error('Failed to build standard JSON input from source');

			const compileContracts = await this.compileContract(
				solidityJsonInput,
				contractDetails.compilerversion,
			);

			if (compileContracts.error)
				throw new Error('Error while compiling');

			// Upgradeable contracts: the submitted source is the logic/implementation
			// contract, but the given address may be the proxy (whose on-chain code is
			// just the tiny proxy stub). Resolve the implementation and match the source
			// against it — this mirrors what hardhat-upgrades does under the hood.
			let bytecodeAddress = contractAddress;
			let implementationAddress = '';
			let proxyName = '';
			const resolvedImpl =
				await web3Helper.getImplementationAddress(contractAddress);
			if (
				resolvedImpl &&
				resolvedImpl.toLowerCase() !== contractAddress.toLowerCase()
			) {
				implementationAddress = resolvedImpl;
				bytecodeAddress = resolvedImpl;
				// The submitted source is the implementation's, so its contract
				// name is NOT the proxy's name. Derive the proxy's own name from
				// its on-chain bytecode signature so proxy and implementation
				// records don't collapse to the same name.
				proxyName =
					(await web3Helper.detectProxyType(contractAddress)) || 'Proxy';
			}

			const deployedByteCodeRes =
				await web3Helper.getCode(bytecodeAddress);

			if (deployedByteCodeRes.error || !deployedByteCodeRes.data?.byteCode)
				throw new Error(
					deployedByteCodeRes.formattedMessage ||
						'Failed to fetch deployed bytecode from chain',
				);

			const deployedBytecodeHex = deployedByteCodeRes.data.byteCode;

			const verified: any = await matchContractDetails(
				compileContracts.data.contracts,
				deployedBytecodeHex,
			);

			if (contractAddress && verified?.abi) {
				const deployedBytecode = deployedBytecodeHex;
				const abi =
					verified?.abi !== undefined &&
					typeof verified?.abi === 'string'
						? JSON.parse(verified?.abi)
						: verified?.abi;

				if (deployedBytecode && deployedBytecodeHex !== '0x' && abi) {
					const constructorArgsData = deployedBytecode.slice(10);
					const constructors = abi.filter(
						(item: any) => item.type === 'constructor',
					);

					for (const constructorItem of constructors) {
						const constructorInputs = constructorItem.inputs;
						if (constructorInputs) {
							const decodedConstructorArgs =
								await web3Helper.decodeParam(
									constructorInputs,
									constructorArgsData,
								);
							let constructorArgs = decodedConstructorArgs.data
								? decodedConstructorArgs.data
								: null;
							if (
								constructorArgs &&
								typeof constructorArgs === 'object'
							) {
								constructorArgs = JSON.parse(
									JSON.stringify(
										constructorArgs,
										(key: any, value: any) => {
											if (typeof value === 'bigint') {
												return value.toString();
											}
											return value;
										},
									),
								);
							}

							constructorArray.push(
								JSON.stringify({
									constructorInputs,
									constructorArgs,
								}),
							);
						} else {
							logger.error(
								ERROR_MESSAGES.CONSTRUCTOR_INPUT_NOT_FOUND,
								constructorItem,
							);
						}
					}
				}
			}

			let verifiedRecord: any = {
				sourceCode: solidityJsonInput,
				// For a proxy the bytecode match runs against the implementation,
				// so verified.contractName is the *implementation's* name — reusing
				// it (or the submitted name, which is also the implementation's)
				// would make the proxy and implementation records share a name.
				// Use the proxy type detected from the proxy's own bytecode instead.
				contractname: implementationAddress
					? proxyName
					: verified.contractName !== ''
						? verified.contractName
						: contractDetails.contractname,
				verificationType: verified?.fullyVerified
					? VERIFICATION_TYPE.FULLY_VERIFIED
					: verified?.verified
						? VERIFICATION_TYPE.PARTIAL_VERIFIED
						: VERIFICATION_TYPE.REJECTED,
				byteCode: verified.bytecode,
				constructorArguements: constructorArray,
				creationCode: verified.creationCode,
				abi: verified.abi,
				abis: compileContracts.data.abis
					? JSON.stringify(compileContracts.data.abis)
					: '',
				errors: compileContracts.data.compilationErrorsAndWarnings,
			};

			// Record the resolved implementation so the proxy is linked to its logic contract.
			if (implementationAddress)
				verifiedRecord.implementation = implementationAddress;

			await updateRecord(
				TABLE_NAME.CONTRACT_VERIFICATION,
				verifiedRecord,
				{ contractAddress },
			);

			rabbitmqService.enqueueData(
				RABBITMQ_QUEUES.TRANSACTION_LOGS_DECODING,
				JSON.stringify({ contractAddress }),
			);

			if (
				verifiedRecord.verificationType >=
				VERIFICATION_TYPE.PARTIAL_VERIFIED
			) {
				let bytecodeHash;
				let contracts: any = [];
				// const schema = environment.schema
				// 	? environment.schema
				// 	: 'public';
				const schema = 'public';
				// try {
				// 	const query = `SELECT "Contracts"."bytecodeHash" FROM ${schema}."Contracts" WHERE "Contracts"."address" = '${contractAddress}'`;
				// 	const result: any[] =
				// 		await databaseService.prisma.$queryRawUnsafe(query);
				// 	if (result.length) bytecodeHash = result[0].bytecodeHash;
				// 	const conQuery = `SELECT address FROM ${schema}."Contracts" WHERE "Contracts"."bytecodeHash" = '${bytecodeHash}' AND "Contracts"."address" != '${contractAddress}'`;
				// 	const conResult: any[] =
				// 		await databaseService.prisma.$queryRawUnsafe(conQuery);
				// 	if (conResult?.length) contracts = conResult;
				// } catch (err: any) {
				// 	try {
				// 		const query = `SELECT "Contracts"."bytecodeHash" FROM ${schema}."Contracts" WHERE "Contracts"."address" = '${contractAddress}'`;
				// 		const result: any[] =
				// 			await databaseService.prisma.$queryRawUnsafe(query);
				// 		if (result.length)
				// 			bytecodeHash = result[0].bytecodeHash;
				// 		const conQuery = `SELECT address FROM ${schema}."Contracts" WHERE "Contracts"."bytecodeHash" = '${bytecodeHash}' AND "Contracts"."address" != '${contractAddress}'`;
				// 		const conResult: any[] =
				// 			await databaseService.prisma.$queryRawUnsafe(
				// 				conQuery,
				// 			);
				// 		if (conResult?.length) contracts = conResult;
				// 	} catch (err: any) {}
				// }

				try {
					const query = `SELECT "Contracts"."bytecodeHash" FROM ${schema}."Contracts" WHERE "Contracts"."address" = '${contractAddress}'`;
					const result: any[] =
						await databaseService.prisma.$queryRawUnsafe(query);

					if (!result.length) {
						contracts = [];
					}

					const bytecodeHash = result[0].bytecodeHash;

					const conQuery = `SELECT address FROM ${schema}."Contracts" WHERE "Contracts"."bytecodeHash" = '${bytecodeHash}' AND "Contracts"."address" != '${contractAddress}'`;
					const conResult: any[] =
						await databaseService.prisma.$queryRawUnsafe(conQuery);

					contracts = conResult.length ? conResult : [];
				} catch (err) {
					console.error('Error fetching contracts by bytecode:', err);
					contracts = [];
				}

				let contractVerification: any =
					await databaseService.prisma.contractVerification.findUnique(
						{
							where: {
								contractAddress,
								verificationType: {
									in: [
										VERIFICATION_TYPE.FULLY_VERIFIED,
										VERIFICATION_TYPE.PARTIAL_VERIFIED,
									],
								},
							},
						},
					);

				if (contractVerification) {
					delete contractVerification.id;
					delete contractVerification.contractAddress;
					delete contractVerification.implementation;
					delete contractVerification.iconUrl;
				}
				for (let c = 0; c < contracts.length; c++) {
					contractVerification.contractAddress = contracts[c].address;
					await databaseService.prisma.contractVerification.upsert({
						where: { contractAddress: contracts[c].address }, // Check if the product with id: 1 exists
						update: contractVerification,
						create: contractVerification,
					});

					rabbitmqService.enqueueData(
						RABBITMQ_QUEUES.TRANSACTION_LOGS_DECODING,
						JSON.stringify({
							contractAddress: contracts[c].address,
						}),
					);
				}
			}

			return new ReturnedResponse('', verifiedRecord);
		} catch (err: any) {
			logger.error(ERROR_MESSAGES.CONTRACT_VERIFICATION, err);
			if (data.contractaddress) {
				await updateRecord(
					TABLE_NAME.CONTRACT_VERIFICATION,
					{
						verificationType: VERIFICATION_TYPE.REJECTED,
						errors: {
							errors: [{ message: err?.message || String(err) }],
							warnings: [],
						},
					},
					{ contractAddress: data.contractaddress },
				);
			}
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.CONTRACT_VERIFICATION),
			);
		}
	};

	/**
	 * verify consumer
	 */
	verifyContractConsumer = async (message: amqp.Message | null) => {
		try {
			// return if message is undef or null
			if (!message) return;

			let content = message.content.toString('utf-8');

			const data: SourceCodePayload =
				content !== undefined && typeof content === 'string'
					? JSON.parse(content)
					: content;

			const verificationResult = await this.verifyContract(data);
			if (verificationResult.error) {
				rabbitMqService.ackMessage(message);
				throw verificationResult.error;
			}

			// acknowledge the rabbimq server
			rabbitMqService.ackMessage(message);
		} catch (err) {
			console.log('Error while verifyContractConsumer:', err);
			console.error(ERROR_MESSAGES.CONTRACT_PROCESSING, err);
		}
	};
}

export default new ContractConsumers();
