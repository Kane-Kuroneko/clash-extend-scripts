/**
 * 本工具用于切换flyingbird.js的引用
 */
const fs = require('fs');


const content = function () {
	try {
		return fs.readFileSync('./flyingbird.js',{encoding:"utf8"});
	}catch ( e ) {
		return undefined;
	}
}();

const entryContent = fs.readFileSync('./parser.js',{encoding:"utf8"});


fs.renameSync(
	content ? './flyingbird.js' : "./_flyingbird.js" ,
	content ? './_flyingbird.js' : './flyingbird.js' ,
);



fs.writeFileSync(
	'./parser.js' ,
	entryContent.replace(
		content ? `require('./flyingbird.js')` : `require('./_flyingbird.js')`,
		content ? `require('./_flyingbird.js')` : `require('./flyingbird.js')`
	) ,
	{ encoding : "utf8" }
);
