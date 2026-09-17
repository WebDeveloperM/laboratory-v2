# syntax=docker/dockerfile:1
FROM python:3.10-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Prefer IPv4 to avoid ~20-30s per-connection IPv6 timeouts on networks
# without working IPv6 route to Debian/PyPI mirrors.
RUN echo "precedence ::ffff:0:0/96 100" >> /etc/gai.conf

# Use HTTPS for apt sources: repeated Hash Sum mismatches were observed over
# plain HTTP, consistent with a transparent proxy on the local network
# altering unencrypted traffic.
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/*.sources /etc/apt/sources.list 2>/dev/null || true

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

EXPOSE 8005

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8005"]
