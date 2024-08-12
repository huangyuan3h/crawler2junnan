export const sendProcess = async (key: string) => {
  const response = await fetch(`/api/processFile/${key}`);
  const data = await response.json();

  console.log(data);
};
