// Google Form uploads live in Drive; these helpers turn a share link into its file id and image URL.
export const driveFileId = (url: string) => url.match(/\/file\/d\/([\w-]{20,})/)?.[1] ?? url.match(/[?&]id=([\w-]{20,})/)?.[1] ?? null;
export const driveThumbnail = (id: string, width = 1200) => `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
