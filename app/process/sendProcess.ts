export interface StartResponse {
  jobId: string;
}

export const sendProcess = async (key: string): Promise<StartResponse> => {
  const response = await fetch(`/api/processFile/${key}`);
  const data = await response.json();

  return data;
};
