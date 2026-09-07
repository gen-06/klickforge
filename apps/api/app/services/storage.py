import logging
from datetime import timedelta
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger("clipforge.storage")


class StorageService:
    def __init__(self):
        self.uploads_bucket = settings.STORAGE_BUCKET_UPLOADS
        self.clips_bucket = settings.STORAGE_BUCKET_CLIPS
        s3_config = Config(signature_version="s3v4", s3={"addressing_style": "path"})
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_INTERNAL_ENDPOINT,
            region_name=settings.STORAGE_REGION,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            config=s3_config,
            use_ssl=settings.STORAGE_USE_SSL,
        )
        self._public_client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT,
            region_name=settings.STORAGE_REGION,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            config=s3_config,
            use_ssl=settings.STORAGE_USE_SSL,
        )

    def ensure_buckets(self):
        for bucket in [self.uploads_bucket, self.clips_bucket]:
            try:
                self._client.head_bucket(Bucket=bucket)
            except ClientError:
                self._client.create_bucket(Bucket=bucket)
        self._warn_if_not_public(self.clips_bucket)
        self.set_cors(self.uploads_bucket, settings.CORS_ORIGINS, methods=["PUT"])
        self.set_cors(self.clips_bucket, settings.CORS_ORIGINS, methods=["GET", "HEAD"])

    def _warn_if_not_public(self, bucket: str):
        # Cloudflare R2 does not implement the S3 PutBucketPolicy API (it
        # returns a hard "NotImplemented" error), so anonymous read access
        # can't be granted via the S3-compatible API the way it can on AWS
        # S3/MinIO. Public access must be enabled manually per-bucket via the
        # R2 dashboard/API instead: either the bucket's "Public Development
        # URL" toggle, or a custom domain bound to it — whichever backs
        # STORAGE_PUBLIC_URL. This just reminds you at startup; it can't be
        # automated against R2.
        logger.warning(
            "storage.public_access_not_automated",
            extra={
                "bucket": bucket,
                "hint": "Enable public access for this R2 bucket via the Cloudflare dashboard "
                "(Public Development URL or a custom domain) so STORAGE_PUBLIC_URL resolves.",
            },
        )

    def get_presigned_upload_url(
        self, key: str, bucket: str, content_type: str = "video/mp4", expires_in: int = 600
    ) -> str:
        return self._public_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
        )

    def get_url(self, key: str, bucket: str) -> str:
        # R2's public access (Public Development URL or a custom domain) is
        # bound per-bucket, so the domain alone already scopes to the
        # bucket — no bucket name goes in the path.
        return f"{settings.STORAGE_PUBLIC_URL}/{key}"

    def get_signed_download_url(
        self,
        key: str,
        bucket: str,
        expires_in: int = 600,
        content_disposition: Optional[str] = None,
    ) -> str:
        params: dict = {"Bucket": bucket, "Key": key}
        if content_disposition:
            params["ResponseContentDisposition"] = content_disposition
        return self._public_client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires_in,
        )

    def download_file(self, key: str, bucket: str, local_path: str):
        self._client.download_file(bucket, key, local_path)

    def delete_file(self, key: str, bucket: str):
        try:
            self._client.delete_object(Bucket=bucket, Key=key)
        except ClientError:
            pass

    def upload_file(
        self,
        local_path: str,
        key: str,
        bucket: str,
        content_type: str = "video/mp4",
        content_disposition: Optional[str] = None,
    ):
        extra_args = {"ContentType": content_type}
        if content_disposition:
            extra_args["ContentDisposition"] = content_disposition
        self._client.upload_file(local_path, bucket, key, ExtraArgs=extra_args)

    def set_cors(self, bucket: str, origins: list[str], methods: list[str]):
        cors_config = {
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": methods,
                    "AllowedOrigins": origins,
                    "MaxAgeSeconds": 3600,
                }
            ]
        }
        try:
            self._client.put_bucket_cors(Bucket=bucket, CORSConfiguration=cors_config)
        except ClientError as exc:
            logger.warning(
                "storage.cors_not_automated",
                extra={
                    "bucket": bucket,
                    "error": str(exc),
                    "hint": "R2 API token likely lacks CORS permissions. Set the bucket's CORS "
                    "policy manually via the Cloudflare dashboard (R2 > bucket > Settings > CORS "
                    "Policy) or grant the token 'Edit' access.",
                },
            )
