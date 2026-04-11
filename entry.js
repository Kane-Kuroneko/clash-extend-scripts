
// const {execSync} = require('child_process');

// execSync(`node ./switch-filename.js`,(error,stdout,stderr) => {
// 	if (error) {
// 		console.log(`error: ${error.message}`);
// 		return;
// 	}
// 	if (stderr) {
// 		console.log(`stderr: ${stderr}`);
// 		return;
// 	}
// 	console.log(`stdout: ${stdout}`);
// });


// require('./switch-filename');
module.exports.parse = require('./parser.js').parse;


