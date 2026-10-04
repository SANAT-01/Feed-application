# feedapp API + fanout-worker (one image, two commands). Standard library only — no
# pip install, so the build needs no PyPI access; only the python:3.12-alpine base is
# pulled (via the registry mirror).
FROM python:3.12-alpine

WORKDIR /app
COPY common.py app.py worker.py /app/

EXPOSE 8000
CMD ["python", "/app/app.py"]
