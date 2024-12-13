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

// Validation middleware for getting contract by address
export const getContractByAddressValidation = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const schema = Joi.object({
		contractAddress: addressValidation('contract address'),
	});

	const { error, value } = schema.validate(req.params);

	if (error) {
		return res.status(400).json({ message: error.details[0].message });
	}
	next();
};

// Validation middleware for getting verified contract by user
export const getVerifiedContractByUser = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const querySchema = Joi.object({
		page: Joi.string()
			.custom((value, helpers) => {
				let parsedValue = parseFloat(value.trim());
				if (!isNaN(value) || Number.isInteger(parsedValue)) {
					if (value.trim().toString().length >= 19) {
						return helpers.error('custom.invalidpage');
					}
				}
				return parsedValue;
			}, 'Number Validation')
			.messages({
				'custom.invalidpage': VALIDATION_TYPE.INVALID_PAGE_NUMBER,
			}),
		limit: Joi.string()
			.custom((value, helpers) => {
				let parsedValue = parseFloat(value.trim());
				return parsedValue;
			}, 'Number Validation')
			.messages({}),
	});
	const schema = Joi.object({
		walletAddress: addressValidation('wallet address'),
	});

	const queryValidation = querySchema.validate(req.query);
	const { error } = schema.validate(req.params);
	if (queryValidation.error) {
		return res.status(400).json({
			message: queryValidation.error.details[0].message,
		});
	}
	if (error) {
		return res.status(400).json({ message: error.details[0].message });
	}
	next();
};

// Validation middleware for getting top verified contracts
export const getTopVerifiedContractsValidation = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const querySchema = Joi.object({
		page: Joi.string()
			.custom((value, helpers) => {
				let parsedValue = parseFloat(value.trim());
				if (!isNaN(value) || Number.isInteger(parsedValue)) {
					if (value.trim().toString().length >= 19) {
						return helpers.error('custom.invalidpage');
					}
				}
				return parsedValue;
			}, 'Number Validation')
			.messages({
				'custom.invalidpage': VALIDATION_TYPE.INVALID_PAGE_NUMBER,
			}),
		limit: Joi.string()
			.custom((value, helpers) => {
				let parsedValue = parseFloat(value.trim());
				return parsedValue;
			}, 'Number Validation')
			.messages({}),
	});

	const queryValidation = querySchema.validate(req.query);
	if (queryValidation.error) {
		return res.status(400).json({
			message: queryValidation.error.details[0].message,
		});
	}
	next();
};

// Validation middleware for verifying source code
export const verifySourceCodeValidation = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const schema = Joi.object({
		module: Joi.string().optional(),
		action: Joi.string().optional(),
		contractaddress: Joi.string().required(),
		sourceCode: Joi.when('codeformat', {
			is: COMPILATION_TYPE.MULTI_FILE,
			then: Joi.string().forbidden(),
			otherwise: Joi.string().required(),
		}),
		abi: Joi.string().optional().allow(''),
		codeformat: Joi.string()
			.required()
			.valid(...Object.values(COMPILATION_TYPE)),
		contractname: Joi.string().optional(), //ContractName (if codeformat=solidity-standard-json-input, then enter contractname as ex: erc20.sol:erc20)
		compilerversion: Joi.string()
			.regex(/^v\d+\.\d+\.\d+(-nightly\.\d+\.\d+\.\d+)?\+commit\.\w+$/)
			.required()
			.messages({
				'string.pattern.base': VALIDATION_TYPE.COMPILER_VERSION,
			}),
		optimizationUsed: Joi.number().valid(0, 1).optional(), //0 = No Optimization, 1 = Optimization used (applicable when codeformat=solidity-single-file)
		licenseType: Joi.number().integer().min(1).max(14).optional(), //Valid codes 1-14 where 1=No License .. 14=Business Source License 1.1
		runs: Joi.number().integer().optional(), //set to 200 as default unless otherwise  (applicable when codeformat=solidity-single-file)
		evmVersion: Joi.string()
			.optional()
			.allow('')
			.valid(...EVMVERSION),
		apikey: Joi.string().optional(),
		constructorArguements: Joi.string().optional().allow(''),
	});

	const { error } = schema.validate(req.body);
	// Handle validation errors
	if (
		req.body.codeformat === COMPILATION_TYPE.SINGLE_FILE &&
		req.files instanceof Array &&
		req.files.length
	) {
		return res.status(400).json({
			message: VALIDATION_TYPE.VERIFY_SINGLE_FILE,
		});
	}
	// clarification wrong file not required in case of multi files
	if (
		req?.files?.length &&
		req?.files instanceof Array &&
		req?.body?.sourceCode &&
		req.body.codeformat === COMPILATION_TYPE.SINGLE_FILE
	) {
		return res.status(400).json({
			message: VALIDATION_TYPE.FILE_NOT_REQUIRED,
		});
	}

	if (
		req.body.codeformat === COMPILATION_TYPE.MULTI_FILE &&
		!req.files?.length
	) {
		return res.status(400).json({
			message: VALIDATION_TYPE.VERIFY_JSON_INPUT_FILE,
		});
	}
	if (error) {
		return res.status(400).json({ message: error.details[0].message });
	}
	next();
};
