# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui (including Sidebar component)
- Tailwind CSS
- Vitest (testing)
- Supabase (auth, database, storage, edge functions)
- React Router DOM (with NavLink for active states)

## Running Tests

This project includes unit tests to ensure code quality and prevent regressions:

```sh
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Security

This project implements the following security measures:

- **Row-Level Security (RLS)**: All database tables have RLS policies enabled
- **Function Security**: Database functions use `SECURITY DEFINER` with fixed `search_path = 'public'`
- **Password Protection**: (Requires manual activation) Enable "Check against leaked passwords" in Supabase Auth settings
- **Private Storage**: Receipt files are stored in a private bucket with signed URLs
- **JWT Verification**: All Edge Functions verify authentication tokens

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
