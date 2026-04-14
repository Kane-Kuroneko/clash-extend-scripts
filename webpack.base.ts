
const { DefinePlugin } = webpack;

// 参数定义 - 使用自定义解析支持位置参数
const optionDefinitions = [
	{
		name: 'client' as const,
		type: String,
		defaultOption: true,
		multiple: true,
	},
	{
		name: 'watch' as const,
		alias: 'w',
		type: Boolean,
		defaultValue: false,
	}
];

// 解析参数
const args = commandLineArgs(optionDefinitions) as TypedArgs<typeof optionDefinitions>;

// 从位置参数中提取 client 和 mode
// multiple: true 会将所有位置参数收集为数组
const positionalArgs = Array.isArray(args.client) ? args.client : [];

// 验证并提取参数
let clientArg: string | undefined;
let modeArg: string | undefined;

const validClients = ['cfw', 'cvr', 'clash-party'];
const validModes = ['global-proxy', 'auto-routing'];

positionalArgs.forEach(arg => {
	if (validClients.includes(arg)) {
		clientArg = arg;
	} else if (validModes.includes(arg)) {
		modeArg = arg;
	}
});

// 验证必填参数
if (!clientArg || !modeArg) {
	console.error('错误: 必须指定 client 和 mode 参数');
	console.error('用法: npm run build <cfw|cvr> <global-proxy|auto-routing>');
	console.error('示例: npm run build cvr global-proxy');
	console.error('示例: npm run build cfw auto-routing');
	process.exit(1);
}

console.log(`构建配置: client=${clientArg}, mode=${modeArg}`);

// 异步获取编译时规则
const compileTimeRules = await fetchRules();
const path = await import('path');
const { fileURLToPath } = await import('url');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 编译时规则直接通过 DefinePlugin 注入，无需写入文件
console.log(`规则数据大小: ${(JSON.stringify(compileTimeRules).length / 1024).toFixed(2)} KB`);

const conf: Configuration = {
	mode: 'production',
	entry: {
		[`${clientArg}-${modeArg}`]: {
			import: clientArg === 'cfw' 
				? './src/clients/clash-for-windows/main.ts'
				: clientArg === 'cvr'
					? './src/clients/clash-verge/main.ts'
					: './src/clients/clash-party/main.ts',
			filename: `${clientArg}/${modeArg}.js`,
			// CFW 需要 commonjs2 导出,CVR 和 Clash Party 不配置 library,直接在源码中导出
			...(clientArg === 'cfw' ? { library: { type: 'commonjs2' } } : {})
		}
	},
	output: {
		filename: `[name].js`,
		iife: false,
		// CVR 和 Clash Party 使用 var 库类型,将 main 导出为顶层变量
		...(clientArg !== 'cfw' ? { library: { type: 'var', name: 'main' }, libraryExport: 'main' } : {}),
	},
	watch: args.watch,
	stats: 'minimal',
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
	},
	module: {
		rules: [
			{
				test: /\.(t|j)sx?$/i,
				use: {
					loader: 'babel-loader',
					options: babelConf,
				},
			},
		],
	},
	performance: {
		maxEntrypointSize: 10000000,
		maxAssetSize: 30000000,
		hints: false
	},
	optimization: {
		mangleExports: false,
		minimize: true,
		minimizer: [
			new TerserPlugin({
				parallel: true,
				terserOptions: {
					keep_fnames: true,
					keep_classnames: true,
					format: {
						comments: false,
					},
				},
				extractComments: false,
			})
		],
	},
	plugins: [
		new DefinePlugin({
			__MAIN__: `this['main']=main;`,
			__ROUTING_MODE__: JSON.stringify(modeArg),
			__CompileTime_Rules__: JSON.stringify(compileTimeRules),
		}),
		// CVR 和 Clash Party:在文件头部添加 var main 声明,严格模式下不报错
		...(clientArg !== 'cfw' ? [new webpack.BannerPlugin({
			banner: 'var main;',
			raw: true,
		})] : [])
	]
} as Configuration;



webpack(conf , (err , stats) => {
	if ( err ) {
		console.log(err , 111111111111111);
	}
	if ( stats.hasErrors() ) {
		console.log(stats);
	}
	console.log(stats.toString({ colors : true }));
});

import {} from 'cmd-ts';
import { fetchRules } from './CompileTimeScripts/fetch-rules';
import commandLineArgs , {type OptionDefinition} from 'command-line-args';
import webpack from 'webpack';
import type { Configuration } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import babelConf from './babel.config.mjs';


/**
 * 辅助类型：将 union 转为 intersection（用于合并每个 option 的属性）
 */
type UnionToIntersection<U> =
	(U extends unknown ? (x: U) => void : never) extends (x: infer I) => void
		? I
		: never;

/**
 * 解析 type 字段对应的 TS 类型
 * - 未指定 type → string（库默认行为）
 * - Boolean → boolean
 * - Number → number
 * - String → string
 * - 自定义 parser 函数 → 自动推断其返回值
 */
type GetParserType<T> =
	T extends undefined | null | void ? string :
		T extends BooleanConstructor ? boolean :
			T extends NumberConstructor ? number :
				T extends StringConstructor ? string :
					T extends (...args: unknown[]) => infer R ? R :
						unknown;

/**
 * 判断是否为数组类型（multiple 或 lazyMultiple）
 */
type IsMultiple<D> =
	D extends { multiple: true } | { lazyMultiple: true } ? true : false;

/**
 * 基础值类型（不包含 undefined）
 */
type BaseValue<D extends OptionDefinition> = IsMultiple<D> extends true
	? GetParserType<D['type']>[]
	: GetParserType<D['type']>;

/**
 * 单个 option 对应的属性类型（核心逻辑）
 * - 如果定义中写了 defaultValue → 属性必选（required）
 * - 否则 → 属性可选（可选 + | undefined，与运行时“键不存在”行为一致）
 */
type OptionProp<D extends OptionDefinition> =
	D['name'] extends infer Name extends PropertyKey
		? 'defaultValue' extends keyof D
			? { [K in Name]: BaseValue<D> }           // 有 defaultValue → 必选
			: { [K in Name]?: BaseValue<D> }          // 无 defaultValue → 可选
		: never;

/**
 * 主类型：TypedArgs<typeof optionDefinitions>
 *
 * 支持 command-line-args 库的大部分常用 case：
 * - Boolean / String / Number / 自定义 parser
 * - multiple / lazyMultiple → 数组
 * - defaultValue → 必选属性
 * - defaultOption（位置参数）也自动支持（类型由 multiple 决定）
 * - name 为 literal 类型（as const）时，输出键为精确 literal
 * - 未指定的 type 默认 string
 *
 * 注意：
 * - 键不存在时访问返回 undefined（与库行为一致）
 * - 如果你使用了 parseOptions.camelCase，键名会被转换，需要自行处理
 * - _unknown 等特殊字段未包含（因为 commandLineArgs(optionDefinitions) 默认不返回）
 */
export type TypedArgs<Defs extends readonly OptionDefinition[]> =
	Defs extends readonly OptionDefinition[]
		? UnionToIntersection<
			Defs[number] extends infer D
				? D extends OptionDefinition
					? OptionProp<D>
					: never
				: never
		>
		: never;
