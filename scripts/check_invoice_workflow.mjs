import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
const baseUrl=process.env.APP_URL||"https://93.127.215.188";
const text=await readFile(process.env.CREDENTIALS_FILE||"/root/procontra-admin-credentials.txt","utf8");
const email=text.match(/^Email:\s*(.+)$/m)?.[1]?.trim(); const password=text.match(/^Password:\s*(.+)$/m)?.[1]?.trim();
if(!email||!password) throw new Error("Credenciales protegidas no disponibles");
const artifacts=new URL("../artifacts/invoice-workflow/",import.meta.url).pathname; await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true}); const results=[];
const probePage=await browser.newPage({viewport:{width:1000,height:500}}); await probePage.setContent('<main style="padding:50px;font:28px Arial;background:white;color:black"><h1>FACTURA 100</h1><p>016907 ACETAMINOFEN 500 MG TABLETAS</p><p>TOTAL 250.00</p></main>'); await probePage.screenshot({path:"/tmp/procontra-ocr-probe.png"}); await probePage.close();
for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]]){
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport}); const page=await context.newPage(); const consoleErrors=[]; const pageErrors=[]; const badResponses=[];
 page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())}); page.on("pageerror",e=>pageErrors.push(e.message)); page.on("response",r=>{if(r.status()>=400)badResponses.push(`${r.status()} ${r.url()}`)});
 await page.goto(`${baseUrl}/ingresar`,{waitUntil:"networkidle"}); await page.locator('input[name="email"]').fill(email); await page.locator('input[name="password"]').fill(password); await Promise.all([page.waitForURL(u=>!u.pathname.includes("ingresar")),page.locator('button[type="submit"]').click()]);
 await page.goto(`${baseUrl}/documentos`,{waitUntil:"networkidle"}); await page.getByRole("heading",{name:"Fotografías de facturas"}).waitFor();
 let ocrLines=0; if(name==="desktop"){ await page.locator('input[name="file"]').setInputFiles('/tmp/procontra-ocr-probe.png'); await page.getByRole("button",{name:"Extraer texto de la foto"}).click(); await page.getByText(/Texto extraído|No se detectaron renglones/).waitFor(); ocrLines=await page.locator('.invoice-line-editor').count(); }
 const branches=await page.locator('select[name="branchId"] option').count(); const lineEditors=await page.locator('.invoice-line-editor').count(); const adminPanel=await page.getByRole("heading",{name:"Usuarios autorizados"}).count(); const bodyOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 await page.screenshot({path:`${artifacts}/${name}.png`,fullPage:true}); results.push({name,branches,lineEditors,ocrLines,adminPanel,bodyOverflow,consoleErrors,pageErrors,badResponses}); await context.close();
}
await browser.close(); const passed=results.every(r=>r.branches===5&&r.lineEditors>=1&&r.adminPanel===1&&!r.bodyOverflow&&!r.consoleErrors.length&&!r.pageErrors.length&&!r.badResponses.length)&&results.find(r=>r.name==="desktop")?.ocrLines>0; console.log(JSON.stringify({passed,results,artifacts},null,2)); if(!passed)process.exitCode=1;
