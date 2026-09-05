# npm Package 发布流程

本文记录 `ao3-api-nodejs` 的手动发布流程，以及 `v0.1.0` 首次正式发布时遇到的问题。后续发布时，将示例中的版本号替换为目标版本。

## 一、三个相互独立的发布对象

一次完整发布包含三个独立动作：

1. **npm package**：用户通过 `npm install ao3-api-nodejs` 安装的包。
2. **Git Tag**：Git 仓库中指向发布提交的固定版本标记，例如 `v0.1.0`。
3. **GitHub Release**：基于 Git Tag 创建的版本页面，包含 release notes 和源码归档。

`npm publish` 不会自动创建 Git Tag 或 GitHub Release，三者需要分别完成。

## 二、发布前准备

### 1. 确定版本号

按照 Semantic Versioning 选择新版本：

- Patch：`0.1.0 -> 0.1.1`，兼容的 bug 修复。
- Minor：`0.1.0 -> 0.2.0`，新增功能；在 `1.0.0` 之前也常用于不兼容变更。
- Major：`1.x -> 2.0.0`，稳定 API 中存在不兼容变更；`1.0.0` 表示开始承诺稳定的公开 API。

修改 `package.json` 中的 `version`。同一个 npm 版本号不能重复发布，即使之前的版本存在问题，也必须使用新的版本号。

同时检查：

- Node.js 最低版本是否正确。
- 生产依赖版本是否合理。
- `README` 是否包含新增的公开 API。
- `src/index.ts` 和 `src/types/index.ts` 是否导出了新增函数及类型。
- `package.json` 的 `files`、`main`、`types` 和 `exports` 是否仍然正确。

### 2. 更新生产依赖和 lockfile

仅在本次发布需要更新生产依赖时执行：

```bash
pnpm update --prod
```

这会更新生产依赖解析结果并同步 `pnpm-lock.yaml`。完成后检查变化，避免混入无关的大范围升级：

```bash
git diff -- package.json pnpm-lock.yaml
pnpm audit --prod
```

注意：`pnpm audit --prod` 只负责检查已解析的生产依赖，不会自动更新依赖。

如果审计报告指向传递依赖，可以先查看依赖链：

```bash
pnpm why adm-zip
```

然后优先升级引入它的直接依赖，再重新生成 lockfile；不要直接把传递依赖随意添加到 `dependencies`。

### 3. 完整验证

```bash
pnpm install --frozen-lockfile
pnpm exec vitest run
pnpm run build
npm pack --dry-run
git diff --check
```

检查重点：

- 所有测试通过。
- TypeScript 构建成功。
- `npm pack --dry-run` 列出的包内容包含 `dist`、类型声明、README 和 LICENSE。
- 包中不包含源码 fixture、测试、coverage、TODO 或私密信息。
- 没有空白错误。

本项目配置了 `prepublishOnly: npm run build`，因此正式执行 `npm publish` 时还会再构建一次，但发布前仍应主动运行测试和构建。

### 4. 合并发布准备

将版本号、依赖、lockfile 和文档变化提交到发布分支，创建 PR，并等待 CI 全部通过后合并到 `main`。

正式发布前回到最新的 `main`：

```bash
git switch main
git pull --ff-only
git status --short
git log -1 --oneline
```

`git status --short` 应没有输出，并确认 HEAD 正是准备发布的提交。

## 三、发布到 npm

### 1. 检查 registry 和登录状态

```bash
npm config get registry
npm whoami
```

registry 应为：

```text
https://registry.npmjs.org/
```

如果 `npm whoami` 失败或显示的账号不正确，重新登录：

```bash
npm login
npm whoami
```

### 2. 检查 2FA

npm 发布现在要求满足以下任一条件：

- npm 账号启用了 two-factor authentication；或
- 使用启用了 bypass 2FA 的 granular access token。

本项目目前采用手动发布，建议给 npm 账号启用 2FA，然后交互式执行发布。若以后改为 CI 自动发布，优先评估 npm trusted publishing，而不是长期保存具有发布权限的 token。

### 3. 正式发布

```bash
npm publish --access public
```

`ao3-api-nodejs` 是 unscoped package，本身默认公开；显式写出 `--access public` 可以让发布意图更清楚。

发布期间按 npm 提示完成浏览器确认、security key 或 authenticator OTP 验证。

### 4. 验证 registry

```bash
npm view ao3-api-nodejs version
npm view ao3-api-nodejs@0.1.0
```

还可以在临时目录做一次真实安装，确认 registry 中的产物可以加载：

```bash
release_test_dir="$(mktemp -d)"
cd "$release_test_dir"
npm init -y
npm install ao3-api-nodejs@0.1.0
node --input-type=module -e "import('ao3-api-nodejs').then((module) => console.log(Object.keys(module)))"
cd -
```

确认目标公开函数和错误类型出现在导出列表中。

## 四、创建 Git Tag

确认 npm 包已经成功发布并验证后，再给同一个 `main` 提交创建 annotated tag：

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git show v0.1.0 --no-patch
git push origin v0.1.0
```

使用 annotated tag 的原因是它会保存 tagger、创建时间和说明，更适合作为正式发布标记。

版本对应关系必须一致：

```text
package.json version: 0.1.0
Git Tag:             v0.1.0
GitHub Release:      v0.1.0
```

## 五、创建 GitHub Release

先确认 GitHub CLI 已登录：

```bash
gh auth status
```

然后基于已经推送的 Tag 创建 Release。可以让 GitHub 自动生成说明：

```bash
gh release create v0.1.0 \
  --verify-tag \
  --title "v0.1.0" \
  --generate-notes
