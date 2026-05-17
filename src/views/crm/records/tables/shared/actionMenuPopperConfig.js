export const actionMenuPopperConfig = {
  strategy: 'fixed',
  placement: 'auto-end',
  modifiers: [
    {
      name: 'offset',
      options: { offset: [0, 4] },
    },
    {
      name: 'flip',
      options: {
        fallbackPlacements: ['top-end', 'bottom-end'],
      },
    },
    {
      name: 'preventOverflow',
      options: {
        mainAxis: true,
        altAxis: true,
        tether: false,
        rootBoundary: 'viewport',
        padding: {
          top: 64,
          right: 8,
          bottom: 8,
          left: 8,
        },
      },
    },
  ],
}
