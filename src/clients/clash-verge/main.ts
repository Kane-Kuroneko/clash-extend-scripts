// Define main function (script entry)

import { CVRAdapter } from '../../adapters/CVRAdapter';

// __ROUTING_MODE__ 会在构建时通过 DefinePlugin 注入
const adapter = new CVRAdapter(__ROUTING_MODE__);

export function main(config?, profileName?) {
	return adapter.main(config, profileName);
}
