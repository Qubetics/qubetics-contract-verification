import Environment from './environments/environment';
import { setGlobalEnvironment } from './global';
const env: Environment = new Environment();
setGlobalEnvironment(env);
import App from './App';
import logger from './lib/logger';
import {
	rabbitMqService,
	redisService,
	databaseService,
} from './service/index';
import { ERROR_MESSAGES } from './constant/constants';

function serverError(error: NodeJS.ErrnoException): void {
	console.log('Error while listning: ', error);
	process.exit(1);
}

async function startService() {
	const databaseClientSetupRes = await databaseService.run();
	// await redisService.run();
	const rabbitmqClientSetupRes = await rabbitMqService.run();

	const error = databaseClientSetupRes.error || rabbitmqClientSetupRes.error;
	if (error) {
		logger.error(ERROR_MESSAGES.ERROR_WHILE_SERVICES_SETUP);
		console.error(error);
		closeClientConnections();
		process.exit(1);
	}
}

async function serverListening(): Promise<void> {
	logger.info(`Listening on port ${env.port}`);
}

async function closeClientConnections() {
	console.log('Closing connection');
	await rabbitMqService.close();
	// await redisService.close();
	await databaseService.close();
}

function bindProcessEvents(): void {
	const errorHandlerCB = async (err: any) => {
		logger.error('Service level exception');
		logger.error(err);

		// close the connection
		await closeClientConnections();
		process.exit(1);
	};

	// handle the process level exceptions
	process.on('uncaughtException', errorHandlerCB);
	process.on('unhandledRejection', errorHandlerCB);

	// before exit close all other services connections
	process.on('beforeExit', closeClientConnections);
}

// service starter
(async () => {
	const app: App = new App();
	await startService(); // start the services first
	bindProcessEvents();
	await app.init(); // init the http server
	const server = app.httpServer;

	// bind the events for http server
	server.on('error', serverError);
	server.on('listening', serverListening);

	// bind port and listen for the requests
	server.listen(env.port);
})();
