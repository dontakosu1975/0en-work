const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const routeFiles=new Map([
  ['/','/index.html'],['/jobs','/index.html'],
  ['/about','/about.html'],['/principles','/principles.html'],['/guides','/guides.html'],['/privacy','/privacy.html'],['/terms','/terms.html'],['/contact','/contact.html'],
  ['/company','/company/index.html'],['/company/','/company/index.html'],
  ['/company/importer','/company/importer/index.html'],['/company/importer/','/company/importer/index.html'],
  ['/company/editor','/company/importer/editor/index.html'],['/company/editor/','/company/importer/editor/index.html']
]);
http.createServer((req,res)=>{
  let part;try{part=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  if(/^\/jobs\/\d+$/.test(part))part='/index.html';
  const target=path.resolve(__dirname,'.'+(routeFiles.get(part)||part));
  if(!target.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(target,(e,data)=>{
    if(e){res.writeHead(404);return res.end();}
    if(path.extname(target)==='.html'){let html=data.toString();if(target===path.resolve(__dirname,'./index.html'))html=html.replace('</body>','<script src="/integrated-nav.js"></script></body>');if(target===path.resolve(__dirname,'./company/index.html'))html=html.replace('</html>','<script src="/company/company-enhancements.js"></script></html>');html=html.replace('</html>','<script src="/share-ui.js"></script></html>');data=Buffer.from(html);}
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(target)]||'text/plain')+'; charset=utf-8');
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.end(data);
  });
}).listen(4178,'127.0.0.1',()=>console.log('http://127.0.0.1:4178'));
