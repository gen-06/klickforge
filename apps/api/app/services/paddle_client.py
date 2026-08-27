from paddle_billing import Client
from paddle_billing.Options import Options

from app.config import settings

paddle = Client(settings.paddle_api_key, Options(settings.paddle_environment))
