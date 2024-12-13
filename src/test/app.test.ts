// import request from 'supertest';
// import * as Application from '../App';
// import Environment from '../environments/environment';
// import { setGlobalEnvironment } from '../global';
// import web3Helper from '../helper/web3.helper';
// import DatabaseClient from '../service/db.service';

// const env: Environment = new Environment();
// setGlobalEnvironment(env);
// const App = new Application.default();
// App.init();
// web3Helper.run();
// DatabaseClient.run();

// describe(' Contract Verification API', () => {
//     // Mulltiple files as standard-json-input already in database verified
//     test('POST /verify - Verify Contract', async () => {
//         const result = {
//             contractaddress: '0xe9c999a761ead55cb92004fa6cff7faf4398017b',
//             codeformat: 'solidity-standard-json-input',
//             compilerversion: 'v0.8.25+commit.b61c2a91',
//             sourceCode: '{↵		"language": "Solidity",↵		"sources": {↵			"Contract1.sol": {↵				"content": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\nimport \"./Contract2.sol\";\n\ncontract SimpleERC20 is ComplexERC20 {\n    constructor(uint256 initialSupply) ComplexERC20(\"SimpleToken\", \"SIM\", initialSupply) {\n    }\n}"↵			},↵			"Contract2.sol": {↵				"content": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract ComplexERC20 {\n    string public name;\n    string public symbol;\n    uint8 public decimals = 18;\n    uint256 public totalSupply;\n\n    mapping(address => uint256) private _balances;\n    mapping(address => mapping(address => uint256)) private _allowances;\n\n    constructor(string memory _name, string memory _symbol, uint256 initialSupply) {\n        name = _name;\n        symbol = _symbol;\n        totalSupply = initialSupply * 10 ** uint256(decimals);\n        _balances[msg.sender] = totalSupply;\n        emit Transfer(address(0), msg.sender, totalSupply);\n    }\n\n    function balanceOf(address account) external view returns (uint256) {\n        return _balances[account];\n    }\n\n    function transfer(address recipient, uint256 amount) external returns (bool) {\n        _transfer(msg.sender, recipient, amount);\n        return true;\n    }\n\n    function allowance(address owner, address spender) external view returns (uint256) {\n        return _allowances[owner][spender];\n    }\n\n    function approve(address spender, uint256 amount) external returns (bool) {\n        _approve(msg.sender, spender, amount);\n        return true;\n    }\n\n    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {\n        _transfer(sender, recipient, amount);\n        _approve(sender, msg.sender, _allowances[sender][msg.sender] - amount);\n        return true;\n    }\n\n    function _transfer(address sender, address recipient, uint256 amount) internal {\n        require(sender != address(0), \"ERC20: transfer from the zero address\");\n        require(recipient != address(0), \"ERC20: transfer to the zero address\");\n        require(_balances[sender] >= amount, \"ERC20: transfer amount exceeds balance\");\n        \n        _balances[sender] -= amount;\n        _balances[recipient] += amount;\n        \n        emit Transfer(sender, recipient, amount);\n    }\n\n    function _approve(address owner, address spender, uint256 amount) internal {\n        require(owner != address(0), \"ERC20: approve from the zero address\");\n        require(spender != address(0), \"ERC20: approve to the zero address\");\n\n        _allowances[owner][spender] = amount;\n        emit Approval(owner, spender, amount);\n    }\n\n    event Transfer(address indexed from, address indexed to, uint256 value);\n    event Approval(address indexed owner, address indexed spender, uint256 value);\n}"↵			}↵		},↵		"settings": {↵			"optimizer": {↵				"enabled": false,↵				"runs": 200↵			},↵			"outputSelection": {↵				"*": {↵					"": [↵						"ast"↵					],↵					"*": [↵						"abi",↵						"metadata",↵						"devdoc",↵						"userdoc",↵						"storageLayout",↵						"evm.legacyAssembly",↵						"evm.bytecode",↵						"evm.deployedBytecode",↵						"evm.methodIdentifiers",↵						"evm.gasEstimates",↵						"evm.assembly"↵					]↵				}↵			},↵			"remappings": [],↵			"evmVersion": "london"↵		}↵	}',
//             action: 'verifysourcecodes',
//             module: 'contract',
//             runs: 200,
//             evmVersion: 'london'
//         };

//         const response = await request(App.expressApp)
//             .post('/verify')
//             .send(result);

//         expect(response.statusCode).toBe(400);
//         expect(response.body).toMatchObject({
//             message: 'contract already verified',
//             status: 400
//         });
//     });

//     // contract single file still not verified
//     test('POST /verify - Verify Contract', async () => {
//         const result = {
//             contractaddress: '0xe91b3028fe2381cadb46e6d6583cfa1d28f50640',
//             codeformat: 'solidity-single-file',
//             compilerversion: 'v0.8.25+commit.b61c2a91',
//             sourceCode: '// SPDX-License-Identifier: MIT↵pragma solidity ^0.8.24;↵↵contract Simple {↵    uint storedData;↵↵    function set(uint x) public {↵        storedData = x;↵    }↵↵    function get() public view returns (uint) {↵        return storedData;↵    }↵}',
//             action: 'verifysourcecodes',
//             module: 'contract',
//             runs: 200,
//             evmVersion: 'london'
//         };

