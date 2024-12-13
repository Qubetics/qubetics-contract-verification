import path from 'path';
import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { ERROR_MESSAGES, FILE_OPTIONS } from '../constant/constants';

// Set up memory storage for multer
const memoryStorage = multer.memoryStorage();

// Define a file filter function
const fileFilter = (
	req: Request,
	file: Express.Multer.File, // Use Express.Multer.File type for file object
	cb: FileFilterCallback,
) => {
	const allowedExtensions = ['.sol', '.json'];

	// Get the file extension and convert it to lowercase
	const extname = path.extname(file.originalname).toLowerCase();

	// Check if the file extension is in the allowed list
	if (allowedExtensions.includes(extname)) {
		// If the extension is allowed, pass no errors to the callback and accept the file
		cb(null, true);
	} else {
		cb(
			new Error(ERROR_MESSAGES.SOL_JSON_FILE_ONLY) as unknown as null,
			false,
		);
	}
};

// Create a multer instance for handling multiple file uploads
export const multipleFileUpload = multer({
	// Use memory storage for handling file uploads
	storage: memoryStorage,
	// Apply the defined file filter function
	fileFilter,
	// Set limits for file size (2MB limit per file)
	limits: {
		fileSize:
			(environment.fileSize || FILE_OPTIONS.FILE_SIZE_LIMIT) *
			1024 *
			1024,
	},
}).array('files', environment.fileLimit || FILE_OPTIONS.FILE_LIMIT);
