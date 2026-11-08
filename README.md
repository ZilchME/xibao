# xibao

[![NPM Version](https://img.shields.io/npm/v/xibao)](https://www.npmjs.com/package/xibao)

一个使用 `nodejs` 合成喜报/悲报图片的小工具, 合成图片基于高效的 [`sharp`](https://sharp.pixelplumbing.com)，仅需数毫秒即可合成一张喜报！

## REST API 服务

项目也提供 REST API，可通过 HTTP 生成图片。接口直接返回 JPEG 或 PNG 图片数据；相同请求会命中进程内缓存。缓存服务重启后清空。本版本不提供图床 URL 或持久化图片存储。

### 本地启动

需要 Node.js 24 或更高版本。复制环境变量示例并安装依赖：

```sh
cp .env.example .env
corepack yarn install --frozen-lockfile
corepack yarn start
```

默认监听 `http://127.0.0.1:3000`。也可以运行 `pnpm start` 启动服务。

### 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/healthz` | 健康检查 |
| `GET` | `/api/v1/templates` | 查询模板和默认样式 |
| `POST` | `/api/v1/images` | 生成图片并返回二进制 |
| `GET` | `/docs` | Swagger UI 交互式文档 |
| `GET` | `/docs/json` | OpenAPI JSON |

生成图片示例：

```sh
curl -fS -X POST http://127.0.0.1:3000/api/v1/images \
  -H 'Content-Type: application/json' \
  --data '{"template":"xibao","text":"接口生成测试","output":"jpeg"}' \
  -o xibao-test.jpg
```

请求支持 `template`（`xibao` 或 `beibao`）、`text`（字符串或字符串数组）、`output`（`jpeg` 或 `png`）和可选 `style`。成功响应的 `X-Cache` 为 `HIT`、`MISS` 或 `COALESCED`。

### 配置

复制 `.env.example` 为 `.env` 后可调整配置：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `3000` | API 端口 |
| `LOG_LEVEL` | `info` | Fastify 日志级别 |
| `REQUEST_BODY_LIMIT_BYTES` | `16384` | 请求体大小上限 |
| `CACHE_TTL_SECONDS` | `3600` | 图片缓存 TTL |
| `CACHE_MAX_ENTRIES` | `100` | 缓存条目上限 |
| `CACHE_MAX_BYTES` | `67108864` | 缓存总字节上限 |
| `API_PORT` | `3000` | Docker Compose 映射到宿主机的端口 |

### Docker 部署

```sh
cp .env.example .env
docker compose up --build -d
```

默认 API 地址为 `http://127.0.0.1:3000`，Swagger UI 位于 `/docs`。用 `API_PORT` 可调整宿主机端口。停止服务：

```sh
docker compose down
```

## Usage

```sh
npm i -S xibao
# Or
yarn add xibao
```

```javascript
const { resolve } = require('path')
const { xibao, beibao } = require('xibao')

// 直接提供字符串，每满32个半角字符时会自动换行
xibao('本群已从普通群升级为原神群')
  .then(img => img.toFile(resolve(__dirname, 'xibao.jpg')))
// 提供字符串数组，不会自动换行
beibao(['本群已从原神群', '降级为普通群'])
  .then(img => img.toFile(resolve(__dirname, 'beibao.jpg')))

// 如果你正在使用聊天机器人，你可以直接将图片转成 buffer 后上传/发送
const buffer = await xibao('悲报').jpeg().toBuffer()
// node-mirai-sdk
bot.sendImageMessage(buffer, Group(123456))
// oicq
bot.on('message', message => {
  message.reply([segment.image(buffer)])
})
// koishi
ctx.on('message', session => {
  session.send(h.image(buffer, 'image/jpeg'))
})
// 也可以将 buffer 再转成 base64 后使用
const base64 = 'data:image/jpeg;base64,' + buffer.toString('base64')

```

效果如下

![xibao](docs/xibao.jpg)

![beibao](docs/beibao.jpg)

## 注意事项

单行字数过多，或多行高度过高，背景图装不下时，会自动调整显示的字体大小，但效果不会很好，建议自行限制字数。默认样式下建议最多 32 个中文字符或 64 个英文字符。

## 高级用法

```javascript
const { resolve } = require('path')
const { setFont, custom } = require('xibao')

// 设置字体，会在下一次合成时生效
setFont(resolve(__dirname, 'assets/font.ttf'))
custom({
  background: {
    // 背景图片的路径，建议使用jpg或其他不透明图片，透明png合成jpg背景会变成黑色
    path: resolve(__dirname, 'path/to/background.jpg'),
    width: 114514, // 背景图片的宽度，用于计算文本位置
    height: 1919, // 背景图片的高度
  },
  defaultConfig: { // 默认文本设置, textOrTexts 未设置的选项应用此配置
    color: '#34a4e4', // 字体颜色，可以是 css 颜色，应用于 <svg><path fill="$color" /></svg>
    fontSize: 48, // 字体大小
    strokeColor: 'red', // 描边颜色，应用于 <svg><path stroke="$strokeColor" /></svg>
    strokeSize: 8, // 描边大小
  },
  textOrTexts: [ // 可以是字符串（自动换行）或数组
    '人人实现', // 使用数组时不会自动换行，每个数组成员为一行，使用 defaultConfig 作为配置
    { // 也可以单独配置某一行的内容，未设置的选项会使用 defaultConfig
      text: '喜报自由',
      color: '#66ccff',
      fontSize: 72,
      strokeColor: '#000000',
      strokeSize: 24,
    }
  ],
  lineSpace: 16, // 每行之间的行距
}).then(img => {
  img.toFile(resolve(__dirname, 'docs/custom.png'))
  // Or
  img.toBuffer().then(buffer => console.log(buffer.byteLength)) // ...
})

```

![custom](docs/custom.png)
