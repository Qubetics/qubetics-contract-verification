export class HttpResponse {
	error: boolean;

	message?: string;

	data?: any | any[];

	status?: number;

	constructor(
		error: boolean,
		message: string = '',
		data: any = null,
		status: number = -1,
	) {
		this.error = error;
		this.message = message;
		this.data = data;
		this.status = status;
	}
}
