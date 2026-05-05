# Kiri-Chat

## Introduction
Kiri-Chat is a project combining [DocFX](https://dotnet.github.io/docfx/) — a .NET static site generator for technical documentation — with Retrieval-Augmented Generation (RAG) to enable AI-powered question answering over documentation content.

The repository includes a scaffolded DocFX documentation site (located in `projects/docfx-rag/docfx-site`) with core configuration in place, ready for content population and RAG feature development.

## Getting Started
### Prerequisites
- [.NET SDK](https://dotnet.microsoft.com/download) (required to run the DocFX CLI)
- [DocFx](https://dotnet.github.io/docfx/) install with `dotnet tool install -g docfx` 
- [pnpm](https://pnpm.io/) (v10.22.0 or later)
- Python 3.x (required for the FastAPI backend)

### Running the Documentation Site
1. Navigate to the DocFX site directory:
   ```bash
   cd projects/docfx-rag/docfx-site
   ```
2. Install dependencies:
   ```bash
   pnpm -w install
   ```
3. Start the local development server:
   ```bash
   pnpm dev
   ```
   This executes `docfx docfx.json --serve` to build the site and serve it locally with live reload.

4. Open your browser to the URL displayed in the terminal (typically `http://localhost:8080`).

### Project Structure
- `projects/docfx-rag/docfx-site`: Main DocFX documentation site
  - `docfx.json`: DocFX configuration (templates, output settings, metadata)
  - `docs/`: Documentation content (Markdown files, section table of contents)
  - `toc.yml`: Root table of contents linking to documentation sections
  - `package.json`: Package manager configuration and development scripts
