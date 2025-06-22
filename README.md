# 🌩️ Cloud Coder Backend

Cloud-Coder is an easy-to-use online coding platform where users can sign in with GitHub and start coding instantly in a secure, cloud-based environment (like VS Code). It supports real-time collaboration and Docker-based execution, perfect for developers, students, and tech educators.

---

## 🚀 Features

- GitHub OAuth login
- Cloud-based code editor
- Real-time collaboration
- Secure Docker sandboxing
- REST API backend with Express.js
- MongoDB and Mongo Express support
- Pre-commit hooks with Husky + Prettier

---

## 🛠 Setup Instructions

> 🧩 Run this once after cloning the repo to install everything and prepare Husky hooks.

### 1. Clone the repo

```bash
git clone https://github.com/thesaiteja24/cloud-coder-backend.git
cd cloud-coder-backend
```

### 2. Run the setup script

```bash
./setup.sh
```

This will:

- ✅ Install all dependencies via `npm install`
- ✅ Initialize Husky for Git hooks
- ✅ Add and activate a `pre-commit` hook with `lint-staged`
- ✅ Create a `.env` file with default values (if missing)

---

## 🧪 Start Development

```bash
npm run dev
```

The server will run on:

```
http://localhost:8888
```

> You can change the port by editing the `.env` file. Also refere to .sample.env to know other required .env variables

---

## 📁 Project Structure

```
.
├── server.js              # Express entry point
├── setup.sh               # Auto-setup script
├── .husky/                # Husky hooks directory
├── package.json           # Project config and scripts
└── .env                   # Environment config (auto-created if missing)
```

---

## 🧹 Lint & Format

This project uses **Prettier + lint-staged** for consistent code formatting.

Format all files manually:

```bash
npm run format
```

Or let it auto-format staged files on every commit via pre-commit hook.

---

## 🤝 Contribution

Pull requests are welcome! Please make sure your code is formatted and passes pre-commit checks before submitting.
