# 📚 LibroAI — AI-Powered Book Companion

LibroAI is a full-stack AI application that transforms static books into **interactive conversational experiences**. Users can upload PDFs and interact with them through a voice-enabled assistant that understands and responds based on the book’s content.

---

## 🚀 Features

- 📄 **PDF Upload & Parsing**
  - Upload books in PDF format
  - Extract and process content into structured segments

- 🧠 **AI-Powered Conversations**
  - Ask questions and interact with book content
  - Context-aware responses based on parsed data

- 🎙️ **Voice Assistant Integration**
  - Real-time voice interaction using Vapi
  - Dynamic conversational flow

- 🔐 **Authentication & User Management**
  - Secure login/signup with Clerk
  - Personalized user sessions

- 📊 **Usage & Session Handling**
  - Track user sessions
  - Enforce usage limits (sessions, duration, etc.)

- ☁️ **Cloud Storage**
  - File uploads managed via Vercel Blob
  - Efficient storage and retrieval

- ⚡ **Modern UI/UX**
  - Built with Next.js App Router
  - Clean, responsive interface

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS  
- **Backend:** Next.js Server Actions  
- **Database:** MongoDB (Mongoose)  
- **Authentication:** Clerk  
- **Storage:** Vercel Blob  
- **Voice AI:** Vapi  
- **Deployment:** Vercel  

---

## 📂 Project Structure
Ai-book-companion-project/
│
├── app/                         # Next.js App Router
│   ├── api/
│   │   └── upload/
│   │       └── route.ts         # Vercel Blob upload handler
│   │
│   ├── books/
│   │   ├── [slug]/
│   │   │   └── page.tsx         # Book interaction page
│   │   └── new/
│   │       └── page.tsx         # Upload new book page
│   │
│   ├── subscriptions/
│   │   └── page.tsx             # Pricing / subscription page
│   │
│   ├── layout.tsx               # Root layout (ClerkProvider, Navbar)
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
│
├── components/                  # Reusable UI components
│   ├── ui/
│   │   ├── Navbar.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Form.tsx
│   │   └── sonner.tsx           # Toast notifications
│   │
│   ├── FileUploader.tsx         # PDF/Image upload component
│   ├── VoiceSelector.tsx        # Voice/persona selection
│   ├── LoadingOverlay.tsx       # Loader during upload
│   └── UploadForm.tsx           # Main upload form logic
│
├── hooks/                       # Custom React hooks
│   ├── useVapi.ts               # Voice session logic (Vapi integration)
│   └── useLatestRef.ts          # Persistent ref helper
│
├── lib/                         # Core logic & utilities
│   ├── actions/
│   │   ├── book.actions.ts      # Book CRUD + segmentation
│   │   └── session.actions.ts   # Voice session handling
│   │
│   ├── database/
│   │   └── mongoose.ts          # MongoDB connection setup
│   │
│   ├── utils.ts                 # Helpers (slug, PDF parsing, etc.)
│   ├── constants.ts             # App constants (limits, voice, etc.)
│   └── zod.ts                   # Validation schemas
│
├── models/ (or database/models/)
│   ├── Book.ts                  # Book schema
│   └── BookSegment.ts           # Segmented content schema
│
├── types/                       # TypeScript types
│   ├── index.ts
│   └── custom types (Book, Messages, etc.)
│
├── public/                      # Static assets
│   ├── assets/
│   │   └── book-cover.svg
│   └── screenshots/             # (for README images)
│
├── .env.local                   # Local environment variables
├── next.config.ts               # Next.js config
├── tailwind.config.ts           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
└── README.md

## 🧪 How It Works

1. User uploads a PDF

2. The file is parsed into segments

3. Data is stored in MongoDB

4. User starts a voice session

5. AI responds based on book content

## 📸 Screenshots

### Home Page
! [Home Page](homepage.jpg)

### Upload Book
! [Upload Book](uploadbook.jpg)

### Book Interaction
! [Book Interaction](interacting.jpg)

### Subscriptions
! [Subscriptions](subscriptions.jpg)

## 🔐 Key Concepts Implemented

1. Server-side validation & error handling

2. Slug-based routing for books

3. Data serialization for MongoDB

4. Custom hooks for voice session handling

5. Efficient state management with React hooks

## 🚀 Getting Started (Local Setup)

### 1️ Clone the repository
```bash
git clone https://github.com/your-username/ATSight.git
cd ATSight
```
### 2️ Install dependencies
```bash
npm install

```

### 3 make api keys and add in .env
```bash
#clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY

#mongodb
MONGODB_URI

#vercel
VERCEL_BLOB_READ_WRITE_TOKEN

#vapi
NEXT_PUBLIC_ASSISTANT_ID
NEXT_PUBLIC_VAPI_API_KEY


```

### 4 Run the project
```bash
npm start
```

The app will run on:

http://localhost:3000

### 🧪 Build for Production
```bash
npm run build
```

### Known bugs of book project :-

- Development mode supported in every log in 

- Pricing highlighting is not showing of existing plan on pricing page

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repo and submit a pull request.




