# CogniFlow

An AI-powered research workspace for PhD students and academic researchers. CogniFlow combines intelligent document management, multi-modal AI assistance, and research analytics into a single platform.

## Features

| Module | Description |
|--------|-------------|
| **Thinking Mode** | Research command centre — momentum tracking, AI insights, project health |
| **Writing Mode** | Academic editor with AI improve, humanize, plagiarism check, and PDF export |
| **Research Assistant** | RAG-powered chat grounded in your documents with XAI explainability |
| **Gap Analyzer** | Identifies research gaps and unexplored areas in your field |
| **Viva Preparation** | PhD defense simulator with 4 examiner personalities and scored feedback |
| **Research Memory** | Timeline of all your research activity — documents, conversations, gaps |
| **Project Dashboard** | Manage research projects across 8 stages from Ideation to Submission |
| **Document Manager** | Upload, organize, and manage research papers and drafts |
| **Knowledge Graph** | Visual map of your research concepts and connections |
| **Research Council** | Multi-agent AI panel discussion on your research questions |
| **Agent Debate** | AI agents debate competing research positions |
| **Breakthrough Oracle** | AI-generated breakthrough predictions for your field |
| **AutoPilot** | Automated research suggestions and next-step recommendations |
| **Research Genome** | Your unique research DNA — trait radar, archetype, strengths, blind spots |
| **Analytics** | Research activity analytics and progress tracking |
| **Paper Search** | Search and discover academic papers |

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Auth**: Firebase Authentication (email/password + Google)
- **Database**: Firestore (user-scoped collections)
- **AI Backend**: FastAPI (proxied via `/api`) — Claude-powered endpoints
- **State**: React Query (TanStack Query v5)
- **UI**: shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Auth and Firestore enabled
- The CogniFlow FastAPI backend running (or proxied)

### Installation

```bash
git clone https://github.com/nishtha0608/Cogniflow.git
cd Cogniflow
npm install
```

### Environment Setup

Create a `.env` file at the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running Locally

```bash
# Start the frontend
npm run dev

# The AI backend should be running at localhost:8000
# Vite proxies /api → http://localhost:8000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── api/
│   ├── cogniflowAdapter.js     # Main API client (Firebase + FastAPI)
│   ├── cogniflowClient.js      # Re-export
│   └── firestoreEntities.js    # Firestore CRUD for all entities
├── lib/
│   ├── AuthContext.jsx          # Firebase auth + backend JWT exchange
│   ├── ProjectContext.jsx       # Active project state
│   ├── ThemeContext.jsx         # Light/dark mode
│   └── firebase.js              # Firebase init
├── pages/                       # One file per route/module
├── components/ui/               # shadcn/ui components
├── App.jsx                      # Router + auth guard
├── Layout.jsx                   # Sidebar + topbar shell
└── pages.config.js              # Route registration
```

## Data Model

All data is stored per-user in Firestore under `users/{uid}/{EntityName}/{docId}`:

- `ResearchProject` — research projects with stage, field, keywords
- `Document` — writing drafts and uploaded literature
- `Conversation` — chat history (research assistant, viva sessions)
- `ResearchGap` — identified research gaps
- `Citation` — saved citations

## License

MIT
