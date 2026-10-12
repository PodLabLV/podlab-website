import { sanitizeFragment, isSafeUrl, dangerProfile } from '@/lib/tiptop/doc-edit';
const bad = ['&#106;avascript:alert(1)', 'java&#x09;script:alert(1)', 'jav&Tab;ascript:x', 'JaVaScRiPt:x', ' javascript:x', '&#x6A;&#x61;vascript:x', 'vbscript:x', 'data:text/html;base64,xx', 'java\nscript:x', '&#0000106avascript:x', 'file:///etc/passwd'];
const good = ['https://podlablv.com', 'http://x.com/a?b=1', 'mailto:info@podlablv.com', 'tel:+17025551234', '#section-2', '/portal', 'page.html', '?q=1'];
let fail = 0;
for (const u of bad) if (isSafeUrl(u)) { fail++; console.log('FAIL allowed:', u); }
for (const u of good) if (!isSafeUrl(u)) { fail++; console.log('FAIL blocked:', u); }
for (const u of bad) {
  const out = sanitizeFragment(`<a href="${u}">click</a>`);
  if (!out.includes('href="#"')) { fail++; console.log('FAIL sanitize kept:', out); }
  if (dangerProfile(`<a href="${u}">x</a>`).scriptUrls < 1) { fail++; console.log('FAIL dangerProfile missed:', u); }
}
const keep = sanitizeFragment('<a href="https://podlablv.com" style="color:red">ok</a>');
if (!keep.includes('https://podlablv.com')) { fail++; console.log('FAIL broke a good link', keep); }
console.log(fail ? `${fail} FAILURES` : `all ${bad.length * 3 + good.length + 1} checks passed`);
