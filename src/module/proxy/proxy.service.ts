import web3Helper from '../../helper/web3.helper';
import { getAddress } from '../../helper/common.helper';
import { IResponse } from '../../interfaces/index';
import {
	RES_MSG,
	STATUS_CODES,
	VERIFICATION_TYPE,
} from '../../constant/constants';
import { databaseService } from '../../service/index';
import { HttpResponse } from '../../data classes';

class ContractService {
	/**
	 * Check if contract is proxy based on the provided contract address.
	 * @param contractAddress -The address of the proxy contract.
	 * @returns Promise<IResponse> - Response containing implementation contract details.
	 */
	async checkProxyContract(contractAddress: string): Promise<IResponse> {
		try {
			const formattedAddress = web3Helper.getCheckSumAddress(
							contractAddress
						);
												console.log(contractAddress, "contractAddress")


						console.log(formattedAddress.data.address, "formattedAddress")
			const address = await getAddress(formattedAddress.data.address);
			let data = { implementation: '', verified: 0 };

				const resolvedImpl =			await web3Helper.getImplementationAddress(address);
			
console.log(resolvedImpl, "resolvedImp--l")
			// EIP-1967 implementation slot used by UUPS and TransparentUpgradeableProxy
			const EIP1967_IMPL_SLOT =
				'0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

			// First try EIP-1967 storage slot (covers UUPS / ERC1967Proxy)
			try {
				const slotValue = await web3Helper.web3.eth.getStorageAt(
					address,
					EIP1967_IMPL_SLOT,
				);

				console.log("slotValue-checkProxyContract", slotValue)
				if (slotValue && slotValue !== '0x' + '0'.repeat(64)) {
					// Last 20 bytes of the 32-byte slot value is the address
					data.implementation =
						'0x' + slotValue.slice(-40);
				}
			} catch (_) {}
				console.log("data-checkProxyContract", data)

			// Fallback: call implementation() for older transparent proxy pattern
			if (!data.implementation) {
				const proxyABI = [
					{
						inputs: [],
						name: 'implementation',
						outputs: [
							{
								internalType: 'address',
								name: '',
								type: 'address',
							},
						],
						stateMutability: 'view',
						type: 'function',
					},
				];
				const contractInstance = await web3Helper.getContract(
					proxyABI,
					address,
				);
				if (contractInstance.data) {
					try {
						data.implementation =
							await contractInstance.data.contract.methods
								.implementation()
								.call();
					} catch (_) {}
				}
			}

			// if (data.implementation) {
				const contract =
					await databaseService.prisma.contractVerification.findUnique(
						{
							where: {
								contractAddress: data.implementation,
								verificationType: {
									in: [
										VERIFICATION_TYPE.PARTIAL_VERIFIED,
										VERIFICATION_TYPE.FULLY_VERIFIED,
									],
								},
							},
						},
					);
				data.verified = contract ? 1 : 0;
			// }

			console.log(contract, "contract---l")

			return new HttpResponse(
				false,
				RES_MSG.CONTRACT,
				data,
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			console.log('Error in check proxy contract: ', err);
			return new HttpResponse(true, err.msg || RES_MSG.ERROR);
		}
	}

	/**
	 * Save implementation contract address into the database based on the provided proxy contract address.
	 * @param contractAddress - The address of the proxy contract.
	 * @returns Promise<IResponse> - Response containing proxy and implementation contract addresses.
	 */
	async saveProxyDetails(contractAddress: string): Promise<IResponse> {
		try {
			const address = await getAddress(contractAddress);

			const contractVerificationDetails =
				await databaseService.prisma.contractVerification.findUnique({
					where: {
						contractAddress: address,
					},
					select: {
						implementation: true,
						verificationType: true,
					},
				});

			if (
				contractVerificationDetails?.verificationType ==
					VERIFICATION_TYPE.REJECTED ||
				contractVerificationDetails?.verificationType ==
					VERIFICATION_TYPE.PENDING
			)
				return new HttpResponse(
					false,
					RES_MSG.PROXY_CONTRACT_NOT_VERIFIED,
					{ message: RES_MSG.PROXY_CONTRACT_NOT_VERIFIED },
					STATUS_CODES.SUCCESS,
				);

			const proxyDetails = await this.checkProxyContract(address);

			let contractAddresses = {
				implementation: proxyDetails.data?.implementation,
				proxy: address,
			};

			if (proxyDetails?.data?.verified == 0)
				return new HttpResponse(
					false,
					RES_MSG.IMPLEMENTATION_CONTRACT_NOT_VERIFIED,
					{ message: RES_MSG.IMPLEMENTATION_CONTRACT_NOT_VERIFIED },
					STATUS_CODES.SUCCESS,
				);

			if (
				contractVerificationDetails?.implementation !==
				proxyDetails.data?.implementation
			) {
				await databaseService.prisma.contractVerification.update({
					data: { implementation: proxyDetails.data?.implementation },
					where: { contractAddress: address },
				});
			}

			return new HttpResponse(
				false,
				RES_MSG.CONTRACT_SAVED,
				contractAddresses,
				STATUS_CODES.SUCCESS,
			);
		} catch (err: any) {
			console.log(err, 'Error while saveProxyDetails');
			return new HttpResponse(true, err.msg || RES_MSG.ERROR);
		}
	}
}

export default new ContractService();
