const assert=require('node:assert/strict'),C=require('./csv-parser');
assert.deepEqual(C.read('名前\t本文\n求人\t"一行目\n二行目"').rows,[['求人','一行目\n二行目']]);
assert.deepEqual(C.read('a,b\r\n"a,b","x""y"').rows,[['a,b','x"y']]);
assert.throws(()=>C.read('a,a\n1,2'));assert.throws(()=>C.read('a,b\n1'));assert.throws(()=>C.read('a\n"x'));
const fs=require('node:fs');if(process.argv[2]){const t=C.read(fs.readFileSync(process.argv[2],'utf8'));assert.equal(t.headers.length,271);assert.equal(t.rows.length,3);t.rows.forEach((r,i)=>{const x=C.mapRow(t,i);assert.equal(x.fields.company.status,'missing');assert.equal(x.fields.salary.status,'clear');const selected=Object.fromEntries(Object.entries(x.fields).filter(([,f])=>f.status==='clear').map(([k,f])=>[k,f.value]));const v=require('./parser').toInput(selected);assert.equal(v.totalOnly,true);console.log(i+1,JSON.stringify(x.fields.salary.value),x.fields.trial.status);});}
console.log('CSV tests passed');
