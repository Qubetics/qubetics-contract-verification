import cron, { CronJob } from 'cron';
import contractService from '../module/contract/contract.service';

class CronHelper {
	public updatePendingContracts() {
		new CronJob(
			'*/2 * * * *', // will run every 2  minutes.
			async () => {
				contractService.pendingContracts();
			},
			null,
			true,
			'Asia/Kolkata', // IST timezone
		);
	}
}

export default new CronHelper();
