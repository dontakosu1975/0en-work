const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

function parseInput(text) {
  text = text.replace(/\\([:.])/g, '$1').replace(/\\(?=\r?\n|$)/g, '');
  text = text.replace(/\[(https?:\/\/[^\]\s]+)\]\((https?:\/\/[^)\s]+)\)/gi, '$2');
  const matches = text.match(/https?:\/\/[^\s<>"'「」×]+/gi) || [];
  const unique = new Map();
  for (const match of matches) {
    const raw = match.replace(/[、。，．）)\]】]+$/u, '');
    let key; try { key = new URL(raw).href; } catch { key = raw; }
    if (!unique.has(key)) unique.set(key, raw);
  }
  return [...unique.values()];
}
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === s;
}
function adapter(url) {
  const m = url.hostname === 'www.baitoru.com' && url.pathname.match(/^\/jobdetail\/(\d+)\/?$/);
  return m ? {mediaType:'バイトル', jobId:m[1]} : {mediaType:'一般サイト', jobId:null};
}
function publicIPv4(ip) {
  if (net.isIP(ip) !== 4) return false;
  const [a,b,c] = ip.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && c === 113));
}
function pinnedLookup(ip) {
  return (_host, opts, cb) => opts.all ? cb(null, [{address:ip, family:4}]) : cb(null, ip, 4);
}
async function fetchPublic(url, signal, timeoutMs = 12000) {
  if (signal?.aborted) throw Error('キャンセルしました');
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) throw Error('許可されない URL');
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {timedOut = true; controller.abort();}, timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, {once:true});
  const aborted = new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(Error(timedOut ? 'タイムアウト' : 'キャンセルしました')), {once:true}));
  try {
    const addresses = await Promise.race([dns.lookup(url.hostname, {all:true,verbatim:true}), aborted]);
    if (!addresses.length || addresses.some(a => !publicIPv4(a.address))) throw Error('公開 IPv4 以外の宛先は対象外');
    if (controller.signal.aborted) throw Error(timedOut ? 'タイムアウト' : 'キャンセルしました');
    const ip = addresses[0].address;
    return await Promise.race([new Promise((resolve,reject) => {
      const mod = url.protocol === 'https:' ? https : http;
      const req = mod.get(url, {signal:controller.signal, lookup:pinnedLookup(ip), headers:{'User-Agent':'JobURLInventoryPoC/0.1 (manual inventory)', 'Accept':'text/html,application/xhtml+xml'}}, res => {
        let chunks = [], size = 0;
        res.on('data', chunk => {size += chunk.length; if(size > 2_000_000) req.destroy(Error('応答がサイズ上限を超過')); else chunks.push(chunk);});
        res.on('end',()=>resolve({status:res.statusCode, location:res.headers.location || null, type:res.headers['content-type'] || '', body:Buffer.concat(chunks).toString('utf8')}));
        res.on('error',reject);
        res.on('aborted',()=>reject(Error('応答が途中で切断されました')));
      });
      req.on('error',reject);
    }), aborted]);
  } catch (e) {
    if (timedOut) throw Error('タイムアウト');
    if (signal?.aborted) throw Error('キャンセルしました');
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort',cancel);
  }
}
function classify(originalUrl, response, referenceDate, today) {
  const url = new URL(originalUrl), meta = adapter(url);
  const result = {originalUrl,normalizedUrl:originalUrl,domain:url.hostname,...meta,httpStatus:response.status,finalUrl:originalUrl,listingStatus:'unknown',listingEndDate:null,checkedAt:new Date().toISOString(),result:'manual_check',reason:'',errorType:null};
  if (response.status >= 300 && response.status < 400) {result.reason = `HTTP ${response.status} リダイレクト先を要確認: ${response.location || '不明'}`; result.errorType='redirect'; return result;}
  const visible = response.body.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  if (/captcha|access denied|アクセスが制限|アクセスが拒否|ログインしてください/i.test(visible) || /<title[^>]*>[^<]*(?:ログイン|sign in|access denied)[^<]*<\/title>/i.test(response.body)) {result.reason='アクセス制限・ログインまたは CAPTCHA の可能性';result.errorType='blocked';return result;}
  if ([404,410].includes(response.status)) {
    if (meta.jobId && /<title[^>]*>\s*掲載終了[^<]*<\/title>/i.test(response.body) && visible.includes('掲載終了または募集を締め切りました')) {result.result='delete';result.listingStatus='closed';result.reason=`HTTP ${response.status}、バイトルの掲載終了・募集締切表示を確認`;return result;}
    result.reason=`HTTP ${response.status}。終了画面を確認できないため要確認`;result.errorType='unrecognized_error_page';return result;
  }
  if (response.status !== 200) {result.reason=`HTTP ${response.status} 取得または判定不能`;result.errorType='http_error';return result;}
  if (!response.type.toLowerCase().includes('text/html')) {result.reason='HTML 以外の応答';result.errorType='unexpected_content';return result;}
  if (!meta.jobId) {
    if (!response.body.trim() || /ページが見つかりません|404 not found|ページは存在しません/i.test(visible)) {result.reason='HTTP 200。ページの内容を確認できません';result.errorType='unrecognized_page';return result;}
    result.result='keep';result.reason='HTTP 200、対象ページの内容を取得。募集状態は未判定';return result;
  }
  const html=response.body;
  const idMarker = new RegExp('<title[^>]*>[^<]*\\(No\\.' + meta.jobId + '\\)', 'i').test(html);
  const jobPosting = /"@type"\s*:\s*"JobPosting"/.test(html);
  const apply = html.includes('応募画面にすすむ');
  const matches=[...html.matchAll(/<dt[^>]*>\s*掲載終了日\s*[：:]\s*<\/dt>\s*<dd[^>]*>\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*<\/dd>/g)];
  const dates=[...new Set(matches.map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`))];
  if (dates.length !== 1 || !validDate(dates[0]) || !idMarker || !jobPosting || !apply) {result.reason='求人 ID・JobPosting・応募ボタン・掲載終了日の組合せを確認できません';result.errorType='unrecognized_page';return result;}
  result.listingEndDate=dates[0];
  if (dates[0] < today) {result.result='manual_check'; result.reason=`掲載終了日 ${dates[0]} は過去ですが、終了画面を確認できないため要確認`;return result;}
  result.listingStatus='active';
  if (referenceDate && dates[0] < referenceDate) {result.result='delete';result.reason=`掲載中。掲載終了日 ${dates[0]} は基準日 ${referenceDate} より前`;return result;}
  if (url.searchParams.has('pname')) {result.reason='掲載中。pname の除去は案件ごとの同一性確認が未実装のため要確認';return result;}
  result.result='keep';result.reason=`掲載中。画面の掲載終了日 ${dates[0]}、求人 ID と応募ボタンを確認`;
  return result;
}
function todayJst(){ return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
async function run(text,referenceDate,onProgress=()=>{},signal) {
  if(referenceDate && !validDate(referenceDate)) throw Error('基準日が不正です');
  const urls=parseInput(text); if (!urls.length) throw Error('URL が見つかりません'); if(urls.length > 200) throw Error('URL は 200 件以内にしてください');
  for(const u of urls) {try {new URL(u)} catch {throw Error('不正な URL: ' + u)}}
  const results=[]; let last=0;
  onProgress({completed:0,total:urls.length});
  for(const originalUrl of urls){
    if (signal?.aborted) throw Error('キャンセルしました');
    const meta=adapter(new URL(originalUrl));
    try {
      let current = new URL(originalUrl), response, hops = 0;
      for (;;) {
        await sleep(Math.max(0,1500-(Date.now()-last)), undefined, {signal});last=Date.now();
        response=await fetchPublic(current,signal);
        if (meta.jobId || response.status < 300 || response.status >= 400 || !response.location || hops >= 3) break;
        let next; try {next = new URL(response.location, current)} catch {break;}
        if (next.hostname !== current.hostname || !['http:','https:'].includes(next.protocol) || next.username || next.password) break;
        current=next; hops++;
      }
      const result=classify(originalUrl,response,referenceDate,todayJst());
      if (hops) {result.finalUrl=current.href;result.reason = `同一ホスト内で ${hops} 回転送後: ` + result.reason;}
      results.push(result);
    } catch(e) {if(signal?.aborted) throw Error('キャンセルしました');results.push({originalUrl,normalizedUrl:originalUrl,domain:new URL(originalUrl).hostname,...meta,httpStatus:null,finalUrl:null,listingStatus:'unknown',listingEndDate:null,checkedAt:new Date().toISOString(),result:'manual_check',reason:String(e.message || e),errorType:'fetch_error'});}
    onProgress({completed:results.length,total:urls.length});
  }
  return results;
}
function startServer(onListening, port = 3217){
  let busy = false;
  let controller = null;
  let progress = {completed:0,total:0,running:false};
  const server=http.createServer(async(req,res)=>{
    const actualPort = server.address()?.port || port;
    const allowed = [`localhost:${actualPort}`,`127.0.0.1:${actualPort}`];
    if(!allowed.includes(req.headers.host) || (req.headers.origin && !allowed.some(h=>req.headers.origin===`http://${h}`))) {res.writeHead(403);return res.end('Forbidden');}
    if(req.method==='GET' && req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'public/index.html')));}
    if(req.method==='GET' && req.url==='/api/progress'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify(progress));}
    if(req.method==='POST' && req.url==='/api/cancel'){if(controller) controller.abort();res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({requested:!!controller}));}
    if(req.method==='POST' && req.url==='/api/check'){
      if(busy) {res.writeHead(429,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'別のチェックを実行中です'}));}
      busy=true; controller=new AbortController(); progress={completed:0,total:0,running:true}; let data=''; try {for await(const chunk of req){data+=chunk;if(data.length>100000) throw Error('入力が大きすぎます');}const input=JSON.parse(data);if(typeof input.text!=='string') throw Error('入力が不正です');const results=await run(input.text,input.referenceDate || '', p=>{progress={...p,running:true}},controller.signal);res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({results}));} catch(e){res.writeHead(400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:String(e.message)}));} finally {busy=false;controller=null;progress.running=false;} return;
    }
    res.writeHead(404);res.end();
  });
  server.listen(port,'127.0.0.1',onListening || (()=>console.log('http://127.0.0.1:3217')));
  return server;
}
if (require.main === module) startServer();
module.exports={parseInput,validDate,adapter,publicIPv4,pinnedLookup,fetchPublic,classify,run,startServer};
