FROM mcr.microsoft.com/devcontainers/base:bookworm

USER root

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        chromium \
        fonts-dejavu-core \
        fonts-liberation \
        fonts-noto-cjk \
        fonts-noto-color-emoji \
        fonts-noto-core \
    && fc-cache --force \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV DEBIAN_FRONTEND=

USER vscode
