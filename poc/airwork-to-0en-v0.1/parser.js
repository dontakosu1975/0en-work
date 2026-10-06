/* Deterministic text parser. Field results are extraction evidence, not a new Job schema. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AirworkParser=api;})(typeof globalThis==='object'?globalThis:this,()=>{
'use strict';
const norm=s=>String(s).normalize('NFKC').replace(/[ \t　]+/g,' ').trim();
const same=s=>norm(s).replace(/\s+/g,'');
function money(s){s=norm(s).replace(/,/g,'').replace(/円/g,'');if(!/^(?:\d+(?:\.\d+)?万(?:\d+)?)$|^\d+$/.test(s))return null;const parts=s.split('万');const n=parts.length===2?Number(parts[0])*10000+Number(parts[1]||0):Number(s);return Number.isSafeInteger(n)&&n>0?n:null;}
function pay(line){const text=norm(line);const m=text.match(/^(月給|時給|日給|年俸)\s*([\d,.]+(?:万[\d,]*)?)円?\s*(?:(?:〜|～|~|以上)(?:\s*([\d,.]+(?:万[\d,]*)?)円?)?)?\s*$/);if(!m)return null;const min=money(m[2]),max=m[3]?money(m[3]):null;if(min===null||(m[3]&&(max===null||max<min)))return null;return {unit:{月給:'month',時給:'hour',日給:'day',年俸:'annual'}[m[1]],min,max,format:max!==null?'range':/[〜～~]|以上/.test(text)?'above':'exact'};}
const definitions=[['company','会社名'],['jobTitle','職種名'],['employment','雇用形態'],['duties','仕事内容'],['salary','給与（形態・総額・下限・上限）'],['workplace','勤務先名'],['address','勤務地住所'],['access','アクセス'],['schedule','勤務時間'],['holidays','休日・休暇'],['requirements','応募資格・対象'],['benefits','待遇・福利厚生'],['insurance','社会保険'],['trial','試用期間'],['selection','応募・選考情報'],['companyAddress','企業所在地'],['contact','問い合わせ先']];
const boundary=new Set(['特徴','職種','求める人材','スキル','経験','資格','勤務地','住所','アクセス','その他情報','給与','給与例','勤務時間','休日休暇','休日・休暇','休日休暇制度','社会保険 / 福利厚生','社会保険/福利厚生','職場環境','試用・研修期間','応募とその後の流れ','選考プロセス','問い合わせ先','会社情報','会社名','代表者','業種 / 許認可番号','設立年月','従業員規模','売上規模','その他']);
function parse(input){
 let source=String(input);if(source.length>200000)throw Error('200,000文字以内の原稿を貼り付けてください。');
 // Capture wrappers are discarded only by this explicit delimiter; no fetched content.
 const wrapper=source.indexOf('## 求人内容');if(wrapper>=0)source=source.slice(wrapper+'## 求人内容'.length).split('## 取得メタデータ')[0];
 const raw=source.replace(/\r\n?/g,'\n').split('\n');const lines=raw.map(norm);const fields=Object.fromEntries(definitions.map(([k,label])=>[k,{label,status:'missing',value:null,candidates:[],note:''}]));const notices=[];
 function add(k,value,start,end,note=''){if(value===null||value==='')return;const f=fields[k];const identity=typeof value==='object'?JSON.stringify(value):same(value);const old=f.candidates.find(c=>c.identity===identity);if(old){old.sources.push({start:start+1,end:end+1,text:raw.slice(start,end+1).join('\n')});notices.push(`${f.label}：同一内容の重複を1候補に整理（元記載は保持）`);return;}f.candidates.push({value,identity,sources:[{start:start+1,end:end+1,text:raw.slice(start,end+1).join('\n')}],note});}
 function block(k,heads,stops=boundary){for(let i=0;i<lines.length;i++){if(!heads.includes(lines[i]))continue;let j=i+1;while(j<lines.length&&!stops.has(lines[j])&&!/^応募画面へ進む$|^約1分/.test(lines[j]))j++;let value=raw.slice(i+1,j).join('\n').trim();if(value)add(k,value,i+1,j-1);}}
 const top=lines.findIndex(x=>x==='お仕事について');const topEnd=top<0?lines.length:top;
 for(let i=0;i<topEnd;i++){const t=lines[i].match(/^【(正社員|アルバイト・パート|契約社員|派遣社員)】(.+?)(?:[／/](.+))?$/);if(t&&!/の画像\d/.test(lines[i])){add('jobTitle',t[2].trim(),i,i);add('employment',{正社員:'regular','アルバイト・パート':'part',契約社員:'contract',派遣社員:'temporary'}[t[1]],i,i);}}
 block('company',['会社名']);if(!fields.company.candidates.length){const first=lines.findIndex(x=>x);if(first>=0&&/株式会社|有限会社|合同会社|社会福祉法人/.test(lines[first])&&!/[【】]/.test(lines[first]))add('company',raw[first].trim(),first,first,'先頭の明示的な法人名称');}
 block('duties',['仕事内容']);fields.duties.candidates.forEach(c=>{c.value=c.value.split('\n').filter(x=>!/^雇用形態[:：]|^職種[:：]/.test(norm(x))).join('\n').trim();c.identity=same(c.value);});
 for(let i=0;i<lines.length;i++){const m=lines[i].match(/^雇用形態[:：]\s*(正社員|アルバイト・パート|契約社員|派遣社員)$/);if(m)add('employment',{正社員:'regular','アルバイト・パート':'part',契約社員:'contract',派遣社員:'temporary'}[m[1]],i,i);}
 let inSalary=false,inTrial=false,inExample=false;
 for(let i=0;i<lines.length;i++){const l=lines[i];if(l==='給与'){inSalary=true;inTrial=false;inExample=false;}if(l==='給与例'){inExample=true;inSalary=false;}if(l==='勤務時間'){inSalary=false;}if(/^試用・研修期間[:：]/.test(l))inTrial=true;const p=pay(l);if(p&&((i<topEnd)||(inSalary&&!inTrial&&!inExample)))add('salary',p,i,i);}
 const companyIndex=lines.indexOf('会社情報');const workplaceStart=lines.indexOf('勤務地');const salaryStart=lines.findIndex((l,i)=>i>workplaceStart&&l==='給与');
 if(workplaceStart>=0){const end=salaryStart>=0?salaryStart:companyIndex>=0?companyIndex:lines.length;for(let i=workplaceStart;i<end;i++){if(lines[i]==='勤務地'){let j=i+1;while(j<end&&!lines[j])j++;let next=j+1;while(next<end&&!lines[next])next++;if(lines[j]&&lines[next]==='住所')add('workplace',raw[j].trim(),j,j);}if(lines[i]==='住所'){let j=i+1;while(j<end&&!boundary.has(lines[j]))j++;add('address',raw.slice(i+1,j).join('\n').trim(),i+1,j-1);}if(lines[i]==='アクセス'){let j=i+1;while(j<end&&!boundary.has(lines[j]))j++;add('access',raw.slice(i+1,j).join('\n').trim(),i+1,j-1);}}}
 block('schedule',['勤務時間']); // Duplicate tag-only blocks are not treated as a definitive working schedule.
 fields.schedule.candidates=fields.schedule.candidates.filter(c=>/勤務形態|実働時間|\d{1,2}[:：]\d{2}/.test(c.value));
 block('holidays',['休日休暇制度']);if(!fields.holidays.candidates.length)block('holidays',['休日休暇','休日・休暇']);
 block('requirements',['求める人材']);
 const subStops=new Set([...boundary,'【社会保険】','【福利厚生】']);block('insurance',['【社会保険】'],subStops);block('benefits',['【福利厚生】'],subStops);
 block('selection',['選考プロセス']);for(let i=0;i<lines.length;i++){if(lines[i]==='職場環境'){let j=i+1;while(j<lines.length&&!boundary.has(lines[j])){if(/駅.*(?:徒歩|車|バス).*\d+分/.test(lines[j]))add('access',raw[j].trim(),j,j,'職場環境にもアクセス記載があります。正式なアクセス欄と照合してください。');j++;}}}
 const trialStarts=lines.map((x,i)=>/^試用・研修期間[:：]/.test(x)?i:-1).filter(i=>i>=0);
 for(const i of trialStarts){let j=i+1;while(j<lines.length&&!['給与例','応募画面へ進む','勤務時間','応募とその後の流れ','試用・研修期間'].includes(lines[j]))j++;add('trial',raw.slice(i,j).join('\n').trim(),i,j-1);}
 if(companyIndex>=0){for(let i=companyIndex+1;i<lines.length;i++){if(lines[i]==='住所'){let j=i+1;while(j<lines.length&&!boundary.has(lines[j]))j++;add('companyAddress',raw.slice(i+1,j).join('\n').trim(),i+1,j-1);}}}
 const q=lines.indexOf('問い合わせ先');if(q>=0){let j=q+1;while(j<lines.length&&lines[j]!=='会社情報')j++;const section=raw.slice(q+1,j).join('\n');const emails=section.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[];for(const email of emails)add('contact',email,q+1,j-1,'問い合わせ先のみ。応募先とは確定しない');if(!emails.length){const phones=section.match(/(?:0\d{1,4}[-－]?\d{1,4}[-－]?\d{3,4})/g)||[];for(const p of phones)add('contact',p,q+1,j-1,'問い合わせ先のみ');}}
 return normalize({fields,notices,source,lineCount:raw.length});
}

function normalize(result){const {fields,notices=[],source='',lineCount=0}=result;
 for(const [k,f] of Object.entries(fields)){if(f.candidates.length===1){f.status='clear';f.value=f.candidates[0].value;}if(f.forceReview){f.status='review';f.value=null;}if(f.candidates.length>1){f.status='review';f.note='異なる候補があります。選ぶまで自動反映しません。';}}
 // Separate the original text from structural certainty. Occupation/age/contract conditions are never inferred.
 if(fields.salary.status==='clear'&&fields.salary.value.unit==='annual'){fields.salary.status='review';fields.salary.note='年俸は既存入力PoCの選択肢にありません。';fields.salary.value=null;}
 if(fields.schedule.status==='clear'){fields.schedule.note='勤務時間の原文を反映。所定時間・シフト・実働は推定しません。';}
 if(fields.requirements.status==='clear'){fields.requirements.note='必須／歓迎に自動分類せず原文で保持。資格タグは必須要件にしません。';}
 if(fields.trial.status==='clear'&&/条件[:：]\s*本採用と同じ/.test(norm(fields.trial.value))&&/試用期間.*(?:時給|日給|月給).*\d/.test(norm(fields.trial.value))){fields.trial.status='review';fields.trial.note='本採用と同じという表示と、試用中の給与記載が併存しています。条件を確認してください。';fields.trial.value=null;}return {fields,notices:[...new Set(notices)],source,lineCount};
}
function toInput(selected){const values={};const get=k=>selected[k];for(const k of ['company','jobTitle','employment','duties','workplace','address','holidays','benefits','insurance','selection','companyAddress','contact'])if(get(k))values[k]=get(k);
 if(get('requirements'))values.required=get('requirements');
 if(get('access'))values.workIntro='【アクセス】\n'+get('access');
 if(get('schedule')){values.timeMode='other';values.otherTime=get('schedule');}
 if(get('salary')){const p=get('salary');if(['month','hour','day'].includes(p.unit)&&Number.isFinite(p.min)&&['exact','range','above'].includes(p.format)&&(p.format!=='range'||Number.isFinite(p.max)&&p.max>=p.min)){values.unit=p.unit;values.totalOnly=true;values.reported=String(p.min);values.totalFormat=p.format;if(p.max!==null)values.reportedMax=String(p.max);}}
 if(get('trial')){const text=get('trial'),n=norm(text);values.trialBenefits=text;const m=n.match(/^試用・研修期間[:：]\s*(\d+)\s*(ヶ月|か月|カ月|ヵ月|日|週間)/);if(m){values.trial='yes';values.trialMin=m[1];values.trialUnit=m[2]==='日'?'day':m[2]==='週間'?'week':'month';}else if(/^試用・研修期間[:：]\s*なし/.test(n)){values.trial='no';}
 if(/試用・研修期間の条件[:：]\s*本採用と同じ/.test(n)&&!/試用期間.*(?:時給|日給|月給).*\d/.test(n)){values.trialDiff='same';}else if(/試用・研修期間の条件[:：]\s*給与条件が異なる/.test(n)){values.trialDiff='different';values.trialSalaryDiff=true;values.trialBenefitsDiff=true;values.trialAllowances=text;const a=text.split('\n').map(norm).filter(x=>/^基本給\s*[:：]/.test(x)).map(x=>pay(x.replace(/^基本給\s*[:：]\s*/,''))).filter(Boolean);if(a.length===1&&['month','hour','day'].includes(a[0].unit)){values.trialSalaryUnit=a[0].unit;values.trialBase=String(a[0].min);}}
 }
 return values;
}
return {parse,pay,money,toInput,normalize,definitions};
});
