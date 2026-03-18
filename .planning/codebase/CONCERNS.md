# Codebase Concerns

**Analysis Date:** 2026-03-18

## 当前问题

## Tech Debt

**前端与 Tauri 构建链不一致:**
- Issue: `src-tauri/tauri.conf.json` 的 `beforeDevCommand` 和 `beforeBuildCommand` 写死为 `pnpm dev` 与 `pnpm build`，但仓库根目录只有 `package.json`，没有 `pnpm-lock.yaml`、`package-lock.json` 或 `yarn.lock`，默认包管理器约定不清晰。
- Files: `package.json`, `src-tauri/tauri.conf.json`, `README.md`
- Impact: 新环境首次启动时容易因为未安装 `pnpm` 或团队成员使用不同包管理器而失败，构建过程也缺少可复现性。
- Fix approach: 明确统一包管理器；补充对应锁文件；让 `README.md` 和 `src-tauri/tauri.conf.json` 使用同一套命令。

**应用仍停留在模板示例结构:**
- Issue: 前端主界面仍是单文件示例页，业务状态、表单交互、样式和资源引用全部集中在 `src/App.tsx` 与 `src/App.css`；Rust 侧仅保留模板 `greet` 命令。
- Files: `src/App.tsx`, `src/App.css`, `src-tauri/src/lib.rs`
- Impact: 当前没有功能阻塞，但任何真实业务一旦接入，都会直接叠加到模板结构上，增加后续拆分成本。
- Fix approach: 在引入真实功能前先建立组件、状态、命令与样式的最小分层，再逐步替换模板内容。

## Known Bugs

**未发现可直接复现的功能性缺陷:**
- Symptoms: 代码检查范围内未发现明显运行时报错点，`src/App.tsx`、`src-tauri/src/lib.rs`、`src-tauri/tauri.conf.json` 也没有静态错误。
- Files: `src/App.tsx`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`
- Trigger: Not applicable
- Workaround: Not applicable

## Security Considerations

**桌面端 WebView 未配置 CSP:**
- Risk: `src-tauri/tauri.conf.json` 中 `app.security.csp` 为 `null`，当前模板页面内容静态且风险有限，但这意味着后续加载外部资源、插入 HTML 或引入更复杂前端依赖时，没有现成的内容安全策略兜底。
- Files: `src-tauri/tauri.conf.json`, `src/App.tsx`
- Current mitigation: Tauri 默认能力模型仍在使用，当前前端功能很少，尚未看到远程内容加载逻辑。
- Recommendations: 在引入真实业务前定义最小 CSP；仅为必要资源白名单放行；避免把“先设为 null”带入生产配置。

**默认启用 opener 插件能力:**
- Risk: `src-tauri/src/lib.rs` 注册了 `tauri_plugin_opener`，`src-tauri/capabilities/default.json` 允许 `opener:default`。当前前端代码没有调用 opener API，因此不是现成漏洞，但随着功能增加，若后续允许用户输入 URL 或路径并直接打开，权限边界会变得敏感。
- Files: `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`
- Current mitigation: 当前前端仅调用 `invoke("greet")`，没有暴露 opener 入口。
- Recommendations: 在真正需要前不要保留该插件；若需要，改为更窄的 capability 和显式 allowlist。

## Performance Bottlenecks

**当前不存在明显性能瓶颈:**
- Problem: 代码总量很小，前端与 Rust 入口逻辑都非常轻量，尚未观察到计算密集、I/O 密集或渲染热点。
- Files: `src/App.tsx`, `src/App.css`, `src-tauri/src/lib.rs`
- Cause: Not applicable
- Improvement path: 暂无必须处理的性能优化项，优先在功能落地后针对真实数据流做 profiling。

## Fragile Areas

**构建入口依赖隐式环境约定:**
- Files: `vite.config.ts`, `src-tauri/tauri.conf.json`
- Why fragile: Vite 开发服务器固定使用 `1420/1421` 端口，Tauri 构建又依赖外部命令启动前端；当端口被占用、开发主机变量变化或包管理器不一致时，本地开发链路会直接失败。
- Safe modification: 保持前端 dev server、Tauri `devUrl` 与脚本命令同步修改；任何一侧改端口或改包管理器，都要同时更新另一侧与文档。
- Test coverage: 没有自动化测试或 CI 来验证这条启动链路。

## Scaling Limits

**单组件前端结构只能支撑演示级别界面:**
- Current capacity: 当前 UI 只有一个 `App` 组件、一个输入框和一次 `invoke` 调用，适合模板验证。
- Limit: 一旦增加多个页面、状态来源、异步请求或本地持久化，`src/App.tsx` 与 `src/App.css` 会迅速膨胀，变更耦合变高。
- Scaling path: 在新增业务前先拆出页面层、通用组件层和 Tauri API 封装层。

**Tauri 命令层目前没有扩展边界设计:**
- Current capacity: `src-tauri/src/lib.rs` 只暴露一个无副作用的字符串命令 `greet`。
- Limit: 后续加入文件系统、网络、系统集成等命令时，如果继续直接在 `lib.rs` 增加命令并暴露给前端，权限、参数校验与错误处理会混在一起。
- Scaling path: 在命令数量增长前引入模块化命令组织、统一错误模型和输入校验。

## Dependencies at Risk

**模板依赖仍以脚手架默认项为主:**
- Risk: 当前依赖集中在 `react`、`vite`、`tauri` 与 `@tauri-apps/plugin-opener`；没有发现明显失效依赖，但 `opener` 插件属于“已启用但未使用”的依赖，长期保留会扩大维护面。
- Impact: 依赖越多，后续升级、权限审计和平台兼容验证的成本越高。
- Migration plan: 删除未使用插件；仅在真实功能需要时再加入平台能力依赖。

## Missing Critical Features

**缺少发布前最基本的质量与发布护栏:**
- Problem: 仓库中未发现测试文件、CI 工作流或发布校验流程；`README.md` 仍是模板说明，没有提供项目级安装、运行、打包或签名约束。
- Blocks: 当前不阻塞模板运行，但会阻塞团队协作、稳定发布和问题回归定位。

**缺少生产化错误处理与观测能力:**
- Problem: 前端 `greet` 调用没有错误展示，Rust 入口在启动失败时直接 `expect` 退出；仓库中也未见日志、诊断或崩溃上报方案。
- Blocks: 一旦功能增加，失败场景会难以定位，桌面端发布后问题反馈成本高。

## Test Coverage Gaps

**前后端主路径完全未测试:**
- What's not tested: `src/App.tsx` 的表单提交与 `invoke("greet")` 调用，`src-tauri/src/lib.rs` 的命令返回值，前后端联调启动链路。
- Files: `src/App.tsx`, `src/main.tsx`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`
- Risk: 后续改动可能在不被察觉的情况下打破桌面端最基础的交互与构建流程。
- Priority: High

