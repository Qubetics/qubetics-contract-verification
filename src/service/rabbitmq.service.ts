import * as amqp from 'amqplib/callback_api';
import {
	ERROR_CODES,
	ERROR_MESSAGES,
	RABBITMQ_QUEUES,
	RES_MSG,
} from '../constant/constants';
import { ReturnedError, ReturnedResponse } from '../data classes';
import logger from '../lib/logger';
import contractConsumer from '../module/contract/contract.consumer';

class RabbitMQ {
	private channel: amqp.Channel; // Declaring a property to hold amqp Channel instance

	private connection: amqp.Connection;

	private static instance: RabbitMQ;

	constructor() {
		if (!RabbitMQ.instance) {
			RabbitMQ.instance = this;
		}
		return RabbitMQ.instance;
	}

	// close connection
	public async close() {
		return new Promise((resolve) => {
			this.connection.close((err: Error) => {
				if (!err)
					resolve(
						new ReturnedResponse(
							RES_MSG.RABBITMQ_CONNECTION_CLOSED,
						),
					);
				else
					resolve(
						new ReturnedResponse(
							'',
							null,
							new ReturnedError(
								err,
								ERROR_CODES.RABBITMQ_CONNECTION_CLOSE,
							),
						),
					);
			});
		});
	}

	// Method to establish connection to RabbitMQ
	public async run() {
		try {
			// create rabbitmq client and channel
			const rabbitMq = await this.connect();
			this.connection = rabbitMq.connection;
			this.channel = rabbitMq.channel;

			if (!this.channel)
				throw new Error(
					JSON.stringify({
						code: ERROR_CODES.RABBITMQ_QUEUE_CREATION,
						message: ERROR_MESSAGES.RABBITMQ_CHANNEL_NULL,
					}),
				);

			// create queues at startup
			this.setQueues();
			this.setConsumers();
			logger.info(RES_MSG.RABBITMQ_CONNECTION_SUCCESS);
			return new ReturnedResponse(RES_MSG.RABBITMQ_CONNECTION_SUCCESS);
		} catch (err: any) {
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.RABBIT_MQ_CONNECTION),
			);
		}
	}

	public async setQueues() {
		// set the prefetch count
		this.channel.prefetch(1);
		Object.values(RABBITMQ_QUEUES).forEach((queue) => {
			this.assertQueue(queue);
		});
	}

	// set the consumers
	public async setConsumers() {
		this.channel.consume(
			RABBITMQ_QUEUES.CONTRACT_VERIFICATION_QUEUE,
			contractConsumer.verifyContractConsumer,
		);
	}

	// set consumer
	public async setConsumer(queueName: string, cb: any) {
		this.channel.consume(queueName, cb, { noAck: false });
	}

	// Method to establish connection to RabbitMQ
	public connect(): Promise<{
		channel: amqp.Channel;
		connection: amqp.Connection;
	}> {
		return new Promise((resolve, reject) => {
			amqp.connect(environment.rabbitMq, (err, connection) => {
				// Connecting to RabbitMQ server
				if (err) {
					logger.error(ERROR_MESSAGES.RABBITMQ, err); // Logging error if connection fails
					reject(err); // Rejecting promise if connection fails
					return;
				}

				connection?.createChannel((error: Error, channel) => {
					// Creating channel
					if (error) {
						logger.error(ERROR_MESSAGES.RABBITMQ, error); // Logging error if channel creation fails
						reject(error); // Rejecting promise if channel creation fails
						return;
					}

					resolve({ channel, connection }); // Resolving promise with the created channel
				});
			});
		});
	}

	public ackMessage(message: amqp.Message) {
		try {
			if (!this.channel)
				throw new Error(
					JSON.stringify({
						code: ERROR_CODES.RABBITMQ_QUEUE_CREATION,
						message: ERROR_MESSAGES.RABBITMQ_CHANNEL_NULL,
					}),
				);
			this.channel.ack(message);
		} catch (err: any) {
			console.log('Error in askMessage:', err);
		}
	}

	// Method to assert a queue in RabbitMQ
	public assertQueue(queue: string, options = { durable: false }) {
		try {
			if (!this.channel)
				throw new Error(
					JSON.stringify({
						code: ERROR_CODES.RABBITMQ_QUEUE_CREATION,
						message: ERROR_MESSAGES.RABBITMQ_CHANNEL_NULL,
					}),
				);
			this.channel.assertQueue(queue, options); // Asserting a queue with given name
		} catch (err: any) {
			console.log('Error in enqueue data: ', err);
			throw new Error(
				JSON.stringify({
					code: ERROR_CODES.RABBITMQ_QUEUE_CREATION,
					message: ERROR_MESSAGES.RABBITMQ_CHANNEL_NULL,
				}),
			);
		}
	}

	// Method to send data to a queue in RabbitMQ
	public enqueueData(queue: string, data: string) {
		try {
			if (!this.channel)
				throw new Error(
					JSON.stringify({
						code: ERROR_CODES.RABBITMQ_QUEUE_INSERT,
						message: ERROR_MESSAGES.RABBITMQ_CHANNEL_NULL,
					}),
				);

			this.channel.sendToQueue(queue, Buffer.from(data));

			return new ReturnedResponse(RES_MSG.DATA_INSERTED_IN_QUEUE_SUCCESS);
		} catch (err: any) {
			console.log('Error in enqueue data: ', err);
			return new ReturnedResponse(
				'',
				null,
				new ReturnedError(err, ERROR_CODES.RABBITMQ_QUEUE_INSERT),
			);
		}
	}
}

export default new RabbitMQ();
