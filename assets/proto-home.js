/* 全站固定按钮：返回原型导航首页。
   每个原型页面在 </body> 前引入：<script src="/assets/proto-home.js"></script>
   在 iframe 内嵌或 ?embed=1 时不显示，避免重复。 */
(function () {
  var inFrame = false;
  try { inFrame = window.top !== window.self; } catch (e) { inFrame = true; }
  if (inFrame || new URLSearchParams(location.search).get('embed') === '1') return;
  if (document.getElementById('protoHomeBtn')) return;
  var a = document.createElement('a');
  a.id = 'protoHomeBtn';
  a.href = '/';
  a.title = '返回原型导航首页';
  a.textContent = '← 原型导航';
  a.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483000;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:#1f2329;color:#fff;font:13px/1.2 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.18);opacity:.88';
  a.onmouseenter = function () { a.style.opacity = '1'; };
  a.onmouseleave = function () { a.style.opacity = '.88'; };
  (document.body || document.documentElement).appendChild(a);
})();
