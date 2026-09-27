// Project exposure classes, never inferred from a product's permitted uses.
// Source: https://www.pci-augsburg.eu/de/fokusthema/din-18534 (2026-09-27).
export const waterClasses=['W0-I','W1-I','W2-I','W3-I'];
export const waterproofingTypes={sheet:'Dichtbahn',compound:'Dichtmasse'};
export const projectPhotoLimit=8;
export const hasWaterproofingDetails=d=>Boolean(d?.water_class||d?.type||d?.photos?.length);
