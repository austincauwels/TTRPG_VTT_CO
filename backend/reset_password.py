"""
Reset a single user's password (account recovery).

Only touches the `hashed_password` column of ONE user. Nothing else is modified.

Usage (from the repo root):
  export DATABASE_URL="<External Database URL from the Render dashboard>"
  python3 backend/reset_password.py --email austin.cauwels@gmail.com
  # or: python3 backend/reset_password.py --username some_name

The new password is typed at a hidden prompt, never passed on the command line.
"""
import argparse
import getpass
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main():
    parser = argparse.ArgumentParser(description="Reset one user's password.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--email", help="Email address on the account")
    group.add_argument("--username", help="Username (Identification) on the account")
    args = parser.parse_args()

    url = os.getenv("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set. Export the External Database URL from Render first.")
    # Some providers hand out the legacy scheme; SQLAlchemy 1.4+ needs postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(url)
    db = sessionmaker(bind=engine)()
    try:
        query = db.query(User)
        if args.email:
            user = query.filter(User.email == args.email).first()
        else:
            user = query.filter(User.username == args.username).first()

        if not user:
            sys.exit("No matching user found. Nothing was changed.")

        print(f"Found account: username={user.username!r} email={user.email!r}")

        new_pw = getpass.getpass("New password (min 8 characters): ")
        if len(new_pw) < 8:
            sys.exit("Password must be at least 8 characters. Nothing was changed.")
        if new_pw != getpass.getpass("Confirm new password: "):
            sys.exit("Passwords do not match. Nothing was changed.")

        user.hashed_password = pwd_context.hash(new_pw)
        db.commit()
        print("Password updated. You can log in with it now.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
