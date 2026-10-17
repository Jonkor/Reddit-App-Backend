# Direct image uploads

The API uses a provider-neutral upload lifecycle. The browser uploads binary data
directly to object storage, and blogs store an upload ID rather than a provider URL.

## Configuration

```env
STORAGE_PROVIDER=s3
S3_BUCKET=forum-app-uploads
S3_REGION=us-west-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

AWS credentials are loaded through the standard AWS SDK credential chain, so IAM
roles and workload identities can be used instead of environment variables.

`S3_ENDPOINT` and `S3_FORCE_PATH_STYLE` support S3-compatible providers such as
MinIO. Other providers can implement the interface in `storage/objectStorage.ts`.

The S3 principal needs `s3:PutObject`, `s3:GetObject`, `s3:HeadObject`, and
`s3:DeleteObject` for the configured bucket's `uploads/*` keys.

## Browser workflow

1. Select a JPEG, PNG, WebP, or GIF file up to 10 MB.
2. Request an upload authorization.
3. Upload the file to the returned URL using the returned method and headers.
4. Confirm the upload.
5. Pass the completed `uploadId` as `imageId` when creating or updating a blog.

```ts
async function uploadImage(file: File, token: string): Promise<string> {
  const authorizationResponse = await fetch("/api/uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  const authorization = await authorizationResponse.json();
  if (!authorizationResponse.ok) {
    throw new Error(authorization.error ?? "Upload authorization failed");
  }
  const uploadResponse = await fetch(authorization.uploadUrl, {
    method: authorization.method,
    headers: authorization.headers,
    body: file,
  });
  if (!uploadResponse.ok) throw new Error("Image upload failed");

  const completionResponse = await fetch(
    `/api/uploads/${authorization.uploadId}/complete`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!completionResponse.ok) throw new Error("Upload verification failed");

  return authorization.uploadId;
}
```

An HTML picker can pass its selected file to that function:

```html
<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
```

Create or update the blog after completion:

```json
{
  "title": "A post with an image",
  "content": "...",
  "imageId": "completed-upload-id"
}
```

Send `"imageId": null` during an update to detach the image. Blog responses expose
the safe image metadata and a `contentPath`; requesting that path redirects to a
short-lived signed download URL.

## S3 CORS

The bucket must allow the frontend origin to perform `PUT` requests. Replace the
example origin with the deployed frontend origin:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Keep the bucket private. Read access is provided by short-lived signed redirects.
Production deployments should also run a scheduled cleanup for pending uploads whose
objects were transferred but never completed.
