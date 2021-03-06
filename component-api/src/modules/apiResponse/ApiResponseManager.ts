import { IResponseObject, MessageResponseObject } from './responseObjects';
import { IApiErrorSource } from './apiError';

export interface IApiResponseSource {
	resultData?: IResponseObject<any>;
	errorSource?: IApiErrorSource;
	errorDetail?: { [x: string]: any };
}

export default class ApiResponseManager {
	constructor(resResolver: (source: IApiResponseSource) => any) {
		this.resResolver = resResolver;
	}

	private resResolver: (source: IApiResponseSource) => any;
	private resultData?: IResponseObject<any>;
	private errorSource?: IApiErrorSource;
	private errorDetail?: { [x: string]: any }

	get responded(): boolean {
		return (this.resultData != null || this.errorSource != null);
	}

	async ok(data: string | IResponseObject<any>): Promise<void> {
		if (this.responded) {
			throw new Error('already responded');
		}

		if (typeof data == 'string') {
			this.resultData = new MessageResponseObject(data);
		}
		else {
			this.resultData = data;
		}

		await this.resResolver({
			resultData: this.resultData,
			errorSource: this.errorSource,
			errorDetail: this.errorDetail
		});
	}

	async error(errorSource: IApiErrorSource, errorDetail?: { [x: string]: any }): Promise<void> {
		if (this.responded) {
			throw new Error('already responded');
		}

		this.errorSource = errorSource;
		this.errorDetail = errorDetail;

		await this.resResolver({
			resultData: this.resultData,
			errorSource: this.errorSource,
			errorDetail: this.errorDetail
		});
	}
}
