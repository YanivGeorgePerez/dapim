# Dapim

**Dapim** is a minimal, privacy-focused pastebin-style web application built with Bun, TypeScript, MongoDB, and EJS templates.

## Features

- **Create & View Pastes** – Users can register, login, and create pastes with titles and content.
- **ReCAPTCHA Protection** – All forms protected by Google ReCAPTCHA.
- **User Sessions** – Cookie-based sessions to track logged-in users.
- **User Groups & Permissions** – Admin, Moderator, and Member roles with customizable permissions and group colors.
- **In-Memory Caching** – Homepage results are cached for improved performance.
- **Responsive Design** – Mobile-friendly layout with EJS & Tailwind-style CSS.
- **MongoDB Aggregation** – Single-stage pipelines to enrich pastes with author and group data.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Language:** TypeScript
- **Database:** MongoDB (native driver)
- **Templating:** EJS
- **Styling:** Custom CSS

## Project Structure

```
/src
  /routes
    index.ts       - main router orchestration
    home.ts        - homepage & search
    paste.ts       - view/create paste
    auth.ts        - login/register
    profile.ts     - user profile
    tos.ts         - Terms of Service
    _utils.ts      - shared EJS renderer
  /models
    pasteModel.ts  - Paste & Comment schemas + aggregation methods
    userModel.ts   - User model + permissions helper
    groupModel.ts  - Group model + seeding
  /services
    pasteService.ts
    authService.ts
  /lib
    mongo.ts       - MongoDB connection
    session.ts     - cookie session helpers
    recaptcha.ts   - ReCAPTCHA verifier
/public
  /styles
    layout.css
    home.css
  /resources      - icons, logo, etc.
/views
  /partials       - navbar.ejs, footer.ejs
  index.ejs
  paste.ejs
  create.ejs
  login.ejs
  register.ejs
  profile.ejs
  tos.ejs
app.ts            - Bun server bootstrap
```

## Getting Started

1. **Clone & Install**  
   ```bash
   git clone <repo-url>
   cd dapim
   bun install
   ```

2. **Environment Variables**  
   Create a `.env` in project root:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net
   DB_NAME=dapim
   RECAPTCHA_SECRET=<your-secret>
   RECAPTCHA_SITE_KEY=<your-site-key>
   ```

3. **Run Server**  
   ```bash
   bun run src/app.ts
   ```
   Server will be live at `http://localhost:3000`.

## Customization

- **Groups & Permissions**: Edit `GroupModel.seedDefaults()` or add via Mongo shell.
- **Styling**: Tweak `/public/styles/*.css`.
- **Templates**: Modify EJS under `/views`.

## License

MIT © Yaniv George Perez
