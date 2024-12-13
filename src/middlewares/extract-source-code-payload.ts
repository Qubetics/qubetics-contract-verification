/* eslint-disable */
import { NextFunction, Request, Response } from 'express';
import { ERROR_MESSAGES, STATUS_CODES } from '../constant/constants';

export const extractSourceCodePayload = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		req.body = { ...req.body, files: req.files };
	} catch (err) {
		res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send({
			message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
		});
	}
};
