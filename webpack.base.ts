
const { DefinePlugin } = webpack;

const optionDefinitions = [
	{
		name : 'flyingbird' as const ,
		type : Boolean ,
		
	},
	{
		name : 'watch' as const,
		type : Boolean,
		defaultValue:false,
	}
];
const args = commandLineArgs(optionDefinitions) as TypedArgs<typeof optionDefinitions>;
debugger;
const conf:Configuration = {
	mode : 'production' ,
	entry : {
		// 'generic':'./src/generic-transfer-to-DC.js',
		'cfw-script' : {
			import : './src/clients/clash-for-windows/cfw-script.ts' ,
			filename : 'clash-for-windows/cfw-script.js',
			library : {
				type : 'commonjs2'
			}
		} ,
		'clash-verge' : {
			import : './src/clients/clash-verge/script.ts' ,
			filename : 'clash-verge/script.js' ,
			library : {
				type : 'this'
			}
		} ,
	} ,
	output : {
		filename : `[name].js` ,
		iife : false ,
	} ,
	watch : args.watch ,
	stats : 'minimal' ,
	resolve : {
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
	},
	module : {
		rules : [
			{
				test : /\.(t|j)sx?$/i ,
				use : {
					loader : 'babel-loader' ,
					options : babelConf,
				},
			} ,
		],
	} ,
	performance: {
		maxEntrypointSize: 10000000,
		maxAssetSize: 30000000,
		hints : false
	},
	optimization : {
		mangleExports : false ,
		minimize : true ,
		minimizer : [
			new TerserPlugin({
				parallel : true ,
				terserOptions : {
					keep_fnames : true ,
					keep_classnames : true ,
					format : {
						comments : false ,
					} ,
				} ,
				extractComments : false ,
			}) ,
		] ,
	} ,
	plugins : [
		new DefinePlugin({
			__MAIN__ : `this['main']=main;` ,
			// __CompileTime_Rules__ : JSON.stringify(await fetchRules()),
		})
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
	(U extends any ? (x: U) => void : never) extends (x: infer I) => void
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
					T extends (...args: any[]) => infer R ? R :
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
