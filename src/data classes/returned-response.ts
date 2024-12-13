import { ReturnedError } from './returned-error';

export class ReturnedResponse {
	formattedMessage: string;

	data?: any;

	error?: ReturnedError | null;

	httpStatusCode?: number;

	constructor(
		formattedMessage: string,
		data: any = null,
		error: ReturnedError | null = null,
		httpStatusCode = 0,
	) {
		this.formattedMessage = formattedMessage;
		this.data = data;
		this.error = error;
		this.httpStatusCode = httpStatusCode;
	}
}
