import "server-only";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uuidv7 } from "uuidv7";
import { requireEnv } from "@/lib/env";

let client: S3Client | undefined;

function s3() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export const publicBucket = () => requireEnv("R2_BUCKET");
/** Claim and verification documents live in a private bucket, read only via signed URLs. */
export const privateBucket = () => process.env.R2_PRIVATE_BUCKET || `${requireEnv("R2_BUCKET")}-private`;

export function publicUrl(key: string) {
  return `${requireEnv("R2_PUBLIC_URL").replace(/\/$/, "")}/${key}`;
}

export function buildKey(prefix: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${prefix}/${uuidv7()}.${ext}`;
}

export async function presignPut(opts: { bucket: string; key: string; contentType: string; maxBytes: number }) {
  const command = new PutObjectCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(s3(), command, { expiresIn: 600 });
}

export async function presignGet(bucket: string, key: string, expiresIn = 300) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function getObjectBytes(bucket: string, key: string) {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty object");
  return Buffer.from(bytes);
}

export async function putObject(bucket: string, key: string, body: Buffer, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObject(bucket: string, key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
