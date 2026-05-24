# MyTab

MyTab is my custom version of the Chrome start page.


## Features

- Custom start page for Chrome
- Bookmark cards with favicons
- Import and export bookmarks as JSON
- Custom tab title

## Tech stack

- React
- Vite
- SCSS

## Project setup

### 1. Install dependencies

Open the project folder in your terminal and run:

```bash
npm install
```

### 2. Build the project

To create the final version of the extension, run:

```bash
npm run build
```

After the build is finished, Vite will create a `dist` folder. This is the folder that should be loaded into Chrome as an extension.


## Installing MyTab in Chrome

### 1. Open Chrome Extensions

Open Chrome and go to:

```text
chrome://extensions/
```

### 2. Enable Developer mode

In the top-right corner of the Extensions page, turn on **Developer mode**.

### 3. Load the extension

Click **Load unpacked**.

Then select the `dist` folder that was created