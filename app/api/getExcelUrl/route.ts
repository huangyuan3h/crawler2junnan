import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const generateSignedURL = async (): Promise<string> => {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: randomUUID(),
    Bucket: process.env.NEXT_PUBLIC_EXCEL_BUCKET,
  });
  return getSignedUrl(new S3Client({}), command);
};

export async function GET(request: Request) {
  const url = await generateSignedURL();

  return Response.json({ url });
}
