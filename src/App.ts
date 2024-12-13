import http from 'http';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import registerRoutes from './routes';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';
import limiter from './helper/limiter.helper';
export default class App {
	public expressApp: express.Application;
	public httpServer: http.Server;
	public enableMorganMiddleware = environment.apiLogsEnable;

	public async init(): Promise<void> {
		this.expressApp = express();
		this.httpServer = http.createServer(this.expressApp);

		// add all global middleware like cors
		this.middleware();

		// register the all routes
		this.routes();

		// generate and bind the swagger docs page
		this.setupSwaggerDocs();
	}

	/**
	 * here register your all routes
	 */
	private routes(): void {
		this.expressApp.use('/', registerRoutes());
	}

	/**
	 * here you can apply your middlewares
	 */
	private middleware(): void {
		this.expressApp.use(cors());
		this.expressApp.use(limiter);
		if (this.enableMorganMiddleware) this.expressApp.use(morgan('tiny'));
		// support application/json type post data
		// support application/x-www-form-urlencoded post data
		// Helmet can help protect your app from some well-known web vulnerabilities by setting HTTP headers appropriately.
		this.expressApp.use(
			helmet({
				contentSecurityPolicy: false,
				crossOriginEmbedderPolicy: false,
			}),
		);

		this.expressApp.use(express.json({ limit: '100mb' }));
		this.expressApp.use(
			express.urlencoded({ limit: '100mb', extended: true }),
		);
	}

	private setupSwaggerDocs(): void {
		this.expressApp.use(
			'/api/docs',
			swaggerUi.serve,
			swaggerUi.setup(swaggerDocument),
		);
	}
}
