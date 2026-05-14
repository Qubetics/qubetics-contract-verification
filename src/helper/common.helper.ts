/*eslint-disable*/
import Web3Helper from './web3.helper';
const crypto = require('crypto');

export function convertBigIntToNumber(dataVal: any): any {
	if (dataVal && typeof dataVal === 'object') {
		if (Array.isArray(dataVal)) {
			return dataVal.map((item) => convertBigIntToNumber(item));
		}

		const finalDataVal: Record<string, any> = {};

		for (const key in dataVal) {
			if (Object.prototype.hasOwnProperty.call(dataVal, key)) {
				const value = dataVal[key];

				if (value instanceof Date) {
					finalDataVal[key] = value; // Convert Date to timestamp
				} else if (value && typeof value === 'object') {
					finalDataVal[key] = convertBigIntToNumber(value);
				} else if (typeof value === 'bigint') {
					finalDataVal[key] = value.toString();
				} else {
					finalDataVal[key] = value;
				}
			}
		}

		return finalDataVal;
	}

	return dataVal;
}

export async function getAddress(address: string) {
	const covertedPayload = await Web3Helper.getCheckSumAddress(address);
	return covertedPayload.error ? address : covertedPayload.data.address;
}

export function pagination(page: string, limit: string) {
	const regexPage = page ? page.replace(/^['"]|['"]$/g, '') : undefined;
	const regexLimit = limit ? limit.replace(/^['"]|['"]$/g, '') : undefined;

	const data = {
		page:
			regexPage === undefined ||
			isNaN(Number(regexPage)) ||
			+regexPage <= 0
				? 1
				: +regexPage,
		limit:
			regexLimit === undefined ||
			isNaN(Number(regexLimit)) ||
			+regexLimit < 1 ||
			+regexLimit > 10
				? 10
				: +regexLimit,
	};

	return data;
}
