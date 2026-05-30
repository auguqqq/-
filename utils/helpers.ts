/**
 * Inkflow Studio v2.0.0 - Shared Helpers
 * 通用工具函数，避免多个文件重复定义
 */

/** 统计有效字数（中文字符 + 英文字母 + 数字） */
export const countActualChars = (text: string): number => {
  if (!text) return 0;
  const matches = text.match(/[一-龥a-zA-Z0-9]/g);
  return matches ? matches.length : 0;
};

/** 获取今天的日期字符串（YYYY-MM-DD） */
export const getTodayKey = () => new Date().toISOString().split('T')[0];
