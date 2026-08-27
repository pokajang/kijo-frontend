import{r as n,j as c}from"./vendor-react-B4h96LKZ.js";import{E as s}from"./vendor-editor-DXc5wQmL.js";import{u as d}from"./vendor-coreui-Dgx8G--H.js";const a="coreui-free-react-admin-template-theme",i=()=>{const{colorMode:o}=d(a);return o},l=()=>i()==="dark",m=`
  body {
    background: #1c1f23;
    color: #ced4da;
  }
  a {
    color: #7aabf0;
  }
  table,
  td,
  th {
    border-color: #373d45;
  }
  blockquote {
    border-color: #373d45;
    color: #9aa5b4;
  }
`,f=`
  body {
    background: #ffffff;
    color: #1f2937;
  }
`,y=(o={},t=!1)=>({...o,skin:t?"oxide-dark":"oxide",content_css:t?"dark":"default",content_style:[t?m:f,o.content_style].filter(Boolean).join(`
`)}),E=({init:o,...t})=>{const e=l(),r=n.useMemo(()=>y(o,e),[o,e]);return c.jsx(s,{tinymceScriptSrc:"/tinymce/tinymce.min.js",...t,init:r},e?"tinymce-dark":"tinymce-light")};export{E as T};
