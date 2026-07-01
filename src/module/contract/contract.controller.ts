import * as express from 'express';
import { Request, Response } from 'express';
import ResponseHelper from '../../helper/response.helper';
import ContractService from './contract.service';
import { Controller, SourceCodePayload } from '../../interfaces/index';
import {
	getContractByAddressValidation,
	verifySourceCodeValidation,
	getTopVerifiedContractsValidation,
} from './contract.validation';
import { pagination } from '../../helper/common.helper';
import { handleMultipleFileUpload } from '../../middlewares/multer.middleware';

const setResponse = ResponseHelper;
class ContractController implements Controller {
	public router = express.Router();

	constructor() {
		this.initializeRoutes();
	}

	private initializeRoutes() {
		this.router
			.get(
				`/detail/:contractAddress`,
				getContractByAddressValidation,
				this.getContractDetail,
			)
			.get(
				`/contract/status/:contractAddress`,
				getContractByAddressValidation,
				this.getContractStatus,
			)
			.get(
				`/abi/:contractAddress`,
				getContractByAddressValidation,
				this.getAbi,
			)
			.get(
				`/verification/detail/:contractAddress`,
				getContractByAddressValidation,
				this.getVerifiedContract,
			)
			// .get(
			// 	`/user/verified/:walletAddress`,
			// 	getVerifiedContractByUser,
			// 	this.getVerifiedContractByUser,
			// )
			.get(
				`/top`,
				getTopVerifiedContractsValidation,
				this.getTopVerifiedContracts,
			)
			.get(`/widget`, this.getWidget)
			.post(
				`/verify`,
				handleMultipleFileUpload,
				verifySourceCodeValidation,
				this.verify,
			)
			.get(`/verify`, this.contractVerified);
	}

	private getContractStatus = async (
		request: Request,
		response: Response,
	) => {
		const contracts = await ContractService.getContractStatus(
			request.params.contractAddress,
		);
		return setResponse.setResponse(response, contracts);
	};

	private getContractDetail = async (
		request: Request,
		response: Response,
	) => {
		const contracts = await ContractService.getContractDetail(
			request.params.contractAddress,
		);

		console.log("getContractDetail of contract",request.params.contractAddress, contracts)
		// return setResponse.setResponse(response, contracts);
	};

	private getAbi = async (request: Request, response: Response) => {
		const contracts = await ContractService.getAbi(
			request.params.contractAddress,
		);
		return setResponse.setResponse(response, contracts);
	};

	private getVerifiedContract = async (
		request: Request,
		response: Response,
	) => {
		const contracts = await ContractService.getVerifiedContract(
			request.params.contractAddress,
		);

		return setResponse.setResponse(response, contracts);
	};

	private contractVerified = async (request: any, response: Response) => {
		const contracts = await ContractService.getVerifiedContract(
			request.query.guid || request.query.address,
		);
		return setResponse.setResponse(response, contracts);
	};

	private getTopVerifiedContracts = async (
		request: Request,
		response: Response,
	) => {
		const data = pagination(
			<string>request.query.page,
			<string>request.query.limit,
		);

		const contracts = await ContractService.getTopVerifiedContracts(data);
		return setResponse.setResponse(response, contracts);
	};

	private getWidget = async (request: Request, response: Response) => {
		const contracts = await ContractService.getWidget();
		return setResponse.setResponse(response, contracts);
	};

	private verify = async (req: express.Request, res: Response) => {
		const data: SourceCodePayload = { ...req.body, files: req.files };
		const _result = await ContractService.verify(data);
		return setResponse.setResponse(res, _result);
	};
}

export default ContractController;
