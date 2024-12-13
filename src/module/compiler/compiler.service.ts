import { IResponse } from '../../interfaces/index';
import { RES_MSG, COMPILER_TYPE, LICENSE_TYPE } from '../../constant/constants';

class CompilerService {
	/**
	 * Retrieves compiler type.
	 * @returns Promise<IResponse> - Response containing compiler type.
	 */
	async getCompilerType(): Promise<IResponse> {
		try {
			return {
				error: false,
				message: RES_MSG.COMPILER_TYPE_FETCH_SUCCESS,
				data: COMPILER_TYPE,
			};
		} catch (err) {
			return {
				error: true,
			};
		}
	}

	/**
	 * Retrieves license type.
	 * @returns Promise<IResponse> - Response containing license type.
	 */
	async getLicenseType(): Promise<IResponse> {
		try {
			return {
				error: false,
				message: RES_MSG.LICENSE_TYPE_FETCH_SUCCESS,
				data: LICENSE_TYPE,
			};
		} catch (err) {
			return {
				error: true,
			};
		}
	}
}

export default new CompilerService();
