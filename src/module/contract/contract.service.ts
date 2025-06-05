import web3Helper from '../../helper/web3.helper';
import { convertBigIntToNumber, getAddress } from '../../helper/common.helper';
import { IResponse, SourceCodePayload } from '../../interfaces/index';
import {
	RES_MSG,
	STATUS_CODES,
	TABLE_NAME,
	RABBITMQ_QUEUES,
	VERIFICATION_TYPE,
	CONTRACT_VERIFICATION_STATUS,
	TOOLS_VERIFICATION_STATUS_CODE,
} from '../../constant/constants';
import { databaseService, rabbitMqService } from '../../service/index';
import { saveRecord, updateRecord } from '../../helper/crud.helper';
import { HttpResponse } from '../../data classes';

class ContractService {
	/**
	 * Retrieves contract details from the database based on the provided contract address.
	 * @param contractAddress - The address of the contract.
	 * @returns Promise<IResponse> - Response containing contract details.
	 */
	async getContractDetail(contractAddress: string): Promise<IResponse> {
		try {
			const address = await getAddress(contractAddress);
			let contract: any = null;
			// const schema = environment.schema ? environment.schema : 'public';
			const schema = 'public';

			try {
				const query = `SELECT bytecode FROM ${schema}."Contracts" WHERE "address" = '${address}'`;
				const result: any[] =
					await databaseService.prisma.$queryRawUnsafe(query);
				if (result?.length) contract = result[0];
			} catch (err: any) {
				try {
					const query = `SELECT bytecode FROM ${schema}."Contracts" WHERE "contractAddress" = '${address}'`;
					const result: any[] =
						await databaseService.prisma.$queryRawUnsafe(query);
					if (result?.length) contract = result[0];
				} catch (err: any) {}
			}

			// check if any contract found with following contract address
			if (!contract) {
				return new HttpResponse(
					false,
					RES_MSG.CONTRACT_NOT_FOUND,
					null,
					STATUS_CODES.NOTFOUND,
				);
			}

			const contractVerificationDetails: any =
				await databaseService.prisma.contractVerification.findUnique({
					where: {
						contractAddress: address,
					},
				});

			const data = {
				...convertBigIntToNumber(contractVerificationDetails),
				bytecode: contract.bytecode,
			};

			if (
				contractVerificationDetails &&
				contractVerificationDetails?.verificationType > 0
			) {
				data.sourcecode =
					contractVerificationDetails?.sourceCode !== undefined &&
					typeof contractVerificationDetails?.sourceCode === 'string'
						? JSON.parse(contractVerificationDetails?.sourceCode)
						: contractVerificationDetails?.sourceCode;
			}

			return new HttpResponse(
				false,
				RES_MSG.CONTRACT,
				data,
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			console.log('error: ', err);
			return new HttpResponse(true, err.msg || RES_MSG.ERROR);
		}
	}

	async getContractStatus(contractAddress: string): Promise<IResponse> {
		try {
			const address = await getAddress(contractAddress);

			const contractVerificationDetails =
				await databaseService.prisma.contractVerification.findUnique({
					where: {
						contractAddress: address,
					},
				});

			if (!contractVerificationDetails) {
				return new HttpResponse(
					false,
					RES_MSG.CONTRACT_NOT_FOUND,
					null,
					STATUS_CODES.SUCCESS,
				);
			}
			if (
				contractVerificationDetails &&
				(contractVerificationDetails?.verificationType ===
					VERIFICATION_TYPE.FULLY_VERIFIED ||
					contractVerificationDetails?.verificationType ===
						VERIFICATION_TYPE.PARTIAL_VERIFIED)
			) {
				return new HttpResponse(
					false,
					RES_MSG.CONTRACT_ALREADY_VERIFIED_ERROR,
					null,
					STATUS_CODES.BADREQUEST,
				);
			}

			return new HttpResponse(
				false,
				RES_MSG.CONTRACT,
				contractVerificationDetails,
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			console.log(err, 'error while fetching user detail');
			return new HttpResponse(true, err.msg || RES_MSG.ERROR);
		}
	}
	/**
	 * Retrieves ABI (Application Binary Interface) of a contract from the database based on the provided contract address.
	 * @param contractAddress - The address of the contract.
	 * @returns Promise<IResponse> - Response containing contract ABI.
	 */
	async getAbi(contractAddress: string): Promise<IResponse> {
		try {
			const address: any = await getAddress(contractAddress);
			let contractImplementation;
			const contract =
				await databaseService.prisma.contractVerification.findUnique({
					where: {
						contractAddress: address,
						verificationType: {
							in: [
								VERIFICATION_TYPE.PARTIAL_VERIFIED,
								VERIFICATION_TYPE.FULLY_VERIFIED,
							],
						},
					},
					select: {
						abi: true,
						implementation: true,
					},
				});

			if (!contract)
				return new HttpResponse(
					false,
					RES_MSG.ABI_ERROR,
					null,
					STATUS_CODES.SUCCESS,
				);

			if (contract?.implementation) {
				const implementationAddress: any = await getAddress(
					contract.implementation,
				);
				contractImplementation =
					await databaseService.prisma.contractVerification.findUnique(
						{
							where: {
								contractAddress: implementationAddress,
								verificationType: {
									in: [
										VERIFICATION_TYPE.PARTIAL_VERIFIED,
										VERIFICATION_TYPE.FULLY_VERIFIED,
									],
								},
							},
							select: {
								abi: true,
							},
						},
					);
			}

			return new HttpResponse(
				false,
				RES_MSG.ABI,
				{
					abi: convertBigIntToNumber(contract?.abi),
					proxyABI: convertBigIntToNumber(
						contractImplementation?.abi,
					),
				},
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			return new HttpResponse(true);
		}
	}
	/**
	 * Retrieves contract details for a contract based on the provided contract address.
	 * @param contractAddress - The address of the contract.
	 * @returns Promise<IResponse> - Response containing contract details.
	 */
	async getVerifiedContract(contractAddress: string): Promise<IResponse> {
		try {
			const address: any = await getAddress(contractAddress);

			const contractDetails =
				await databaseService.prisma.contractVerification.findUnique({
					where: {
						contractAddress: address,
					},
				});

			if (!contractDetails)
				return new HttpResponse(
					false,
					RES_MSG.CONTRACT_NOT_FOUND,
					{ message: RES_MSG.CONTRACT_NOT_FOUND },
					STATUS_CODES.SUCCESS,
				);

			const verificationType = contractDetails.verificationType;
			const contractVerificationStatus =
				verificationType === VERIFICATION_TYPE.REJECTED
					? CONTRACT_VERIFICATION_STATUS.REJECTED
					: verificationType === VERIFICATION_TYPE.FULLY_VERIFIED ||
						  verificationType ===
								VERIFICATION_TYPE.PARTIAL_VERIFIED
						? CONTRACT_VERIFICATION_STATUS.VERIFIED
						: CONTRACT_VERIFICATION_STATUS.PENDING;

			return new HttpResponse(
				false,
				RES_MSG.CONTRACT,
				{
					result: contractVerificationStatus,
					status: TOOLS_VERIFICATION_STATUS_CODE.SUCCESS,
				},
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			return new HttpResponse(false, err.msg);
		}
	}

	/**
	 * Retrieves verified contracts created by a specific user, based on the provided wallet address.
	 * @param data - Object containing pagination details and user wallet address.
	 * @param data.page - The page number for pagination.
	 * @param data.limit - The maximum number of contracts to fetch per page.
	 * @param data.walletAddress - The wallet address of the user.
	 * @returns Promise<IResponse> - Response containing verified contracts created by the user.
	 */
	// async getVerifiedContractByUser(data: {
	// 	page: number;
	// 	limit: number;
	// 	walletAddress: string;
	// }): Promise<IResponse> {
	// 	try {
	// 		const userAddress: any = await getAddress(data.walletAddress);

	// 		const contractAddresses =
	// 			await databaseService.prisma.transactions.findMany({
	// 				orderBy: {
	// 					createdAt: 'desc',
	// 				},
	// 				where: {
	// 					fromAddress: userAddress,
	// 					type: TRANSACTION_TYPE.CONTRACT_CREATION,
	// 				},
	// 				select: {
	// 					contractAddress: true,
	// 				},
	// 				distinct: ['contractAddress'],
	// 			});

	// 		if (!contractAddresses.length)
	// 			return new HttpResponse(
	// 				false,
	// 				RES_MSG.CONTRACT_NOT_FOUND,
	// 				null,
	// 				STATUS_CODES.NOTFOUND,
	// 			);

	// 		const [verifiedContracts, verifiedContractsCount] =
	// 			await databaseService.prisma.$transaction([
	// 				databaseService.prisma.contractVerification.findMany({
	// 					skip: (data.page - 1) * data.limit,
	// 					take: data.limit,
	// 					orderBy: {
	// 						createdAt: 'desc',
	// 					},
	// 					where: {
	// 						contractAddress: {
	// 							in: contractAddresses.map(
	// 								(transaction: any) =>
	// 									transaction.contractAddress,
	// 							),
	// 						},
	// 						verificationType:
	// 							VERIFICATION_TYPE.PARTIAL_VERIFIED ||
	// 							VERIFICATION_TYPE.FULLY_VERIFIED,
	// 					},
	// 				}),
	// 				databaseService.prisma.contractVerification.count({
	// 					where: {
	// 						contractAddress: {
	// 							in: contractAddresses.map(
	// 								(transaction: any) =>
	// 									transaction.contractAddress,
	// 							),
	// 						},
	// 						verificationType:
	// 							VERIFICATION_TYPE.PARTIAL_VERIFIED ||
	// 							VERIFICATION_TYPE.FULLY_VERIFIED,
	// 					},
	// 				}),
	// 			]);
	// 		if (!verifiedContracts.length)
	// 			return new HttpResponse(
	// 				false,
	// 				RES_MSG.VERIFY_CONTRACT_FETCH_ERROR,
	// 				null,
	// 				STATUS_CODES.NOTFOUND,
	// 			);

	// 		return new HttpResponse(
	// 			false,
	// 			RES_MSG.VERIFY_CONTRACT_FETCH_SUCCESS,
	// 			{
	// 				count: verifiedContractsCount,
	// 				contracts: convertBigIntToNumber(verifiedContracts),
	// 			},
	// 			STATUS_CODES.SUCCESS,
	// 		);
	// 	} catch (err: any) {
	// 		return new HttpResponse(true);
	// 	}
	// }
	/**
	 * Retrieves a list of top verified contracts based on the provided pagination details.
	 * @param data - Object containing pagination details.
	 * @param data.page - The page number for pagination.
	 * @param data.limit - The maximum number of contracts to fetch per page.
	 * @returns Promise<IResponse> - Response containing top verified contracts.
	 */
	async getTopVerifiedContracts(data: {
		page: number;
		limit: number;
	}): Promise<IResponse> {
		try {
			const topVerifiedContracts =
				await databaseService.prisma.contractVerification.findMany({
					where: {
						verificationType: {
							in: [
								VERIFICATION_TYPE.PARTIAL_VERIFIED,
								VERIFICATION_TYPE.FULLY_VERIFIED,
							],
						},
					},
					skip: (data.page - 1) * data.limit,
					take: data.limit,
					orderBy: {
						createdAt: 'desc',
					},
				});
			return new HttpResponse(
				false,
				RES_MSG.CONTRACT,
				convertBigIntToNumber(topVerifiedContracts),
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			return new HttpResponse(true);
		}
	}

	/**
	 * Retrieves widget data containing the count of verified contracts.
	 * @returns Promise<IResponse> - Response containing widget data.
	 */
	async getWidget(): Promise<IResponse> {
		try {
			const verifiedContractCount =
				await databaseService.prisma.contractVerification.count({
					where: {
						verificationType: {
							in: [
								VERIFICATION_TYPE.PARTIAL_VERIFIED,
								VERIFICATION_TYPE.FULLY_VERIFIED,
							],
						},
					},
				});
			return new HttpResponse(
				false,
				RES_MSG.WIDGET,
				verifiedContractCount,
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			return new HttpResponse(true);
		}
	}

	/**
	 * verify contract
	 * @param data
	 * @returns
	 */
	async verify(data: SourceCodePayload) {
		try {
			const formattedAddress = web3Helper.getCheckSumAddress(
				data.contractaddress,
			);

			if (formattedAddress.error) {
				return new HttpResponse(
					false,
					formattedAddress.formattedMessage,
					null,
					formattedAddress.httpStatusCode,
				);
			}
			let contractAddress = formattedAddress.data.address;
			let contractVerificationDetails =
				await this.getContractDetail(contractAddress);
			if (contractVerificationDetails.status != STATUS_CODES.SUCCESS) {
				return contractVerificationDetails;
			}

			//check if already verified
			let contractPendingCondition =
				contractVerificationDetails &&
				contractVerificationDetails.data &&
				contractVerificationDetails.data.verificationType &&
				contractVerificationDetails.data.verificationType ===
					VERIFICATION_TYPE.PENDING;
			if (contractPendingCondition) {
				return new HttpResponse(
					false,
					RES_MSG.CONTRACT_VERIFICATION_PENDING,
					null,
					STATUS_CODES.BADREQUEST,
				);
			}

			let contractCondition =
				contractVerificationDetails &&
				contractVerificationDetails.data &&
				contractVerificationDetails.data.verificationType &&
				contractVerificationDetails.data.verificationType !==
					VERIFICATION_TYPE.REJECTED;
			if (contractCondition) {
				return new HttpResponse(
					false,
					RES_MSG.CONTRACT_ALREADY_VERIFIED_ERROR,
					null,
					STATUS_CODES.BADREQUEST,
				);
			}

			// check if the contract exist ot not
			const deployedByteCode = await web3Helper.getCode(contractAddress);

			if (deployedByteCode.httpStatusCode) {
				return new HttpResponse(
					false,
					deployedByteCode.formattedMessage,
					null,
					deployedByteCode.httpStatusCode,
				);
			}

			const contractDetails = {
				contractAddress,
				codeformat: data.codeformat,
				compilerversion: data.compilerversion,
				optimizationUsed: !!Number(data.optimizationUsed),
				runs: Number(data.runs) || 200,
				licenseType: data.licenseType ? Number(data.licenseType) : 0,
				evmVersion: data.evmVersion ? data.evmVersion : 'default',
				constructorArguements: data.constructorArguements || [],
				verificationType: VERIFICATION_TYPE.PENDING,
				abi: data?.abi ?? '',
				errors: { errors: [], warnings: [] },
				sourceCode: data.sourceCode,
			};

			await saveRecord(TABLE_NAME.CONTRACT_VERIFICATION, contractDetails);

			// const contractDetailsRaw = {
			// 	...data,
			// 	contractaddress: contractAddress,
			// };

			// insert the contract data for verification data into queue for further processing
			rabbitMqService.enqueueData(
				RABBITMQ_QUEUES.CONTRACT_VERIFICATION_QUEUE,
				JSON.stringify({
					contractaddress: contractAddress,
					files: data.files,
				}),
			);

			return new HttpResponse(
				false,
				RES_MSG.CONTRACT_VERIFICATION_UNDER_PROCESS,
				{
					result: contractAddress,
					status: TOOLS_VERIFICATION_STATUS_CODE.SUCCESS,
				},
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			console.log('Error in verify', err);
			return new HttpResponse(true);
		}
	}
}

export default new ContractService();
