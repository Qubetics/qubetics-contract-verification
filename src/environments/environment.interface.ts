interface IEnvironment {
	port: number;
	databaseUrl: string;
	nodeLink: string;
	redisHost: string;
	redisPort: number;
	rabbitMq: string;
	apiLogsEnable: boolean;
	getCurrentEnvironment(): string;
	setEnvironment(env: string): void;
	isProductionEnvironment(): boolean;
	isDevEnvironment(): boolean;
	isTestEnvironment(): boolean;
	isStagingEnvironment(): boolean;
}

export default IEnvironment;
