# syntax = docker/dockerfile:1

ARG RUBY_VERSION=3.3.1
FROM registry.docker.com/library/ruby:$RUBY_VERSION-slim AS base

WORKDIR /rails

ENV BUNDLE_PATH="/usr/local/bundle" \
    RAILS_LOG_TO_STDOUT="true"

# Install packages needed to build gems
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    git \
    pkg-config \
    curl \
    libvips \
    && rm -rf /var/lib/apt/lists/*

# Development stage
FROM base AS development
ENV RAILS_ENV=development

# Install application gems
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local without '' && \
    bundle install

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p db log tmp public && \
    useradd rails --create-home --shell /bin/bash && \
    chown -R rails:rails db log tmp public

USER rails:rails

# Production stage
FROM base AS production
ENV RAILS_ENV=production \
    BUNDLE_WITHOUT="development:test"

# Install application gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p db log tmp public && \
    useradd rails --create-home --shell /bin/bash && \
    chown -R rails:rails db log tmp public

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

USER rails:rails

EXPOSE 3000
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]