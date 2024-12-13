import Redis, { Redis as RedisClientType } from 'ioredis';
// import { createPrismaRedisCache } from 'prisma-redis-middleware';
import { ERROR_CODES, RES_MSG } from '../constant/constants';
import { ReturnedError, ReturnedResponse } from '../data classes';
import logger from '../lib/logger';

class RedisClient {
	public redis: RedisClientType;

	private static instance: RedisClient;

	constructor() {
		if (!RedisClient.instance) RedisClient.instance = this;
		return RedisClient.instance;
	}

	// Method to establish connection to Redis
	public async run() {
		try {
			// Initializing Redis client with provided host and port
			this.redis = new Redis({
				host: environment.redisHost,
				port: environment.redisPort,
			});

			const isClientConnected = await this.redis.ping();
			if (isClientConnected)
				logger.info(RES_MSG.REDIS_CONNECTION_SUCCESS);
			return new ReturnedResponse(RES_MSG.REDIS_CONNECTION_SUCCESS);
		} catch (err: any) {
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.REDIS_CONNECTION),
			);
		}
	}

	// close the redis connection
	public async close() {
		try {
			// close the connection and write the pending replies to client
			const isConnectionClosed = await this.redis.quit();
			if (isConnectionClosed)
				return new ReturnedResponse(RES_MSG.REDIS_CONNECTION_CLOSED);
			throw new Error(RES_MSG.REDIS_CONNECTION_NOT_CLOSED);
		} catch (err: any) {
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.REDIS_CONNECTION_CLOSE),
			);
		}
	}
}

export default new RedisClient();
