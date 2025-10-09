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
import { deleteRecord, updateRecord } from '../../helper/crud.helper';
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
			let compiledOutput: string | null = await createSolidityCompiler(
				compilerVersion,
				standardJsonInput,
			);
			let compiled = JSON.parse(compiledOutput);
			// console.log("solc.compile(standardJsonInput) : ", solc.compile(standardJsonInput));

			// let compiled = JSON.parse(solc.compile(standardJsonInput));
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
					const deployedByteCode =
						contract.evm.deployedBytecode.object;
					const contractDetails = {
						contractName,
						abi,
						deployedByteCode,
						bytecode,
					};
					contracts.push(contractDetails);
				}
			}
			compiled = null;
			compiledOutput = null;
			// solc = null;

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
			const compileContracts = await this.compileContract(
				solidityJsonInput,
				contractDetails.compilerversion,
			);

			if (compileContracts.error)
				throw new Error('Error while compiling');

			const deployedByteCode = await web3Helper.getCode(contractAddress);

			const verified: any = matchContractDetails(
				compileContracts.data.contracts,
				deployedByteCode.data.byteCode,
			);

			if (contractAddress && verified?.abi) {
				const code = await web3Helper.getCode(contractAddress);
				const deployedBytecode = code?.data?.byteCode ?? '';
				const abi =
					verified?.abi !== undefined &&
					typeof verified?.abi === 'string'
						? JSON.parse(verified?.abi)
						: verified?.abi;

				if (
					deployedBytecode &&
					deployedByteCode.data.byteCode !== '0x' &&
					abi
				) {
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
										(value: any, key: any) => {
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

			let verifiedRecord = {
				sourceCode: solidityJsonInput,
				contractname:
					verified.contractName !== ''
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

			// await updateRecord(
			// 	TABLE_NAME.CONTRACT_VERIFICATION,
			// 	verifiedRecord,
			// 	{ contractAddress },
			// );

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
			soliditySources = null;

			console.log('Verify Memory ...... ');

			const used: any = process.memoryUsage();
			for (let key in used) {
				console.log(
					`${key} ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`,
				);
			}

			// console.log(process.memoryUsage().rss / 1024 / 1024, 'MB');

			return new ReturnedResponse('', verifiedRecord);
		} catch (err: any) {
			logger.error(ERROR_MESSAGES.CONTRACT_VERIFICATION, err);
			await deleteRecord(TABLE_NAME.CONTRACT_VERIFICATION, {
				contractAddress: data.contractaddress,
			});
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
