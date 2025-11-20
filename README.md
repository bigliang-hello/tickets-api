## 目标
- 为小程序提供：微信登录、票据 CRUD、短信解析、OCR 识别、12306 站点查询。
- 不在服务器保存截图：OCR 仅做临时识别，图片即来即处理、即弃。

## 架构
- Next.js 14 App Router，Serverless API（`runtime: nodejs`）。
- Supabase Postgres；不使用 Supabase Auth，采用自建 JWT；所有 DB 操作由服务端执行。

## 数据库
- `users_wechat(id uuid, openid unique, unionid?, nickname?, avatar_url?, created_at, last_login_at)`
- `tickets(id, user_id, train_code, from_station, to_station, start_date, depart_time, arrive_time, seat_no, gate, carriage_no, price, source_type, raw_sms?, raw_ocr_json?, created_at, updated_at)`
- `train_routes_cache(train_code, depart_date, route_json, cached_at)`

## 登录
- `POST /api/auth/wechat/login`：用 `code` 调用 `jscode2session` 获取 `openid`，查找/创建用户，签发自建 JWT（`APP_JWT_SECRET`）。
- 客户端携带 `Authorization: Bearer <token>` 调用受限接口。

## API
- 票据：`GET/POST /api/tickets`，`GET/PUT/DELETE /api/tickets/:id`（需登录）。
- 短信解析：`POST /api/parse/sms` → 返回结构化字段与置信度。
- 经停站：`GET /api/train/:trainCode/stations?date=YYYY-MM-DD`（含缓存）。
- OCR：`POST /api/ocr`（表单 `file` 或 `base64`）；仅在内存处理，返回结构化字段；不落盘不入库图片。
- 健康检查：`GET /api/health`。

## 第三方
- 微信：`WECHAT_APPID`、`WECHAT_SECRET`；配置小程序合法域名。
- 百度 OCR：`BAIDU_OCR_API_KEY`、`BAIDU_OCR_SECRET_KEY`；服务端缓存 `access_token` 并自动续期。
- Supabase：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。

## 安全
- 自建 JWT（HS256）；服务端按 `user_id` 做行级逻辑隔离。
- 速率限制：`parse/sms`、`ocr`、`train/*` 按用户限流。
- 输入校验与隐私：限制文本/图片大小；不记录图片、不回传图片原文，仅保留必要解析字段。

## 部署
- Vercel 环境变量配置；API 路由标记 `runtime: nodejs`。
- 小程序加入 Vercel 生产/预览域名为合法请求域名。

## 测试
- 登录 E2E：`wx.login` → `/auth/wechat/login` → 带 JWT 访问受限接口。
- 解析准确率：短信/OCR 样例集统计命中率；不可识别字段保留前端回填。
- CRUD 与分页性能：`tickets(user_id, start_date DESC)` 索引。

## 里程碑
1) 微信登录 + JWT；2) 票据 CRUD；3) 短信解析；4) 12306 路由 + 缓存；5) 百度 OCR（无图存储）；6) Vercel 上线与 E2E 验收。