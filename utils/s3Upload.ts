export async function uploadFileToS3(url: string, file: File) {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename="${file.name}"`,
      },
    });

    return response.url.split('?')[0];
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}
