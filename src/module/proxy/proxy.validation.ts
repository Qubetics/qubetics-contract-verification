import * as Joi from 'joi';
import * as express from 'express';
import {
	VALIDATION_TYPE,
	COMPILATION_TYPE,
	EVMVERSION,
} from '../../constant/constants';

// Validation function for contract address
const addressValidation = (fieldName: string) =>
	Joi.string()
		.required()
		.custom((value, helpers) => {
			if (value.startsWith(' ')) {
				return helpers.error('custom.noLeadingSpaces');
			}
			if (!value.startsWith('0x')) {
				return helpers.error('custom.validHash');
			}
			if (value.startsWith('0x') && value.length < 42) {
				return helpers.error('custom.hashLength');
			}
			if (value.startsWith('0x') && value.length > 42) {
				return helpers.error('custom.hashLength');
			}
		})
		.messages({
			'custom.validHash': `${fieldName} ${VALIDATION_TYPE.ADDRESS_FORMAT}`,
			'custom.hashLength': `${fieldName} ${VALIDATION_TYPE.ADDRESS_LENGTH}`,
			'custom.noLeadingSpaces': `${fieldName} ${VALIDATION_TYPE.ADDRESS_AVOID_SPACE}`,
			'string.pattern.base': `${fieldName} ${VALIDATION_TYPE.ADDRESS_FORMAT}`,
		});

// Validation middleware for getting contract address
export const verifyproxycontract = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const schema = Joi.object({
		contractAddress: addressValidation('contract address'),
	});

	const { error, value } = schema.validate(req.query);

	if (error) {
		return res.status(400).json({ message: error.details[0].message });
	}
	next();
};
