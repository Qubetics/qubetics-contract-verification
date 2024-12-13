import * as express from 'express';
import { Request, Response } from 'express';
import ResponseHelper from '../../helper/response.helper';
import ProxyService from './proxy.service';
import { Controller } from '../../interfaces/index';
import { verifyproxycontract } from './proxy.validation';

const setResponse = ResponseHelper;
class ProxyController implements Controller {
	public router = express.Router();

	constructor() {
		this.initializeRoutes();
	}

	private initializeRoutes() {
		this.router
			.get(
				`/verifyproxycontract`,
				verifyproxycontract,
				this.proxycontractchecker,
			)
			.get(
				`/saveProxyContract`,
				verifyproxycontract,
				this.saveProxyContract,
			);
	}

	private proxycontractchecker = async (
		request: Request,
		response: Response,
	) => {
		const contracts = await ProxyService.checkProxyContract(
			String(request.query.contractAddress),
		);
		return setResponse.setResponse(response, contracts);
	};

	private saveProxyContract = async (
		request: Request,
		response: Response,
	) => {
		const contracts = await ProxyService.saveProxyDetails(
			String(request.query.contractAddress),
		);
		return setResponse.setResponse(response, contracts);
	};
}

export default ProxyController;
