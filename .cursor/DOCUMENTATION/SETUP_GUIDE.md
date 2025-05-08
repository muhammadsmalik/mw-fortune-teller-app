# Next.js + React 19 + Tailwind CSS v3.x + shadcn/ui: Setup Guide

This guide walks through setting up a Next.js project with React 19, Tailwind CSS v3.x, and `shadcn/ui`.
The decision to use Tailwind CSS v3.x (instead of v4) is primarily for better compatibility with current AI coding assistant tools, which may have a knowledge cut-off predating Tailwind CSS v4's release.

## Prerequisites

*   **Node.js**: Ensure you have a recent version of Node.js installed (which includes `npm`).
*   **Package Manager**: This guide uses `npm`. If you are using `pnpm` or `bun`, they often handle peer dependencies more gracefully (e.g., with silent warnings instead of errors), so some steps related to `--force` or `--legacy-peer-deps` might be less critical or handled automatically.

## Setup Steps

### 1. Create a New Next.js Project

Open your terminal and run:
```bash
npx create-next-app@latest your-project-name
cd your-project-name
```
Replace `your-project-name` with your desired project name. This command typically sets up a Next.js project with the latest React version (including React 19 RCs) and may default to installing Tailwind CSS v4.

### 2. Verify React Version (Optional but Recommended)

Open your `package.json`. You should see `react` and `react-dom` listed with versions like `^19.0.0` or `^19.0.0-rc...`.
If they are not at version 19 for some reason, you can install the RC version:
```bash
npm install react@rc react-dom@rc
```

### 3. Set up Tailwind CSS v3.x

`create-next-app` might install Tailwind CSS v4. We'll ensure v3.x is used.

**a. Check and Uninstall Tailwind CSS v4 (if present)**
   Inspect your `package.json`. If you see `"tailwindcss": "^4"` and `"@tailwindcss/postcss": "^4"`, uninstall them:
   ```bash
   npm uninstall tailwindcss @tailwindcss/postcss
   ```

**b. Install Tailwind CSS v3.x and its peer dependencies:**
   ```bash
   npm install -D tailwindcss@^3 postcss autoprefixer
   ```
   Note: We are installing `tailwindcss` version 3 (e.g., `^3.4.0`).

**c. Initialize Tailwind CSS v3 Configuration:**
   This command will generate `tailwind.config.js` and `postcss.config.js` files suitable for Tailwind v3.
   ```bash
   npx tailwindcss init -p
   ```

### 4. Configure Tailwind CSS

**a. Update `tailwind.config.js`:**
   Open `tailwind.config.js`. Update the `content` array to include paths to all your template files. It should look something like this:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: [
       "./pages/**/*.{js,ts,jsx,tsx,mdx}",
       "./components/**/*.{js,ts,jsx,tsx,mdx}",
       "./app/**/*.{js,ts,jsx,tsx,mdx}", // If using App Router (default)
     ],
     theme: {
       extend: {
         // You can extend your theme here
       },
     },
     plugins: [],
   }
   ```

**b. Add Tailwind Directives to Global CSS:**
   Open your global CSS file.
   *   For **App Router** (default in new Next.js projects): `app/globals.css`
   *   For **Pages Router**: `styles/globals.css`

   Ensure the file starts with the following Tailwind directives, replacing any v4 specific imports (like `@import "tailwindcss";`) or `@theme` directives:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   /* You can add any custom global styles below this line */
   body {
     /* Example global styles */
   }
   ```

### 5. Initialize `shadcn/ui`

Run the `shadcn/ui` init command:
```bash
npx shadcn@latest init
```
You will be guided through a series of prompts:
*   `Would you like to use TypeScript?`
*   `Which style would you like to use?` (e.g., Default, New York)
*   `Which color would you like to use as base color?`
*   `Where is your global CSS file?` (Confirm path, e.g., `app/globals.css`)
*   `Do you want to use CSS variables for colors?`
*   `Where is your tailwind.config.js located?` (Confirm path)
*   `Configure import alias for components:` (e.g., `@/components`)
*   `Configure import alias for utils:` (e.g., `@/lib/utils`)
*   `Are you using React Server Components?`

**Important: React 19 Peer Dependency Prompt (for `npm` users)**
You will likely see a prompt like this:
```
It looks like you are using React 19.
Some packages may fail to install due to peer dependency issues in npm (see https://ui.shadcn.com/react-19).

? How would you like to proceed? › - Use arrow-keys. Return to submit.
❯   Use --force
    Use --legacy-peer-deps
```
It is recommended to select **`Use --legacy-peer-deps`**. Use your arrow keys to highlight it and press Enter. This tells `npm` to bypass strict peer dependency checks for this installation.

### 6. Adding `shadcn/ui` Components

To add components, use the `add` command:
```bash
npx shadcn@latest add button
```
Replace `button` with any component you need (e.g., `card`, `dialog`, `input`).

If you encounter peer dependency issues during this step when using `npm`, the CLI might prompt you again, or you may need to run the command with the chosen flag if errors occur (though `shadcn/ui` usually handles this well after the `init` choice).

### 7. Specific Package Considerations (e.g., Recharts for Charts)

If you plan to use components that depend on `recharts` (often used for charts in `shadcn/ui`), React 19 requires an override for `react-is`.

**a. Update `package.json`:**
   Add an `overrides` section (for `npm`) or `resolutions` (for `yarn` or `pnpm`) to your `package.json`:
   ```json
   // package.json (for npm)
   {
     // ... other package.json content
     "dependencies": {
       // ...
     },
     "devDependencies": {
       // ...
     },
     "overrides": {
       "react-is": "^19.0.0-rc-yourSpecificReactVersion" 
       // Ensure the react-is version matches your installed React 19 RC version.
       // Example: "react-is": "^19.0.0-rc-69d4b800-20241021" (check your react version)
     }
   }
   ```
   *To find your specific React 19 RC version, look at `react` in your `package.json` or `node_modules/react/package.json`.*

**b. Install dependencies:**
   After updating `package.json`, run:
   ```bash
   npm install
   ```
   Or, to be safe with peer dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

### 8. Run Your Development Server

Start your Next.js development server:
```bash
npm run dev
```
Open your browser to `http://localhost:3000` to see your application.

This completes the setup process. You should now have a Next.js project running with React 19, Tailwind CSS v3.x, and `shadcn/ui` configured. Remember to test thoroughly!
