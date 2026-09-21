"""一次性创建部署管理员；密码仅从临时运行环境读取，不修改已有用户。"""
import asyncio
import os

from app.database import AsyncSessionLocal, dispose_engine
from app.models import User
from app.services.auth import get_user_by_email, hash_password


async def main() -> None:
    """验证部署凭据并创建管理员，绝不覆盖已有密码或提权已有普通用户。"""
    email = os.environ["INITIAL_ADMIN_EMAIL"].strip().lower()
    password = os.environ["INITIAL_ADMIN_PASSWORD"]
    if "@" not in email or len(password) < 16:
        raise ValueError("Invalid initial administrator credentials")
    try:
        async with AsyncSessionLocal() as db:
            existing = await get_user_by_email(db, email)
            if existing:
                if existing.role != "admin":
                    raise ValueError("Existing account is not an administrator")
                print("Administrator already exists")
                return
            db.add(User(email=email, nickname="Admin", hashed_password=hash_password(password), role="admin"))
            await db.commit()
            print("Administrator created")
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())
