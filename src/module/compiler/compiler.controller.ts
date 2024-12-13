import * as express from 'express';
import { Request, Response } from 'express';
import ResponseHelper from '../../helper/response.helper';
import CompilerService from './compiler.service';
import { Controller } from '../../interfaces/index';

const setResponse = ResponseHelper;
class CompilerController implements Controller {
	public router = express.Router();

	constructor() {
		this.initializeRoutes();
	}

	private initializeRoutes() {
		this.router
			.get(`/type`, this.getCompilerType)
			.get(`/license/type`, this.getLicenseType);
	}

	private getCompilerType = async (request: Request, response: Response) => {
		const contracts = await CompilerService.getCompilerType();
		return setResponse.setResponse(response, contracts);
	};

	private getLicenseType = async (request: Request, response: Response) => {
		const contracts = await CompilerService.getLicenseType();
		return setResponse.setResponse(response, contracts);
	};
}

export default CompilerController;
