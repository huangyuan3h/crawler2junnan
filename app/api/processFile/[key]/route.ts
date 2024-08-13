import { extractLastPart } from "@/utils/lastPart";
import { Job } from "sst/node/job";

export async function GET(request: Request) {
  const url = request.url;
  const key = extractLastPart(url);

  const { jobId } = await Job.process.run({
    payload: {
      id: key,
    },
  });

  return Response.json({ url: jobId });
}
