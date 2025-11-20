export function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env ${name}`);
  return val;
}

export const ENV = {
  SUPABASE_URL: () => requiredEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: () => requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  APP_JWT_SECRET: () => requiredEnv('APP_JWT_SECRET'),
  WECHAT_APPID: () => requiredEnv('WECHAT_APPID'),
  WECHAT_SECRET: () => requiredEnv('WECHAT_SECRET'),
  BAIDU_OCR_API_KEY: () => requiredEnv('BAIDU_OCR_API_KEY'),
  BAIDU_OCR_SECRET_KEY: () => requiredEnv('BAIDU_OCR_SECRET_KEY'),
};