```

也可以提前准备 release notes 文件：

```bash
gh release create v0.1.0 \
  --verify-tag \
  --title "v0.1.0" \
  --notes-file /path/to/release-notes.md
```

`--verify-tag` 可以避免在 Tag 尚未推送或版本号写错时，让 GitHub CLI 自动从默认分支创建另一个 Tag。

Release notes 建议至少包含：

- 本版本主要新增功能。
- 重要 bug 修复或行为变化。
- Node.js 和 ESM 等兼容性要求。
- 必要的升级说明或 breaking changes。

最后验证：

```bash
gh release view v0.1.0
```

## 六、`v0.1.0` 本次发布实录

### 发布内容

- `package.json` 版本从 `0.0.4` 更新为 `0.1.0`。
- Node.js 最低版本从 `>=20.0.0` 更新为 `>=20.18.1`。
- `cheerio` 更新到 `^1.2.0`。
- `got-scraping` 更新到 `^4.2.1`。
- `pnpm-lock.yaml` 同步更新。
- `adm-zip` 最终解析为 `0.6.0`。
- 111 个测试全部通过，构建、package 内容检查和生产依赖审计通过。
- 发布准备通过 PR #13 合并到 `main`，GitHub Actions 的 Node.js 20、22、24 矩阵全部通过。

### 问题 1：更新直接依赖后，`adm-zip` 仍然是 `0.5.x`

`adm-zip` 不是项目直接依赖，而是以下链路中的传递依赖：

```text
got-scraping
└── header-generator
    └── generative-bayesian-network
        └── adm-zip
```

只运行 `pnpm audit --prod` 不会改变 lockfile，所以旧解析结果仍可能保留。

解决方式是更新生产依赖图并重新审计：

```bash
pnpm update --prod
pnpm why adm-zip
pnpm audit --prod
```

最终解析结果为：

```text
got-scraping 4.2.1
header-generator 2.1.87
generative-bayesian-network 2.1.87
adm-zip 0.6.0
```

生产依赖审计结果为没有已知漏洞。

### 问题 2：首次 `npm publish` 返回 E404

错误摘要：

```text
404 Not Found - PUT https://registry.npmjs.org/ao3-api-nodejs
'ao3-api-nodejs@0.1.0' is not in this registry
```

对于尚未发布的新包，“registry 中不存在”本身是正常状态；首次成功发布会创建这个包，不需要因为该消息修改包名。本次重新执行 npm 登录后，E404 消失，因此首先应检查的是 registry 和 CLI 认证状态：

```bash
npm config get registry
npm whoami
npm login
npm whoami
```

不要只根据 E404 判断包名不可用。如果登录后仍失败，再检查包名、账号权限和 npm package-name 规则。

### 问题 3：登录后 `npm publish` 返回 E403

错误摘要：

```text
403 Forbidden
Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

原因是账号已经成功认证，但不满足 npm 的发布安全要求。

本次解决方式：

1. 在 npm 账号中启用 2FA。
2. 重新执行 `npm publish --access public`。
3. 按提示完成二次验证。

完成后 `ao3-api-nodejs@0.1.0` 发布成功。

### 问题 4：npm 发布成功后没有 GitHub Tag 和 Release

这不是异常。npm registry、Git 和 GitHub Release 彼此独立，`npm publish` 不负责操作 GitHub。

本次在 npm 发布成功后另外执行了：

1. 在合并后的 `main` 提交上创建 annotated tag `v0.1.0`。
2. 将 Tag 推送到 `origin`。
3. 使用 GitHub CLI 创建正式 Release。

最终状态：

- npm package：<https://www.npmjs.com/package/ao3-api-nodejs/v/0.1.0>
- Git Tag：`v0.1.0`
- GitHub Release：<https://github.com/Tubring25/ao3-api-node/releases/tag/v0.1.0>
- Release 不是 Draft，也不是 Prerelease。
- Tag 指向 PR #13 合并后的提交 `feae6c4`。

## 七、后续发布速查清单

```text
[ ] 确定新版本号并修改 package.json
[ ] 检查 Node.js、生产依赖、README 和公开 exports
[ ] 必要时执行 pnpm update --prod
[ ] pnpm audit --prod 无已知漏洞
[ ] pnpm install --frozen-lockfile 成功
[ ] pnpm exec vitest run 全部通过
[ ] pnpm run build 成功
[ ] npm pack --dry-run 内容正确
[ ] git diff --check 通过
[ ] 发布准备 PR 已合并，main CI 通过
[ ] 本地 main 与 origin/main 同步且工作区干净
[ ] npm whoami 是正确账号
[ ] npm 账号已启用 2FA
[ ] npm publish --access public 成功
[ ] npm view 与临时安装验证成功
[ ] 创建并推送 annotated Git Tag
[ ] 创建正式 GitHub Release
[ ] Git Tag、package.json 和 GitHub Release 版本一致
```

## 八、官方参考

- `npm publish`：<https://docs.npmjs.com/cli/v11/commands/npm-publish/>
- npm 2FA：<https://docs.npmjs.com/about-two-factor-authentication/>
- npm 发布安全要求：<https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/>
- GitHub Release 管理：<https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository>
- `gh release create`：<https://cli.github.com/manual/gh_release_create>
