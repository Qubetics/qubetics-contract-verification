import { IResponse } from '../../interfaces/index';
import {
	RES_MSG,
	STATUS_CODES,
	TABLE_NAME,
	VERIFICATION_TYPE,
} from '../../constant/constants';
import { ethers } from 'ethers';
import { databaseService } from '../../service';
import { getAddress } from '../../helper/common.helper';
import { updateRecord } from '../../helper/crud.helper';
import { HttpResponse } from '../../data classes';
import dbService from '../../service/db.service';

class VerifyService {
	/**
	 * Verify message signature.
	 * @returns Promise<IResponse> - Response if message verified.
	 */
	async verifyMessage(req: any): Promise<IResponse> {
		try {
			let creator;
			const schema = environment.schema ? environment.schema : 'public';
			const contractAddress = await getAddress(req.address);
			const contractDetails =
				await dbService.prisma.contractVerification.findUnique({
					where: {
						contractAddress: contractAddress,
						OR: [
							{
								verificationType:
									VERIFICATION_TYPE.PARTIAL_VERIFIED,
							},
							{
								verificationType:
									VERIFICATION_TYPE.FULLY_VERIFIED,
							},
						],
					},
				});

			if (!contractDetails)
				return new HttpResponse(
					false,
					RES_MSG.CONTACT_NOT_VERIFIED,
					{ message: RES_MSG.CONTACT_NOT_VERIFIED },
					STATUS_CODES.NOTFOUND,
				);

			try {
				const query = `SELECT creator FROM ${schema}."Contracts" WHERE "address" = '${contractAddress}'`;
				const result: any[] =
					await databaseService.prisma.$queryRawUnsafe(query);
				if (result?.length) creator = result[0].creator;
			} catch (err: any) {
				try {
					const query = `SELECT creator FROM ${schema}."Tokens" WHERE "contractAddress" = '${contractAddress}'`;
					const result: any[] =
						await databaseService.prisma.$queryRawUnsafe(query);
					if (result?.length) creator = result[0].creator;
				} catch (err: any) {}
			}

			let signerAddr = ethers.recoverAddress(
				req.messageHash,
				req.signature,
			);
			signerAddr = await getAddress(signerAddr);
			if (creator !== signerAddr) {
				return new HttpResponse(
					false,
					RES_MSG.MESSAGE_NOT_VERIFIED,
					{
						isVerified: false,
						message: RES_MSG.AUTHORIZATION_FAILED,
						isError: false,
					},
					STATUS_CODES.UN_AUTHORIZED,
				);
			}
			await updateRecord(
				TABLE_NAME.CONTRACT_VERIFICATION,
				{ iconUrl: req.iconUrl },
				{ contractAddress },
			);
			return new HttpResponse(
				false,
				RES_MSG.MESSAGE_VERIFIED,
				{
					isVerified: true,
					message: RES_MSG.ICON_UPLOAD,
					isError: false,
				},
				STATUS_CODES.SUCCESS,
			);
		} catch (err) {
			return new HttpResponse(
				true,
				RES_MSG.MESSAGE_NOT_VERIFIED,
				{ isError: true },
				STATUS_CODES.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export default new VerifyService();
