/* eslint-disable */
import Web3 from 'web3';
import {
	BLOCKCHAIN_MSG,
	ERROR_CODES,
	ERROR_MESSAGES,
	RES_MSG,
	STATUS_CODES,
} from '../constant/constants';
import logger from '../lib/logger';
import { ReturnedError, ReturnedResponse } from '../data classes';
class Web3Helper {
	public web3: Web3;
	public static instance: Web3Helper;

	constructor() {
		if (!Web3Helper.instance) {
			// init the web3 instance
			this.web3 = new Web3(
				new Web3.providers.HttpProvider(environment.nodeLink),
			);
			this.run();
			Web3Helper.instance = this;
		}
		return Web3Helper.instance;
	}

	async run() {
		try {
			// Define a function to check the connection status
			const checkConnection = async () => {
				try {
					const isConnected = await this.web3.eth.net.isListening();
					return isConnected;
				} catch (error) {
					logger.error(BLOCKCHAIN_MSG.ERROR);
					return false; // Return false if an error occurs
				}
			};

			// Function to continuously check connection status with long-polling
			const checkConnectionLoop = async () => {
				try {
					while (true) {
						const isConnected = await checkConnection(); // Check the connection status
						if (isConnected) {
							logger.info(BLOCKCHAIN_MSG.BLOCKCHAIN_CONNECTED); // Log if the blockchain is connected
							break; // Exit the loop if the connection is established
						} else {
							logger.info(
								BLOCKCHAIN_MSG.BLOCKCHAIN_NOT_CONNECTED,
							); // Log if the blockchain is not connected
						}
						// Adjust the interval as needed (e.g., every 5 seconds)
						await new Promise((resolve) =>
							setTimeout(resolve, 1000),
						); // Wait for 1 second before the next check
					}
				} catch (error) {
					logger.error(BLOCKCHAIN_MSG.ERROR_LOOP);
				}
			};

			// Start the long-polling loop only if the connection is not initially established
			const initialConnectionStatus = await checkConnection();
			if (!initialConnectionStatus) {
				checkConnectionLoop();
			}

			return new ReturnedResponse(RES_MSG.RPC_NODE_REQ_SUCCESS);
		} catch (err) {
			return new ReturnedResponse(
				ERROR_MESSAGES.NODE_RPC_CONNECTION,
				null,
				new ReturnedError(err, ERROR_CODES.RPC_REQUEST),
			);
		}
	}

	getCheckSumAddress(address: string) {
		try {
			const sumAddress = this.web3.utils.toChecksumAddress(address);
			return new ReturnedResponse(BLOCKCHAIN_MSG.SUCCESS, {
				address: sumAddress,
			});
		} catch (err: any) {
			console.log('Error in getCheckSumAddress: ', err);
			return new ReturnedResponse(
				ERROR_MESSAGES.INVALID_CONTRACT_ADDRESS,
				address,
				new ReturnedError(err),
				STATUS_CODES.BADREQUEST,
			);
		}
	}

	// Method to get the balance of a given public key
	async getBalance(publicKey: string) {
		try {
			const balance = await this.web3.eth.getBalance(publicKey);
			return new ReturnedResponse('', balance);
		} catch (err) {
			return new ReturnedResponse(
				BLOCKCHAIN_MSG.GET_BALANCE_ERROR,
				null,
				new ReturnedError(err, ERROR_CODES.RPC_REQUEST),
			);
		}
	}

	// Method to get the code of a contract at a given address
	async getCode(contractAddress: string) {
		try {
			const deployedByteCode =
				await this.web3.eth.getCode(contractAddress);
			console.log(
				'RPC Node Link',
				`${environment.nodeLink}`,
				process.env.EVM_TENDERMENT_HTTP_HOST,
			);
			if (!deployedByteCode || deployedByteCode === '0x')
				return new ReturnedResponse(
					`${RES_MSG.BYTECODE_NOT_FOUND_ON_CHAIN} ${environment.nodeLink}`,
					null,
					null,
					404,
				);
			return new ReturnedResponse('', {
				byteCode: deployedByteCode?.slice(2),
			});
		} catch (err: any) {
			console.log('Error in getCode: ', err);
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.RPC_REQUEST),
			);
		}
	}

	// Method to get the code of a contract at a given address
	async decodeParam(constructorInputs: any, constructorArgsData: any) {
		try {
			const decodedConstructorArgs = this.web3.eth.abi.decodeParameters(
				constructorInputs,
				constructorArgsData,
			);
			return new ReturnedResponse('', {
				decodedConstructorArgs: decodedConstructorArgs,
			});
		} catch (err: any) {
			console.log('Error in decodeParam', err);
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.RPC_REQUEST),
			);
		}
	}

	// Method that allows to interact with smart contracts
	async getContract(abi: any, contractAddress: string) {
		try {
			const contract = new this.web3.eth.Contract(abi, contractAddress);

			if (!contract)
				return new ReturnedResponse(
					`Contract not found`,
					null,
					null,
					404,
				);
			return new ReturnedResponse('', { contract });
		} catch (err: any) {
			console.log('Error in getContract', err);
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.RPC_REQUEST),
			);
		}
	}
}

export default new Web3Helper();
