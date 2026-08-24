/**
 * dsh-office-suite - 海洋办公室（Marvis 办公室）v4
 *
 * 白色等距(Isometric mockup)场景条，v4 针对实测反馈修复：
 *  1. 动态布局（修复宽高固定 bug）：
 *     - 实时测量 dsh 输入区(textarea/contenteditable) 的真实几何，
 *       场景条宽度跟随输入区宽度、高度随输入区高度联动、位置锚定在输入区正上方；
 *     - resize + MutationObserver(节流) + 定时兜底三重跟随，面板折叠/展开/缩放都不再遮挡；
 *  2. 人物立体化（告别纸片人）：
 *     - SVG 右侧挤出实心侧影厚度 + 底部斜投影，模拟体积感；
 *     - 行走动画改为「踏步式」双脚交替，脚下接地阴影同步脉冲，像真的在走；
 *  3. 显示器真实屏幕（告别白板）：
 *     - 屏幕改为深色玻璃 + 桌面壁纸 + 顶部菜单栏(仿红黄绿点) + 应用窗口 + 底部 Dock；
 *     - 工作时窗口点亮、代码行滚动 + 屏幕蓝光；空闲时桌面半透明待机。
 *
 * 其余保留：白底等距房间/硬投影/领导调度/按距离步行/日志流驱动/最小侵入
 * (fixed + pointer-events:none，不碰 body/root/shadow DOM，不遮输入框与左右/底部面板)。
 */

