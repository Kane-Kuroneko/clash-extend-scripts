declare global {
	//@ts-ignore
	export const _: typeof import('lodash');
	export const __CompileTime_Rules__ : Awaited<ReturnType<typeof import('./CompileTimeScripts/fetch-rules')['fetchRules']>>
}
export {}
