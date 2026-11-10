// Run with: node test-title-placement.cjs <editor-root>
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const editor=process.argv[2]||'.';
const esbuild=require(path.join(editor,'node_modules/esbuild'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'title-geometry-'));
function build(rel,name){const output=path.join(temp,name+'.cjs');esbuild.buildSync({entryPoints:[path.join(editor,'src',rel)],bundle:true,platform:'node',format:'cjs',outfile:output,logLevel:'silent'});return require(output);}
const g=build('editorPlacement.ts','placement');
const {getSectionTitleLayout}=build('legacy-semantic-foreground-pack/lib/section-title-layout.ts','title');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
let cases=0;
for(const [w,h] of [[1440,2560],[1080,1920],[2560,1440],[1920,1080]])for(const variant of ['referenceV2','standard']){
 const e={id:'title',enabled:true,componentId:'SectionTitle',semanticLayer:'title',variantId:variant,anchorText:'标题',payload:{headline:'检查后，导出透明前景',setup:'CHECK · EXPORT · ASSEMBLE',sectionIndex:'01 / 06'},placement:{mode:'normalized',preset:'leftMiddle',x:.2,y:.1,width:.3,height:.2}};
 const migrated=g.migrateVisiblePlacement(e,w,h);
 assert.equal(migrated.placement.mode,'preset');assert.equal(migrated.placement.boundsVersion,2);assert.ok(g.canMultiTransform(migrated));
 const b=g.getEventPlacementBox(migrated,w,h),layout=getSectionTitleLayout({width:w,height:h,variantId:variant,payload:e.payload});
 for(const key of ['x','y','width','height'])near(b[key]*(key==='x'||key==='width'?w:h),layout.bounds[key]);
 if(h>w){assert.ok(layout.fontSize/w>=.04);assert.ok((b.y+b.height)<.14);}
 const moved={...migrated,placement:{...migrated.placement,mode:'normalized',x:.11,y:.16,width:b.width*.67,height:b.height*.67}};
 const scale=g.getEventScale(moved,w,h),origin=g.getEventTransformOrigin(moved,w,h),delta=g.getEventTranslation(moved,w,h);
 near(scale,.67);near(origin.x+(b.x*w-origin.x)*scale+delta.x,.11*w);near(origin.y+(b.y*h-origin.y)*scale+delta.y,.16*h);
 assert.deepEqual(g.migrateVisiblePlacement(JSON.parse(JSON.stringify(moved)),w,h),moved);
 const long=getSectionTitleLayout({width:w,height:h,variantId:variant,payload:{headline:'这是一个需要自动换行并保持边框高度正确的比较长的章节标题'}});
 assert.ok(long.headlineLines.length>1);assert.ok(long.bounds.height>layout.bounds.height);cases++;
}
console.log(`PASS: ${cases} title layouts; portrait/landscape, both variants, migration, transform, persistence, long text`);
