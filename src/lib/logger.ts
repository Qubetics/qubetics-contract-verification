/* eslint-disable */
import { createLogger, format, transports } from 'winston';

const { timestamp, printf } = format;

// Function to format timestamp to Indian Standard Time (IST)
function formatTimestamp() {
	const options = {
		timeZone: 'Asia/Kolkata', // Set the timezone to Indian Standard Time
		hour12: false, // Use 24-hour format
	};
	return new Date().toLocaleString('en-US', options);
}

const logger = createLogger({
	format: format.combine(
		timestamp({ format: formatTimestamp }), // Custom timestamp format
		format.simple(),
		printf(
			(info: any) => `${info.timestamp} - ${info.level}: ${info.message}`,
		),
	),
	transports: [new transports.Console()],
});

export default logger;
