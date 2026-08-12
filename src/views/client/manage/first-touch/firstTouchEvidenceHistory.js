export const hasFirstTouchEvidenceHistory = (record) =>
  Boolean(
    record?.conflict ||
      record?.claims?.length > 1 ||
      record?.disputes?.length ||
      record?.clarifications?.length ||
      record?.firstTouch?.revisions?.length,
  )
