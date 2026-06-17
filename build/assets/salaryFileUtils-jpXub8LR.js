import{j as s}from"./vendor-react-DN-RL_pw.js";import"./vendor-coreui-DnNijYIB.js";import{D as v}from"./DataTableEmbeddedList-AQjG4Y0p.js";import{D as b}from"./RightSideDrawer-JXw49pgq.js";import{c as f}from"./DefaultLayout-BsGnHVCu.js";import{f as c}from"./salaryCalculations-CiNpm_C3.js";const m=(...e)=>e.filter(Boolean).join(" "),d=e=>{const a=Number(e||0);return a<0?`-${c(Math.abs(a))}`:c(a)},w=(e={})=>e.isSubtotal||e.isGroup||e.isClaimGroup?"salary-preview-group-row":"",x=()=>[{key:"item",label:"Item",render:e=>{const a=s.jsxs(s.Fragment,{children:[e.item,e.badge&&s.jsx(b,{tone:e.badge.tone||"secondary",size:"sm",className:"salary-preview-badge",children:e.badge.label}),e.note&&s.jsx("span",{className:"salary-preview-note",children:e.note})]});return e.isClaimItem?s.jsx("span",{className:"salary-preview-detail--deep",children:a}):e.isClaimGroup?s.jsx("span",{className:"salary-preview-detail",children:s.jsx("strong",{children:a})}):e.isDetail?s.jsx("span",{className:"salary-preview-detail",children:a}):s.jsx("strong",{children:a})}},{key:"amount",label:"Amount",align:"right",render:e=>e.isDetail||e.isClaimItem?d(e.amount):s.jsx("strong",{children:d(e.amount)})}],g=e=>[{key:"estimated-payable",className:"salary-payable-preview-footer-row",cells:[{key:"item",content:s.jsx("strong",{children:"Estimated Payable Salary"})},{key:"amount",align:"right",content:s.jsx("strong",{children:c(e)})}]}],j=(e={})=>s.jsxs(s.Fragment,{children:[e.item,e.badge&&s.jsx(b,{tone:e.badge.tone||"secondary",size:"sm",className:"salary-preview-badge",children:e.badge.label}),e.note&&s.jsx("span",{className:"salary-preview-note",children:e.note})]}),N=(e={},a="")=>m("salary-preview-mobile-row",(e.isSubtotal||e.isGroup||e.isClaimGroup)&&"salary-preview-mobile-row--group",e.isDetail&&"salary-preview-mobile-row--detail",e.isClaimItem&&"salary-preview-mobile-row--deep",a),S=e=>s.jsxs("div",{className:N(e),children:[s.jsx("span",{className:"salary-preview-mobile-label",children:j(e)}),s.jsx("span",{className:"salary-preview-mobile-amount",children:e.isDetail||e.isClaimItem?d(e.amount):s.jsx("strong",{children:d(e.amount)})})]}),P=(e,a,l=[])=>{var t,r;return s.jsxs("div",{className:"salary-preview-mobile-row salary-preview-mobile-row--footer",children:[s.jsx("span",{className:"salary-preview-mobile-label",children:((t=l[0])==null?void 0:t.content)||"Estimated Payable Salary"}),s.jsx("span",{className:"salary-preview-mobile-amount",children:((r=l[1])==null?void 0:r.content)||c(e.amount)})]})},R=({rowProps:e,previewRows:a=!1,shellClassName:l,mobileClassName:t,desktopBreakpoint:r="md",...i})=>{const n=!!e||a,o=(p,u)=>{const y=typeof e=="function"?e(p,u)||{}:e||{},h=w(p);return{...y,className:m(y.className,h)}};return s.jsx(v,{...i,rowProps:n?o:void 0,shellClassName:m("salary-table-shell",l),mobileClassName:m("salary-table-mobile-list",t),desktopBreakpoint:r})},T=({className:e,actionColumnWidth:a="56px",desktopBreakpoint:l="md",showDesktopSummary:t=!1,desktopUtilityPlacement:r="portal",mobileUtilityPlacement:i="portal",showMobileUtilityRow:n=!1,...o})=>s.jsx(f,{...o,className:m("salary-records-table",e),actionColumnWidth:a,desktopBreakpoint:l,showDesktopSummary:t,desktopUtilityPlacement:r,mobileUtilityPlacement:i,showMobileUtilityRow:n}),U=({rows:e,payableSalary:a,columns:l=x(),footerRows:t=g(a),renderMobileItem:r=S,renderMobileFooterItem:i=P,...n})=>s.jsx(R,{rows:e,columns:l,footerRows:t,getRowKey:o=>o.id,previewRows:!0,renderMobileItem:r,renderMobileFooterItem:i,...n}),E=(e="Preparing PDF...")=>{if(typeof window>"u")return null;const a=window.open("","_blank");if(!a)return null;try{a.opener=null,a.document.open(),a.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${e}</title>
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
  <div class="message">${e}</div>
</body>
</html>`),a.document.close()}catch{}return a},F=(e,a,l=null)=>{if(typeof window>"u")return;const t=window.URL.createObjectURL(e),r=l&&!l.closed?l:window.open(t,"_blank");if(r){try{r.opener=null}catch{}try{r.document.title=a}catch{}l&&!l.closed&&(r.location.href=t),window.setTimeout(()=>window.URL.revokeObjectURL(t),6e4);return}window.location.href=t,window.setTimeout(()=>window.URL.revokeObjectURL(t),6e4)};export{U as S,R as a,T as b,x as c,E as d,d as f,F as o};
