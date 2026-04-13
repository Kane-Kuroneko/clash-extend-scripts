// Define main function (script entry)

import { CVRAdapter } from '../../adapters/CVRAdapter';

// __ROUTING_MODE__ 会在构建时通过 DefinePlugin 注入
const adapter = new CVRAdapter(__ROUTING_MODE__);

function main(config?, profileName?) {
	return adapter.main(config, profileName);
}

//@ts-ignore
// __MAIN__;

//勿删,fakeInvoke防止webpack搞么蛾子
main();
