# 上架 Microsoft Edge Add-ons 指南（Navvi v1.0.0）

> 目标：把扩展发布到 Edge 扩展商店（免费，无需 $5）。
> 本商店与 Chrome 同为 Chromium / Manifest V3，当前构建产物 `AI-Chat-Navigator-v1.0.0.zip` 可直接上传，无需改代码或重建。

## 一、你需要准备的账号与材料

| 项目 | 谁做 | 说明 |
|------|------|------|
| Microsoft 账号 + Partner Center 开发者账号 | 你 | 免费注册：https://partner.microsoft.com/dashboard/microsoftedge/overview 。无需付费，按提示填个人或公司信息即可。 |
| 隐私政策公开 URL | 你 | 用仓库根的 `privacy.html`。开启 GitHub Pages（Settings → Pages → branch `main`、folder `/root`）后，地址形如 `https://<你的用户名>.github.io/Chatgpt_Talk_v1/privacy.html`。 |
| 商店截图 | 你 | 至少 1 张，建议 1280×800（或 640×400）。展示扩展 UI：①侧边栏时间轴 ②高亮面板（含一条高亮）③收藏面板。需登录 ChatGPT 后手动截。 |
| 宣传图（可选） | 你 | 440×280 或 1400×560，商店列表用。 |

## 二、上传与提交步骤

1. 打开 [Microsoft Edge Add-ons 开发人员仪表板](https://partner.microsoft.com/dashboard/microsoftedge/overview)。
2. 首次进入按向导建好开发者/发布者档案（免费，无需税号除非你要收款；本扩展免费，可略过付款设置）。
3. 点 **"新建项" / Create new item**，填写扩展名称 `Navvi — AI Multi‑Agent Chat Navigator`（商店内需唯一，若提示冲突可加副标题如 `Navvi for ChatGPT`）。
4. **上传包**：选择仓库根的 `AI-Chat-Navigator-v1.0.0.zip`（manifest 在 zip 根，Edge 会自动读取）。
5. **列表信息**：
   - 简述（Short description，≤ 132 字符）：
     `Navigate, search, and organize your ChatGPT conversations — timeline, favorites, important markers, and inline AI-response highlights. Local-only.`
   - 详细描述（Description）：可直接复用 manifest 里的那段英文描述，或补充中文。
   - 类别（Category）：**Productivity**。
   - 语言（Language）：默认 English，可加中文。
6. **图标**：自动取 manifest（已含 16/32/48/96/128）。
7. **截图 / 宣传图**：上传第一步准备的图。
8. **隐私与权限（重点）**：
   - 隐私政策 URL：填 GitHub Pages 拿到的 `privacy.html` 链接。
   - 数据使用声明：本扩展**不收集任何用户数据**，所有数据仅存于浏览器本地（`chrome.storage.local`）。在问卷里逐项选“不收集 / 仅本地存储”。
   - 权限理由：`storage` = 本地保存高亮/收藏/重要标记；`host_permissions: https://chatgpt.com/*` = 向 ChatGPT 页面注入侧边栏导航 UI。单一目的：在 ChatGPT 内导航/检索/整理对话。
9. **分发**：可见性 **Public**；区域全选（或全区域）；价格 **Free**。
10. 提交审核。Edge 审核免费，通常 1–3 天（偶有到 7 天）。

## 三、合规自查（提交前确认）

- ✅ Manifest V3，无 `eval` / 远程代码。
- ✅ `permissions` 仅 `storage`；`host_permissions` 仅 `https://chatgpt.com/*`（窄权限，非 `<all_urls>`）。
- ✅ 数据全本地、绝不上传（与 `privacy.html` 一致）。
- ✅ 单一目的明确（导航/整理 ChatGPT 对话）。
- ⚠️ 若审核问到 `all_frames: true` + `match_origin_as_fallback`：说明是为了在 ChatGPT 的 iframe 渲染容器里也能挂载侧边栏 UI（参照项目 `chatgptSelectors.ts` 的 iframe 兼容设计）。

## 四、常见问题

- **需要重建包吗？** 不需要。当前 v1.0.0 zip 即 Edge 可用。
- **和 Chrome Web Store 的关系？** 本扩展首发只上 Edge（免费）。Edge 后台也支持“从 Chrome Web Store 导入”，但本仓库未上架 Chrome，故直接传 zip 即可。
- **以后发新版？** 在仪表板同一项里上传新 zip 并重新提交，商店会更新并保留用户本地数据（扩展 ID 由商店固定）。
- **GitHub 开源分发？** 属第二阶段（见后续 README 重写与 GitHub Release），本文不涉及；届时会在 README 说明 load-unpacked 安装及“就地升级保留数据”注意事项。
