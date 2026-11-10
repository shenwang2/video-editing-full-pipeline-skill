// Exercises the real browser-client upload function against the real server routes
// in an isolated temporary project. Never touches an installed user's project.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),net=require('node:net');
const {spawn}=require('node:child_process'),{once}=require('node:events'),{pathToFileURL}=require('node:url');
const {File}=require('node:buffer');
async function main(){
 const editor=path.resolve(process.argv[2]||'.');
 const parent=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'edit-desk-upload-test-'));
 let child;
 try{
  const projectRoot=path.join(root,'projects','fixture');fs.mkdirSync(projectRoot,{recursive:true});
  const manifest=JSON.stringify({project:{id:'fixture',name:'Upload regression fixture'},assets:[{id:'asset',path:'original.mp4'}]});
  fs.writeFileSync(path.join(projectRoot,'edit-project.json'),manifest);
  const viteEntry=path.join(editor,'node_modules/vite/dist/node/index.js');assert.ok(fs.existsSync(viteEntry));
  let source=fs.readFileSync(path.join(editor,'server.mjs'),'utf8');
  assert.ok(source.includes("from 'vite'"));
  source=source.replace("from 'vite'",`from ${JSON.stringify(pathToFileURL(viteEntry).href)}`);
  fs.writeFileSync(path.join(root,'server.mjs'),source);
  require(path.join(editor,'node_modules/esbuild')).buildSync({entryPoints:[path.join(editor,'src/api.ts')],bundle:true,platform:'node',format:'cjs',outfile:path.join(root,'client.cjs'),logLevel:'silent'});
  const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
  const base=`http://127.0.0.1:${port}`;
  child=spawn(process.execPath,[path.join(root,'server.mjs')],{cwd:root,env:{...process.env,EDIT_DESK_PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
  const nativeFetch=global.fetch;
  let ready=false;
  for(let i=0;i<100;i++){try{ready=(await nativeFetch(base+'/api/projects')).ok;}catch{}if(ready)break;if(child.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'Fixture server did not start: '+logs);
  const api=require(path.join(root,'client.cjs'));
  global.fetch=(url,options)=>{
   // Uses the browser Fetch header validation that rejected raw Chinese names.
   const headers=new Headers(options.headers);
   assert.ok(/^[\x00-\x7f]*$/.test(headers.get('x-filename')));
   return nativeFetch(new URL(url,base),options);
  };
  const bytes=Buffer.from('binary-fixture\0\xff','latin1');
  const names=['中文视频.mp4','（未剪辑版） 操作画面.mp4','素材🎬.mp4','100%完成.mp4','literal%20name.mp4','ascii clip.mp4'];
  for(const name of names){
   const result=await api.uploadAsset('fixture','asset',new File([bytes],name,{type:'video/mp4'}));
   assert.equal(result.filename,path.basename(name).replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(-120));
   assert.equal(path.extname(result.path),'.mp4');
   assert.deepEqual(fs.readFileSync(path.join(projectRoot,result.path)),bytes);
   const fetched=await nativeFetch(base+'/project-assets/fixture/'+result.path.split('/').map(encodeURIComponent).join('/'));
   assert.equal(fetched.status,200);assert.deepEqual(Buffer.from(await fetched.arrayBuffer()),bytes);
  }
  const legacy=await nativeFetch(base+'/api/projects/fixture/assets/asset',{method:'POST',headers:{'x-filename':'literal%20name.mp4'},body:bytes});
  assert.equal((await legacy.json()).filename,'literal-20name.mp4');
  const bad=await nativeFetch(base+'/api/projects/fixture/assets/asset',{method:'POST',headers:{'x-filename':'%ZZ.mp4','x-filename-encoding':'percent-utf8'},body:bytes});
  assert.equal(bad.status,400);assert.equal((await bad.json()).error,'invalid-filename-encoding');
  assert.equal(fs.readFileSync(path.join(projectRoot,'edit-project.json'),'utf8'),manifest);
  console.log('PASS: 6 Unicode/ASCII uploads, readable stored names, exact file bytes, served media, legacy filename compatibility, malformed encoding rejection, manifest unchanged');
 }finally{
  if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}
  const resolved=path.resolve(root);
  assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('edit-desk-upload-test-'));
  fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
