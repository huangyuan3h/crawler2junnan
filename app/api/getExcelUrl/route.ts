import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { Bucket } from "sst/node/bucket";

const generateSignedURL = async (): Promise<string> => {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: randomUUID(),
    Bucket: Bucket.public.bucketName, // 确保在 SST 配置中定义了 `Bucket.public`
  });

  const s3Client = new S3Client({
    region: "us-east-1", // 根据您的存储桶区域设置
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL 过期时间为 1 小时
};

export async function GET(request: Request) {
  try {
    const url = await generateSignedURL();
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate signed URL" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
