const {test}=require('node:test');const assert=require('node:assert/strict');const {parseInput,validDate,publicIPv4,pinnedLookup,classify}=require('../server');
const url='https://www.baitoru.com/jobdetail/163701918';
const html='<title>求人情報｜バイトルで仕事探し(No.163701918)</title><script type="application/ld+json">{"@type":"JobPosting"}</script><dt>掲載終了日：</dt><dd>2026年10月31日</dd><button>応募画面にすすむ</button>';
const response=(body=html,status=200)=>({status,body,type:'text/html',location:null});
const c=(u=url,r=response(),date='')=>classify(u,r,date,'2026-10-30');
test('URL のみを抽出し同一 URL を重複除去',()=>assert.deepEqual(parseInput(url+'\n×\n'+url),[url]));
test('掲載中、基準日を境界比較',()=>{assert.equal(c().result,'keep');assert.equal(c(url,response(),'2026-10-31').result,'keep');assert.equal(c(url,response(),'2026-11-01').result,'delete')});
test('未検証パラメータは修正しない',()=>{let r=c(url+'?pname=abc');assert.equal(r.result,'manual_check');assert.equal(r.normalizedUrl,url+'?pname=abc')});
test('未知パラメータは保持',()=>assert.equal(c(url+'?unknown=1').result,'keep'));
test('失敗・構造変化・リダイレクトは要確認',()=>{for(let r of [response('broken'),response('',403),{...response('',302),location:'/other'}])assert.equal(c(url,r).result,'manual_check')});
test('終了を確認できる 404 は削除、それ以外の 404 は要確認',()=>{let ended='<title>掲載終了｜バイトルで仕事探し</title><div>掲載終了または募集を締め切りました</div>';assert.equal(c(url,response(ended,404)).result,'delete');for(let status of [404,410])assert.equal(c(url,response('unexpected',status)).result,'manual_check')});
test('一般の 200 はページ到達で維持、募集状態は不明',()=>{let r=c('https://example.com/recruit',response('<title>採用情報</title><body>このページは採用についての情報を案内しています。詳しくは採用情報をご覧ください。</body>'));assert.equal(r.result,'keep');assert.equal(r.listingStatus,'unknown');assert.equal(c('https://example.com/recruit',response('<title>確認</title><div>Access denied</div>')).result,'manual_check');assert.equal(c('https://example.com/recruit',response('')).result,'manual_check')});
test('過去日付、番号違い、日付矛盾は要確認',()=>{assert.equal(c(url,response(html.replace('2026年10月31日','2026年10月29日'))).result,'manual_check');assert.equal(c(url,response(html.replace('No.163701918','No.1'))).result,'manual_check');assert.equal(c(url,response(html+'<dt>掲載終了日：</dt><dd>2026年11月1日</dd>')).result,'manual_check')});
test('日付とプライベート IP の検証',()=>{assert.equal(validDate('2026-02-29'),false);assert.equal(publicIPv4('127.0.0.1'),false);assert.equal(publicIPv4('192.168.1.1'),false);assert.equal(publicIPv4('8.8.8.8'),true)});
test('Markdown リンクと区切り文字、Markdown のエスケープ',()=>{let escaped='https\\://www\\.baitoru.com/jobdetail/163701918\\\n×';assert.deepEqual(parseInput(`[${url}](${url})\n×\n${escaped}`),[url])});

test('Node の lookup の単一・複数アドレス要求に応答',()=>{const lookup=pinnedLookup('8.8.8.8');lookup('example.com',{all:true},(e,addresses)=>assert.deepEqual(addresses,[{address:'8.8.8.8',family:4}]));lookup('example.com',{all:false},(e,address,family)=>{assert.equal(address,'8.8.8.8');assert.equal(family,4)});});
test('処理中の中止は途中結果を完了結果として返さない',async()=>{const {run}=require('../server');const ac=new AbortController();let updates=[];await assert.rejects(run('http://127.0.0.1/a\nhttp://127.0.0.1/b','',p=>{updates.push(p);if(p.completed===1)ac.abort()},ac.signal),/キャンセル/);assert.deepEqual(updates.map(x=>x.completed),[0,1])});

test('HTTP 200 のログイン画面は要確認',()=>assert.equal(c('https://example.com/recruit',response('<title>Sign in</title><body>Please sign in to continue.</body>')).result,'manual_check'));

test('DNS の遅延もタイムアウトに含める',async(t)=>{const dns=require('node:dns').promises;const {fetchPublic}=require('../server');t.mock.method(dns,'lookup',()=>new Promise(()=>{}));await assert.rejects(fetchPublic(new URL('https://example.com/'),undefined,30),/タイムアウト/)});
test('DNS 応答待ちでもキャンセルできる',async(t)=>{const dns=require('node:dns').promises;const {run}=require('../server');t.mock.method(dns,'lookup',()=>new Promise(()=>{}));const ac=new AbortController();const check=run('https://example.com/recruit','',()=>{},ac.signal);setTimeout(()=>ac.abort(),30);await assert.rejects(check,/キャンセル/)});