## 随着功能增加会出现的风险

## Tech Debt

**全局样式文件会成为快速堆积点:**
- Issue: `src/App.css` 目前采用模板式全局选择器和单文件管理，适合示例，不适合多页面或主题扩展。
- Files: `src/App.css`
- Impact: 功能增多后容易出现样式覆盖、命名冲突和暗色模式回归。
- Fix approach: 提前约定组件级样式组织方式，避免继续把所有规则叠加进同一个全局文件。

## Security Considerations

**前端到 Rust 的命令边界会随功能增长变得更敏感:**
- Risk: 当前唯一命令 `greet` 没有副作用，但未来如果继续通过 `invoke` 暴露文件、系统或网络能力，而没有统一的输入校验和权限建模，桌面端攻击面会明显增大。
- Files: `src/App.tsx`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`
- Current mitigation: 现阶段命令面极小。
- Recommendations: 在新增高权限命令前先设计 capability、参数校验、错误返回和审计日志。

## Performance Bottlenecks

**渲染与桥接调用模式尚未为真实负载准备:**
- Problem: 当前没有列表渲染、缓存、节流或异步状态管理。随着功能增加，如果把更多逻辑直接留在 `App` 组件并频繁调用 Tauri 命令，界面响应和桥接开销会先于业务复杂度暴露问题。
- Files: `src/App.tsx`, `src-tauri/src/lib.rs`
- Cause: 模板代码没有建立数据层、状态层或命令调用约束。
- Improvement path: 在出现真实数据流时增加状态分层、批量调用策略和按需渲染，而不是继续沿用演示结构。

## Fragile Areas

**跨平台打包目标会放大发布复杂度:**
- Files: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
- Why fragile: `bundle.targets` 设为 `all`，当前没有看到 CI、签名、证书、平台差异校验或发布文档；功能越多，平台差异越容易在临发布阶段集中暴露。
- Safe modification: 在正式发布前明确首发平台并缩小 bundle 目标；补齐平台专项检查。
- Test coverage: 未发现任何自动化发布验证。

## Missing Critical Features

**缺少面向真实业务的数据持久化与迁移策略:**
- Problem: 当前代码没有本地存储、数据库、文件结构或版本迁移设计。
- Blocks: 一旦产品开始保存用户数据，后续升级兼容、数据恢复和回滚都会缺少基础设施。

---

*Concerns audit: 2026-03-18*
