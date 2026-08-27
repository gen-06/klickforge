from app.database import SessionLocal
from app.models import Clip

db = SessionLocal()
clip = db.query(Clip).filter(Clip.id == "8f096295-c2f7-49b5-930b-13cbd3b01896").first()
if clip:
    print("clip", clip.id, clip.status.value, clip.output_key, clip.output_url)
else:
    print("clip not found")
