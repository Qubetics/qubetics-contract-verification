import { Router } from 'express';
import ContractController from './module/contract/contract.controller';
import CompilerController from './module/compiler/compiler.controller';
import ProxyController from './module/proxy/proxy.controller';
import VerifyController from './module/verify/verify.controller';

// import limiter from './helper/limiter.helper';

/**
 * Here, you can register routes by instantiating the controller.
 *
 */
export default function registerRoutes(): Router {
	const router = Router();
	const contractController = new ContractController();
	const compilerController = new CompilerController();
	const proxyController = new ProxyController();
	const verifyController = new VerifyController();

	router.use('/status', (req, res) => {
		res.json({ message: 'Service is up and running.' });
	});
	router.use('/', contractController.router);
	router.use('/', compilerController.router);
	router.use('/', proxyController.router);
	router.use('/', verifyController.router);

	return router;
}
