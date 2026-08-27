import { downloadWordDocument } from '../../../utils/documents/downloadWordDocument'

export const downloadCommercialWord = (url, fallbackFilename) =>
  downloadWordDocument(url, fallbackFilename, {
    errorSuffix: '\n\nThe commercial record remains saved and unchanged.',
  })