//         const response = await request(App.expressApp)
//             .post('/verify')
//             .send(result);
//         expect(response.statusCode).toBe(400);
//         // expect(response.body).toMatchObject({ result: '0xe91B3028fE2381cAdb46E6D6583CFA1D28f50640', status: 1 });
//     });

//     // //fetch contract details
//     test('GET /detail/:contractAddress - Fetch Contract Details', async () => {
//         const response = await request(App.expressApp)
//             .get('/detail/0xe91b3028fe2381cadb46e6d6583cfa1d28f50640');

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toMatchObject({
//             bytecode: '"0x608060405234801561001057600080fd5b50600436106100365760003560e01c806360fe47b11461003b5780636d4ce63c14610057575b600080fd5b610055600480360381019061005091906100c3565b610075565b005b61005f61007f565b60405161006c91906100ff565b60405180910390f35b8060008190555050565b60008054905090565b600080fd5b6000819050919050565b6100a08161008d565b81146100ab57600080fd5b50565b6000813590506100bd81610097565b92915050565b6000602082840312156100d9576100d8610088565b5b60006100e7848285016100ae565b91505092915050565b6100f98161008d565b82525050565b600060208201905061011460008301846100f0565b9291505056fea26469706673582212203e2f54a65e1180159772aef1aba38df00734ea82de5e25e33f5c6a3bc671772564736f6c63430008180033"'
//         });
//     });

//     // //fetch contract details wrong contract
//     test('GET /detail/:contractAddress - Fetch Contract Details', async () => {
//         const response = await request(App.expressApp)
//             .get('/detail/0xe91b3028fe2381cadb46e6d6583cfa1d28f5064');

//         expect(response.statusCode).toBe(400);
//         expect(response.body).toMatchObject({
//             message: 'contract address  length should be equal to 42'
//         });
//     });

//     // //fetch contract status
//     test('GET /contract/status/:contractAddress - Fetch Contract Status', async () => {
//         const response = await request(App.expressApp)
//             .get('/contract/status/0xe91b3028fe2381cadb46e6d6583cfa1d28f50640');

//         expect(response.statusCode).toBe(200);
//         expect(typeof (response.body)).toMatch('object');
//     });

//     // //fetch contract abi wrong
//     test('GET /abi/:contractAddress - Fetch Contract abi', async () => {
//         const response = await request(App.expressApp)
//             .get('/abi/0xe91b3028fe2381cadb46e6d6583cfa1d28f50641');

//         expect(response.statusCode).toBe(404);
//         expect(response.body).toMatchObject({
//             'message': 'contract not found',
//             'status': 404
//         });
//     });

//     // fetch contract abi
//     test('GET /abi/:contractAddress - Fetch Contract abi', async () => {
//         const response = await request(App.expressApp)
//             .get('/abi/0x198BA7D6Ad9C7831d1DB59770388E0D4Db38F5d5');

//         expect(response.statusCode).toBe(200);
//         expect(typeof (response.body)).toMatch('object');
//     });

//     // fetch contract verification status
//     test('GET /verification/detail/:contractAddress - Fetch contract verification status', async () => {
//         const response = await request(App.expressApp)
//             .get('/verification/detail/0x198BA7D6Ad9C7831d1DB59770388E0D4Db38F5d5');

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toMatchObject({
//             result: 'Pass - Verified',
//             status: 1
//         });
//     });

//     // top verified contracts
//     test('GET /top - Top verified contracts ', async () => {
//         const response = await request(App.expressApp)
//             .get('/top');

//         expect(response.statusCode).toBe(200);
//     });

//     // fetch contract verification status
//     test('GET /verify - Fetch contract verification ', async () => {
//         const response = await request(App.expressApp)
//             .get('/verify?guid=0x198BA7D6Ad9C7831d1DB59770388E0D4Db38F5d5');

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toMatchObject({
//             result: 'Pass - Verified',
//             status: 1
//         });
//     });

//     // fetch contract based on wallet address
//     test('GET /user/verified/:walletAddress - Fetch Contract from wallet', async () => {
//         const response = await request(App.expressApp)
//             .get('/user/verified/0x3A87048524fe027A228D06915ff8b9Ed58425523');

//         expect(response.statusCode).toBe(404);
//         expect(response.body).toMatchObject({
//             'message': 'contract not found',
//             'status': 404
//         });
//     });

//     // fetch contract based on wallet address
//     test('GET /user/verified/:walletAddress - Fetch Contract from wallet', async () => {
//         const response = await request(App.expressApp)
//             .get('/user/verified/0x1a640ba5895b974d5eb6C051c7a362904640d635');

//         expect(response.statusCode).toBe(200);

//     });

//     // fetch contract widget
//     test('GET /widget - Fetch Contract widget', async () => {
//         const response = await request(App.expressApp)
//             .get('/widget');

//         expect(response.statusCode).toBe(200);

//     });
// });
