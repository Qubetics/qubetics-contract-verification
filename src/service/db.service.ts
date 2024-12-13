import { PrismaClient } from '@prisma/client';
import { ERROR_CODES, RES_MSG } from '../constant/constants';
import { ReturnedError, ReturnedResponse } from '../data classes';
import logger from '../lib/logger';

class DatabaseClient {
	private static instance: DatabaseClient;

	public prisma: PrismaClient;

	constructor() {
		if (!DatabaseClient.instance) DatabaseClient.instance = this;

		return DatabaseClient.instance;
	}

	// Method to establish connection to the database
	public async run() {
		try {
			this.prisma = new PrismaClient();
			await this.prisma.$connect();
			logger.info(RES_MSG.DATABASE_CONNECTION_SUCCESS);
			return new ReturnedResponse(RES_MSG.DATABASE_CONNECTION_SUCCESS);
		} catch (err: any) {
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.DATABASE_CONNECTION_CLOSE),
			);
		}
	}

	// close the postgres connection
	public async close() {
		try {
			await this.prisma.$disconnect();
			return new ReturnedResponse(RES_MSG.DATABASE_CONNECTION_FAILED);
		} catch (err) {
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.DATABASE_CONNECTION_CLOSE),
			);
		}
	}
}

export default new DatabaseClient(); // Exporting an instance of DatabaseClient