window.__ModuleLoader__.load({
  id: 'dsh-office-suite',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const STYLE_ID = 'dsh-office-suite-style'
    const ROOT_ATTR = 'data-dsh-ocean-root'

    // ---------- 员工定义（海洋拟人，对应 dsh sub-agent 职能） ----------
    const AGENTS = [
      { id: 'planner',  name: '牛·调度',  role: '主 Agent 调度', tool: ['dispatch_task', 'use_skill', 'ask_user', 'create_scheduled_task', 'modify_scheduled_task', 'search_history'] },
      { id: 'file',     name: '牛·文件',  role: 'file-agent',    tool: ['read_text', 'write_file', 'edit_file', 'delete', 'search_image', 'list_mcp_tools'] },
      { id: 'app',      name: '牛·应用',  role: 'app-agent',     tool: ['app', 'mcp_install', 'mcp_uninstall'] },
      { id: 'browser',  name: '牛·浏览',  role: 'browser',       tool: ['web_fetch', 'web_search'] },
      { id: 'system',   name: '牛·系统',  role: 'computer-agent', tool: ['shell_executor', 'python_executor'] },
      { id: 'search',   name: '牛·检索',  role: 'search-agent',  tool: ['game_kb_search', 'search_history'] },
    ]
    function agentForTool(name) {
      const n = (name || '').toLowerCase()
      for (const a of AGENTS) {
        if (a.tool.some((t) => t === n || (t.includes('_') && n.startsWith(t)))) return a.id
      }
      if (/web|fetch|search|curl|http/i.test(n)) return 'browser'
      if (/file|read|write|edit|delete|mkdir|copy|move|list|find/i.test(n)) return 'file'
      if (/shell|exec|python|node|npm|git|brew/i.test(n)) return 'system'
      if (/app|install|open|launch/i.test(n)) return 'app'
      return 'planner'
    }

    // ---------- 角色 SVG：Marvin 风格黑猫（背面坐姿，面向屏幕；围巾颜色区分身份） ----------
    function charaSVG(agentId) {
      const SC = {
        planner: { scarf: '#ef4444', dark: '#b91c1c' },  // Marvis 本人 = 红围巾（同参考图）
        file:    { scarf: '#3b82f6', dark: '#1d4ed8' },
        app:     { scarf: '#f97316', dark: '#c2410c' },
        browser: { scarf: '#a855f7', dark: '#7e22ce' },
        system:  { scarf: '#6366f1', dark: '#4338ca' },
        search:  { scarf: '#06b6d4', dark: '#0e7490' },
      }[agentId] || { scarf: '#64748b', dark: '#334155' }
      const s = SC.scarf, d = SC.dark
      return `<svg viewBox="0 0 96 106" width="54" height="60" aria-hidden="true">
        <g class="c-leg">
          <rect x="36" y="86" width="9" height="18" rx="4" fill="#94a3b8"/>
          <rect x="51" y="86" width="9" height="18" rx="4" fill="#94a3b8"/>
          <rect x="35" y="83" width="11" height="4" rx="2" fill="#64748b"/>
          <rect x="50" y="83" width="11" height="4" rx="2" fill="#64748b"/>
        </g>
        <g class="c-body">
          <ellipse cx="48" cy="74" rx="24" ry="24" fill="#cbd5e1"/>
          <path d="M30 62 Q28 86 48 94 Q68 86 66 62 Q64 54 48 52 Q32 54 30 62 Z" fill="#e2e8f0"/>
          <rect x="42" y="60" width="12" height="22" rx="6" fill="#94a3b8"/>
          <rect x="44" y="64" width="8" height="14" rx="4" fill="${s}"/>
          <circle cx="48" cy="66" r="2" fill="#fff" opacity=".7"/>
        </g>
        <g class="c-arm c-arm-l">
          <rect x="22" y="62" width="10" height="14" rx="5" fill="#cbd5e1"/>
          <circle cx="27" cy="76" r="5.5" fill="#94a3b8"/>
        </g>
        <g class="c-arm c-arm-r">
          <rect x="64" y="62" width="10" height="14" rx="5" fill="#cbd5e1"/>
          <circle cx="69" cy="76" r="5.5" fill="#94a3b8"/>
        </g>
        <g class="c-head">
          <rect x="25" y="12" width="46" height="40" rx="16" fill="#cbd5e1"/>
          <rect x="31" y="18" width="8" height="28" rx="4" fill="#94a3b8"/>
          <rect x="57" y="18" width="8" height="28" rx="4" fill="#94a3b8"/>
          <circle cx="25" cy="28" r="5.5" fill="#94a3b8"/>
          <circle cx="71" cy="28" r="5.5" fill="#94a3b8"/>
          <path d="M42 8 L46 2 L50 8 L48 15 L44 15 Z" fill="#64748b"/>
          <circle cx="48" cy="1" r="3.5" fill="#ef4444"/>
          <rect x="34" y="48" width="28" height="5" rx="2.5" fill="#94a3b8"/>
        </g>
      </svg>
      `
    }

    // 侧脸行走变体：黑色猫形侧面（朝右，dir='l' 时整体镜像朝左）
    function sideSVG(agentId, dir) {
      const SC2 = {
        planner: { scarf: '#ef4444', dark: '#b91c1c' },
        file:    { scarf: '#3b82f6', dark: '#1d4ed8' },
        app:     { scarf: '#f97316', dark: '#c2410c' },
        browser: { scarf: '#a855f7', dark: '#7e22ce' },
        system:  { scarf: '#6366f1', dark: '#4338ca' },
        search:  { scarf: '#06b6d4', dark: '#0e7490' },
      }[agentId] || { scarf: '#64748b', dark: '#334155' }
      const s = SC2.scarf, d = SC2.dark
      const open = dir === 'l' ? '<g transform="translate(96,0) scale(-1,1)">' : ''
      const close = dir === 'l' ? '</g>' : ''
      return `<svg viewBox="0 0 96 106" width="54" height="60" aria-hidden="true">${open}
        <g class="c-leg c-leg-b">
          <rect x="42" y="84" width="9" height="20" rx="4" fill="#94a3b8"/>
          <rect x="55" y="84" width="9" height="20" rx="4" fill="#94a3b8"/>
        </g>
        <g class="c-leg c-leg-f">
          <rect x="26" y="86" width="9" height="18" rx="4" fill="#cbd5e1"/>
        </g>
        <g class="c-body">
          <ellipse cx="47" cy="72" rx="22" ry="23" fill="#cbd5e1"/>
          <path d="M33 60 Q30 80 47 90 Q62 80 59 60 Z" fill="#e2e8f0" opacity=".6"/>
          <circle cx="42" cy="70" r="7" fill="${s}"/>
          <circle cx="42" cy="70" r="4.5" fill="${d}" opacity=".7"/>
          <circle cx="40.5" cy="68.5" r="1.5" fill="#fff" opacity=".8"/>
        </g>
        <g class="c-arm c-arm-l">
          <rect x="54" y="54" width="10" height="18" rx="5" fill="#cbd5e1"/>
          <circle cx="59" cy="72" r="5.5" fill="#94a3b8"/>
        </g>
        <g class="c-arm c-arm-r">
          <rect x="31" y="54" width="9" height="15" rx="4" fill="#cbd5e1"/>
          <circle cx="35" cy="70" r="5" fill="#64748b"/>
        </g>
        <g class="c-head">
          <path d="M34 12 Q26 18 26 32 Q26 45 34 50 L62 50 Q70 45 70 32 Q70 18 62 12 Z" fill="#cbd5e1"/>
          <path d="M62 22 Q74 24 74 35 Q74 44 62 46 L62 22 Z" fill="#e2e8f0"/>
          <circle cx="36" cy="28" r="6" fill="#94a3b8"/>
          <circle cx="58" cy="27" r="8.5" fill="#0f172a"/>
          <circle cx="58" cy="27" r="4.2" fill="#38bdf8"/>
          <circle cx="56.3" cy="25.3" r="1.6" fill="#fff"/>
          <path d="M66 37 Q70 40 66 43" stroke="#334155" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <path d="M46 6 L50 0 L54 6 L52 14 L48 14 Z" fill="#64748b"/>
          <circle cx="52" cy="1" r="3" fill="#ef4444"/>
          <rect x="40" y="46" width="20" height="6" rx="3" fill="#94a3b8"/>
        </g>
      </svg>${close}`
    }

    // 领导侧脸：更大一号的黑猫经理侧面
    function sideBOSS(dir) {
      const open = dir === 'l' ? '<g transform="translate(96,0) scale(-1,1)">' : ''
      const close = dir === 'l' ? '</g>' : ''
      return `<svg viewBox="0 0 96 106" width="58" height="64" aria-hidden="true">${open}
        <g class="c-leg c-leg-b">
          <rect x="42" y="84" width="10" height="20" rx="5" fill="#64748b"/>
          <rect x="56" y="84" width="10" height="20" rx="5" fill="#64748b"/>
        </g>
        <g class="c-leg c-leg-f">
          <rect x="24" y="86" width="10" height="18" rx="5" fill="#94a3b8"/>
        </g>
        <g class="c-body">
          <ellipse cx="47" cy="72" rx="23" ry="24" fill="#94a3b8"/>
          <path d="M32 60 Q29 82 47 92 Q62 82 59 60 Z" fill="#cbd5e1" opacity=".55"/>
          <circle cx="42" cy="70" r="8" fill="#f59e0b"/>
          <circle cx="42" cy="70" r="5" fill="#b45309" opacity=".7"/>
          <circle cx="40.2" cy="68.2" r="1.6" fill="#fff" opacity=".85"/>
          <rect x="32" y="80" width="30" height="4" rx="2" fill="#475569"/>
        </g>
        <g class="c-arm c-arm-l">
          <rect x="53" y="52" width="11" height="20" rx="5" fill="#94a3b8"/>
          <circle cx="58" cy="72" r="6" fill="#64748b"/>
        </g>
        <g class="c-arm c-arm-r">
          <rect x="30" y="52" width="10" height="16" rx="4" fill="#94a3b8"/>
          <circle cx="35" cy="70" r="5.5" fill="#334155"/>
        </g>
        <g class="c-head">
          <path d="M33 10 Q25 17 25 32 Q25 46 33 52 L62 52 Q71 46 71 32 Q71 17 62 10 Z" fill="#94a3b8"/>
          <path d="M62 20 Q75 22 75 35 Q75 46 62 48 L62 20 Z" fill="#cbd5e1"/>
          <circle cx="35" cy="26" r="6.5" fill="#64748b"/>
          <circle cx="58" cy="25" r="9" fill="#0f172a"/>
          <circle cx="58" cy="25" r="4.5" fill="#38bdf8"/>
          <circle cx="56.2" cy="23.2" r="1.7" fill="#fff"/>
          <path d="M66 36 Q70 39 66 43" stroke="#1e293b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <path d="M45 4 L49 -2 L53 4 L51 13 L47 13 Z" fill="#64748b"/>
          <circle cx="51" cy="-1" r="3.2" fill="#fbbf24"/>
          <rect x="40" y="46" width="21" height="6" rx="3" fill="#64748b"/>
          <path d="M36 44 Q32 52 36 60" stroke="#fbbf24" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>
      </svg>${close}`
    }

    // 领导（经理）：Marvin 黑猫 + 深蓝围巾 + 金链领带 + 公文包（更大一号）
    const BOSS_SVG = `<svg viewBox="0 0 96 106" width="58" height="64" aria-hidden="true">
      <g class="c-leg">
        <rect x="36" y="86" width="10" height="18" rx="5" fill="#64748b"/>
        <rect x="51" y="86" width="10" height="18" rx="5" fill="#64748b"/>
        <rect x="35" y="83" width="12" height="4" rx="2" fill="#334155"/>
        <rect x="50" y="83" width="12" height="4" rx="2" fill="#334155"/>
      </g>
      <g class="c-body">
        <ellipse cx="48" cy="74" rx="25" ry="24" fill="#94a3b8"/>
        <path d="M30 62 Q28 86 48 94 Q68 86 66 62 Q64 54 48 52 Q32 54 30 62 Z" fill="#cbd5e1"/>
        <rect x="41" y="58" width="14" height="24" rx="7" fill="#64748b"/>
        <rect x="43" y="62" width="10" height="16" rx="5" fill="#f59e0b"/>
        <circle cx="48" cy="66" r="2.2" fill="#fff" opacity=".8"/>
      </g>
      <g class="c-arm c-arm-l">
        <rect x="21" y="62" width="11" height="15" rx="5" fill="#94a3b8"/>
        <circle cx="26" cy="77" r="6" fill="#64748b"/>
      </g>
      <g class="c-arm c-arm-r">
        <rect x="64" y="62" width="11" height="15" rx="5" fill="#94a3b8"/>
        <circle cx="70" cy="77" r="6" fill="#64748b"/>
      </g>
      <g class="c-head">
        <rect x="25" y="11" width="46" height="41" rx="17" fill="#94a3b8"/>
        <rect x="31" y="17" width="9" height="29" rx="4" fill="#64748b"/>
        <rect x="56" y="17" width="9" height="29" rx="4" fill="#64748b"/>
        <circle cx="24" cy="28" r="6" fill="#64748b"/>
        <circle cx="72" cy="28" r="6" fill="#64748b"/>
        <path d="M42 7 L46 1 L50 7 L48 14 L44 14 Z" fill="#64748b"/>
        <circle cx="48" cy="0" r="3.5" fill="#fbbf24"/>
        <rect x="33" y="48" width="30" height="5" rx="2.5" fill="#64748b"/>
      </g>
    </svg>
    `


    // ---------- 白色等距 mockup 场景条样式 ----------
    const CSS = `
[${ROOT_ATTR}] {
  position: fixed !important;
  /* 布局(top/left/width/height/transform)由 JS 实时锚定输入区上方，此处仅兜底默认值；
     注意不可加 !important，否则会压过 JS 内联样式导致动态布局失效 */
  top: 164px;
  left: 50%;
  transform: translateX(-50%);
  width: min(1560px, calc(100vw - 420px));
  min-width: 420px;
  height: 280px;
  z-index: 2147482000 !important;
  pointer-events: none !important;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --dso-text-0: #1e293b;
  --dso-text-1: #475569;
  --dso-text-2: #94a3b8;
  --dso-accent: #38bdf8;
  opacity: 0;
  transition: opacity .4s ease;
  filter: none;
}
[${ROOT_ATTR}].dso-ready { opacity: 1; }
/* 模型选择等 dsh 下拉弹层打开时，淡出面动画板避免遮挡 */
[${ROOT_ATTR}].dso-dim { opacity: 0.1 !important; filter: blur(1.5px); }
[${ROOT_ATTR}] * { pointer-events: none !important; box-sizing: border-box; }

/* 房间：外层裁剪窗口（承接等轴测世界露出的底色），矩形窗内是旋转的 3D 菱形世界 */
[${ROOT_ATTR}] .dso-room {
  position: absolute; inset: 0;
  border-radius: 18px;
  background:
    radial-gradient(140% 120% at 50% -18%, rgba(56,189,248,.07), rgba(56,189,248,0) 55%),
    linear-gradient(180deg, #f2f6fb 0%, #f6f9fc 60%, #edf3fa 100%);
  border: 1px solid rgba(100,116,139,.22);
  box-shadow: 0 20px 46px rgba(15,23,42,.16), 0 5px 14px rgba(15,23,42,.08),
    inset 26px 0 34px -26px rgba(15,23,42,.14),
    inset -26px 0 34px -26px rgba(15,23,42,.14),
    inset 0 18px 24px -18px rgba(15,23,42,.12);
  overflow: hidden;
}
/* 等轴测 3D 世界：上帝斜视角——整块平面绕 X 轴前倾 54° 呈现俯视，绕 Z 轴转 -45° 使正方形变菱形（类正等轴测），放大铺满窗口 */
[${ROOT_ATTR}] .dso-world {
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(18deg) scale(1.05);
  transform-origin: 50% 100%;
}
/* 原正视房间的墙面/踢脚线元素在 3D 世界下不再需要，隐藏 */
[${ROOT_ATTR}] .dso-room::after, [${ROOT_ATTR}] .dso-room::before { display: none; }
/* 地板（等轴测世界地面）：铺满整个世界平面，菱形地砖 + 左上受光、右下微沉（光源统一左上） */
[${ROOT_ATTR}] .dso-floor {
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(0deg, rgba(148,163,184,.17) 0 1.5px, transparent 1.5px 46px),
    repeating-linear-gradient(90deg, rgba(148,163,184,.17) 0 1.5px, transparent 1.5px 46px),
    linear-gradient(180deg, rgba(226,232,240,.92) 0%, rgba(226,232,240,0) 34%),
    linear-gradient(118deg, #ffffff 0%, #f7fafd 55%, #edf2f9 100%);
  box-shadow: inset 0 0 60px rgba(100,116,139,.10);
}

/* 地面内凹收影（世界边缘暗角，强化菱形地板与底色区分） */
[${ROOT_ATTR}] .dso-floor-edge {
  position: absolute; inset: 0;
  background:
    radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(15,23,42,.10) 100%);
}

/* 3D 等轴测世界下，原正视墙上的远景装饰（书架/窗/钟/绿植）会躺倒失真，整体隐藏，保持地面纯净 */
[${ROOT_ATTR}] .dso-depth, [${ROOT_ATTR}] .dso-window, [${ROOT_ATTR}] .dso-clock, [${ROOT_ATTR}] .dso-plant { display: none; }

/* 远景层：后墙书架/柜体（景深，挂在远处矮墙上，分散布局建立纵深） */
[${ROOT_ATTR}] .dso-depth {
  position: absolute; left: 0; right: 0; top: 2px; height: 13%;
  background: none;
  filter: none; opacity: 1;
}
[${ROOT_ATTR}] .dso-depth::before {
  content: ''; position: absolute; left: 18%; top: 5px; width: 150px; height: 34px;
  border-radius: 4px;
  background:
    repeating-linear-gradient(0deg, rgba(148,163,184,.18) 0 3px, transparent 3px 11px),
    linear-gradient(180deg, rgba(148,163,184,.14), rgba(148,163,184,.05));
  border: 1px solid rgba(100,116,139,.18);
  box-shadow: 5px 5px 0 rgba(15,23,42,.07), inset 0 1px 0 rgba(255,255,255,.4);
}
[${ROOT_ATTR}] .dso-depth::after {
  content: ''; position: absolute; right: 16%; top: 7px; width: 110px; height: 30px;
  border-radius: 4px;
  background:
    repeating-linear-gradient(90deg, rgba(148,163,184,.16) 0 3px, transparent 3px 14px),
    linear-gradient(180deg, rgba(148,163,184,.12), rgba(148,163,184,.04));
  border: 1px solid rgba(100,116,139,.18);
  box-shadow: 5px 5px 0 rgba(15,23,42,.07), inset 0 1px 0 rgba(255,255,255,.4);
}
/* 后墙中部挂画：小画框点缀 */
[${ROOT_ATTR}] .dso-depth .dso-pic {
  position: absolute; left: 56%; top: 9px; width: 64px; height: 24px;
  border-radius: 3px;
  background: linear-gradient(180deg, rgba(56,189,248,.20), rgba(56,189,248,.05));
  border: 1px solid rgba(100,116,139,.2);
  box-shadow: 4px 4px 0 rgba(15,23,42,.07), inset 0 1px 0 #fff;
}

/* 窗户：浅色天空 + 硬投影 */
[${ROOT_ATTR}] .dso-window {
  position: absolute; top: 16px; right: 26px; width: 124px; height: 66px;
  border-radius: 10px;
  background:
    radial-gradient(70% 70% at 72% 16%, rgba(255,255,255,.6), transparent 62%),
    linear-gradient(180deg, #cbe9fb 0%, #e2f3fe 50%, #a9d4f2 52%, #7fb8e8 100%);
  border: 5px solid #f8fafc;
  box-shadow: 9px 9px 0 rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.06);
  overflow: hidden;
}
[${ROOT_ATTR}] .dso-window::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0; bottom: 0;
  background: linear-gradient(120deg, transparent 40%, rgba(255,255,255,.55) 50%, transparent 60%);
  animation: dso-wsh 5s ease-in-out infinite;
}
@keyframes dso-wsh { 0%,100% { transform: translateX(-30%);} 50% { transform: translateX(30%);} }
[${ROOT_ATTR}] .dso-window::after {
  content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(100,116,139,.28);
}

/* 时钟：白色 */
[${ROOT_ATTR}] .dso-clock {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  width: 46px; height: 46px; border-radius: 50%;
  background: radial-gradient(40% 40% at 35% 28%, #fff, transparent 60%), linear-gradient(160deg, #ffffff, #dbe3ef);
  border: 2px solid rgba(100,116,139,.4);
  box-shadow: 7px 7px 0 rgba(15,23,42,.08), inset 0 -2px 3px rgba(148,163,184,.4);
}
[${ROOT_ATTR}] .dso-clock::before {
  content: ''; position: absolute; left: 50%; top: 7px; width: 2px; height: 14px;
  background: #475569; transform-origin: 50% 100%; animation: dso-tick 6s linear infinite;
}
[${ROOT_ATTR}] .dso-clock::after {
  content: ''; position: absolute; left: 50%; top: 7px; width: 2px; height: 10px;
  background: #94a3b8; transform-origin: 50% 100%; animation: dso-tick 36s linear infinite;
}
@keyframes dso-tick { to { transform: rotate(360deg); } }

/* 绿植 */
[${ROOT_ATTR}] .dso-plant {
  position: absolute; left: 14px; bottom: 52px; width: 36px; height: 58px;
  transform-origin: 50% 100%; animation: dso-sway 4s ease-in-out infinite;
  filter: drop-shadow(3px 4px 5px rgba(15,23,42,.12)) drop-shadow(1px 1px 0 rgba(15,23,42,.06));
}
@keyframes dso-sway { 0%,100% { transform: rotate(-3deg);} 50% { transform: rotate(3deg);} }
[${ROOT_ATTR}] .dso-plant .pot { position: absolute; bottom: 0; left: 4px; width: 28px; height: 15px; border-radius: 3px 3px 7px 7px; background: linear-gradient(180deg,#f97316,#ea580c 55%,#c2410c); box-shadow: inset 0 1px 0 rgba(255,255,255,.35); }
[${ROOT_ATTR}] .dso-plant .leaf { position: absolute; bottom: 13px; left: 13px; width: 10px; height: 30px; border-radius: 50%; background: linear-gradient(180deg,#4ade80,#0ea5e9); box-shadow: inset 1px 0 1px rgba(255,255,255,.5), inset -1px 0 1px rgba(15,23,42,.12); transform-origin: 50% 100%; }
[${ROOT_ATTR}] .dso-plant .leaf:nth-child(1){ transform: rotate(-30deg);} [${ROOT_ATTR}] .dso-plant .leaf:nth-child(2){ transform: rotate(18deg); height: 34px;} [${ROOT_ATTR}] .dso-plant .leaf:nth-child(3){ transform: rotate(40deg);}

/* 领导区：浅木桌 + 硬投影 */
[${ROOT_ATTR}] .dso-boss-zone { position: absolute; left: 84%; bottom: 240px; width: 9%; min-width: 104px; height: 120px; }
[${ROOT_ATTR}] .dso-boss-desk {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; bottom: 0; left: 6px; width: 88%; height: 32px;
  border-radius: 8px 8px 2px 2px;
  background:
    linear-gradient(112deg, rgba(255,255,255,.45), transparent 40%),
    linear-gradient(180deg, #fde68a, #f5c04a 55%, #d99a24);
  border-top: 3px solid #fef3c7;   /* 顶面厚度受光 */
  border-right: 4px solid #b97a1c; /* 右侧深立壁 */
  box-shadow: 4px 6px 10px rgba(15,23,42,.14), 2px 2px 0 rgba(15,23,42,.07), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -3px 4px rgba(120,72,10,.3);
}
[${ROOT_ATTR}] .dso-boss-desk::before {
  content: '马·经理'; position: absolute; top: -20px; left: 22px; width: 64px; height: 18px;
  background: #fff; border: 1px solid rgba(100,116,139,.3); border-radius: 8px;
  color: #b45309; font-size: 11px; font-weight: 600; text-align: center; line-height: 17px;
  letter-spacing: 2px; box-shadow: 5px 5px 0 rgba(15,23,42,.06);
}
[${ROOT_ATTR}] .dso-boss-desk::after {
  content: ''; position: absolute; top: 6px; left: 10px; width: 34%; height: 17px;
  background: rgba(56,189,248,.35); border-radius: 3px;
}
[${ROOT_ATTR}] .dso-boss {
  position: absolute; bottom: 40px; left: 6.2%; width: 58px; height: 64px;
  transition: left 1.1s cubic-bezier(0.45, 0.05, 0.35, 1);
  will-change: left;
  z-index: 7;
}
[${ROOT_ATTR}] .dso-boss::after { /* 接地阴影 */
  content: ''; position: absolute; left: 50%; bottom: -5px; width: 54px; height: 13px;
  transform: translateX(-50%);
  background: radial-gradient(50% 50% at 50% 50%, rgba(15,23,42,.20), transparent 72%);
  border-radius: 50%; z-index: -1;
}
[${ROOT_ATTR}] .dso-boss .bubble {
  position: absolute; top: -24px; left: 50%; transform: translateX(-50%);
  font-size: 10px; padding: 3px 8px; border-radius: 9px; white-space: nowrap;
  background: #fff; border: 1px solid rgba(100,116,139,.28);
  color: #b45309; box-shadow: 4px 4px 0 rgba(15,23,42,.08);
  opacity: 0; transition: opacity .18s;
}
[${ROOT_ATTR}] .dso-boss.dso-direct .bubble { opacity: 1; }
/* 领导真 3D 挤出：多层 1px 阶梯 drop-shadow 形成实体厚度 + 等轴测世界内补偿立起 */
[${ROOT_ATTR}] .dso-boss svg { display: block; transform: none; transform-origin: 50% 100%; filter:
  drop-shadow(1px 1px 0 rgba(15,23,42,.10))
  drop-shadow(2px 2px 0 rgba(15,23,42,.14))
  drop-shadow(3px 3px 0 rgba(15,23,42,.17))
  drop-shadow(4px 4px 0 rgba(15,23,42,.19))
  drop-shadow(5px 5px 0 rgba(15,23,42,.17))
  drop-shadow(6px 6px 0 rgba(15,23,42,.14))
  drop-shadow(7px 7px 0 rgba(15,23,42,.10))
  drop-shadow(0 9px 6px rgba(15,23,42,.22)); }
[${ROOT_ATTR}] .dso-boss.dso-walk { animation: dso-bwalk 0.5s ease-in-out infinite; }
@keyframes dso-bwalk { 0%,100% { transform: translateY(0) rotate(-1.4deg);} 50% { transform: translateY(-3px) rotate(1.4deg);} }
[${ROOT_ATTR}] .dso-boss .c-leg { transform-box: fill-box; transform-origin: 50% 18%; }
[${ROOT_ATTR}] .dso-boss.dso-walk .c-leg-f { animation: dso-legF .5s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-boss.dso-walk .c-leg-b { animation: dso-legB .5s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-boss.dso-stand { animation: none; }

/* 工位区：多排网格容器（铺满房间，每排 3 列由 JS 内联 left/bottom 定位） */
[${ROOT_ATTR}] .dso-stations { position: absolute; left: 0; right: 0; top: 0; bottom: 0; }
[${ROOT_ATTR}] .dso-station {
  position: absolute; width: 24%; height: 150px;
  /* 多排等距：后排(远处)整体缩小、前排(近处)原大，形成纵深 */
}
[${ROOT_ATTR}] .dso-station[data-row="0"] { transform: scale(.76); transform-origin: 50% 100%; }
[${ROOT_ATTR}] .dso-station[data-row="1"] { transform: scale(1); }
/* 工位落地阴影：椭圆接触影，建立家具贴地关系（立体感关键） */
[${ROOT_ATTR}] .dso-station::after {
  content: ''; position: absolute; left: -6%; right: -6%; bottom: -2px; height: 14px;
  background: radial-gradient(52% 100% at 50% 0%, rgba(15,23,42,.20), rgba(15,23,42,0) 72%);
  transform: scaleY(.6); transform-origin: 50% 0;
  pointer-events: none;
  z-index: -1;
}
/* 桌面：等轴测三面体 —— 前侧壁(正面) + 大顶面(斜投影平行四边形) + 右侧深立壁 */
[${ROOT_ATTR}] .dso-station .cube {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; left: 1%; bottom: 2px; width: 98%; height: 15px;
  background: linear-gradient(180deg, #c8d6e4, #aebfcf 60%, #97adc2);
  border-radius: 3px 6px 6px 3px;
  box-shadow: 4px 6px 10px rgba(15,23,42,.13), 2px 2px 0 rgba(15,23,42,.08), inset 0 1px 0 rgba(255,255,255,.55), inset 0 -3px 4px rgba(100,116,139,.30);
  z-index: 1;
}
/* 桌面大顶面：等轴测斜投影平行四边形 —— 更宽更斜的顶面 + 顶部受光高光边，明确三面体积 */
[${ROOT_ATTR}] .dso-station .cube::after {
  content: ''; position: absolute; left: 0; right: -34%; top: -34px; height: 34px;
  background:
    linear-gradient(112deg, #ffffff 0%, #fdfeff 45%, #e6eef7 82%, #cfdcec 100%);
  border-radius: 18px 16px 4px 4px;
  transform: skewX(-30deg);
  transform-origin: left bottom;
  box-shadow:
    inset 7px 0 0 rgba(255,255,255,.95),    /* 左上受光 */
    inset -10px 0 9px rgba(120,134,160,.5), /* 右下微沉 */
    0 2px 0 rgba(71,85,105,.42),            /* 顶面下沿厚度边 */
    0 2px 3px rgba(15,23,42,.08),           /* 顶面下沿细影 */
    1px 1px 0 rgba(255,255,255,.95);
  z-index: 3;
}
/* 桌面顶面右厚边：等轴测右侧立壁（深色厚边，决定性的立体信号） */
[${ROOT_ATTR}] .dso-station .cube::before {
  content: ''; position: absolute; left: 0; right: -34%; top: -34px; height: 34px;
  border-right: 18px solid rgba(41,55,75,.68);
  border-bottom: 17px solid rgba(60,74,94,.5);
  border-radius: 18px 16px 4px 4px;
  transform: skewX(-30deg); transform-origin: left bottom; z-index: 4;
  pointer-events: none;
}
/* 桌面主体（前侧壁） */
[${ROOT_ATTR}] .dso-station .desk {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; left: 2%; bottom: 13px; width: 96%; height: 7px;
  background: linear-gradient(180deg, #ffffff, #dde6f1 62%, #c0cedf);
  border-radius: 4px;
  box-shadow: 12px 12px 0 rgba(15,23,42,.14), inset 0 1px 0 #fff, inset 0 -2px 3px rgba(148,163,184,.25);
  z-index: 2;
}
[${ROOT_ATTR}] .dso-station .desk::after { /* 桌腿 */
  content: ''; position: absolute; left: 8%; right: 8%; bottom: -3px; height: 4px;
  background: linear-gradient(180deg, #c6d3e2, #aebccd);
  border-radius: 0 0 3px 3px;
  box-shadow: 0 1px 0 rgba(255,255,255,.5);
}

/* ==== 显示器：立在桌面后方的宽屏，等轴测三面体 —— 顶部厚度高光 + 右侧深边 + 底部底座 ==== */
[${ROOT_ATTR}] .dso-station .mon {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; left: 36%; bottom: 46px; width: 44%; height: 44px;
  background: linear-gradient(180deg, #18233c, #0b1220 55%, #131c30);
  border: 2px solid #3b4a63; border-radius: 6px;
  border-top-width: 4px; border-top-color: #7d92b2;  /* 顶部厚度高光 = 屏幕顶面受光 */
  border-right: 4px solid #060a14;                    /* 右侧深边 = 侧壁 */
  border-bottom-width: 5px;                           /* 底部更厚 = 底座感 */
  box-shadow: 0 0 0 1px rgba(15,23,42,.25), 4px 5px 10px rgba(15,23,42,.14), 2px 2px 0 rgba(15,23,42,.08), inset 0 0 12px rgba(56,189,248,.05);
  overflow: hidden;
  z-index: 5;                              /* 立在桌面顶面上方，向后高起可见 */
}
[${ROOT_ATTR}] .dso-station .mon::before { /* 玻璃反光：持续扫描 */
  content: ''; position: absolute; inset: 0; z-index: 4;
  background: linear-gradient(115deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.04) 22%, transparent 45%), linear-gradient(0deg, rgba(255,255,255,.06), transparent 34%);
  background-size: 230% 100%;
  animation: dso-scan 6s linear infinite;
  border-radius: 4px;
}
[${ROOT_ATTR}] .dso-station .mon::after { /* 底座 */
  content: ''; position: absolute; left: 50%; bottom: -9px; width: 22px; height: 6px;
  transform: translateX(-50%); background: #64748b; border-radius: 0 0 3px 3px;
  box-shadow: 0 1px 0 rgba(255,255,255,.25);
}
/* 桌面壁纸（深蓝渐变 + 高光） */
[${ROOT_ATTR}] .dso-station .mon .ui { position: absolute; inset: 0; animation: dso-breathe 7s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-station .mon .ui::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(80% 90% at 72% 16%, rgba(56,189,248,.42), transparent 56%),
    radial-gradient(60% 70% at 18% 88%, rgba(129,140,248,.30), transparent 60%),
    linear-gradient(160deg, #1e3a8a 0%, #0ea5e9 52%, #7dd3fc 100%);
  opacity: .9;
}
[${ROOT_ATTR}] .dso-station .mon .ui::after { /* 壁纸山影：缓慢漂移 */
  content: ''; position: absolute; left: -6%; right: -6%; bottom: -4px; height: 14px;
  background: radial-gradient(120% 100% at 50% 0%, transparent 58%, rgba(15,23,42,.35) 59% 74%, rgba(15,23,42,.15) 78% 92%, transparent 96%);
  animation: dso-drift 16s ease-in-out infinite;
}
/* 顶部菜单栏（仿红黄绿） */
[${ROOT_ATTR}] .dso-station .mon .ui-bar {
  position: absolute; left: 0; right: 0; top: 0; height: 11px;
  background: rgba(255,255,255,.16); display: flex; align-items: center; gap: 3px; padding: 0 4px;
  z-index: 2;
}
[${ROOT_ATTR}] .dso-station .mon .ui-bar i { width: 4px; height: 4px; border-radius: 50%; }
[${ROOT_ATTR}] .dso-station .mon .ui-bar i:nth-child(1){ background: #f87171; }
[${ROOT_ATTR}] .dso-station .mon .ui-bar i:nth-child(2){ background: #fbbf24; }
[${ROOT_ATTR}] .dso-station .mon .ui-bar i:nth-child(3){ background: #34d399; }
/* 应用窗口 */
[${ROOT_ATTR}] .dso-station .mon .ui-win {
  position: absolute; left: 5px; right: 5px; top: 9px; height: 16px;
  background: rgba(241,245,249,.94); border-radius: 3px; padding: 0 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,.4);
  opacity: .5; transition: opacity .3s, height .3s, box-shadow .3s;
  overflow: hidden; z-index: 3;
}
[${ROOT_ATTR}] .dso-station .mon .ui-tbar { height: 4px; display: flex; align-items: center; }
[${ROOT_ATTR}] .dso-station .mon .ui-tbar span { width: 12px; height: 4px; border-radius: 2px; background: #38bdf8; }
[${ROOT_ATTR}] .dso-station .mon .ui-body { display: flex; flex-direction: column; gap: 1.5px; padding-top: 0; }
[${ROOT_ATTR}] .dso-station .mon .ui-body i {
  display: block; height: 2.4px; border-radius: 1.5px;
  background: linear-gradient(90deg, #38bdf8, #93c5fd 70%, #e2e8f0);
  animation: dso-codes 1.6s steps(2) infinite;
}
[${ROOT_ATTR}] .dso-station .mon .ui-body i:nth-child(2) { animation-delay: .4s; }
[${ROOT_ATTR}] .dso-station .mon .ui-body i:nth-child(3) { animation-delay: .8s; }
[${ROOT_ATTR}] .dso-station .mon .ui-body i:nth-child(4) { animation-delay: 1.2s; }
[${ROOT_ATTR}] .dso-station .mon .ui-body i:nth-child(2){ width: 82%; }
[${ROOT_ATTR}] .dso-station .mon .ui-body i:nth-child(3){ width: 60%; background: linear-gradient(90deg,#34d399,#a7f3d0 70%,#e2e8f0); }
[${ROOT_ATTR}] .dso-station .mon .ui-body i:nth-child(4){ width: 70%; }
/* 底部 Dock */
[${ROOT_ATTR}] .dso-station .mon .ui-dock {
  position: absolute; left: 14%; right: 14%; bottom: 3px; height: 6px;
  background: rgba(255,255,255,.24); border-radius: 3px;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  z-index: 3;
}
[${ROOT_ATTR}] .dso-station .mon .ui-dock i { width: 5px; height: 4.5px; border-radius: 1px; background: rgba(255,255,255,.95); }
[${ROOT_ATTR}] .dso-station .mon .ui-dock i:nth-child(2){ height: 6px; }
/* 工作态：窗口点亮、代码滚动、屏幕蓝光 */
[${ROOT_ATTR}] .dso-station.dso-on .mon {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56,189,248,.35), 9px 9px 0 rgba(15,23,42,.10), 0 0 16px rgba(56,189,248,.6);
}
[${ROOT_ATTR}] .dso-station.dso-on .mon .ui-win {
  opacity: 1; height: 20px;
  box-shadow: 0 0 8px rgba(56,189,248,.55), 0 1px 2px rgba(0,0,0,.4);
}
[${ROOT_ATTR}] .dso-station.dso-on .mon .ui-body i { animation-duration: 0.7s; }
@keyframes dso-codes { 0% { transform: translateY(0); opacity: .9;} 100% { transform: translateY(-3px); opacity: .55;} }
@keyframes dso-scan { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes dso-drift { 0%,100% { transform: translateX(-4px); } 50% { transform: translateX(12px); } }
@keyframes dso-breathe { 0%,100% { filter: brightness(.96); } 50% { filter: brightness(1.06); } }

[${ROOT_ATTR}] .dso-station .chair {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; left: 18%; bottom: 0; width: 44%; height: 24px;
  background: linear-gradient(180deg, #f8fafc, #d7e2ee 60%, #a9bccf);
  border: 2px solid rgba(71,85,105,.45);
  border-radius: 8px 8px 4px 4px;
  box-shadow: 3px 4px 8px rgba(15,23,42,.14), 2px 2px 0 rgba(15,23,42,.08), inset 0 1px 0 #fff, inset 0 -2px 3px rgba(148,163,184,.35);
  z-index: 8; /* 靠背立在屏幕前，不被桌面/显示器遮挡 */
}
[${ROOT_ATTR}] .dso-station .chair::before { /* 靠背：加高加厚的等轴测立壁 */
  content: ''; position: absolute; left: 4%; right: 4%; top: -26px; height: 26px;
  background: linear-gradient(180deg, #f8fafc, #d3dfec 60%, #a9bccf);
  border: 2px solid rgba(71,85,105,.4);
  border-radius: 6px 6px 2px 2px;
  box-shadow: inset 0 2px 0 rgba(255,255,255,.95), inset -4px 0 6px rgba(148,163,184,.30), 3px 4px 8px rgba(15,23,42,.09), 1px 1px 0 rgba(15,23,42,.05);
}
[${ROOT_ATTR}] .dso-station .chair::after { /* 座面厚度边：斜投影顶面 */
  content: ''; position: absolute; left: 0; right: -14%; top: -9px; height: 11px;
  background: linear-gradient(115deg, #f8fafc, #e0e9f2 60%, #b9c9da);
  border: 2px solid rgba(71,85,105,.35);
  border-radius: 5px;
  transform: skewX(-22deg); transform-origin: left bottom;
  box-shadow: inset 2px 0 0 #fff, inset -3px 0 4px rgba(148,163,184,.30);
}
[${ROOT_ATTR}] .dso-station .lamp {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; left: 10%; bottom: 36px; width: 4px; height: 30px;
  background: linear-gradient(90deg, #cbd5e1, #f8fafc 40%, #cbd5e1);
  border-radius: 3px;
}
[${ROOT_ATTR}] .dso-station .lamp::before { /* 灯罩：顶部受光高光 + 右下微沉 */
  content: ''; position: absolute; top: -6px; left: -6px; width: 16px; height: 9px;
  border-radius: 5px 5px 2px 2px;
  background: linear-gradient(115deg, #ffffff, #e2e9f2 55%, #c0cddc);
  box-shadow: 2px 3px 6px rgba(15,23,42,.12), 1px 1px 0 rgba(15,23,42,.05), inset 0 1px 0 #fff, inset -3px 0 4px rgba(148,163,184,.35);
}
[${ROOT_ATTR}] .dso-station .lamp::after { /* 光晕 */
  content: ''; position: absolute; top: -2px; left: -4px; width: 14px; height: 8px;
  background: radial-gradient(circle, rgba(251,191,36,.95), rgba(251,191,36,.12));
  border-radius: 4px;
}

/* 咖啡机：白色机身 */
[${ROOT_ATTR}] .dso-kitchen { position: absolute; left: 1.6%; bottom: 268px; width: 8.2%; min-width: 84px; height: 120px; }
[${ROOT_ATTR}] .dso-kitchen .stand {
  transform: none;
  transform-origin: 50% 100%;
 position: absolute; bottom: 0; left: 8px; width: 82%; height: 42px; border-radius: 8px; background: linear-gradient(180deg,#ffffff,#e6edf6 70%,#c3cfde); box-shadow: 4px 6px 10px rgba(15,23,42,.12), 2px 2px 0 rgba(15,23,42,.06), inset 0 1px 0 #fff; }
[${ROOT_ATTR}] .dso-kitchen .stand::before { /* 柜顶面：等轴测斜投影顶面 */
  content: ''; position: absolute; left: 0; right: -26%; top: -24px; height: 24px;
  background: linear-gradient(112deg, #ffffff, #e9f0f8 55%, #cfdbea);
  border-radius: 8px 8px 2px 2px;
  transform: skewX(-30deg); transform-origin: left bottom;
  box-shadow: inset 5px 0 0 rgba(255,255,255,.95), inset -5px 0 6px rgba(148,163,184,.32);
}
[${ROOT_ATTR}] .dso-kitchen .machine {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; bottom: 36px; left: 16px; width: 60%; height: 62px;
  border-radius: 9px; background: linear-gradient(180deg,#ffffff,#e8eff8 55%,#c9d6e5);
  box-shadow: 4px 6px 10px rgba(15,23,42,.13), 2px 2px 0 rgba(15,23,42,.06), inset 0 1px 0 #fff, inset 0 -3px 5px rgba(148,163,184,.3);
}
[${ROOT_ATTR}] .dso-kitchen .machine::before { /* 出液口面板 */
  content: ''; position: absolute; top: 10px; left: 22%; width: 56%; height: 22px;
  background: linear-gradient(180deg, rgba(15,23,42,.12), rgba(15,23,42,.06));
  border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(100,116,139,.15);
}
[${ROOT_ATTR}] .dso-kitchen .machine::after { /* 屏幕光 */
  content: ''; position: absolute; top: 16px; left: 32%; width: 36%; height: 10px;
  background: #f59e0b; border-radius: 3px; opacity: .9;
  box-shadow: 0 0 6px rgba(245,158,11,.5);
  animation: dso-glow 1.6s ease-in-out infinite;
}
@keyframes dso-glow { 0%,100% { opacity: .4;} 50% { opacity: 1;} }
[${ROOT_ATTR}] .dso-kitchen .cup {
  position: absolute; bottom: 40px; left: 33%; width: 30%; height: 20px;
  background: linear-gradient(180deg, #ffffff, #eef3fa 70%, #dbe4ef);
  border-radius: 3px 3px 8px 8px;
  box-shadow: 5px 5px 0 rgba(15,23,42,.08), inset 0 1px 0 #fff;
}
[${ROOT_ATTR}] .dso-kitchen .cup::before { /* 咖啡液面 */
  content: ''; position: absolute; top: 3px; left: 15%; right: 15%; height: 4px;
  border-radius: 2px; background: #7c3f16;
}
[${ROOT_ATTR}] .dso-kitchen .steam { position: absolute; bottom: 62px; left: 42%; width: 16px; height: 22px; }
[${ROOT_ATTR}] .dso-kitchen .steam i {
  position: absolute; bottom: 0; width: 4px; height: 14px; border-radius: 4px;
  background: rgba(100,116,139,.4); opacity: 0; animation: dso-steam 1.6s ease-in infinite;
}
[${ROOT_ATTR}] .dso-kitchen .steam i:nth-child(1){ left: 0; animation-delay: .2s;} [${ROOT_ATTR}] .dso-kitchen .steam i:nth-child(2){ left: 7px; animation-delay: .8s;}
@keyframes dso-steam { 0% { transform: translateY(0) scaleX(1); opacity: 0;} 30% { opacity: .7;} 100% { transform: translateY(-18px) scaleX(1.4); opacity: 0;} }

/* 跑步机：白色框架 */
[${ROOT_ATTR}] .dso-gym { position: absolute; left: 1.6%; bottom: 142px; width: 8.2%; min-width: 86px; height: 120px; }
[${ROOT_ATTR}] .dso-gym .frame {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; bottom: 0; left: 10px; width: 78%; height: 64px;
  border-radius: 9px; background: linear-gradient(180deg,#ffffff,#e6edf6 70%,#c3cfde);
  box-shadow: 4px 6px 10px rgba(15,23,42,.12), 2px 2px 0 rgba(15,23,42,.06), inset 0 1px 0 #fff, inset 0 -3px 5px rgba(148,163,184,.3);
}
[${ROOT_ATTR}] .dso-gym .frame::before { /* 跑步机顶面：等轴测斜投影顶面 */
  content: ''; position: absolute; left: 0; right: -24%; top: -22px; height: 22px;
  background: linear-gradient(112deg, #ffffff, #e9f0f8 55%, #cfdbea);
  border-radius: 8px 8px 2px 2px;
  transform: skewX(-30deg); transform-origin: left bottom;
  box-shadow: inset 5px 0 0 rgba(255,255,255,.95), inset -5px 0 6px rgba(148,163,184,.32);
}
[${ROOT_ATTR}] .dso-gym .belt {
  position: absolute; bottom: 8px; left: 18%; width: 64%; height: 10px;
  background: linear-gradient(180deg,#e2e8f0,#94a3b8); border-radius: 5px;
  box-shadow: inset 0 1px 2px rgba(15,23,42,.25), 0 1px 0 #fff;
  overflow: hidden;
}
[${ROOT_ATTR}] .dso-gym .belt::before {
  content: ''; position: absolute; top: 0; bottom: 0; left: -60px; width: 60px;
  background: repeating-linear-gradient(90deg, rgba(56,189,248,.7) 0 6px, transparent 6px 14px);
  animation: dso-belt 0.5s linear infinite;
}
@keyframes dso-belt { to { transform: translateX(60px); } }
[${ROOT_ATTR}] .dso-gym .rail {
  position: absolute; bottom: 38px; left: 24%; width: 5px; height: 34px;
  background: linear-gradient(90deg, #cbd5e1, #f8fafc 45%, #cbd5e1);
  border-radius: 3px; box-shadow: 3px 3px 0 rgba(15,23,42,.08);
}
[${ROOT_ATTR}] .dso-gym .rail.r2 { left: 72%; }
[${ROOT_ATTR}] .dso-gym .screen {
  position: absolute; bottom: 42px; left: 34%; width: 32%; height: 26px;
  background: linear-gradient(115deg, rgba(56,189,248,.18), #f1f5fb 45%);
  border: 2px solid #f8fafc; border-radius: 4px;
  box-shadow: 6px 6px 0 rgba(15,23,42,.08);
}

/* 厕所：白色门 */
[${ROOT_ATTR}] .dso-bath { position: absolute; left: 1.6%; bottom: 16px; width: 8.2%; min-width: 60px; height: 120px; }
[${ROOT_ATTR}] .dso-bath .door {
  transform: none;
  transform-origin: 50% 100%;

  position: absolute; bottom: 0; left: 12px; width: 66%; height: 96px;
  border-radius: 5px 5px 0 0;
  background:
    linear-gradient(112deg, rgba(255,255,255,.75), transparent 34%),
    linear-gradient(90deg, rgba(255,255,255,.6), transparent 26%),
    linear-gradient(180deg,#ffffff,#edf3fa 70%,#dbe4ef);
  border: 1px solid rgba(100,116,139,.3);
  border-top-width: 3px; border-top-color: #ffffff;
  border-right: 4px solid #b6c3d3;   /* 右侧深立壁 */
  box-shadow: 4px 6px 10px rgba(15,23,42,.12), 2px 2px 0 rgba(15,23,42,.06), inset 0 -8px 12px rgba(148,163,184,.2);
}
[${ROOT_ATTR}] .dso-bath .door::before {
  content: 'WC'; position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  font-size: 12px; font-weight: 700; color: #0ea5e9; letter-spacing: 1px;
  text-shadow: 0 1px 0 #fff;
}
[${ROOT_ATTR}] .dso-bath .door::after {
  content: ''; position: absolute; right: 8px; top: 48px; width: 5px; height: 5px;
  border-radius: 50%; background: radial-gradient(circle at 35% 30%, #f5cf6e, #d4a437 65%);
  box-shadow: 0 1px 2px rgba(15,23,42,.35);
}
[${ROOT_ATTR}] .dso-bath .sign {
  position: absolute; top: -4px; left: 8px; width: 82%; height: 16px;
  background: #fff; border: 1px solid rgba(100,116,139,.3); border-radius: 7px;
  color: #0ea5e9; font-size: 9px; text-align: center; line-height: 15px;
  box-shadow: 5px 5px 0 rgba(15,23,42,.06);
}

/* 员工层：站工位前方（z 高于桌面/显示器，人物永远可见不被电脑遮挡） */
[${ROOT_ATTR}] .dso-crew {
  position: absolute; width: 58px; height: 96px; margin-left: -29px;
  transition: left 1s cubic-bezier(0.45, 0.05, 0.35, 1), top .9s cubic-bezier(0.45, 0.05, 0.35, 1);
  will-change: left, top;
  z-index: 9;
}
/* 多排透视：后排(远处)整体缩小 */
[${ROOT_ATTR}] .dso-crew .c-scaler { position: relative; width: 100%; height: 100%; transform-origin: 50% 100%; }
[${ROOT_ATTR}] .dso-crew[data-row="0"] .c-scaler { transform: scale(.78); }
[${ROOT_ATTR}] .dso-crew .chara { position: relative; height: 92px; }
/* 等距平行四边形硬投影（右侧斜切，模拟 3D 物体的底部投影） */
[${ROOT_ATTR}] .dso-crew .chara::before {
  content: ''; position: absolute; left: 16px; right: -12px; bottom: -4px; height: 13px;
  background: linear-gradient(180deg, rgba(15,23,42,.34), rgba(15,23,42,.10));
  transform: skewX(44deg);
  transform-origin: left bottom;
  border-radius: 3px; z-index: -1;
}
/* 接地阴影（行走时脉冲） */
[${ROOT_ATTR}] .dso-crew .chara::after {
  content: ''; position: absolute; left: 50%; bottom: -3px; width: 46px; height: 12px;
  transform: translateX(-50%);
  background: radial-gradient(50% 50% at 50% 50%, rgba(15,23,42,.32), transparent 68%);
  border-radius: 50%; z-index: -1;
}
/* 人物真 3D 挤出：多层 1px 阶梯 drop-shadow 形成向右下的实体厚度，视觉上是立体纸片而非平面 */
[${ROOT_ATTR}] .dso-crew svg { display: block; position: relative; z-index: 2; height: 84px; width: 72px;
  /* 等轴测世界内角色补偿立起：世界 rotateX(54°)rotateZ(-45°)，角色反向旋转以面向镜头（保持背面坐姿/侧脸行走） */
  transform: none;
  transform-origin: 50% 100%;
  filter:
  drop-shadow(1px 1px 0 rgba(15,23,42,.09))
  drop-shadow(2px 2px 0 rgba(15,23,42,.13))
  drop-shadow(3px 3px 0 rgba(15,23,42,.16))
  drop-shadow(4px 4px 0 rgba(15,23,42,.18))
  drop-shadow(5px 5px 0 rgba(15,23,42,.17))
  drop-shadow(6px 6px 0 rgba(15,23,42,.14))
  drop-shadow(7px 7px 0 rgba(15,23,42,.10))
  drop-shadow(0 8px 6px rgba(15,23,42,.20)); }

/* ==== 肢体动画：头/双臂/尾巴独立分组，按状态驱动 ==== */
[${ROOT_ATTR}] .dso-crew .c-head { transform-box: fill-box; transform-origin: 50% 96%; transition: transform .3s ease; }
[${ROOT_ATTR}] .dso-crew .c-arm { transform-box: fill-box; transition: transform .28s ease; }
[${ROOT_ATTR}] .dso-crew .c-arm-l { transform-origin: 10% 8%; }
[${ROOT_ATTR}] .dso-crew .c-arm-r { transform-origin: 90% 8%; }
[${ROOT_ATTR}] .dso-crew .c-leg { transform-box: fill-box; transform-origin: 50% 18%; transition: transform .3s ease; }
/* idle：头轻摆 + 偶尔挥手 */
[${ROOT_ATTR}] .dso-crew.dso-idle .c-head { animation: dso-hidle 3.4s ease-in-out infinite; }
@keyframes dso-hidle { 0%,100%{transform:rotate(0)} 18%{transform:rotate(-4deg)} 38%{transform:rotate(3deg)} 58%{transform:rotate(-2deg)} 80%{transform:rotate(1deg)} }
[${ROOT_ATTR}] .dso-crew.dso-idle .c-arm-r { animation: dso-wave 3.4s ease-in-out infinite; }
@keyframes dso-wave { 0%,100%{transform:rotate(-10deg)} 22%{transform:rotate(-38deg)} 40%{transform:rotate(-16deg)} 56%{transform:rotate(-40deg)} 78%{transform:rotate(-8deg)} }
/* working：双臂快速打字敲键 */
[${ROOT_ATTR}] .dso-crew.dso-working .c-arm-l { animation: dso-type-l .32s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew.dso-working .c-arm-r { animation: dso-type-r .32s ease-in-out infinite; }
@keyframes dso-type-l { 0%,100%{transform:rotate(4deg)} 50%{transform:rotate(-12deg)} }
@keyframes dso-type-r { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(12deg)} }
/* walking：双臂前后摆 + 双腿交替迈步（前腿/后腿反相摆动，形成真实走路步态） */
[${ROOT_ATTR}] .dso-crew.dso-walking .c-arm-l { animation: dso-swing-l .42s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew.dso-walking .c-arm-r { animation: dso-swing-r .42s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew.dso-walking .c-leg-f { animation: dso-legF .42s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew.dso-walking .c-leg-b { animation: dso-legB .42s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew.dso-run .c-leg-f { animation: dso-legF .3s linear infinite; }
[${ROOT_ATTR}] .dso-crew.dso-run .c-leg-b { animation: dso-legB .3s linear infinite; }
@keyframes dso-swing-l { 0%,100%{transform:rotate(28deg)} 50%{transform:rotate(-16deg)} }
@keyframes dso-swing-r { 0%,100%{transform:rotate(-16deg)} 50%{transform:rotate(28deg)} }
@keyframes dso-legF { 0%,100% { transform: rotate(-20deg) translateY(1px);} 50% { transform: rotate(16deg) translateY(-2px);} }
@keyframes dso-legB { 0%,100% { transform: rotate(16deg) translateY(-2px);} 50% { transform: rotate(-20deg) translateY(1px);} }
/* done：双臂上举欢呼 */
[${ROOT_ATTR}] .dso-crew.dso-done .c-arm-l { animation: dso-hail-l .5s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew.dso-done .c-arm-r { animation: dso-hail-r .5s ease-in-out infinite; }
@keyframes dso-hail-l { 0%,100%{transform:rotate(-150deg)} 50%{transform:rotate(-122deg)} }
@keyframes dso-hail-r { 0%,100%{transform:rotate(150deg)} 50%{transform:rotate(122deg)} }
/* coffee：右臂举杯 + 头微仰 */
[${ROOT_ATTR}] .dso-crew.dso-coffee .c-arm-r { transform: rotate(152deg); }
[${ROOT_ATTR}] .dso-crew.dso-coffee .c-head { animation: dso-drink 2.4s ease-in-out infinite; }
@keyframes dso-drink { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-6deg) translateY(2px)} }
/* bathx：双臂轻抱 */
[${ROOT_ATTR}] .dso-crew.dso-bathx .c-arm-l { transform: rotate(24deg); }
[${ROOT_ATTR}] .dso-crew.dso-bathx .c-arm-r { transform: rotate(-24deg); }
/* failed：垂头丧气 */
[${ROOT_ATTR}] .dso-crew.dso-failed .c-head { animation: dso-sad .8s ease-in-out infinite; }
@keyframes dso-sad { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(-1deg)} }
[${ROOT_ATTR}] .dso-crew.dso-failed .c-arm { transform: rotate(16deg); }
/* run：大幅摆臂快跑 */
[${ROOT_ATTR}] .dso-crew.dso-run .c-arm-l { animation: dso-runarm-l .3s linear infinite; }
[${ROOT_ATTR}] .dso-crew.dso-run .c-arm-r { animation: dso-runarm-r .3s linear infinite; }
@keyframes dso-runarm-l { 0%,100%{transform:rotate(48deg)} 50%{transform:rotate(-30deg)} }
@keyframes dso-runarm-r { 0%,100%{transform:rotate(-30deg)} 50%{transform:rotate(48deg)} }
/* roam：悠闲慢摆 */
[${ROOT_ATTR}] .dso-crew.dso-roam .c-arm-l { animation: dso-swing-l 1.4s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew.dso-roam .c-arm-r { animation: dso-swing-r 1.4s ease-in-out infinite; }
[${ROOT_ATTR}] .dso-crew .bubble {
  position: absolute; top: -22px; left: 50%; transform: translateX(-50%);
  max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-size: 10px; line-height: 1.3; padding: 3px 8px; border-radius: 9px;
  background: #ffffff; color: #334155; border: 1px solid rgba(100,116,139,.3);
  box-shadow: 4px 4px 0 rgba(15,23,42,.08);
  opacity: 0; transition: opacity .18s;
}
[${ROOT_ATTR}] .dso-crew .name {
  position: relative; z-index: 6;
  text-align: center; font-size: 11px; font-weight: 700; color: #1e293b;
  white-space: nowrap; letter-spacing: -.2px;
  background: #fff; border: 1px solid rgba(100,116,139,.25);
  border-radius: 8px; padding: 2px 8px; margin-top: 2px;
  box-shadow: 3px 3px 0 rgba(15,23,42,.06);
}
[${ROOT_ATTR}] .dso-crew .bev { position: absolute; display: none; }
[${ROOT_ATTR}] .dso-crew .state-dot {
  position: absolute; top: 2px; right: 6px; width: 8px; height: 8px; border-radius: 50%;
  background: #cbd5e1; border: 1.5px solid #fff; box-shadow: 2px 2px 0 rgba(15,23,42,.10);
}
/* 行为状态 */
[${ROOT_ATTR}] .dso-crew.dso-working .state-dot { background: #38bdf8; animation: dso-blink .8s infinite; }
[${ROOT_ATTR}] .dso-crew.dso-done .state-dot { background: #34d399; }
[${ROOT_ATTR}] .dso-crew.dso-failed .state-dot { background: #f87171; }
[${ROOT_ATTR}] .dso-crew.dso-working .bubble { opacity: 1; animation: dso-pop .3s; }
@keyframes dso-pop { from { transform: translateX(-50%) scale(.7);} to { transform: translateX(-50%) scale(1);} }
[${ROOT_ATTR}] .dso-crew.dso-working { animation: dso-type .5s ease-in-out infinite; }
@keyframes dso-type { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-3px);} }
[${ROOT_ATTR}] .dso-crew.dso-done { animation: dso-jump .7s ease-out; }
@keyframes dso-jump { 0% { transform: translateY(0);} 35% { transform: translateY(-10px) scale(1.06);} 100% { transform: translateY(0);} }
[${ROOT_ATTR}] .dso-crew.dso-failed { animation: dso-shake .45s; }
@keyframes dso-shake { 0%,100% { transform: translateX(0);} 25% { transform: translateX(-3px) rotate(-3deg);} 75% { transform: translateX(3px) rotate(3deg);} }
/* 待机：轻微浮动 */
[${ROOT_ATTR}] .dso-crew.dso-idle { animation: dso-idle 3.2s ease-in-out infinite; animation-delay: var(--d,0s); }
@keyframes dso-idle { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-3px);} }
/* 走路：踏步式双脚交替（更真实），脚下阴影同步脉冲 */
[${ROOT_ATTR}] .dso-crew.dso-walking { animation: dso-walk 0.42s ease-in-out infinite; }
@keyframes dso-walk {
  0%,100% { transform: translateY(0) rotate(-1.2deg); }
  25% { transform: translateY(-2.5px) rotate(0deg); }
  50% { transform: translateY(0) rotate(1.2deg); }
  75% { transform: translateY(-2.5px) rotate(0deg); }
}
[${ROOT_ATTR}] .dso-crew.dso-walking .chara::after { animation: dso-wstep 0.42s ease-in-out infinite; }
@keyframes dso-wstep { 0%,100% { width: 46px; opacity: 1; } 50% { width: 38px; opacity: .65; } }
/* 喝咖啡 */
[${ROOT_ATTR}] .dso-crew.dso-coffee .bev.cup { display: block; top: -18px; left: 26px; width: 22px; height: 18px; background: #f8fafc; border-radius: 3px 3px 7px 7px; box-shadow: 0 3px 6px rgba(15,23,42,.22); }
[${ROOT_ATTR}] .dso-crew.dso-coffee .bev.cup::before { content:''; position:absolute; top:3px; left:-5px; width:5px; height:10px; border:2px solid #f8fafc; border-left:0; border-radius:0 4px 4px 0; }
[${ROOT_ATTR}] .dso-crew.dso-coffee .bev.steam { display:block; top:-30px; left:34px; width:12px; height:16px; }
[${ROOT_ATTR}] .dso-crew.dso-coffee .bev.steam::before, [${ROOT_ATTR}] .dso-crew.dso-coffee .bev.steam::after {
  content:''; position:absolute; bottom:0; width:3px; height:12px; border-radius:3px; background:rgba(100,116,139,.5); animation:dso-steam2 1.2s ease-in infinite;
}
[${ROOT_ATTR}] .dso-crew.dso-coffee .bev.steam::after { left:6px; animation-delay:.5s; }
@keyframes dso-steam2 { 0%{transform:translateY(0);opacity:0;} 40%{opacity:.7;} 100%{transform:translateY(-14px);opacity:0;} }
/* 上厕所：在 WC 内变半透明 */
[${ROOT_ATTR}] .dso-crew.dso-bathx { opacity: .35; }
/* 跑步机跑步 */
[${ROOT_ATTR}] .dso-crew.dso-run { animation: dso-run 0.4s linear infinite; }
@keyframes dso-run { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-5px);} }
/* 闲逛：工位附近左右踱步 */
[${ROOT_ATTR}] .dso-crew.dso-roam { animation: dso-roam 1.4s ease-in-out infinite; }
@keyframes dso-roam { 0%,100% { transform: translateX(-8px);} 50% { transform: translateX(8px);} }

@media (prefers-reduced-motion: reduce) {
  [${ROOT_ATTR}] * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`

    // ---------- 布局常量（百分比坐标，相对房间宽度） ----------
    // Marvis 办公室参考：左功能带(茶水/健身/卫生间) + 右办公区(3行×2列)
    // 右办公区两列中心全局x%：COL_C=[37,62]；三行 bottom：ROW_B=[232,132,32]（row=0 远排…row=2 近排）
    const COL_C = [37, 62]
    const ROW_B = [232, 132, 32]
    const STATIONS = [
      { c: 0, r: 2 }, { c: 1, r: 2 },   // 近排
      { c: 0, r: 1 }, { c: 1, r: 1 },   // 中排
      { c: 0, r: 0 }, { c: 1, r: 0 },   // 远排
    ]
    const stationX = (i) => COL_C[STATIONS[i].c]      // 工位/角色 home x（全局百分比）
    const KITCHEN_X = 10.5  // 茶水（左功能带上）
    const GYM_X = 10.5      // 跑步机（左功能带中）
    const BATH_X = 10.5     // 厕所（左功能带下）
    const BOSS_BASE = 10.5  // 领导基准全局 x（百分比，左功能带区）

    // 走动时长：按移动距离百分比计算（约 0.06s / %，100% ≈ 6s 封顶，短距 ≥ 1.15s）
    function walkDur(distPct) {
      return Math.min(6, Math.max(1.15, Math.abs(distPct) * 0.06))
    }

    // ---------- 查找 dsh 输入区（textarea / contenteditable） ----------
    function findInput() {
      let best = null, bestArea = 0
      const vh = window.innerHeight
      const all = document.querySelectorAll('textarea')
      for (const t of all) {
        const r = t.getBoundingClientRect()
        if (r.width > 40 && r.height > 16 && r.top > vh * 0.25) {
          const a = r.width * r.height
          if (a > bestArea) { best = t; bestArea = a }
        }
      }
      if (best) return best
      const ce = document.querySelector('[contenteditable="true"]')
      if (ce) {
        const r = ce.getBoundingClientRect()
        if (r.width > 40 && r.top > 0) return ce
      }
      return null
    }

    // ---------- 动态布局：宽高/位置全部跟随输入区，面板怎么变都不遮挡 ----------
    function layoutScene(root) {
      const inp = findInput()
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (inp) {
        const r = inp.getBoundingClientRect()
        if (r.width > 40 && r.top > 0 && r.top < vh) {
          // 铺满中央：从输入区左缘(即左面板右侧)一直铺到输入框右缘（不超右面板），上下尽量铺满输入框上方空间
          const left = Math.max(8, r.left + 4)
          const right = Math.min(vw, r.right - 4)
          const W = Math.max(420, Math.min(1560, Math.round(right - left - 8)))
          const H = Math.round(Math.min(432, Math.max(320, r.top - 64)))
          const top = Math.max(4, r.top - H - 46)   /* 整体再上移，彻底避开输入框 */
          root.style.left = left + 'px'
          root.style.top = top + 'px'
          root.style.width = W + 'px'
          root.style.height = H + 'px'
          root.style.transform = 'none'
          root.classList.add('dso-layout-live')
          return
        }
      }
      // 兜底：视口居中偏上，宽度收窄避开左右面板
      const W = Math.min(1180, vw - 480)
      root.style.width = Math.max(420, W) + 'px'
      root.style.height = '250px'
      root.style.left = '50%'
      root.style.top = '140px'
      root.style.transform = 'translateX(-50%)'
      root.classList.remove('dso-layout-live')
    }

    // ---------- 创建办公室场景 ----------
    function createOffice() {
      const root = document.createElement('div')
      root.setAttribute(ROOT_ATTR, '')
      root.innerHTML = `
        <div class="dso-room">
        <div class="dso-world">
          <div class="dso-depth"><span class="dso-pic"></span></div>
          <div class="dso-floor"></div>
          <div class="dso-floor-edge"></div>
          <div class="dso-window"></div>
          <div class="dso-clock"></div>
          <div class="dso-plant"><span class="leaf"></span><span class="leaf"></span><span class="leaf"></span><span class="pot"></span></div>

          <div class="dso-boss-zone">
            <div class="dso-boss-desk"></div>
            <div class="dso-boss dso-walk" id="dso-boss" style="left:${BOSS_BASE}%">
              <div class="bubble">巡视中</div>
              ${BOSS_SVG}
            </div>
          </div>

          <div class="dso-stations">
            ${AGENTS.map((a, i) => `
              <div class="dso-station" data-station="${a.id}" data-row="${STATIONS[i].r}" data-col="${STATIONS[i].c}"
                   style="left:${COL_C[STATIONS[i].c] - 12}%; bottom:${ROW_B[STATIONS[i].r]}px">
                <div class="cube"></div>
                <div class="mon">
                  <div class="ui">
                    <div class="ui-bar"><i></i><i></i><i></i></div>
                    <div class="ui-win">
                      <div class="ui-tbar"><span></span></div>
                      <div class="ui-body"><i></i><i></i><i></i><i></i></div>
                    </div>
                    <div class="ui-dock"><i></i><i></i><i></i><i></i></div>
                  </div>
                </div>
                <div class="desk"></div>
                <div class="chair"></div>
                <div class="lamp"></div>
              </div>`).join('')}
          </div>

          <div class="dso-kitchen">
            <div class="stand"></div><div class="machine"></div><div class="cup"></div>
            <div class="steam"><i></i><i></i></div>
          </div>
          <div class="dso-gym">
            <div class="frame"></div><div class="belt"></div>
            <div class="rail"></div><div class="rail r2"></div><div class="screen"></div>
          </div>
          <div class="dso-bath"><div class="door"></div><div class="sign">休息区</div></div>

          ${AGENTS.map((a, i) => `
            <div class="dso-crew dso-idle" data-agent="${a.id}" data-row="${STATIONS[i].r}" style="left:${stationX(i)}%; bottom:${ROW_B[STATIONS[i].r] - 10}px; --d:${-(i * 0.5)}s">
              <div class="c-scaler">
                <div class="chara">
                  <div class="bubble"></div>
                  ${charaSVG(a.id)}
                  <div class="bev cup"></div>
                  <div class="bev steam"></div>
                </div>
                <div class="name">${a.name}</div>
                <div class="state-dot"></div>
              </div>
            </div>`).join('')}
        </div>
        </div>`
      document.body.appendChild(root)
      const crews = [...root.querySelectorAll('.dso-crew')]
      const boss = root.querySelector('#dso-boss')
      const stations = [...root.querySelectorAll('.dso-station')]
      return { root, crews, boss, stations }
    }

    // ---------- 员工行为机 + 领导调度 ----------
    function createBehaviors({ crews, boss, stations }) {
      const nodes = {}
      const homeX = {}
      const homeY = {}
      crews.forEach((el, i) => {
        nodes[el.dataset.agent] = el
        homeX[el.dataset.agent] = stationX(i)
        homeY[el.dataset.agent] = ROW_B[STATIONS[i].r] - 10   // 与创建时的 bottom 一致
      })
      const state = {}   // agent -> 当前状态
      AGENTS.forEach((a) => { state[a.id] = 'idle' })  // 初始全部待机
      const timers = {}  // agent -> 行为/结束 timer
      const stationByAgent = {}
      stations.forEach((s) => { stationByAgent[s.dataset.station] = s })

      function cls(el, ...list) {
        el.classList.remove('dso-working', 'dso-done', 'dso-failed', 'dso-idle', 'dso-coffee', 'dso-bathx', 'dso-run', 'dso-roam', 'dso-walking')
        list.forEach((c) => c && el.classList.add(c))
      }
      // 走动：left（及可选 bottom）百分比/px + 按距离计算时长 + 踏步摆动
      function moveTo(el, pct, bot) {
        const cur = parseFloat(el.style.left) || homeX[el.dataset.agent]
        const dist = pct - cur
        let distPct = Math.abs(dist)
        if (typeof bot === 'number') {
          const curB = parseFloat(el.style.bottom) || 0
          // 垂直位移按场景约 400px 折算为等效水平百分比，参与时长计算
          distPct = Math.max(distPct, Math.abs(bot - curB) / 4)
        }
        const ms = walkDur(distPct) * 1000
        const dir = dist >= 0 ? 'r' : 'l'
        el.style.transition = `left ${ms}ms cubic-bezier(0.45, 0.05, 0.35, 1), bottom ${ms}ms cubic-bezier(0.45, 0.05, 0.35, 1)`
        el.style.left = `${pct}%`
        if (typeof bot === 'number') el.style.bottom = `${bot}px`
        el.classList.add('dso-walking')
        const svg = el.querySelector('.chara > svg')
        if (svg) svg.outerHTML = sideSVG(el.dataset.agent, dir)
        clearTimeout(el._walkT)
        el._walkT = setTimeout(() => {
          el.classList.remove('dso-walking')
          const s2 = el.querySelector('.chara > svg')
          if (s2) s2.outerHTML = charaSVG(el.dataset.agent)
        }, ms + 60)
        return ms / 1000
      }
      function clearTimer(id) {
        if (timers[id]) { clearTimeout(timers[id]); clearInterval(timers[id]); timers[id] = null }
      }

      // 回到工位（打断任何休闲，同时恢复工位行高）
      function goHome(id) {
        const el = nodes[id]
        if (!el) return
        moveTo(el, homeX[id], homeY[id])
        cls(el, 'dso-idle')
        state[id] = 'idle'
      }

      // 休闲行为：真正走到对应设施（x + 高度都移动），不再按行高停留
      function startLeisure(id) {
        const el = nodes[id]
        if (!el || state[id] !== 'idle') return
        const r = Math.random()
        let kind, target, dur
        if (r < 0.28) { kind = 'coffee'; target = { x: KITCHEN_X, y: 250 }; dur = 3800 }
        else if (r < 0.52) { kind = 'bath'; target = { x: BATH_X, y: 40 }; dur = 3300 }
        else if (r < 0.74) { kind = 'run'; target = { x: GYM_X, y: 140 }; dur = 4200 }
        else { kind = 'roam'; target = { x: homeX[id], y: homeY[id] }; dur = 2600 }

        state[id] = kind
        clearTimer(id)
        const travel = moveTo(el, target.x, target.y)   // 走到目标（含垂直）
        // 到达后加行为态（等步行结束）
        timers[id] = setTimeout(() => {
          if (kind === 'coffee') cls(el, 'dso-coffee')
          else if (kind === 'bath') { cls(el, 'dso-bathx') }
          else if (kind === 'run') { cls(el, 'dso-run') }
          else cls(el, 'dso-roam')
          // 行为结束回工位
          timers[id] = setTimeout(() => goHome(id), dur)
        }, travel * 1000 + 250)
      }

      // 领导调度
      const bossBubble = boss.querySelector('.bubble')
      let bossTimer = null
      let bossDir = 'r'
      function moveBoss(x, ms) {
        const cur = parseFloat(boss.style.left) || BOSS_BASE
        bossDir = x - cur >= 0 ? 'r' : 'l'
        boss.style.transition = `left ${ms}ms cubic-bezier(0.45, 0.05, 0.35, 1)`
        boss.style.left = `${x}%`
        boss.classList.remove('dso-stand')
        boss.classList.add('dso-walk')
        const svg = boss.querySelector('svg')
        if (svg) svg.outerHTML = sideBOSS(bossDir)
      }
      function bossBack() {
        boss.classList.remove('dso-walk')
        boss.classList.add('dso-stand')
        const svg = boss.querySelector('svg')
        if (svg) svg.outerHTML = BOSS_SVG
      }
      function bossWalk() {
        clearTimeout(bossTimer)
        boss.classList.remove('dso-direct')
        boss.classList.add('dso-walk')
        bossBubble.textContent = '巡视中'
        // 领导区到办公室中段来回踱步
        const side = Math.random() < 0.5 ? -1 : 1
        const t1 = side * (0.8 + Math.random() * 1.6)
        moveBoss(BOSS_BASE + t1, 1500)
        bossTimer = setTimeout(bossWalk, 2200 + Math.random() * 2200)
      }
      function bossDirect(agentId) {
        clearTimeout(bossTimer)
        boss.classList.remove('dso-walk')
        boss.classList.add('dso-direct')
        const x = homeX[agentId]
        bossBubble.textContent = `调度 → ${nodes[agentId].querySelector('.name').textContent}`
        const ms = walkDur(x - BOSS_BASE) * 1000
        moveBoss(x, ms)   // 按距离走向工位
        bossTimer = setTimeout(() => {
          boss.classList.remove('dso-direct')
          boss.classList.add('dso-walk')
          bossBubble.textContent = '巡视中'
          bossTimer = setTimeout(bossWalk, 400)
        }, ms + 2200)
      }
      bossWalk()

      // 日志流驱动
      const pending = {} // callId -> agentId
      function drive(logEntries) {
        const list = logEntries || []
        for (const e of list) {
          const type = e.type || ''
          if (type === 'tool/call' && e.callId) {
            const aid = agentForTool(e.summary)
            pending[e.callId] = aid
            const el = nodes[aid]
            if (el) {
              clearTimer(aid)
              moveTo(el, homeX[aid], homeY[aid])
              cls(el, 'dso-working')
              state[aid] = 'working'
              el.querySelector('.bubble').textContent = (e.summary || '').replace(/^🔧\s*调用工具\s*/, '') || '任务处理中'
              const st = stationByAgent[aid]
              if (st) st.classList.add('dso-on')
            }
            bossDirect(aid)
          } else if (type === 'tool/result') {
            const aid = pending[e.callId]
            if (aid) {
              const el = nodes[aid]
              if (el) {
                const ok = e.ok !== false
                cls(el, ok ? 'dso-done' : 'dso-failed')
                state[aid] = ok ? 'done' : 'failed'
                el.querySelector('.bubble').textContent = ok ? '完成' : '执行失败'
                const st = stationByAgent[aid]
                if (st) st.classList.remove('dso-on')
              }
              clearTimer(aid)
              timers[aid] = setTimeout(() => goHome(aid), 2600)
              delete pending[e.callId]
            }
          } else if (type === 'assistant/message') {
            const aid = 'planner'
            const el = nodes[aid]
            if (el && state[aid] !== 'working') {
              moveTo(el, homeX[aid], homeY[aid]); cls(el, 'dso-working'); state[aid] = 'working'
              el.querySelector('.bubble').textContent = '回复整理中…'
            }
            bossDirect('planner')
          } else if (type === 'turn/end') {
            AGENTS.forEach((a) => goHome(a.id))
            stations.forEach((s) => s.classList.remove('dso-on'))
          }
        }
      }

      // 休闲调度：每秒对空闲员工随机触发
      let tick = setInterval(() => {
        for (const a of AGENTS) {
          if (state[a.id] === 'idle' && Math.random() < 0.07) startLeisure(a.id)
        }
      }, 1000)

      return {
        drive,
        stop: () => {
          clearInterval(tick)
          Object.keys(timers).forEach(clearTimer)
          clearTimeout(bossTimer)
        },
      }
    }

    // ---------- 注入 ----------
    function apply(ctx) {
      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = CSS
        document.head.appendChild(style)
      }

      const office = createOffice()
      const { root } = office
      const behaviors = createBehaviors(office)

      // ==== 弹层避让：dsh 模型选择等下拉弹层打开时淡出面板 ====
      const POPUP_SELS = ['._7KE1Ra_menu', '[role=listbox]', '[role=menu]', '[class*=popup]', '[class*=dropdown]']
      let popupShown = false
      const checkPopups = () => {
        let show = false
        for (const sel of POPUP_SELS) {
          let el = null
          try { el = document.querySelector(sel) } catch (e) { continue }
          if (!el) continue
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          if (r.width > 40 && r.height > 40 && cs.display !== 'none' && cs.visibility !== 'hidden') { show = true; break }
        }
        if (show !== popupShown) {
          popupShown = show
          root.classList.toggle('dso-dim', show)
        }
      }
      checkPopups()
      setInterval(checkPopups, 500)
      new MutationObserver(checkPopups).observe(document.body, { childList: true, subtree: true })

      // ==== 动态布局：跟随输入区几何，三重保障 ====
      let layoutRAF = null
      const doLayout = () => {
        layoutRAF = null
        layoutScene(root)
        root.classList.add('dso-ready')
      }
      const scheduleLayout = () => {
        if (layoutRAF) return
        layoutRAF = requestAnimationFrame(doLayout)
      }
      scheduleLayout()
      window.addEventListener('resize', scheduleLayout)
      // 面板折叠/展开等 DOM 布局变化（节流）
      let moT = null
      const mo = new MutationObserver(() => {
        if (moT) return
        moT = setTimeout(() => { moT = null; scheduleLayout() }, 600)
      })
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
      // 定时兜底（即使 MutationObserver 失效也持续跟随）
      const layoutTimer = setInterval(scheduleLayout, 1500)

      // 轮询状态
      let timer = null
      let lastLogLen = 0
      const fetchState = async () => {
        try {
          const res = await fetch('/api/office-suite/state', { headers: { Accept: 'application/json' } })
          if (!res.ok) throw new Error(String(res.status))
          const data = await res.json()
          const entries = data.log || []
          if (entries.length > lastLogLen) {
            behaviors.drive(entries.slice(lastLogLen))
            lastLogLen = entries.length
          } else if (entries.length < lastLogLen) {
            lastLogLen = entries.length
          }
        } catch { /* 离线时保持现状 */ }
      }
      const startPoll = () => {
        fetchState()
        timer = setInterval(fetchState, 2500)
      }
      const onVisibility = () => {
        if (document.visibilityState === 'visible') fetchState()
      }
      startPoll()
      document.addEventListener('visibilitychange', onVisibility)

      ctx.effect(() => () => {
        clearInterval(timer)
        clearInterval(layoutTimer)
        if (layoutRAF) cancelAnimationFrame(layoutRAF)
        if (moT) clearTimeout(moT)
        mo.disconnect()
        window.removeEventListener('resize', scheduleLayout)
        document.removeEventListener('visibilitychange', onVisibility)
        behaviors.stop()
        root.remove()
        const style = document.getElementById(STYLE_ID)
        if (style) style.remove()
      }, 'dsh-ocean-office: embedded scene')
    }

    exports.apply = apply
    return module.exports
  },
})
