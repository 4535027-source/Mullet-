/* =========================================================
 * 万能验证码管理平台 - 原型脚本
 * 数据保存在内存中，刷新页面恢复初始示例数据
 * ========================================================= */

const SCENES = {
  REGISTER: '手机号注册',
  LOGIN: '手机号登录',
  CHANGE_PASSWORD: '登录后修改密码',
  RESET_PASSWORD: '忘记密码',
};

const SOURCES = {
  SYSTEM: '系统短信',
  UNIVERSAL: '万能码',
};

const STATUS_TEXT = {
  VALID: '有效',
  INVALID: '已失效',
};

const TTL = 5 * 60 * 1000; // 有效期 5 分钟，与短信验证码一致
let idSeq = 0;
let codes = [];

/* ---------------- 工具函数 ---------------- */
const $ = (sel) => document.querySelector(sel);

function fmtTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtRemain(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = isError ? 'show error' : 'show';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => (el.className = ''), 2200);
}

/** 展示状态：有效码超过过期时间自动显示为已失效 */
function displayStatus(c) {
  if (c.status === 'VALID' && Date.now() > c.expireAt) return 'INVALID';
  return c.status;
}

/* ---------------- 初始示例数据 ---------------- */
function seed() {
  const now = Date.now();
  const M = 60 * 1000;
  const add = (phone, scene, code, source, status, createdAt, expireAt) =>
    codes.push({ id: ++idSeq, phone, scene, code, source, status, createdAt, expireAt });

  add('13800138000', 'REGISTER', '482913', 'SYSTEM', 'VALID', now - 2 * M, now + 3 * M);
  add('13912345678', 'LOGIN', '771204', 'SYSTEM', 'INVALID', now - 30 * M, now - 25 * M);
  add('13711112222', 'RESET_PASSWORD', '556688', 'SYSTEM', 'INVALID', now - 10 * M, now - 5 * M);
  add('13711112222', 'RESET_PASSWORD', '905317', 'UNIVERSAL', 'VALID', now - 1 * M, now + 4 * M);
  add('13655556666', 'CHANGE_PASSWORD', '120943', 'SYSTEM', 'VALID', now - 8 * M, now - 3 * M);
  add('13500001111', 'LOGIN', '334455', 'UNIVERSAL', 'INVALID', now - 60 * M, now - 55 * M);
}

/* ---------------- 业务逻辑（对应后端接口行为） ---------------- */

/**
 * 设置万能验证码：同一手机号+业务类型
 * 1. 旧万能码与未失效的系统短信验证码置为已失效（INVALID）
 * 2. 新万能码有效期 5 分钟
 */
function setUniversalCode(phone, scene, code) {
  const now = Date.now();
  codes.forEach((c) => {
    if (c.phone === phone && c.scene === scene && c.status === 'VALID') {
      c.status = 'INVALID';
    }
  });
  const record = {
    id: ++idSeq,
    phone,
    scene,
    code,
    source: 'UNIVERSAL',
    status: 'VALID',
    createdAt: now,
    expireAt: now + TTL,
  };
  codes.unshift(record);
  return record;
}

/** 查询列表（对应 GET /admin/sms-codes） */
function queryCodes({ phone = '', scene = '', source = '', status = '' }) {
  return codes.filter((c) => {
    if (phone && !c.phone.includes(phone)) return false;
    if (scene && c.scene !== scene) return false;
    if (source && c.source !== source) return false;
    if (status && displayStatus(c) !== status) return false;
    return true;
  });
}

/* ---------------- Tab 切换 ---------------- */
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    $(`#tab-${btn.dataset.tab}`).classList.add('active');
  });
});

/* ---------------- 弹窗：设置万能验证码 ---------------- */
const modalMask = $('#modalMask');

function openModal() {
  modalMask.classList.add('show');
  $('#setPhone').focus();
}
function closeModal() {
  modalMask.classList.remove('show');
  $('#setForm').reset();
}

$('#openModal').addEventListener('click', openModal);
$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);
modalMask.addEventListener('click', (e) => {
  if (e.target === modalMask) closeModal(); // 点击遮罩关闭
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalMask.classList.contains('show')) closeModal();
});

$('#genCode').addEventListener('click', () => {
  $('#setCode').value = String(Math.floor(100000 + Math.random() * 900000));
});

$('#setForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const phone = $('#setPhone').value.trim();
  const scene = $('#setScene').value;
  const code = $('#setCode').value.trim();

  if (!/^1\d{10}$/.test(phone)) return toast('请输入正确的 11 位手机号', true);
  if (!scene) return toast('请选择业务类型', true);
  if (!/^\d{6}$/.test(code)) return toast('万能验证码必须是 6 位数字', true);

  setUniversalCode(phone, scene, code);
  closeModal();
  toast(`设置成功：${phone} · ${SCENES[scene]} · ${code}，5 分钟内有效`);
  renderTable();
});

/* ---------------- 验证码列表 ---------------- */
function renderTable() {
  const list = queryCodes({
    phone: $('#fPhone').value.trim(),
    scene: $('#fScene').value,
    source: $('#fSource').value,
    status: $('#fStatus').value,
  });

  const tbody = $('#codeTbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#86909c;padding:28px 0">暂无数据</td></tr>`;
  } else {
    tbody.innerHTML = list
      .map((c) => {
        const st = displayStatus(c);
        const remain = st === 'VALID' ? fmtRemain(c.expireAt - Date.now()) : '—';
        const op =
          displayStatus(c) === 'VALID'
            ? `<button class="btn danger" onclick="revokeCode(${c.id})">作废</button>`
            : '—';
        return `<tr>
          <td>${c.phone}</td>
          <td>${SCENES[c.scene]}</td>
          <td style="font-family:Menlo,monospace;letter-spacing:1px">${c.code}</td>
          <td><span class="badge source-${c.source}">${SOURCES[c.source]}</span></td>
          <td><span class="badge st-${st}">${STATUS_TEXT[st]}</span></td>
          <td>${fmtTime(c.createdAt)}</td>
          <td>${fmtTime(c.expireAt)}</td>
          <td>${remain}</td>
          <td>${op}</td>
        </tr>`;
      })
      .join('');
  }
  $('#listSummary').textContent = `共 ${list.length} 条记录`;
}

window.revokeCode = function (id) {
  const c = codes.find((x) => x.id === id);
  if (c && c.status === 'VALID') {
    c.status = 'INVALID';
    toast(`已作废验证码 ${c.code}`);
    renderTable();
  }
};

$('#fSearch').addEventListener('click', renderTable);
$('#fReset').addEventListener('click', () => {
  $('#fPhone').value = '';
  $('#fScene').value = '';
  $('#fSource').value = '';
  $('#fStatus').value = '';
  renderTable();
});
['#fScene', '#fSource', '#fStatus'].forEach((sel) => $(sel).addEventListener('change', renderTable));

/* ---------------- 启动 ---------------- */
seed();
renderTable();
setInterval(renderTable, 1000); // 刷新剩余时间与过期状态
