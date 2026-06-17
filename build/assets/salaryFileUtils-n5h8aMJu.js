const r=(n="Preparing PDF...")=>{if(typeof window>"u")return null;const e=window.open("","_blank");if(!e)return null;try{e.opener=null,e.document.open(),e.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${n}</title>
  <style>
    body {
      align-items: center;
      color: #273142;
      display: flex;
      font-family: Arial, Helvetica, sans-serif;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
    }
    .message {
      border: 1px solid #d8dee8;
      border-radius: 6px;
      padding: 18px 22px;
    }
  </style>
</head>
<body>
  <div class="message">${n}</div>
</body>
</html>`),e.document.close()}catch{}return e},l=(n,e,t=null)=>{if(typeof window>"u")return;const o=window.URL.createObjectURL(n),i=t&&!t.closed?t:window.open(o,"_blank");if(i){try{i.opener=null}catch{}try{i.document.title=e}catch{}t&&!t.closed&&(i.location.href=o),window.setTimeout(()=>window.URL.revokeObjectURL(o),6e4);return}window.location.href=o,window.setTimeout(()=>window.URL.revokeObjectURL(o),6e4)};export{r as a,l as o};
