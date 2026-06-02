# PixLoop 📸

A full-stack, modern image-sharing platform built with React, Node.js, Express, MySQL, and Cloudinary. PixLoop allows users to share images, interact through likes and comments, and enjoy a clean social-media-inspired experience with secure authentication and responsive design.

---

## 🚀 Live Demo

Frontend: Add your deployed frontend URL here

---

## 📂 Repositories

### Frontend Repository
https://github.com/acboss1346/PixLoop_frontend

### Backend Repository
https://github.com/acboss1346/PixLoop_backend

---

## ✨ Features

### 🔐 Authentication
- JWT-based authentication
- Secure user registration and login
- Protected routes

### 📸 Image Sharing
- Upload images using Cloudinary
- Create and manage posts
- View posts in a social feed

### ❤️ Social Interactions
- Like posts
- Comment on posts
- Real-time engagement experience

### 🎨 Modern UI
- Responsive design for all devices
- Clean Instagram-inspired interface
- Smooth user experience

### ⚡ Full-Stack Architecture
- Separate frontend and backend repositories
- RESTful API architecture
- Easily deployable and scalable

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js
- Express.js
- MySQL
- JWT Authentication
- Cloudinary

### Database
- MySQL

### Cloud Services
- Cloudinary

---

## 📁 Project Structure

This project is separated into two deployable repositories:

### Frontend
```text
PixLoop_frontend/
├── src/
├── public/
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### Backend
```text
PixLoop_backend/
├── controllers/
├── routes/
├── middleware/
├── config/
├── database/
├── package.json
└── server.js
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repositories

#### Frontend

```bash
git clone https://github.com/acboss1346/PixLoop_frontend.git
cd PixLoop_frontend
```

#### Backend

```bash
git clone https://github.com/acboss1346/PixLoop_backend.git
cd PixLoop_backend
```

---

## 🗄️ Database Setup

Ensure MySQL is installed and running locally.

Create a database:

```sql
CREATE DATABASE pixloop;
```

---

## 🔑 Environment Variables

Create a `.env` file inside the backend directory:

```env
PORT=5001

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pixloop

JWT_SECRET=your_jwt_secret_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## ▶️ Running the Backend

```bash
cd PixLoop_backend

npm install

npm start
```

For development:

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:5001
```

---

## ▶️ Running the Frontend

```bash
cd PixLoop_frontend

npm install

npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 🌐 API Configuration

Create a `.env` file inside the frontend directory:

```env
VITE_API_URL=http://localhost:5001/api
```

For production:

```env
VITE_API_URL=https://your-backend-url/api
```

---

## 🚀 Deployment

### Backend Deployment

Deploy easily on:
- Render
- Railway
- Heroku

### Frontend Deployment

Deploy easily on:
- Vercel
- Netlify

Remember to update:

```env
VITE_API_URL=https://your-live-backend-url/api
```

after deploying the backend.

---

## 📸 Core Functionalities

✅ User Registration

✅ User Login

✅ JWT Authentication

✅ Cloudinary Image Uploads

✅ Create Posts

✅ View Feed

✅ Like Posts

✅ Comment on Posts

✅ Responsive Design

✅ Modern Social Media Interface

✅ Full-Stack Architecture

---

## 🔮 Future Enhancements

- Follow / Unfollow Users
- User Profiles
- Saved Posts
- Notifications
- Dark Mode
- Real-time Messaging
- Infinite Scrolling Feed

---

## 👨‍💻 Developer

**Akshat Chauhan**

GitHub: https://github.com/acboss1346

Frontend Repository:
https://github.com/acboss1346/PixLoop_frontend

Backend Repository:
https://github.com/acboss1346/PixLoop_backend

---

## 📄 License

This project is licensed under the MIT License.
