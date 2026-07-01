import * as fs from 'fs';
import * as path from 'path';
import { config as configDotenv } from 'dotenv';

import { ERROR_MESSAGES } from '../constant/constants';
import { EnvironmentFile, Environments } from './environment.constant';
import IEnvironment from './environment.interface';

class Environment implements IEnvironment {
	public port: number;

	public env: string;

	public nodeLink: string;

	public databaseUrl: string;

	public redisHost: string;

	public redisPort: number;

	public rabbitMq: string;

	public apiLogsEnable: boolean;

	public schema: string;

	public windowms: number;

	public maxRequest: number;

	public fileSize: number;

	public fileLimit: number;

	/**
	 *
	 * @param NODE_ENV
	 */
	constructor(NODE_ENV?: string) {
		this.env = NODE_ENV || process.env.NODE_ENV || Environments.DEV;
		this.setEnvironment(this.env);
		const port: string | undefined | number = process.env.PORT || 3146;
		this.port = Number(port);
		this.nodeLink = <string>process.env.EVM_TENDERMENT_HTTP_HOST;
		this.databaseUrl = <string>process.env.DATABASE_URL;
		this.redisHost = <string>process.env.REDIS_HOST;
		this.redisPort = Number(process.env.REDIS_PORT);
		this.rabbitMq = <string>process.env.RABITMQ_URL;
		this.schema = <string>process.env.SCHEMA;
		this.apiLogsEnable = !!Number(<string>process.env.API_LOGS_ENABLE);
		this.windowms = Number(<string>process.env.WINDOW_MS);
		this.maxRequest = Number(<string>process.env.MAX_REQUEST);
		this.fileSize = Number(<string>process.env.FILE_SIZE);
		this.fileLimit = Number(<string>process.env.FILE_LIMIT);
	}

	/**
	 *
	 * @returns
	 */
	public getCurrentEnvironment(): string {
		return this.env;
	}

	/**
	 *
	 * @param env
	 */
	public setEnvironment(env: string): void {
		let envPath: string;
		this.env = env || Environments.LOCAL;
		const rootdir: string = path.resolve(__dirname, '../../');
		switch (env) {
			case Environments.PRODUCTION:
				envPath = path.resolve(rootdir, EnvironmentFile.PRODUCTION);
				break;
			case Environments.TEST:
				envPath = path.resolve(rootdir, EnvironmentFile.TEST);
				break;
			case Environments.STAGING:
				envPath = path.resolve(rootdir, EnvironmentFile.QA);
				break;
			case Environments.LOCAL:
				envPath = path.resolve(rootdir, EnvironmentFile.LOCAL);
				break;
			default:
				envPath = path.resolve(rootdir, EnvironmentFile.LOCAL);
		}
		// The CI pipeline injects the deploy-time config into `.env`
		// (`echo "${ENV}" >> .env`), not into the per-env file above. So in
		// production, if the dedicated `.env.prod` is absent, fall back to `.env`
		// instead of silently loading nothing (which left DATABASE_URL unset and
		// pointed the server at the wrong/empty database).
		if (
			this.env === Environments.PRODUCTION &&
			!fs.existsSync(envPath)
		) {
			envPath = path.resolve(rootdir, EnvironmentFile.LOCAL);
		}
		if (this.env !== Environments.PRODUCTION && !fs.existsSync(envPath)) {
			throw new Error(ERROR_MESSAGES.ENV_NOT_FOUND);
		}
		configDotenv({ path: envPath });
	}

	/**
	 *
	 * @returns
	 */
	public isProductionEnvironment(): boolean {
		return this.getCurrentEnvironment() === Environments.PRODUCTION;
	}

	/**
	 *
	 * @returns
	 */
	public isDevEnvironment(): boolean {
		return (
			this.getCurrentEnvironment() === Environments.DEV ||
			this.getCurrentEnvironment() === Environments.LOCAL
		);
	}

	/**
	 *
	 * @returns
	 */
	public isTestEnvironment(): boolean {
		return this.getCurrentEnvironment() === Environments.TEST;
	}

	/**
	 *
	 * @returns
	 */
	public isStagingEnvironment(): boolean {
		return this.getCurrentEnvironment() === Environments.STAGING;
	}
}

export default Environment;
