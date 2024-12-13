/* eslint-disable */
import { Router } from 'express';
import { SourceCodePayload } from './SourceCodePayload';

interface IResponse {
	error?: boolean;
	message?: string;
	data?: any | any[];
	status?: number;
}

interface Controller {
	router: Router;
}

interface NestedObject {
	[key: string]:
		| NestedObject
		| number
		| Date
		| bigint
		| string
		| boolean
		| null;
}
interface CustomError extends Error {
	status?: number;
}
export { SourceCodePayload, IResponse, Controller, NestedObject, CustomError };
