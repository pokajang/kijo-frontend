const t=/^[•‣◦⁃∙▪▫]\s*/u,a=r=>String(r||"").replace(/\r\n?/g,`
`).split(`
`).map(e=>e.trim().replace(t,"").replace(/\s+/gu," ")).filter(Boolean).reduce((e,n)=>e?`${e}${e.endsWith(":")?" ":"; "}${n}`:n,"");export{a as c};
