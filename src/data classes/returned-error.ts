export class ReturnedError {
	orignalErr: any;

	code?: number;

	constructor(err: any, code: number = 0) {
		this.orignalErr = err;
		this.code = code;
	}
}
