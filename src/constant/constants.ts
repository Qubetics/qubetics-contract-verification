export const STATUS_CODES = {
	SUCCESS: 200,
	CREATED: 201,
	ACCEPTED: 202,
	NOCONTENT: 204,
	BADREQUEST: 400,
	UN_AUTHORIZED: 401,
	FORBIDDEN: 403,
	NOTFOUND: 404,
	TIMEOUT: 408,
	TOO_MANY_REQ: 429,
	INTERNAL_SERVER_ERROR: 500,
	BADGATEWAYS: 502,
	SERVICEUNAVILABLE: 503,
	GATEWAYTIMEOUT: 504,
	MULTIPLE_CHOICES: 300,
};

export const COMPILATION_TYPE = {
	SINGLE_FILE: 'solidity-single-file',
	MULTI_FILE: 'solidity-multi-part-files',
	JSON_STANDARD_INPUT: 'solidity-standard-json-input',
};

export const FILE_OPTIONS = {
	FILE_LIMIT: 15,
	FILE_SIZE_LIMIT: 15,
};

export const ERROR_MESSAGES = {
	INVALID_CONTRACT_ADDRESS: 'Invalid contract address.',
	INTERNAL_SERVER_ERROR:
		'Something went wrong, please again after some time.',
	FILE_REQUIRED: 'File required',
	NODE_RPC_CONNECTION: 'Node rpc request failed',
	ERROR_WHILE_SERVICES_SETUP: 'Error while services setup.',
	WORKER_NOT_FOUND: 'Worker not found with following name.',
	NULL_WORKER_MESSAGE: 'Message cant be null',
	COMPILED_CONTRACT_NOT_FOUND:
		'Compiled contract not found for current source',
	CONSTRUCTOR_INPUT_NOT_FOUND:
		'Constructor inputs not found for constructor:',
	CONTRACT_VERIFICATION: 'Error while contract verification: ',
	CONTRACT_PROCESSING: 'Error while processing the contract: ',
	RABBITMQ_CHANNEL_NULL: 'Channel is null',
	RABBITMQ: 'The RabbitMQ error is',
	ENV_NOT_FOUND: '.env file is missing in root directory',
	TABLE_NOT_FOUND: 'Table not found',
	SOL_JSON_FILE_ONLY: 'Only SOL and JSON files are allowed!',
	FILE_OVERLOAD: `File limit exceeded.Maximum file limit is ${FILE_OPTIONS.FILE_LIMIT}.`,
	FILE_ERROR: 'File upload error',
};

export const RATE_LIMITER_MESSAGE = {
	TOO_MANY_REQUEST:
		'You are doing too many request. Please try again in 5 minutes.',
	WINDOW_MS: 1, // 1 minute //  600000, 10 minutes in milliseconds
	MAX: 15, // 5 request in 1 minute
};
export const passwordRegex =
	/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const RES_MSG = {
	VERIFY_CONTRACT_SUCCESS: 'Contract verified successfully',
	VERIFY_CONTRACT_FETCH_SUCCESS: 'Verified contracts fetched successfully',
	VERIFY_CONTRACT_FETCH_ERROR: 'Verified contracts not found',
	CONTRACT_NOT_FOUND: 'Contract not found',
	PROXY_CONTRACT_NOT_VERIFIED: 'Proxy contract not verified',
	IMPLEMENTATION_CONTRACT_NOT_VERIFIED:
		'Implementation contract not verified',
	CONTRACT_TX_NOT_FOUND: 'Contract transaction not found',
	CONTRACT_ALREADY_VERIFIED_ERROR: 'Contract already verified',
	CONTACT_NOT_VERIFIED: 'Contract not verified',
	CONTRACT_VERIFICATION_PENDING: 'Contract pending in verification',
	CONTRACT: 'Contract fetched successfully',
	ABI: 'ABI fetched successfully',
	ABI_ERROR: 'ABI not found',
	WIDGET: 'Widget fetched successfully',
	CONTRACT_TX: 'Conract transaction fetched successfully',
	ERROR: 'Oops! Something went wrong. Please try again.',
	SERVER_ERROR: 'Internal server error',
	TRANSACTION_NOT_FOUND: 'Transaction not found',
	TRANSACTION_FETCH_SUCCESS: 'Transaction fetched successfully',
	SUCCESS: 'Success',
	CONTRACT_VERIFICATION_UNDER_PROCESS:
		'Contract verification under process, please check after some time.',
	DATA_INSERTED_IN_QUEUE_SUCCESS: 'Data inserted to queue',
	QUEUE_ASSERTED: 'Queue asserted successsfully',
	REDIS_CONNECTION_SUCCESS: 'Redis connected successfully',
	REDIS_CONNECTION_FAILED: 'Redis connection failed',
	REDIS_CONNECTION_CLOSED: 'Redis connection closed successfully',
	REDIS_CONNECTION_NOT_CLOSED:
		'Connection not closed, something went wrong while closing the connection',
	RABBITMQ_CONNECTION_SUCCESS: 'Rabbitmq connected successfully',
	RABBITMQ_CONNECTION_FAILED: 'Rabbitmq connection failed',
	RABBITMQ_CONNECTION_CLOSED: 'RabbitMq connection closed successfully',
	DATABASE_CONNECTION_SUCCESS: 'Database connected successfully',
	DATABASE_CONNECTION_FAILED: 'Database connection failed',
	DATABASE_CONNECTION_CLOSED: 'Database connection closed successfully',
	COMPILER_TYPE_FETCH_SUCCESS: 'Compiler type fetched successfully',
	COMPILER_VERSION_FETCH_SUCCESS: 'Compiler version fetched successfully',
	RPC_NODE_REQ_SUCCESS: 'RPC request success',
	LICENSE_TYPE_FETCH_SUCCESS: 'License type fetched successfully',
	CONTRACT_VERIFICATION_PROCESSED: 'Contract verification processed.',
	BYTECODE_NOT_FOUND_ON_CHAIN: 'Unable to locate ContractCode at',
	STANDARD_JSON_INPUT_FAILED: 'Error while converting to standard json input',
	SOURCES_CANTBE_NULL: 'Sources can not be null or undef.',
	SOURCES_CANTBE_EMPTY: 'Sources can not be empty.',
	SOURCES_TYPE: 'Sources need to be instance of object',
	CONTRACT_SAVED: 'Contract saved successfully.',
	MESSAGE_VERIFIED: 'Success! The signer is verified',
	MESSAGE_NOT_VERIFIED: 'The signer is not verified',
	ICON_UPLOAD: 'Icon uploaded successfully.',
	AUTHORIZATION_FAILED: 'You are not authorized to change the token',
};

