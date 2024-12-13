import { ERROR_CODES, ERROR_MESSAGES, TABLE_NAME } from '../constant/constants';
import { ReturnedError, ReturnedResponse } from '../data classes';
import dbService from '../service/db.service';

/**
 * save a record into postgres db
 * @param tableName
 * @param record
 * @returns
 */
export const saveRecord = async (tableName: string, record: any) => {
	try {
		let dbResult = null;
		switch (tableName) {
			case TABLE_NAME.CONTRACT_VERIFICATION:
				// dbResult = await dbService.prisma.contractVerification.create({
				// 	data: record,
				// });
				dbResult = await dbService.prisma.contractVerification.upsert({
					where: { contractAddress: record.contractAddress },
					update: record,
					create: record,
				});
				break;
			default:
				throw new Error(
					JSON.stringify({
						message: ERROR_MESSAGES.TABLE_NOT_FOUND,
						code: ERROR_CODES.DATABASE_CRUD,
					}),
				);
		}
		return new ReturnedResponse('', dbResult);
	} catch (err: any) {
		console.log('Error in saveRecord ', err);
		return new ReturnedResponse(
			'',
			null,
			new ReturnedError(err, ERROR_CODES.DATABASE_CRUD),
		);
	}
};

/**
 * update a record into postgres db
 * @param tableName
 * @param record
 * @returns
 */
export const updateRecord = async (
	tableName: string,
	record: any,
	where: any,
) => {
	try {
		let dbResult = null;
		switch (tableName) {
			case TABLE_NAME.CONTRACT_VERIFICATION:
				dbResult = await dbService.prisma.contractVerification.update({
					where,
					data: record,
				});
				break;
			default:
				throw new Error(
					JSON.stringify({
						message: ERROR_MESSAGES.TABLE_NOT_FOUND,
						code: ERROR_CODES.DATABASE_CRUD,
					}),
				);
		}
		return new ReturnedResponse('', dbResult);
	} catch (err: any) {
		console.log('Error in updateRecord:', err);
		return new ReturnedResponse(
			'',
			null,
			new ReturnedError(err, ERROR_CODES.DATABASE_CRUD),
		);
	}
};

/**
 * delete a record from postgres db
 * @param tableName
 * @param record
 * @returns
 */
export const deleteRecord = async (tableName: string, where: any) => {
	try {
		let dbResult = null;
		switch (tableName) {
			case TABLE_NAME.CONTRACT_VERIFICATION:
				dbResult = await dbService.prisma.contractVerification.delete({
					where,
				});
				break;
			default:
				throw new Error(
					JSON.stringify({
						message: ERROR_MESSAGES.TABLE_NOT_FOUND,
						code: ERROR_CODES.DATABASE_CRUD,
					}),
				);
		}
		return new ReturnedResponse('', dbResult);
	} catch (err: any) {
		console.log('Error in delete record: ', err);
		return new ReturnedResponse(
			'',
			null,
			new ReturnedError(err, ERROR_CODES.DATABASE_CRUD),
		);
	}
};
