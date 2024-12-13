import { rateLimit } from 'express-rate-limit';
import { RATE_LIMITER_MESSAGE } from '../constant/constants';

// Create a rate limiter middleware with the provided options
const limiter = rateLimit({
	// The time window for which to track requests (in milliseconds)
	windowMs:
		(environment.windowms || RATE_LIMITER_MESSAGE.WINDOW_MS) * 60 * 1000,

	// The maximum number of requests allowed within the time window
	max: environment.maxRequest || RATE_LIMITER_MESSAGE.MAX,

	// Set standardHeaders to 'draft-7' for compliance with draft version 7 of the HTTP Rate Limiting Headers specification
	standardHeaders: 'draft-7',

	// Customize the message to be sent when the rate limit is exceeded
	message: {
		// Indicate that an error occurred due to rate limiting
		error: true,

		// The message to be sent when the rate limit is exceeded
		message: RATE_LIMITER_MESSAGE.TOO_MANY_REQUEST,
	},

	// Disable legacyHeaders to ensure compatibility with the standardHeaders option
	legacyHeaders: false,
});

// Export the rate limiter middleware for use in other parts of the application
export default limiter;
