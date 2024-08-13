import { getJobStatus } from "@/utils/dynamoDBHelper";
import { extractLastPart } from "@/utils/lastPart";

export async function GET(request: Request) {
  const url = request.url;
  const key = extractLastPart(url);

  const status = await getJobStatus(key);
  return Response.json(status);
}
