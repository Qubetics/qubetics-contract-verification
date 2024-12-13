import * as express from 'express';
import { Request, Response } from 'express';
import ResponseHelper from '../../helper/response.helper';
import { Controller } from '../../interfaces/index';
import verifyService from './verify.service';
import { verifyMessage } from './verify.validation';

const setResponse = ResponseHelper;
class VerifyController implements Controller {
	public router = express.Router();

	constructor() {
		this.initializeRoutes();
	}

	private initializeRoutes() {
		this.router.post(`/uploadIcon`, verifyMessage, this.isVerifyMessage);
	}

	private isVerifyMessage = async (request: Request, response: Response) => {
		const contracts = await verifyService.verifyMessage(request.body);
		return setResponse.setResponse(response, contracts);
	};
}

export default VerifyController;
