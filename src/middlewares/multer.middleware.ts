import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ERROR_MESSAGES, STATUS_CODES } from '../constant/constants';
import ResponseHelper from '../helper/response.helper';
import { multipleFileUpload } from '../helper/upload.helper';

const setResponse = ResponseHelper;

export const handleMultipleFileUpload = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		return multipleFileUpload(req, res, (err) => {
			if (err instanceof multer.MulterError) {
				// A multer error occurred when uploading
				const message =
					err.code === 'LIMIT_UNEXPECTED_FILE'
						? ERROR_MESSAGES.FILE_OVERLOAD
						: ERROR_MESSAGES.FILE_ERROR;
				return setResponse.setResponse(res, {
					error: false,
					message,
					status: STATUS_CODES.BADREQUEST,
				});
			}
			if (err) {
				// An unknown error occurred
				return setResponse.setResponse(res, { error: true });
			}
			// Files were successfully uploaded
			return next();
		});
	} catch (err: any) {
		return setResponse.setResponse(res, { error: true });
	}
};
