const util = require('util');
const solc = require('solc');

process.on('message', async ({ version, input }) => {
	solc.loadRemoteVersion(version, (err: any, compiler: any) => {
		if (err && process?.send) return process.send({ error: err.message });
		let output;
		try {
			output = compiler.compile(input);
                
			if (process?.send) {
				process.send({ output });
			}
		} catch (e) {
			if (process?.send) {
				process.send({ error: e });
			}
		}
		process.exit(0); 
	});
});
