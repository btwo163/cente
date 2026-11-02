# GitHub 更新与发布

当前实现面向 Windows x64 便携版。全局设置中填写公开仓库 `owner/repo` 或完整 GitHub URL 并保存，可手动检查，或开启“启动 Cente 时自动检查更新”。更新只下载新版，不会在未点击确认时自动停止项目。

点击“下载并重启更新”会从指定仓库的最新正式 Release 下载 `cente-windows-x86_64.exe`，校验 SHA-256、文件大小与 Windows 程序文件头，再退出 Cente、替换程序并启动新版。退出会停止托管项目，更新后需手动启动项目。项目配置及日志不被覆盖。

检查更新优先读取 GitHub API；API 不可用、被限流或缺少附件校验值时，自动改读同仓库最新 Release 的 `cente-update.json`。该清单由发布工作流按实际编译产物生成，包含版本、附件地址、大小与 SHA-256，仍经过相同的后端校验，无需 GitHub 登录或令牌。

程序旁的 `cente.exe.update-backup-*` 保留旧程序。若文件替换或启动命令失败，安装脚本尝试恢复旧版；这不是对新版启动后健康状态的检测。安装错误记录在 `.cente-updates/<本次目录>/install-error.txt`。网络、下载或哈希校验失败时不会替换当前程序。

更新依赖 HTTPS 和所配置 GitHub 仓库的发布权限，SHA-256 用于完整性校验，不等同于独立的代码签名。不要把发布仓库改成不可信来源。当前不支持私有仓库、预发布版及降级。

## 发布步骤

1. 发布仓库为 `https://github.com/btwo163/cente`，也是程序默认更新源。仅上传源码、图标、构建文件、文档和 `.github/workflows/release.yml`。不要上传 `cente_projects.json`、`cente_updates.json`、日志、编译目录或旧程序备份。
2. 修改 `src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 为相同且递增的正式版本号，例如 `0.1.1`，更新 `Cargo.lock`，提交并推送。
3. 推送到 main 的版本号或发布工作流变更会自动触发 `Publish Windows release`；也可在 Actions 中手动运行。工作流测试并编译，发布对应版本及附件；不会覆盖已有版本。
4. 在 Cente 全局设置中保存该仓库地址并检查更新。

GitHub 仓库尚未创建或尚无正式 Release 时，检查更新会显示明确错误。首个带更新功能的版本需要先手动部署一次。
