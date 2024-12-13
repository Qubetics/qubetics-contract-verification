import { Response } from 'express';
import { ERROR_MESSAGES, STATUS_CODES } from '../constant/constants';
import { IResponse } from '../interfaces/index';

class ResponseHelper {
	// set response for requests with status code 200, 201
	success(res: Response, responseData: IResponse = {}) {
		return res.status(STATUS_CODES.SUCCESS).send(responseData);
	}

	// set internal server error response
	internalServerError(res: Response) {
		return res
			.status(STATUS_CODES.INTERNAL_SERVER_ERROR)
			.send({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
	}

	// set custom responses
	setResponse(res: Response, responseMsg: IResponse) {
		if (responseMsg.error) return this.internalServerError(res);
		if (
			responseMsg.status &&
			responseMsg.status >= STATUS_CODES.MULTIPLE_CHOICES
		)
			return res.status(responseMsg.status).send({
				message: responseMsg.message,
				status: responseMsg.status,
			});
		return this.success(res, responseMsg.data);
	}
}

export default new ResponseHelper();
