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

- 微信登录
  - POST /api/auth/wechat/login 使用 wx.login 的 code 调用微信 jscode2session ，创建/更新用户并签发自建 JWT。请求后端均需携带 Authorization: Bearer <token> 。
  - 代码位置： src/app/api/auth/wechat/login/route.ts:1
- 票据管理
  - 列表/创建： GET /api/tickets 、 POST /api/tickets
  - 详情/更新/删除： GET|PUT|DELETE /api/tickets/:id
  - 代码位置： src/app/api/tickets/route.ts:1 、 src/app/api/tickets/[id]/route.ts:1
- 短信解析（12306）
  - POST /api/parse/sms 提取车次、日期、站点、时刻、座位、检票口，返回结构化字段与置信度。
  - 代码位置： src/app/api/parse/sms/route.ts:1
- OCR 截图识别（不保存图片）
  - POST /api/ocr 支持 multipart/form-data 的 file 或 JSON base64 ；仅在内存中识别后丢弃图片，不在服务器保存。
  - 百度 OCR 接入并结构化输出同短信解析字段，返回置信度与原始 words_result 。
  - 代码位置： src/app/api/ocr/route.ts:1
- 车次经停站查询（缓存占位）
  - GET /api/train/:trainCode/stations?date=YYYY-MM-DD 先读 Supabase 缓存，未命中返回 not_cached 。后续可接入实时 12306 查询并写入缓存。
  - 代码位置： src/app/api/train/[trainCode]/stations/route.ts:1
- 健康检查
  - GET /api/health 返回版本、时间戳与缺失环境变量列表，便于部署验证。
  - 代码位置： src/app/api/health/route.ts:1
基础设施

- Supabase 客户端与工具
  - src/lib/supabase.ts:1 服务端客户端（Service Role Key）
  - src/lib/env.ts:1 环境变量读取
  - src/lib/auth.ts:1 自建 JWT 签发与校验、请求解析
  - src/lib/validation.ts:1 Zod 校验（用于票据创建）
- 已安装依赖
  - @supabase/supabase-js 、 jsonwebtoken 、 zod
数据库表结构建议

- users_wechat
  - 字段： id uuid ， openid text unique ， unionid text? ， nickname text? ， avatar_url text? ， created_at timestamptz ， last_login_at timestamptz
- tickets
  - 字段： id uuid ， user_id uuid ， train_code text ， from_station text ， to_station text? ， start_date date ， depart_time time? ， arrive_time time? ， seat_no text? ， gate text? ， carriage_no text? ， price numeric(10,2)? ， source_type enum('manual','sms','ocr') ， raw_sms text? ， raw_ocr_json jsonb? ， created_at timestamptz ， updated_at timestamptz
- train_routes_cache
  - 主键： train_code text + depart_date date
  - 字段： route_json jsonb ， cached_at timestamptz
环境变量

- SUPABASE_URL 、 SUPABASE_SERVICE_ROLE_KEY
- APP_JWT_SECRET
- WECHAT_APPID 、 WECHAT_SECRET
- BAIDU_OCR_API_KEY 、 BAIDU_OCR_SECRET_KEY
微信小程序对接说明

- 登录流程
  - 调用 wx.login 获取 code
  - wx.request 调用 POST /api/auth/wechat/login ，得到 { token, user }
  - 将 token 缓存在小程序端（如 storage ），后续请求均设置 Authorization: Bearer <token>
- 手动录票与短信识别
  - 粘贴短信调用 POST /api/parse/sms ，结果用于表单预填；未识别字段继续手填
  - 提交创建： POST /api/tickets （字段与返回的结构化数据一致）
- 车次经停站
  - 用户输入车次后，调用 GET /api/train/:trainCode/stations?date=YYYY-MM-DD 获取站点列表（当前读缓存；可在后端接入实时 12306 并写缓存）
- 截图 OCR（不保存图片）
  - 直接 wx.uploadFile 到 POST /api/ocr ，表单字段名 file ；后端识别完即丢弃图片
  - 返回结构化结果用于表单预填；不产生服务器端图片存储或 URL
部署与配置

- Vercel
  - 将以上环境变量添加到项目设置
  - API 路由运行时为 nodejs ，已设置
- 微信小程序
  - 将 Vercel 生产/预览域名加入「request 合法域名」
  - 强制 HTTPS
- 验证
  - 启动开发： npm run dev ，打开 http://localhost:3000/api/health 检查缺失的环境变量
  - 配置完成后，用小程序调用登录与受限接口验证整链
后续增强建议

- 接入实时 12306 路由查询并写入 train_routes_cache ，缓存 24h
- 为 parse/sms / ocr 增加更多模板适配与容错，提升识别率
- 增加限流与告警（例如对 OCR 与 12306 外部调用做每用户速率限制）
- 在 tickets 建索引 user_id, start_date DESC 优化分页查询