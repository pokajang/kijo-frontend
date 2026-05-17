export const handbookEditorInit = {
  license_key: 'gpl',
  height: 360,
  menubar: 'format table',
  branding: false,
  promotion: false,
  toolbar_mode: 'wrap',
  block_formats: 'Paragraph=p; Heading 5=h5; Heading 6=h6',
  plugins: 'advlist lists link table code',
  toolbar:
    'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright alignjustify | link table | code',
  content_style: `
    body {
      font-family: var(--cui-body-font-family, system-ui, -apple-system, "Segoe UI", sans-serif);
      font-size: 1rem;
      line-height: 1.5;
      color: var(--app-text-base);
    }

    h6 {
      margin: 1.15rem 0 0.65rem;
      font-size: 0.9375rem;
      font-weight: 700;
      line-height: 1.4;
    }

    h6:first-child {
      margin-top: 0;
    }

    p {
      margin: 0 0 0.85rem;
    }

    ul,
    ol {
      padding-left: 1.75rem;
      margin: 0.5rem 0 1rem;
    }

    li {
      padding-left: 0.15rem;
      margin-bottom: 0.35rem;
    }
  `,
}
