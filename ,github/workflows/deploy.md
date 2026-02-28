name: Deploy TS Blog to GitHub Pages

# Trigger the workflow every time you push to the 'main' branch

on:
push:
branches: ["main"]

# Allows you to run this workflow manually from the Actions tab

workflow_dispatch:

# Grant necessary permissions to the GitHub token to deploy to Pages

permissions:
contents: read
pages: write
id-token: write

# Ensure only one deployment runs at a time

concurrency:
group: "pages"
cancel-in-progress: false

jobs:

# --- JOB 1: Build the Static Site ---

build:
runs-on: ubuntu-latest
steps: - name: Checkout repository
uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Build the blog
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist' # This must match the output directory in your TS script!

# --- JOB 2: Deploy to GitHub Pages ---

deploy:
environment:
name: github-pages
url: ${{ steps.deployment.outputs.page_url }}
runs-on: ubuntu-latest
needs: build
steps: - name: Deploy to GitHub Pages
id: deployment
uses: actions/deploy-pages@v4
