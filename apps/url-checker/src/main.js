const {app,BrowserWindow,shell,dialog}=require('electron');
const {startServer}=require('./server');
let server,mainWindow,origin;
function openWindow(){
  mainWindow=new BrowserWindow({width:1180,height:840,minWidth:700,minHeight:600,title:'求人 URL 生存チェック β版',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  mainWindow.webContents.setWindowOpenHandler(({url})=>{try{const u=new URL(url);if(['http:','https:'].includes(u.protocol)) shell.openExternal(url)}catch{}return {action:'deny'}});
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin)event.preventDefault()});
  mainWindow.loadURL(origin+'/');
}
if(!app.requestSingleInstanceLock()){app.quit()}else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus()}});
 app.whenReady().then(()=>{server=startServer(()=>{origin=`http://127.0.0.1:${server.address().port}`;openWindow()},0);server.on('error',()=>{dialog.showErrorBox('起動できません','ローカルのチェック処理を起動できませんでした。');app.quit()});});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',()=>server?.close());
}