export const BLOCKCHAIN_MSG = {
	GET_BALANCE_ERROR: 'Error occured while fetching balance detail',
	GET_ADDRESS_ERROR: 'Error occured while fetching address detail',
	GET_CODE_ERROR: 'Error occured while fetching code detail',
	BYTECODE_NOT_FOUND: 'Deployed bytecode is not found.',
	SUCCESS: 'Success',
	BLOCKCHAIN_NOT_CONNECTED: 'Blockchain not connected',
	BLOCKCHAIN_CONNECTED: 'Blockchain connected successfully',
	ERROR: 'Error while checking blockchain connection',
	ERROR_LOOP: 'Error in connection checking loop',
};

export const CONST_NAME = {
	POWER: 10 ** 18,
};
export const RABBITMQ_QUEUES = {
	CONTRACT_VERIFICATION_QUEUE: 'CONTRACT_VERIFICATION_QUEUE',
	TRANSACTION_LOGS_DECODING: 'TRANSACTION_LOGS_DECODING',
};
export enum TRANSACTION_TYPE {
	COIN_TRANSFER = 'COIN_TRANSFER',
	CONTRACT_CREATION = 'CONTRACT_CREATION',
	CONTRACT_TRANSFER = 'CONTRACT_TRANSFER',
}

export const VALIDATION_TYPE = {
	VERIFY_SINGLE_FILE:
		'file is not required when code format is solidity-single-file',
	FILE_NOT_REQUIRED: 'file is not required',
	VERIFY_JSON_INPUT_FILE:
		'file is required when code format is solidity-multi-part-files',
	INVALID_PAGE_NUMBER: 'invalid page number',
	ADDRESS_FORMAT: 'should start with 0x',
	ADDRESS_LENGTH: 'length should be equal to 42',
	ADDRESS_AVOID_SPACE: 'should not start with space',
	VALID_VALUE: 'should be a valid value',
	INVALID_LIMIT: 'invalid limit',
	REQUIRED_LIMIT: 'limit is required',
	COMPILER_VERSION: 'Invalid compiler version',
};

export const COMPILER_TYPE = [
	'solidity-single-file',
	'solidity-multi-part-files',
	'solidity-standard-json-input',
];

export const LICENSE_TYPE = [
	'No License (None)',
	'The Unlicense (Unlicense)',
	'MIT License (MIT)',
	'GNU General Public License v2.0 (GNU GPLv2)',
	'GNU General Public License v3.0 (GNU GPLv3)',
	'GNU Lesser General Public License v2.1 (GNU LGPLv2.1)',
	'GNU Lesser General Public License v3.0 (GNU LGPLv3)',
	'BSD 2-clause "Simplified" license (BSD-2-Clause)',
	'BSD 3-clause "New" Or "Revised" license* (BSD-3-Clause)',
	'Mozilla Public License 2.0 (MPL-2.0)',
	'Open Software License 3.0 (OSL-3.0)',
	'Apache 2.0 (Apache-2.0)',
	'GNU Affero General Public License (GNU AGPLv3)',
	'Business Source License (BSL 1.1)',
];
// codes for specfic parts failure
export const ERROR_CODES = {
	REDIS_CONNECTION: 100,
	DATABASE_CONNECTION: 101,
	RABBIT_MQ_CONNECTION: 102,
	REDIS_STORING: 103,
	DATABASE_CRUD: 104,
	CONTRACT_COMPILATION: 105,
	RPC_REQUEST: 106,
	CRITICAL_DATA_MISSING: 107,
	ENV_LOAD_FAILURE: 108,
	RABBITMQ_CONNECTION_CLOSE: 109,
	DATABASE_CONNECTION_CLOSE: 110,
	REDIS_CONNECTION_CLOSE: 111,
	RABBITMQ_QUEUE_INSERT: 112,
	RABBITMQ_QUEUE_CREATION: 113,
	CONTRACT_VERIFICATION: 114,
};

export const TABLE_NAME = {
	CONTRACT_VERIFICATION: 'ContractVerification',
};

export const VERIFICATION_TYPE = {
	INITIAL: -2,
	REJECTED: -1,
	PENDING: 0,
	PARTIAL_VERIFIED: 1,
	FULLY_VERIFIED: 2,
};

export const CONTRACT_VERIFICATION_STATUS = {
	REJECTED: 'Fail - Unable to verify',
	PENDING: 'Pending in queue',
	VERIFIED: 'Pass - Verified',
};

export const TOOLS_VERIFICATION_STATUS_CODE = {
	SUCCESS: 1,
};

export const EVMVERSION = [
	'london',
	'berlin',
	'byzantium',
	'constantinople',
	'petersburg',
	'istanbul',
	'default',
	'paris',
	'cancun',
	'shanghai',
	'tangerineWhistle',
	'spuriousDragon',
	'homestead',
];
