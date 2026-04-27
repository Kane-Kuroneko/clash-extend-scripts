/**
 * 用户自定义规则配置模块（类型重新导出）
 * 
 * 说明：
 * - 类型定义已迁移到 src/types/user-rules.d.ts（共享类型）
 * - 此文件仅用于向后兼容和重新导出
 * - 用户配置文件应从 'src/types/user-rules' 导入类型
 */

// 从共享类型重新导出（保持向后兼容）
export type {
  HostMatchType,
  ProcessMatchType,
  HostRule,
  ProcessRule,
  User3DRule,
  SimpleRule,
  ProxyGroup,
  UserCustomRulesConfig
} from '../types/user-rules';
