const assert=require('node:assert/strict');const P=require('./parser');let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
test('yen and man units',()=>{assert.equal(P.money('28万5000円'),285000);assert.equal(P.money('28.5万円'),285000);assert.equal(P.money('200,000円'),200000);});
test('salary lower bound has no invented maximum',()=>assert.deepEqual(P.pay('月給200,000円～'),{unit:'month',min:200000,max:null,format:'above'}));
test('salary range',()=>assert.equal(P.pay('時給 1160円 〜 1210円').max,1210));
test('not salary example or basic component',()=>{assert.equal(P.pay('基本給：月給20万円'),null);assert.equal(P.pay('月収例30万円'),null);assert.equal(P.pay('月給30万円〜20万円'),null);});
const snippet='株式会社テスト\n【正社員】事務／募集\n月給 20万円 〜\nお仕事について\n仕事内容\n入力作業\n特徴\n職種\n事務\n勤務地\n転勤なし\n勤務地\n本社\n住所\n東京都内\nアクセス\n駅徒歩5分\n給与\n月給 20万円 〜\n基本給：月給18万円\n試用・研修期間：3ヶ月\n試用・研修期間の条件：給与条件が異なる\n【給与】\n基本給 : 日給1万円\n給与例\n月給40万円\n勤務時間\n勤務形態：固定時間制\n9:00～18:00\n休日休暇制度\n土日\n社会保険 / 福利厚生\n【社会保険】\n健康保険、雇用保険\n【社会保険】\n健康保険、雇用保険\n【福利厚生】\n制服貸与\n職場環境\n試用・研修期間\n試用・研修期間：3ヶ月\n試用・研修期間の条件：給与条件が異なる\n【給与】\n基本給 : 日給1万円\n応募画面へ進む';
test('trial salary is not normal salary',()=>{const r=P.parse(snippet);assert.equal(r.fields.salary.value.min,200000);assert.equal(r.fields.salary.value.max,null);assert.equal(r.fields.trial.candidates.length,1);});
test('duplicate insurance only one result with two sources',()=>{const f=P.parse(snippet).fields.insurance;assert.equal(f.status,'clear');assert.equal(f.candidates.length,1);assert.equal(f.candidates[0].sources.length,2);});
test('location feature tag is not workplace',()=>assert.equal(P.parse(snippet).fields.workplace.value,'本社'));
test('different salary candidates are not auto selected',()=>{const r=P.parse(snippet.replace('給与\n月給 20万円','給与\n月給 21万円'));assert.equal(r.fields.salary.status,'review');assert.equal(r.fields.salary.value,null);});
test('missing headings leave empty fields',()=>{const r=P.parse('文章だけ');assert.equal(r.fields.address.value,null);assert.equal(r.fields.salary.value,null);});
test('total adapter never invents base pay or allowances',()=>{const p=P.toInput({salary:P.pay('月給20万円～')});assert.equal(p.reported,'200000');assert.equal(p.totalFormat,'above');assert.equal(p.base,undefined);assert.equal(p.fixed,undefined);assert.equal(p.uniform,undefined);assert.equal(p.reportedMax,undefined);});
test('trial same and explicit different pay are review',()=>{const r=P.parse('試用・研修期間：3ヶ月\n試用・研修期間の条件：本採用と同じ\n試用期間1ヶ月間は時給1140円です。');assert.equal(r.fields.trial.status,'review');});
test('one set of insurance works after upstream bug fixed',()=>assert.equal(P.parse('【社会保険】\n健康保険').fields.insurance.value,'健康保険'));
test('conflicting insurance does not merge',()=>{const r=P.parse('【社会保険】\n健康保険\n【社会保険】\n雇用保険');assert.equal(r.fields.insurance.status,'review');});
test('source content is never evaluated as HTML',()=>assert.equal(P.parse('仕事内容\n<script>alert(1)</script>\n特徴').fields.duties.value,'<script>alert(1)</script>'));
console.log(`${count} tests passed`);
